import { Router } from "express";
import { db } from "../../db";
import { paymentCardsTable, paymentCardBranchesTable, branchesTable } from "@shared/schema";
import { eq, sql, and, gte, lte, isNotNull, inArray } from "drizzle-orm";
import {
  salesTable,
  supplierPaymentsSmTable as supplierPaymentsTable,
  supplierReturnsTable,
  expensesSmTable as expensesTable,
  ownerWithdrawalsTable,
  ownerReturnsTable,
  purchasesTable,
  customerTransactionsTable,
} from "@shared/schema";
import { resolveReadBranch, ALL_BRANCHES_ROLES } from "../lib/branchWrite";

const router = Router();

/* Coerce an incoming branchIds payload into a unique list of positive integers. */
function normalizeBranchIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(ids));
}

/* Resolve which branches a card may be assigned to for the current user.
   - Privileged (admin/supervisor): the provided ids, restricted to existing ACTIVE branches.
   - Everyone else: forced to their own session branch (client list is not trusted). */
async function resolveAssignBranchIds(req: any, raw: unknown): Promise<number[]> {
  const user = req.user!;
  if (!ALL_BRANCHES_ROLES.has(user.role ?? "")) {
    return user.branchId ? [user.branchId] : [];
  }
  const ids = normalizeBranchIds(raw);
  if (!ids.length) return [];
  const rows = await db
    .select({ id: branchesTable.id })
    .from(branchesTable)
    .where(and(inArray(branchesTable.id, ids), eq(branchesTable.isActive, true)));
  const valid = new Set(rows.map((r) => r.id));
  return ids.filter((id) => valid.has(id));
}

/* Helper — returns the Set of card IDs that appear in any transaction table.
   Uses per-table try/catch so a missing table on a fresh DB never crashes. */
async function getUsedCardIds(): Promise<Set<number>> {
  const set = new Set<number>();
  const tables = [
    "sales", "supplier_payments", "supplier_returns",
    "expenses", "owner_withdrawals", "owner_returns",
    "purchases", "customer_transactions",
  ];
  for (const tbl of tables) {
    try {
      const r = await db.execute(
        sql.raw(`SELECT DISTINCT card_id FROM ${tbl} WHERE card_id IS NOT NULL`)
      );
      for (const row of r.rows as any[]) {
        const id = Number(row.card_id);
        if (Number.isFinite(id)) set.add(id);
      }
    } catch {
      /* table may not exist yet — skip */
    }
  }
  return set;
}

/* ── GET all cards (each with its assigned branchIds and isUsed flag) ──
   Optional ?branchId=N filters to cards explicitly assigned to that branch.
   A card with no branch assignment belongs to NO branch and never appears for a
   selected branch (it only shows in the unfiltered management list). */
router.get("/", async (req, res) => {
  const [cards, links, usedIds] = await Promise.all([
    db.select().from(paymentCardsTable).orderBy(paymentCardsTable.name),
    db.select().from(paymentCardBranchesTable),
    getUsedCardIds(),
  ]);

  const byCard = new Map<number, number[]>();
  for (const l of links) {
    const arr = byCard.get(l.cardId) ?? [];
    arr.push(l.branchId);
    byCard.set(l.cardId, arr);
  }
  let withBranches = cards.map((c) => ({
    ...c,
    branchIds: byCard.get(c.id) ?? [],
    isUsed: usedIds.has(c.id),
  }));

  /* Branch scope:
     - When a branch is chosen (bid !== null): show ONLY cards explicitly assigned
       to that branch. Cards with no branch assignment belong to NO branch and are
       never shown for a selected branch (for privileged and non-privileged alike).
     - No branch chosen (null): privileged see every card (the management list,
       including unassigned ones so they can assign them); non-privileged have bid
       forced to their own branch by resolveReadBranch, so they never reach here. */
  const bid = resolveReadBranch(req, (req.query as { branchId?: string }).branchId);
  if (bid !== null) {
    withBranches = withBranches.filter((c) => c.branchIds.includes(bid));
  }
  res.json(withBranches);
});

