import { Router } from "express";
import { db } from "../../db";
import {
  shiftsTable, salesTable, customerTransactionsTable, supplierPaymentsSmTable as supplierPaymentsTable,
  supplierReturnsTable, purchasesTable, expensesSmTable as expensesTable, ownerReturnsTable,
  ownerWithdrawalsTable, paymentCardsTable,
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { resolveReadBranch, ALL_BRANCHES_ROLES } from "../lib/branchWrite";

const router = Router();

/* ── Shift-report money helpers ── */
type CardInfo = { name: string; type: string };
type MoneyCard = { cardId: number; cardName: string; cardType: string; amount: number };
type Money = { cash: number; byCard: MoneyCard[]; total: number };

function cardEntry(cardId: number, amount: number, cards: Map<number, CardInfo>): MoneyCard {
  return {
    cardId,
    cardName: cards.get(cardId)?.name ?? `كارت #${cardId}`,
    cardType: cards.get(cardId)?.type ?? "other",
    amount,
  };
}

/* Build a money line from {cardId|null, amount} rows — null cardId = cash. */
function buildMoney(rows: { cardId: number | null; amount: number }[], cards: Map<number, CardInfo>): Money {
  let cash = 0;
  const map = new Map<number, number>();
  for (const r of rows) {
    const amt = r.amount || 0;
    if (r.cardId == null) cash += amt;
    else map.set(r.cardId, (map.get(r.cardId) || 0) + amt);
  }
  const byCard = Array.from(map.entries()).map(([id, amt]) => cardEntry(id, amt, cards));
  return { cash, byCard, total: cash + byCard.reduce((s, c) => s + c.amount, 0) };
}

/* Merge several money lines into one (sum cash, merge cards by id). */
function mergeMoney(parts: Money[], cards: Map<number, CardInfo>): Money {
  let cash = 0;
  const map = new Map<number, number>();
  for (const p of parts) {
    cash += p.cash;
    for (const c of p.byCard) map.set(c.cardId, (map.get(c.cardId) || 0) + c.amount);
  }
  const byCard = Array.from(map.entries()).map(([id, amt]) => cardEntry(id, amt, cards));
  return { cash, byCard, total: cash + byCard.reduce((s, c) => s + c.amount, 0) };
}

const num = (v: unknown) => parseFloat((v as string) ?? "0") || 0;

function mapShift(s: typeof shiftsTable.$inferSelect) {
  return {
    id: s.id,
    userId: s.userId,
    userName: s.userName,
    status: s.status,
    openingAmount: parseFloat(s.openingAmount as string) || 0,
    startTime: s.startTime?.toISOString() ?? null,
    endTime: s.endTime?.toISOString() ?? null,
    totalSales: parseFloat(s.totalSales as string) || 0,
    totalDiscounts: parseFloat(s.totalDiscounts as string) || 0,
    totalCash: parseFloat(s.totalCash as string) || 0,
    totalCard: parseFloat(s.totalCard as string) || 0,
    totalCredit: parseFloat(s.totalCredit as string) || 0,
    totalNet: parseFloat(s.totalNet as string) || 0,
    notes: s.notes,
    branchId: s.branchId ?? null,
    branchName: s.branchName ?? null,
    createdAt: s.createdAt?.toISOString() ?? null,
  };
}

/* GET /api/shifts?date=YYYY-MM-DD&from=YYYY-MM-DD&to=YYYY-MM-DD&branchId=N
   `date` = single day (legacy); `from`/`to` = inclusive date range (either bound optional). */
router.get("/", async (req, res) => {
  const { date, from, to, branchId } = req.query as { date?: string; from?: string; to?: string; branchId?: string };
  let rows = await db.select().from(shiftsTable).orderBy(desc(shiftsTable.startTime));
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);
    rows = rows.filter(r => r.startTime >= start && r.startTime <= end);
  } else if (from || to) {
    const start = from ? new Date(`${from}T00:00:00`) : null;
    const end = to ? new Date(`${to}T23:59:59`) : null;
    rows = rows.filter(r => (!start || r.startTime >= start) && (!end || r.startTime <= end));
  }
  const bid = resolveReadBranch(req, branchId);
  if (bid !== null) rows = rows.filter(r => r.branchId === bid);
  res.json(rows.map(mapShift));
});

