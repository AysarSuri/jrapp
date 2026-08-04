import { Router } from "express";
import { db } from "../../db";
import {
  salesTable,
  expensesSmTable as expensesTable,
  ownerWithdrawalsTable,
  ownerReturnsTable,
  supplierPaymentsSmTable as supplierPaymentsTable,
  customerTransactionsTable,
  supplierReturnsTable,
  purchasesTable,
  branchesTable,
} from "@shared/schema";
import { gte, lte, lt, and, eq, isNull, sql } from "drizzle-orm";
import { resolveReadBranch } from "../lib/branchWrite";

const router = Router();

/* A grouped-by-branch cash sum for one source table.
   Returns one row per branchId (null branch grouped as key 0). */
async function groupSum(table: any, amountCol: any, conds: any[]) {
  const rows = await db
    .select({ bid: table.branchId, total: sql<string>`coalesce(sum(${amountCol}), 0)` })
    .from(table)
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(table.branchId);
  return rows.map((r: any) => ({ bid: (r.bid ?? null) as number | null, total: parseFloat(r.total) || 0 }));
}

const sumAll = (arr: { total: number }[]) => arr.reduce((s, r) => s + r.total, 0);

router.get("/", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
    const from = fromDate || "";
    const to = toDate || "";
    const bid = resolveReadBranch(req, req.query.branchId);
    const allBranches = bid === null; // admin/supervisor viewing every branch

    /* Opening balance (single global figure entered before program start) */
    const settingRows = await db.execute(sql`SELECT value FROM settings WHERE key = 'opening_balance'`);
    const openingBalance = parseFloat((settingRows.rows[0] as any)?.value ?? "0") || 0;

    /* ── condition builders ───────────────────────────────────────────── */
    const branchCond = (table: any) => (bid !== null ? [eq(table.branchId, bid)] : []);

    // text date columns (YYYY-MM-DD stored as text / date)
    const textPeriod = (col: any) => {
      const c: any[] = [];
      if (from) c.push(gte(col, from));
      if (to) c.push(lte(col, to));
      return c;
    };
    const textBefore = (col: any) => (from ? [lt(col, from)] : null); // null = no "before" window

    // timestamp date columns (use invoice date, fall back to created_at)
    const tsExpr = (t: any) => sql`coalesce(${t.invoiceDate}, ${t.createdAt})`;
    const tsPeriod = (t: any) => {
      const c: any[] = [];
      if (from) c.push(sql`${tsExpr(t)}::date >= ${from}`);
      if (to) c.push(sql`${tsExpr(t)}::date <= ${to}`);
      return c;
    };
    const tsBefore = (t: any) => (from ? [sql`${tsExpr(t)}::date < ${from}`] : null);

    /* ── INCOMING sources (cash only, no card) ────────────────────────── */
    // 1) cash sales (POS + sales) — payment_method = cash, no card
    const cSalesCash = (extra: any[]) => [eq(salesTable.paymentMethod, "cash"), isNull(salesTable.cardId), ...branchCond(salesTable), ...extra];
    // 2) customer receipts (حركة الزبائن — واصل)
    const cCustRecv = (extra: any[]) => [eq(customerTransactionsTable.type, "received"), isNull(customerTransactionsTable.cardId), ...branchCond(customerTransactionsTable), ...extra];
    // 3) supplier returns cash (مرجوعات الموردين)
    const cSupRet = (extra: any[]) => [eq(supplierReturnsTable.paymentMethod, "cash"), isNull(supplierReturnsTable.cardId), ...branchCond(supplierReturnsTable), ...extra];
    // 4) supplier payments — type received (دفع الموردين — واصل)
    const cSupRecv = (extra: any[]) => [eq(supplierPaymentsTable.type, "received"), isNull(supplierPaymentsTable.cardId), ...branchCond(supplierPaymentsTable), ...extra];
    // 5) owner returns (مرجوعات المحل)
    const cOwnerRet = (extra: any[]) => [isNull(ownerReturnsTable.cardId), ...branchCond(ownerReturnsTable), ...extra];

    /* ── OUTGOING sources (cash only, no card) ────────────────────────── */
    // 1) customer transactions — type paid (حركة الزبائن — مدفوع)
    const cCustPaid = (extra: any[]) => [eq(customerTransactionsTable.type, "paid"), isNull(customerTransactionsTable.cardId), ...branchCond(customerTransactionsTable), ...extra];
    // 2) cash purchases (المشتريات نقداً)
    const cPurch = (extra: any[]) => [eq(purchasesTable.paymentMethod, "cash"), isNull(purchasesTable.cardId), ...branchCond(purchasesTable), ...extra];
    // 3) supplier payments — type paid (دفع الموردين — مدفوع)
    const cSupPaid = (extra: any[]) => [eq(supplierPaymentsTable.type, "paid"), isNull(supplierPaymentsTable.cardId), ...branchCond(supplierPaymentsTable), ...extra];
    // 4) expenses (المصاريف)
    const cExp = (extra: any[]) => [isNull(expensesTable.cardId), ...branchCond(expensesTable), ...extra];
    // 5) owner withdrawals (سحوبات صاحب المحل)
    const cWd = (extra: any[]) => [isNull(ownerWithdrawalsTable.cardId), ...branchCond(ownerWithdrawalsTable), ...extra];

    /* ── run period queries ───────────────────────────────────────────── */
    const [
      pSalesCash, pCustRecv, pSupRet, pSupRecv, pOwnerRet,
      pCustPaid, pPurch, pSupPaid, pExp, pWd,
    ] = await Promise.all([
      groupSum(salesTable, salesTable.netAmount, cSalesCash(textPeriod(salesTable.saleDate))),
      groupSum(customerTransactionsTable, customerTransactionsTable.amount, cCustRecv(textPeriod(customerTransactionsTable.date))),
      groupSum(supplierReturnsTable, supplierReturnsTable.paidAmount, cSupRet(tsPeriod(supplierReturnsTable))),
      groupSum(supplierPaymentsTable, supplierPaymentsTable.amount, cSupRecv(textPeriod(supplierPaymentsTable.date))),
      groupSum(ownerReturnsTable, ownerReturnsTable.amount, cOwnerRet(textPeriod(ownerReturnsTable.date))),
      groupSum(customerTransactionsTable, customerTransactionsTable.amount, cCustPaid(textPeriod(customerTransactionsTable.date))),
      groupSum(purchasesTable, purchasesTable.paidAmount, cPurch(tsPeriod(purchasesTable))),
      groupSum(supplierPaymentsTable, supplierPaymentsTable.amount, cSupPaid(textPeriod(supplierPaymentsTable.date))),
      groupSum(expensesTable, expensesTable.amount, cExp(textPeriod(expensesTable.date))),
      groupSum(ownerWithdrawalsTable, ownerWithdrawalsTable.amount, cWd(textPeriod(ownerWithdrawalsTable.date))),
    ]);

    /* ── run "before fromDate" queries for carry-forward ──────────────── */
    const tb = (col: any) => textBefore(col);
    const runBefore = async () => {
      if (!from) {
        const empty: { bid: number | null; total: number }[] = [];
        return { bSalesCash: empty, bCustRecv: empty, bSupRet: empty, bSupRecv: empty, bOwnerRet: empty, bCustPaid: empty, bPurch: empty, bSupPaid: empty, bExp: empty, bWd: empty };
      }
      const [
        bSalesCash, bCustRecv, bSupRet, bSupRecv, bOwnerRet,
        bCustPaid, bPurch, bSupPaid, bExp, bWd,
      ] = await Promise.all([
        groupSum(salesTable, salesTable.netAmount, cSalesCash(tb(salesTable.saleDate)!)),
        groupSum(customerTransactionsTable, customerTransactionsTable.amount, cCustRecv(tb(customerTransactionsTable.date)!)),
        groupSum(supplierReturnsTable, supplierReturnsTable.paidAmount, cSupRet(tsBefore(supplierReturnsTable)!)),
        groupSum(supplierPaymentsTable, supplierPaymentsTable.amount, cSupRecv(tb(supplierPaymentsTable.date)!)),
        groupSum(ownerReturnsTable, ownerReturnsTable.amount, cOwnerRet(tb(ownerReturnsTable.date)!)),
        groupSum(customerTransactionsTable, customerTransactionsTable.amount, cCustPaid(tb(customerTransactionsTable.date)!)),
        groupSum(purchasesTable, purchasesTable.paidAmount, cPurch(tsBefore(purchasesTable)!)),
        groupSum(supplierPaymentsTable, supplierPaymentsTable.amount, cSupPaid(tb(supplierPaymentsTable.date)!)),
        groupSum(expensesTable, expensesTable.amount, cExp(tb(expensesTable.date)!)),
        groupSum(ownerWithdrawalsTable, ownerWithdrawalsTable.amount, cWd(tb(ownerWithdrawalsTable.date)!)),
      ]);
      return { bSalesCash, bCustRecv, bSupRet, bSupRecv, bOwnerRet, bCustPaid, bPurch, bSupPaid, bExp, bWd };
    };
    const before = await runBefore();

    /* ── combined line items (sum across branches in scope) ───────────── */
    const incoming = {
      salesCash: sumAll(pSalesCash),
      customerReceipts: sumAll(pCustRecv),
      supplierReturns: sumAll(pSupRet),
      supplierReceived: sumAll(pSupRecv),
      ownerReturns: sumAll(pOwnerRet),
      total: 0,
    };
    incoming.total = incoming.salesCash + incoming.customerReceipts + incoming.supplierReturns + incoming.supplierReceived + incoming.ownerReturns;

    const outgoing = {
      customerPaid: sumAll(pCustPaid),
      purchasesCash: sumAll(pPurch),
      supplierPaid: sumAll(pSupPaid),
      expenses: sumAll(pExp),
      ownerWithdrawals: sumAll(pWd),
      total: 0,
    };
    outgoing.total = outgoing.customerPaid + outgoing.purchasesCash + outgoing.supplierPaid + outgoing.expenses + outgoing.ownerWithdrawals;

    /* ── per-branch accumulation ──────────────────────────────────────── */
    type BAcc = { inc: number; out: number; before: number };
    const branchMap = new Map<number, BAcc>();
    const touch = (k: number) => {
      let e = branchMap.get(k);
      if (!e) { e = { inc: 0, out: 0, before: 0 }; branchMap.set(k, e); }
      return e;
    };
    const add = (arr: { bid: number | null; total: number }[], key: keyof BAcc, sign: number) => {
      for (const r of arr) touch(r.bid ?? 0)[key] += r.total * sign;
    };

    // period incoming (+) / outgoing (+) into their buckets
    [pSalesCash, pCustRecv, pSupRet, pSupRecv, pOwnerRet].forEach((a) => add(a, "inc", 1));
    [pCustPaid, pPurch, pSupPaid, pExp, pWd].forEach((a) => add(a, "out", 1));
    // before: net = incoming(+) - outgoing(-)
    [before.bSalesCash, before.bCustRecv, before.bSupRet, before.bSupRecv, before.bOwnerRet].forEach((a) => add(a, "before", 1));
    [before.bCustPaid, before.bPurch, before.bSupPaid, before.bExp, before.bWd].forEach((a) => add(a, "before", -1));

    const beforeNetTotal = Array.from(branchMap.values()).reduce((s, e) => s + e.before, 0);
    const carryForward = openingBalance + beforeNetTotal;
    const balance = carryForward + incoming.total - outgoing.total;

    /* ── per-branch report rows (only meaningful for all-branches view) ─ */
    let byBranch: any[] = [];
    if (allBranches && branchMap.size > 0) {
      const branchRows = await db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable);
      const nameOf = new Map(branchRows.map((b) => [b.id, b.name]));
      byBranch = Array.from(branchMap.entries())
        .map(([k, e]) => ({
          branchId: k === 0 ? null : k,
          branchName: k === 0 ? "بدون فرع" : (nameOf.get(k) ?? `فرع #${k}`),
          carryForward: e.before, // movement-based carry only (global opening counted once in grand total)
          incomingTotal: e.inc,
          outgoingTotal: e.out,
          balance: e.before + e.inc - e.out,
        }))
        .sort((a, b) => (a.branchName || "").localeCompare(b.branchName || "", "ar"));
    }

    res.json({
      scope: allBranches ? "all" : "single",
      openingBalance,
      carryForward,
      incoming,
      outgoing,
      balance,
      byBranch,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل جلب بيانات القاصة" });
  }
});