/* ── POST create card ── */
router.post("/", async (req, res) => {
  const { name, type, notes, mobile, barcode, openingBalance, isActive, branchIds } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "اسم البطاقة مطلوب" });

  /* Duplicate name check */
  const [dup] = await db.select({ id: paymentCardsTable.id }).from(paymentCardsTable)
    .where(eq(sql`LOWER(TRIM(${paymentCardsTable.name}))`, name.trim().toLowerCase()));
  if (dup) return res.status(400).json({ error: `يوجد بطاقة بهذا الاسم مسبقاً` });

  const ids = await resolveAssignBranchIds(req, branchIds);
  const card = await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(paymentCardsTable)
      .values({
        name: name.trim(),
        type: type || "other",
        notes: notes || null,
        mobile: mobile?.trim() || null,
        barcode: barcode?.trim() || null,
        openingBalance: Number.isFinite(Number(openingBalance)) ? String(Number(openingBalance)) : "0",
        isActive: isActive !== false,
      })
      .returning();
    if (ids.length) {
      await tx.insert(paymentCardBranchesTable).values(ids.map((b) => ({ cardId: c.id, branchId: b })));
    }
    return c;
  });
  res.status(201).json({ ...card, branchIds: ids });
});

/* ── PUT update card ── */
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, type, notes, mobile, barcode, openingBalance, isActive, branchIds } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "اسم البطاقة مطلوب" });

  /* Block name change for cards that have transaction history */
  const [existing] = await db.select({ name: paymentCardsTable.name }).from(paymentCardsTable).where(eq(paymentCardsTable.id, id));
  if (!existing) return res.status(404).json({ error: "البطاقة غير موجودة" });
  if (name.trim() !== existing.name) {
    const usedIds = await getUsedCardIds();
    if (usedIds.has(id)) {
      return res.status(400).json({ error: "لا يمكن تغيير اسم البطاقة لأنها مستخدمة في سجلات المعاملات" });
    }
    /* Duplicate name check (skip when name unchanged) */
    const [dup] = await db.select({ id: paymentCardsTable.id }).from(paymentCardsTable)
      .where(eq(sql`LOWER(TRIM(${paymentCardsTable.name}))`, name.trim().toLowerCase()));
    if (dup) return res.status(400).json({ error: "يوجد بطاقة بهذا الاسم مسبقاً" });
  }

  /* Replace branch assignments only when the field is provided in the payload. */
  const hasBranchIds = Object.prototype.hasOwnProperty.call(req.body, "branchIds");
  const ids = hasBranchIds ? await resolveAssignBranchIds(req, branchIds) : null;

  const card = await db.transaction(async (tx) => {
    const [c] = await tx
      .update(paymentCardsTable)
      .set({
        name: name.trim(),
        type: type || "other",
        notes: notes || null,
        mobile: mobile?.trim() || null,
        barcode: barcode?.trim() || null,
        openingBalance: Number.isFinite(Number(openingBalance)) ? String(Number(openingBalance)) : "0",
        isActive: isActive !== false,
      })
      .where(eq(paymentCardsTable.id, id))
      .returning();
    if (!c) return null;
    if (ids !== null) {
      await tx.delete(paymentCardBranchesTable).where(eq(paymentCardBranchesTable.cardId, id));
      if (ids.length) {
        await tx.insert(paymentCardBranchesTable).values(ids.map((b) => ({ cardId: id, branchId: b })));
      }
    }
    return c;
  });
  if (!card) return res.status(404).json({ error: "البطاقة غير موجودة" });
  res.json(ids !== null ? { ...card, branchIds: ids } : card);
});

/* ── DELETE card ── */
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const usedIds = await getUsedCardIds();
  if (usedIds.has(id)) {
    return res.status(400).json({ error: "لا يمكن حذف البطاقة لأنها مستخدمة في سجلات المعاملات. يمكنك إخفاؤها بدلاً من ذلك." });
  }
  await db.delete(paymentCardBranchesTable).where(eq(paymentCardBranchesTable.cardId, id));
  await db.delete(paymentCardsTable).where(eq(paymentCardsTable.id, id));
  res.json({ ok: true });
});

/* ── GET card statement — all transactions for a card, or for ALL cards ──
   When :id === "all", aggregate every transaction tied to any card. */