/* GET /api/shifts/open?userId=X — open shift for a user (single) or all open shifts (array) */
router.get("/open", async (req, res) => {
  const { userId } = req.query as { userId?: string };
  if (userId) {
    const [shift] = await db.select().from(shiftsTable)
      .where(and(eq(shiftsTable.status, "open"), eq(shiftsTable.userId, userId)))
      .orderBy(desc(shiftsTable.startTime))
      .limit(1);
    return res.json(shift ? mapShift(shift) : null);
  }
  const rows = await db.select().from(shiftsTable)
    .where(eq(shiftsTable.status, "open"))
    .orderBy(desc(shiftsTable.startTime));
  res.json(rows.map(mapShift));
});

/* POST /api/shifts — start new shift */
router.post("/", async (req, res) => {
  const { openingAmount = 0, notes, startTime } = req.body;

  /* Derive actor identity from server-side session — never trust the body */
  const sessionUser = req.user!;
  const userId    = sessionUser.userId;
  const userName  = sessionUser.username;
  const branchId  = sessionUser.branchId;
  const branchName = sessionUser.branchName;

  const [created] = await db.insert(shiftsTable).values({
    userId,
    userName,
    openingAmount: String(openingAmount),
    status: "open",
    notes,
    startTime: startTime ? new Date(startTime) : new Date(),
    branchId: branchId || null,
    branchName: branchName || null,
  }).returning();
  res.status(201).json(mapShift(created));
});

/* PUT /api/shifts/:id/close — close shift and aggregate sales */
router.put("/:id/close", async (req, res) => {
  const id = parseInt(req.params.id);
  const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, id));
  if (!shift) return res.status(404).json({ error: "Not found" });
  if (shift.status === "closed") return res.status(400).json({ error: "Shift already closed" });

  const startTime = shift.startTime;
  const endTime = new Date();

  const [agg] = await db.select({
    totalSales:     sql<string>`COALESCE(SUM(${salesTable.totalAmount}::numeric), 0)`,
    totalDiscounts: sql<string>`COALESCE(SUM(${salesTable.discountAmount}::numeric), 0)`,
    totalCash:      sql<string>`COALESCE(SUM(CASE WHEN ${salesTable.paymentMethod} = 'cash' THEN ${salesTable.netAmount}::numeric ELSE 0 END), 0)`,
    totalCard:      sql<string>`COALESCE(SUM(CASE WHEN ${salesTable.paymentMethod} = 'transfer' THEN ${salesTable.netAmount}::numeric ELSE 0 END), 0)`,
    totalCredit:    sql<string>`COALESCE(SUM(CASE WHEN ${salesTable.paymentMethod} = 'credit' THEN ${salesTable.netAmount}::numeric ELSE 0 END), 0)`,
    totalNet:       sql<string>`COALESCE(SUM(${salesTable.netAmount}::numeric), 0)`,
  }).from(salesTable).where(
    and(
      eq(salesTable.userId, shift.userId!),
      gte(salesTable.createdAt, startTime),
      lte(salesTable.createdAt, endTime),
    )
  );

  const [updated] = await db.update(shiftsTable).set({
    status: "closed",
    endTime,
    totalSales:     agg.totalSales,
    totalDiscounts: agg.totalDiscounts,
    totalCash:      agg.totalCash,
    totalCard:      agg.totalCard,
    totalCredit:    agg.totalCredit,
    totalNet:       agg.totalNet,
  }).where(eq(shiftsTable.id, id)).returning();

  res.json(mapShift(updated));
});

/* GET /api/shifts/:id/report — full cash-drawer reconciliation for the shift window,
   scoped by the shift's branch + [startTime, endTime|now], every money line split
   into cash + per-card. */