/* ── /detail  — returns individual rows for one cash category ──────── */
router.get("/detail", async (req, res) => {
  try {
    const cat   = String((req.query as any).category  || "");
    const from  = String((req.query as any).fromDate  || "");
    const to    = String((req.query as any).toDate    || "");
    const bid   = resolveReadBranch(req, req.query.branchId);

    const labels: Record<string, string> = {
      salesCash:        "مبيعات نقدي",
      customerReceipts: "واصل من حركة الزبائن",
      supplierReturns:  "مرجوعات الموردين (نقداً)",
      supplierReceived: "واصل من دفع الموردين",
      ownerReturns:     "مرجوعات صاحب المحل",
      customerPaid:     "مدفوع من حركة الزبائن",
      purchasesCash:    "المشتريات (نقداً)",
      supplierPaid:     "مدفوعات الموردين",
      expenses:         "المصاريف",
      ownerWithdrawals: "سحوبات صاحب المحل",
    };
    if (!labels[cat]) return res.status(400).json({ error: "تصنيف غير معروف" });

    const bCond = bid !== null ? sql` AND t.branch_id = ${bid}` : sql``;

    const dRange = (col: string) => {
      let s = sql``;
      if (from) s = sql`${s} AND t.${sql.raw(col)} >= ${from}`;
      if (to)   s = sql`${s} AND t.${sql.raw(col)} <= ${to}`;
      return s;
    };
    const tsRange = () => {
      let s = sql``;
      if (from) s = sql`${s} AND coalesce(t.invoice_date, t.created_at)::date >= ${from}::date`;
      if (to)   s = sql`${s} AND coalesce(t.invoice_date, t.created_at)::date <= ${to}::date`;
      return s;
    };

    type R = { date: string; ref: string; name: string; notes: string; amount: number; branchName: string };
    let rows: R[] = [];

    if (cat === "salesCash") {
      const r = await db.execute<any>(sql`
        SELECT t.sale_date AS date, coalesce(t.list_number::text,'') AS ref,
               coalesce(t.customer_name,'') AS name, coalesce(t.notes,'') AS notes,
               t.net_amount::float AS amount, coalesce(t.branch_name,'') AS branch_name
        FROM sales t
        WHERE t.payment_method = 'cash' AND t.card_id IS NULL ${bCond} ${dRange("sale_date")}
        ORDER BY t.sale_date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name }));

    } else if (cat === "customerReceipts" || cat === "customerPaid") {
      const tc = cat === "customerReceipts" ? sql`AND t.type = 'received'` : sql`AND t.type = 'paid'`;
      const r = await db.execute<any>(sql`
        SELECT t.date, coalesce(t.list_number::text,'') AS ref,
               coalesce(t.customer_name,'') AS name, coalesce(t.notes,'') AS notes,
               t.amount::float AS amount, coalesce(t.branch_name,'') AS branch_name
        FROM customer_transactions t
        WHERE t.card_id IS NULL ${tc} ${bCond} ${dRange("date")}
        ORDER BY t.date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name }));

    } else if (cat === "supplierReturns") {
      const r = await db.execute<any>(sql`
        SELECT coalesce(t.invoice_date, t.created_at)::date::text AS date,
               coalesce(t.list_number::text, t.invoice_number, '') AS ref,
               coalesce(s.name,'') AS name, coalesce(t.notes,'') AS notes,
               t.paid_amount::float AS amount, coalesce(t.branch_name,'') AS branch_name
        FROM supplier_returns t
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        WHERE t.payment_method = 'cash' AND t.card_id IS NULL ${bCond} ${tsRange()}
        ORDER BY coalesce(t.invoice_date, t.created_at)::date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name }));

    } else if (cat === "supplierReceived" || cat === "supplierPaid") {
      const tc = cat === "supplierReceived" ? sql`AND t.type = 'received'` : sql`AND t.type = 'paid'`;
      const r = await db.execute<any>(sql`
        SELECT t.date::text AS date, coalesce(t.list_number::text,'') AS ref,
               coalesce(s.name,'') AS name, coalesce(t.notes,'') AS notes,
               t.amount::float AS amount, coalesce(t.branch_name,'') AS branch_name
        FROM supplier_payments t
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        WHERE t.card_id IS NULL ${tc} ${bCond} ${dRange("date")}
        ORDER BY t.date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name }));

    } else if (cat === "ownerReturns") {
      const r = await db.execute<any>(sql`
        SELECT t.date, coalesce(t.list_number::text,'') AS ref,
               '' AS name, coalesce(t.notes,'') AS notes,
               t.amount::float AS amount, coalesce(t.branch_name,'') AS branch_name
        FROM owner_returns t
        WHERE t.card_id IS NULL ${bCond} ${dRange("date")}
        ORDER BY t.date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name }));

    } else if (cat === "purchasesCash") {
      const r = await db.execute<any>(sql`
        SELECT coalesce(t.invoice_date, t.created_at)::date::text AS date,
               coalesce(t.list_number::text, t.invoice_number, '') AS ref,
               coalesce(s.name,'') AS name, coalesce(t.notes,'') AS notes,
               t.paid_amount::float AS amount, coalesce(t.branch_name,'') AS branch_name
        FROM purchases t
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        WHERE t.payment_method = 'cash' AND t.card_id IS NULL ${bCond} ${tsRange()}
        ORDER BY coalesce(t.invoice_date, t.created_at)::date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name }));

    } else if (cat === "expenses") {
      const r = await db.execute<any>(sql`
        SELECT t.date, coalesce(t.list_number::text,'') AS ref,
               coalesce(t.expense_type_name,'') AS name, coalesce(t.notes,'') AS notes,
               t.amount::float AS amount, coalesce(t.branch_name,'') AS branch_name
        FROM expenses t
        WHERE t.card_id IS NULL ${bCond} ${dRange("date")}
        ORDER BY t.date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name }));

    } else if (cat === "ownerWithdrawals") {
      const r = await db.execute<any>(sql`
        SELECT t.date, coalesce(t.list_number::text,'') AS ref,
               '' AS name, coalesce(t.notes,'') AS notes,
               t.amount::float AS amount, coalesce(t.branch_name,'') AS branch_name
        FROM owner_withdrawals t
        WHERE t.card_id IS NULL ${bCond} ${dRange("date")}
        ORDER BY t.date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name }));
    }

    const total = rows.reduce((s, r) => s + r.amount, 0);
    res.json({ category: cat, labelAr: labels[cat], rows, total, fromDate: from, toDate: to });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل جلب تفاصيل القاصة" });
  }
});

export default router;