router.get("/:id/statement", async (req, res) => {
  const isAll = req.params.id === "all";
  const cardId = parseInt(req.params.id);
  if (!isAll && Number.isNaN(cardId)) {
    return res.status(400).json({ error: "invalid card id" });
  }
  const { from, to, branchId } = req.query as { from?: string; to?: string; branchId?: string };
  /* Branch scope: privileged → chosen branch or all (null); others → own branch (-1 = none, fail-closed) */
  const bid = resolveReadBranch(req, branchId);

  /* Card filter: every card (cardId set) when "all", otherwise one card */
  const cardPred = (col: any) => (isAll ? isNotNull(col) : eq(col, cardId));
  /* Branch filter: a specific branch when bid set, otherwise no filter (all branches) */
  const branchPred = (col: any) => (bid !== null ? eq(col, bid) : undefined);

  const results: any[] = [];

  /* Sales (مبيعات) */
  const sales = await db.select({
    id: salesTable.id,
    cardId: salesTable.cardId,
    listNumber: salesTable.listNumber,
    date: salesTable.saleDate,
    amount: salesTable.netAmount,
    notes: salesTable.customerName,
    userName: salesTable.userName,
    type: sql<string>`'sale'`,
    typeLabel: sql<string>`'مبيعات'`,
  }).from(salesTable).where(and(
    cardPred(salesTable.cardId),
    branchPred(salesTable.branchId),
    from ? gte(salesTable.saleDate, from) : undefined,
    to ? lte(salesTable.saleDate, to) : undefined,
  ));
  results.push(...sales.map(r => ({ ...r, amount: parseFloat(r.amount as string) })));

  /* Supplier Payments (دفع موردين) */
  const sp = await db.select({
    id: supplierPaymentsTable.id,
    cardId: supplierPaymentsTable.cardId,
    listNumber: supplierPaymentsTable.listNumber,
    date: supplierPaymentsTable.date,
    amount: supplierPaymentsTable.amount,
    notes: supplierPaymentsTable.notes,
    userName: supplierPaymentsTable.createdBy,
    type: sql<string>`'supplier_payment'`,
    typeLabel: sql<string>`'دفع مورد'`,
  }).from(supplierPaymentsTable).where(and(
    cardPred(supplierPaymentsTable.cardId),
    branchPred(supplierPaymentsTable.branchId),
    from ? gte(supplierPaymentsTable.date, from) : undefined,
    to ? lte(supplierPaymentsTable.date, to) : undefined,
  ));
  results.push(...sp.map(r => ({ ...r, amount: parseFloat(r.amount as string) })));

  /* Supplier Returns (مرجوعات موردين) */
  let srQuery = db.select({
    id: supplierReturnsTable.id,
    cardId: supplierReturnsTable.cardId,
    listNumber: supplierReturnsTable.listNumber,
    date: sql<string>`TO_CHAR(${supplierReturnsTable.invoiceDate}, 'YYYY-MM-DD')`,
    amount: supplierReturnsTable.paidAmount,
    notes: supplierReturnsTable.notes,
    userName: supplierReturnsTable.createdBy,
    type: sql<string>`'supplier_return'`,
    typeLabel: sql<string>`'مرجوعات مورد'`,
  }).from(supplierReturnsTable).where(and(cardPred(supplierReturnsTable.cardId), branchPred(supplierReturnsTable.branchId))).$dynamic();
  const srRows = await srQuery;
  results.push(...srRows.map(r => ({ ...r, amount: parseFloat(r.amount as string) })));

  /* Expenses (مصاريف) */
  const ex = await db.select({
    id: expensesTable.id,
    cardId: expensesTable.cardId,
    listNumber: expensesTable.listNumber,
    date: expensesTable.date,
    amount: expensesTable.amount,
    notes: expensesTable.notes,
    userName: expensesTable.userName,
    type: sql<string>`'expense'`,
    typeLabel: sql<string>`'مصاريف'`,
  }).from(expensesTable).where(and(
    cardPred(expensesTable.cardId),
    branchPred(expensesTable.branchId),
    from ? gte(expensesTable.date, from) : undefined,
    to ? lte(expensesTable.date, to) : undefined,
  ));
  results.push(...ex.map(r => ({ ...r, amount: parseFloat(r.amount as string) })));

  /* Owner Withdrawals (سحوبات) */
  const ow = await db.select({
    id: ownerWithdrawalsTable.id,
    cardId: ownerWithdrawalsTable.cardId,
    listNumber: ownerWithdrawalsTable.listNumber,
    date: ownerWithdrawalsTable.date,
    amount: ownerWithdrawalsTable.amount,
    notes: ownerWithdrawalsTable.notes,
    userName: ownerWithdrawalsTable.userName,
    type: sql<string>`'withdrawal'`,
    typeLabel: sql<string>`'سحوبات'`,
  }).from(ownerWithdrawalsTable).where(and(
    cardPred(ownerWithdrawalsTable.cardId),
    branchPred(ownerWithdrawalsTable.branchId),
    from ? gte(ownerWithdrawalsTable.date, from) : undefined,
    to ? lte(ownerWithdrawalsTable.date, to) : undefined,
  ));
  results.push(...ow.map(r => ({ ...r, amount: parseFloat(r.amount as string) })));

  /* Owner Returns (مرجوعات المحل) */
  const or_ = await db.select({
    id: ownerReturnsTable.id,
    cardId: ownerReturnsTable.cardId,
    listNumber: ownerReturnsTable.listNumber,
    date: ownerReturnsTable.date,
    amount: ownerReturnsTable.amount,
    notes: ownerReturnsTable.notes,
    userName: ownerReturnsTable.userName,
    type: sql<string>`'owner_return'`,
    typeLabel: sql<string>`'مرجوعات المحل'`,
  }).from(ownerReturnsTable).where(and(
    cardPred(ownerReturnsTable.cardId),
    branchPred(ownerReturnsTable.branchId),
    from ? gte(ownerReturnsTable.date, from) : undefined,
    to ? lte(ownerReturnsTable.date, to) : undefined,
  ));
  results.push(...or_.map(r => ({ ...r, amount: parseFloat(r.amount as string) })));

  /* Purchases (مشتريات) */
  let puQuery = db.select({
    id: purchasesTable.id,
    cardId: purchasesTable.cardId,
    listNumber: purchasesTable.listNumber,
    date: sql<string>`TO_CHAR(${purchasesTable.invoiceDate}, 'YYYY-MM-DD')`,
    amount: purchasesTable.paidAmount,
    notes: purchasesTable.notes,
    userName: purchasesTable.createdBy,
    type: sql<string>`'purchase'`,
    typeLabel: sql<string>`'مشتريات'`,
  }).from(purchasesTable).where(and(cardPred(purchasesTable.cardId), branchPred(purchasesTable.branchId))).$dynamic();
  const puRows = await puQuery;
  results.push(...puRows.map(r => ({ ...r, amount: parseFloat(r.amount as string) })));

  /* Opening balance — single card: that card's; all-cards: sum of every card's */
  let openingBalance = 0;
  if (isAll) {
    const [r] = await db
      .select({ s: sql<string>`COALESCE(SUM(${paymentCardsTable.openingBalance}), 0)` })
      .from(paymentCardsTable);
    openingBalance = parseFloat(r?.s ?? "0") || 0;
  } else {
    const [c] = await db
      .select({ ob: paymentCardsTable.openingBalance })
      .from(paymentCardsTable)
      .where(eq(paymentCardsTable.id, cardId));
    openingBalance = c ? parseFloat(c.ob as string) || 0 : 0;
  }
  if (openingBalance) {
    results.push({
      id: 0,
      cardId: isAll ? null : cardId,
      listNumber: null,
      date: from || "0000-01-01",
      amount: openingBalance,
      notes: "رصيد افتتاحي",
      userName: "",
      type: "opening",
      typeLabel: "رصيد افتتاحي",
    });
  }

  /* Attach each row's card name (needed for the "all cards" view) */
  if (results.length) {
    const cardRows = await db
      .select({ id: paymentCardsTable.id, name: paymentCardsTable.name })
      .from(paymentCardsTable);
    const nameById = new Map(cardRows.map(c => [c.id, c.name]));
    results.forEach(r => { r.cardName = r.cardId != null ? (nameById.get(r.cardId) || "—") : "—"; });
  }

  /* Sort by date descending */
  results.sort((a, b) => {
    const da = a.date || "";
    const db_ = b.date || "";
    return db_ > da ? 1 : -1;
  });

  const total = results.reduce((s, r) => s + (r.amount || 0), 0);

  res.json({ rows: results, total });
});

export default router;