router.get("/:id/report", async (req, res) => {
  const id = parseInt(req.params.id);
  const [shift] = await db.select().from(shiftsTable).where(eq(shiftsTable.id, id));
  if (!shift) return res.status(404).json({ error: "Not found" });

  /* branch authorization — a branch-locked user may only view their own branch's report.
     A non-privileged user with no branch assigned cannot view any report (fail closed),
     so they never match a null-branch (all-branches) shift via the -1 sentinel. */
  const reqUser = req.user!;
  const privileged = ALL_BRANCHES_ROLES.has(reqUser.role ?? "");
  if (!privileged && reqUser.branchId == null) {
    return res.status(403).json({ message: "غير مصرح بعرض تقرير هذا الفرع" });
  }
  const allowed = resolveReadBranch(req, undefined);
  if (allowed !== null && allowed !== (shift.branchId ?? -1)) {
    return res.status(403).json({ message: "غير مصرح بعرض تقرير هذا الفرع" });
  }

  /* scope: "branch" (default, all activity in the shift's branch+window) or
     "user" (only the shift owner's own transactions). For "user" the shift must
     be attributed to a user. */
  const userScoped = req.query.scope === "user";
  if (userScoped && shift.userId == null) {
    return res.status(400).json({ message: "هذه الوردية غير منسوبة لمستخدم" });
  }
  const uname = shift.userName;

  const start = shift.startTime;
  const end = shift.endTime ?? new Date();
  const bid = shift.branchId;

  /* userCol marks how a table records its creator: "id" → user_id column
     (sales + the 4 newly-attributed tables), "name" → created_by text column
     (supplier payments/returns, purchases). */
  const win = (table: any, userCol?: "id" | "name") => {
    const conds = [gte(table.createdAt, start), lte(table.createdAt, end)];
    if (bid != null) conds.push(eq(table.branchId, bid));
    if (userScoped) {
      if (userCol === "id") conds.push(eq(table.userId, shift.userId!));
      else if (userCol === "name") conds.push(uname != null ? eq(table.createdBy, uname) : sql`1=0`);
    }
    return and(...conds);
  };

  const [
    cardRows, salesGrouped, salesTotalsRows, ctGrouped, spGrouped,
    srGrouped, orGrouped, puGrouped, puTotalsRows, exGrouped, owGrouped,
  ] = await Promise.all([
    db.select().from(paymentCardsTable),
    db.select({
      paymentMethod: salesTable.paymentMethod,
      cardId: salesTable.cardId,
      amt: sql<string>`COALESCE(SUM(${salesTable.netAmount}::numeric),0)`,
    }).from(salesTable).where(win(salesTable, "id")).groupBy(salesTable.paymentMethod, salesTable.cardId),
    db.select({
      totalSales: sql<string>`COALESCE(SUM(${salesTable.totalAmount}::numeric),0)`,
      discount: sql<string>`COALESCE(SUM(${salesTable.discountAmount}::numeric + ${salesTable.priceEditDiscount}::numeric),0)`,
      credit: sql<string>`COALESCE(SUM(CASE WHEN ${salesTable.paymentMethod}='credit' THEN ${salesTable.netAmount}::numeric ELSE 0 END),0)`,
    }).from(salesTable).where(win(salesTable, "id")),
    db.select({
      type: customerTransactionsTable.type,
      cardId: customerTransactionsTable.cardId,
      amt: sql<string>`COALESCE(SUM(${customerTransactionsTable.amount}::numeric),0)`,
    }).from(customerTransactionsTable).where(win(customerTransactionsTable, "id"))
      .groupBy(customerTransactionsTable.type, customerTransactionsTable.cardId),
    db.select({
      type: supplierPaymentsTable.type,
      cardId: supplierPaymentsTable.cardId,
      amt: sql<string>`COALESCE(SUM(${supplierPaymentsTable.amount}::numeric),0)`,
    }).from(supplierPaymentsTable).where(win(supplierPaymentsTable, "name"))
      .groupBy(supplierPaymentsTable.type, supplierPaymentsTable.cardId),
    db.select({
      cardId: supplierReturnsTable.cardId,
      amt: sql<string>`COALESCE(SUM(${supplierReturnsTable.paidAmount}::numeric),0)`,
    }).from(supplierReturnsTable).where(win(supplierReturnsTable, "name")).groupBy(supplierReturnsTable.cardId),
    db.select({
      cardId: ownerReturnsTable.cardId,
      amt: sql<string>`COALESCE(SUM(${ownerReturnsTable.amount}::numeric),0)`,
    }).from(ownerReturnsTable).where(win(ownerReturnsTable, "id")).groupBy(ownerReturnsTable.cardId),
    db.select({
      cardId: purchasesTable.cardId,
      amt: sql<string>`COALESCE(SUM(${purchasesTable.paidAmount}::numeric),0)`,
    }).from(purchasesTable).where(win(purchasesTable, "name")).groupBy(purchasesTable.cardId),
    db.select({
      discount: sql<string>`COALESCE(SUM(${purchasesTable.discountAmount}::numeric),0)`,
    }).from(purchasesTable).where(win(purchasesTable, "name")),
    db.select({
      cardId: expensesTable.cardId,
      amt: sql<string>`COALESCE(SUM(${expensesTable.amount}::numeric),0)`,
    }).from(expensesTable).where(win(expensesTable, "id")).groupBy(expensesTable.cardId),
    db.select({
      cardId: ownerWithdrawalsTable.cardId,
      amt: sql<string>`COALESCE(SUM(${ownerWithdrawalsTable.amount}::numeric),0)`,
    }).from(ownerWithdrawalsTable).where(win(ownerWithdrawalsTable, "id")).groupBy(ownerWithdrawalsTable.cardId),
  ]);

  const cards = new Map<number, CardInfo>();
  for (const c of cardRows) cards.set(c.id, { name: c.name, type: c.type });

  /* RECEIVED */
  const salesRecRows = salesGrouped
    .filter(r => r.paymentMethod === "cash" || r.paymentMethod === "transfer")
    .map(r => ({ cardId: r.paymentMethod === "transfer" ? r.cardId : null, amount: num(r.amt) }));
  const salesReceived = buildMoney(salesRecRows, cards);
  const customerReceived = buildMoney(
    ctGrouped.filter(r => r.type === "received").map(r => ({ cardId: r.cardId, amount: num(r.amt) })), cards);
  const supplierReceived = buildMoney(
    spGrouped.filter(r => r.type === "received").map(r => ({ cardId: r.cardId, amount: num(r.amt) })), cards);
  const supplierReturns = buildMoney(srGrouped.map(r => ({ cardId: r.cardId, amount: num(r.amt) })), cards);
  const ownerReturns = buildMoney(orGrouped.map(r => ({ cardId: r.cardId, amount: num(r.amt) })), cards);
  const receivedMerged = mergeMoney(
    [salesReceived, customerReceived, supplierReceived, supplierReturns, ownerReturns], cards);

  /* PAID */
  const customerPaid = buildMoney(
    ctGrouped.filter(r => r.type === "paid").map(r => ({ cardId: r.cardId, amount: num(r.amt) })), cards);
  const supplierPaid = buildMoney(
    spGrouped.filter(r => r.type === "paid").map(r => ({ cardId: r.cardId, amount: num(r.amt) })), cards);
  const purchasesPaid = buildMoney(puGrouped.map(r => ({ cardId: r.cardId, amount: num(r.amt) })), cards);
  const expensesPaid = buildMoney(exGrouped.map(r => ({ cardId: r.cardId, amount: num(r.amt) })), cards);
  const ownerWithdrawals = buildMoney(owGrouped.map(r => ({ cardId: r.cardId, amount: num(r.amt) })), cards);
  const paidMerged = mergeMoney(
    [customerPaid, supplierPaid, purchasesPaid, expensesPaid, ownerWithdrawals], cards);

  /* DISCOUNTS (totals only) */
  const salesDiscount = num(salesTotalsRows[0]?.discount);
  const customerDiscount = ctGrouped.filter(r => r.type === "discount").reduce((s, r) => s + num(r.amt), 0);
  const purchaseDiscount = num(puTotalsRows[0]?.discount);
  const supplierDiscount = spGrouped.filter(r => r.type === "discount").reduce((s, r) => s + num(r.amt), 0);
  const discountsTotal = salesDiscount + customerDiscount + purchaseDiscount + supplierDiscount;

  res.json({
    shift: mapShift(shift),
    window: {
      start: start.toISOString(),
      end: end.toISOString(),
      branchId: bid ?? null,
      branchScoped: bid != null,
      userScoped,
      userId: userScoped ? shift.userId : null,
      userName: userScoped ? uname : null,
    },
    totalSales: num(salesTotalsRows[0]?.totalSales),
    totalCredit: num(salesTotalsRows[0]?.credit),
    received: {
      sales: salesReceived,
      customers: customerReceived,
      suppliers: supplierReceived,
      supplierReturns,
      ownerReturns,
      merged: receivedMerged,
    },
    paid: {
      customers: customerPaid,
      suppliers: supplierPaid,
      purchases: purchasesPaid,
      expenses: expensesPaid,
      ownerWithdrawals,
      merged: paidMerged,
    },
    discounts: {
      sales: salesDiscount,
      customers: customerDiscount,
      purchases: purchaseDiscount,
      suppliers: supplierDiscount,
      total: discountsTotal,
    },
  });
});

/* DELETE /api/shifts/:id */
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(shiftsTable).where(eq(shiftsTable.id, id));
  res.json({ success: true });
});

export default router;
