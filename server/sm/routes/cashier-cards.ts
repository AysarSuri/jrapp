import { Router } from "express";
import { db } from "../../db";
import {
  salesTable, expensesSmTable as expensesTable, ownerWithdrawalsTable, ownerReturnsTable,
  supplierPaymentsSmTable as supplierPaymentsTable, customerTransactionsTable, supplierReturnsTable,
  purchasesTable, branchesTable, paymentCardsTable,
} from "@shared/schema";
import { gte, lte, lt, and, eq, isNotNull, sql } from "drizzle-orm";
import { resolveReadBranch } from "../lib/branchWrite";

const router = Router();

/* Groups by branchId AND cardId so we can aggregate either way in JS */
async function groupSum(table: any, amountCol: any, conds: any[]) {
  const rows = await db
    .select({
      bid: table.branchId,
      cid: table.cardId,
      total: sql<string>`coalesce(sum(${amountCol}), 0)`,
    })
    .from(table)
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(table.branchId, table.cardId);
  return rows.map((r: any) => ({
    bid: (r.bid ?? null) as number | null,
    cid: (r.cid ?? null) as number | null,
    total: parseFloat(r.total) || 0,
  }));
}

const sumAll = (arr: { total: number }[]) => arr.reduce((s, r) => s + r.total, 0);

/* ── GET / ── */
router.get("/", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
    const from = fromDate || "";
    const to   = toDate   || "";

    const bid       = resolveReadBranch(req, req.query.branchId);
    const allBranches = bid === null;

    const cidRaw  = req.query.cardId;
    const cid     = cidRaw && cidRaw !== "all" ? parseInt(String(cidRaw)) : null;
    const allCards = cid === null;

    /* card condition */
    const cardCond   = (col: any) => (allCards ? isNotNull(col) : eq(col, cid!));
    const branchCond = (table: any) => (bid !== null ? [eq(table.branchId, bid)] : []);

    /* date helpers */
    const textPeriod = (col: any) => {
      const c: any[] = [];
      if (from) c.push(gte(col, from));
      if (to)   c.push(lte(col, to));
      return c;
    };
    const textBefore = (col: any) => (from ? [lt(col, from)] : null);
    const tsExpr     = (t: any) => sql`coalesce(${t.invoiceDate}, ${t.createdAt})`;
    const tsPeriod   = (t: any) => {
      const c: any[] = [];
      if (from) c.push(sql`${tsExpr(t)}::date >= ${from}`);
      if (to)   c.push(sql`${tsExpr(t)}::date <= ${to}`);
      return c;
    };
    const tsBefore = (t: any) => (from ? [sql`${tsExpr(t)}::date < ${from}`] : null);

    /* condition builders */
    const cSales    = (x: any[]) => [cardCond(salesTable.cardId), ...branchCond(salesTable), ...x];
    const cCustRecv = (x: any[]) => [eq(customerTransactionsTable.type, "received"), cardCond(customerTransactionsTable.cardId), ...branchCond(customerTransactionsTable), ...x];
    const cSupRet   = (x: any[]) => [cardCond(supplierReturnsTable.cardId), ...branchCond(supplierReturnsTable), ...x];
    const cSupRecv  = (x: any[]) => [eq(supplierPaymentsTable.type, "received"), cardCond(supplierPaymentsTable.cardId), ...branchCond(supplierPaymentsTable), ...x];
    const cOwnerRet = (x: any[]) => [cardCond(ownerReturnsTable.cardId), ...branchCond(ownerReturnsTable), ...x];
    const cCustPaid = (x: any[]) => [eq(customerTransactionsTable.type, "paid"), cardCond(customerTransactionsTable.cardId), ...branchCond(customerTransactionsTable), ...x];
    const cPurch    = (x: any[]) => [cardCond(purchasesTable.cardId), ...branchCond(purchasesTable), ...x];
    const cSupPaid  = (x: any[]) => [eq(supplierPaymentsTable.type, "paid"), cardCond(supplierPaymentsTable.cardId), ...branchCond(supplierPaymentsTable), ...x];
    const cExp      = (x: any[]) => [cardCond(expensesTable.cardId), ...branchCond(expensesTable), ...x];
    const cWd       = (x: any[]) => [cardCond(ownerWithdrawalsTable.cardId), ...branchCond(ownerWithdrawalsTable), ...x];

    /* period queries */
    const [pSales, pCustRecv, pSupRet, pSupRecv, pOwnerRet, pCustPaid, pPurch, pSupPaid, pExp, pWd] = await Promise.all([
      groupSum(salesTable,                salesTable.netAmount,                   cSales(textPeriod(salesTable.saleDate))),
      groupSum(customerTransactionsTable, customerTransactionsTable.amount,       cCustRecv(textPeriod(customerTransactionsTable.date))),
      groupSum(supplierReturnsTable,      supplierReturnsTable.paidAmount,        cSupRet(tsPeriod(supplierReturnsTable))),
      groupSum(supplierPaymentsTable,     supplierPaymentsTable.amount,           cSupRecv(textPeriod(supplierPaymentsTable.date))),
      groupSum(ownerReturnsTable,         ownerReturnsTable.amount,               cOwnerRet(textPeriod(ownerReturnsTable.date))),
      groupSum(customerTransactionsTable, customerTransactionsTable.amount,       cCustPaid(textPeriod(customerTransactionsTable.date))),
      groupSum(purchasesTable,            purchasesTable.paidAmount,              cPurch(tsPeriod(purchasesTable))),
      groupSum(supplierPaymentsTable,     supplierPaymentsTable.amount,           cSupPaid(textPeriod(supplierPaymentsTable.date))),
      groupSum(expensesTable,             expensesTable.amount,                   cExp(textPeriod(expensesTable.date))),
      groupSum(ownerWithdrawalsTable,     ownerWithdrawalsTable.amount,           cWd(textPeriod(ownerWithdrawalsTable.date))),
    ]);

    /* before-fromDate queries for carry-forward */
    const runBefore = async () => {
      if (!from) {
        const e: { bid: number | null; cid: number | null; total: number }[] = [];
        return { bS: e, bCR: e, bSR: e, bSRv: e, bOR: e, bCP: e, bP: e, bSP: e, bE: e, bWd: e };
      }
      const tb = (col: any) => textBefore(col)!;
      const [bS, bCR, bSR, bSRv, bOR, bCP, bP, bSP, bE, bWd] = await Promise.all([
        groupSum(salesTable,                salesTable.netAmount,             cSales(tb(salesTable.saleDate))),
        groupSum(customerTransactionsTable, customerTransactionsTable.amount, cCustRecv(tb(customerTransactionsTable.date))),
        groupSum(supplierReturnsTable,      supplierReturnsTable.paidAmount,  cSupRet(tsBefore(supplierReturnsTable)!)),
        groupSum(supplierPaymentsTable,     supplierPaymentsTable.amount,     cSupRecv(tb(supplierPaymentsTable.date))),
        groupSum(ownerReturnsTable,         ownerReturnsTable.amount,         cOwnerRet(tb(ownerReturnsTable.date))),
        groupSum(customerTransactionsTable, customerTransactionsTable.amount, cCustPaid(tb(customerTransactionsTable.date))),
        groupSum(purchasesTable,            purchasesTable.paidAmount,        cPurch(tsBefore(purchasesTable)!)),
        groupSum(supplierPaymentsTable,     supplierPaymentsTable.amount,     cSupPaid(tb(supplierPaymentsTable.date))),
        groupSum(expensesTable,             expensesTable.amount,             cExp(tb(expensesTable.date))),
        groupSum(ownerWithdrawalsTable,     ownerWithdrawalsTable.amount,     cWd(tb(ownerWithdrawalsTable.date))),
      ]);
      return { bS, bCR, bSR, bSRv, bOR, bCP, bP, bSP, bE, bWd };
    };
    const before = await runBefore();

    /* opening balance */
    let openingBalance = 0;
    if (allCards) {
      const r = await db.select({ s: sql<string>`COALESCE(SUM(${paymentCardsTable.openingBalance}), 0)` }).from(paymentCardsTable);
      openingBalance = parseFloat((r[0] as any)?.s ?? "0") || 0;
    } else {
      const r = await db.select({ ob: paymentCardsTable.openingBalance }).from(paymentCardsTable).where(eq(paymentCardsTable.id, cid!));
      openingBalance = r[0] ? parseFloat(r[0].ob as string) || 0 : 0;
    }

    /* totals */
    const incoming = {
      salesCard:        sumAll(pSales),
      customerReceipts: sumAll(pCustRecv),
      supplierReturns:  sumAll(pSupRet),
      supplierReceived: sumAll(pSupRecv),
      ownerReturns:     sumAll(pOwnerRet),
      total: 0,
    };
    incoming.total = incoming.salesCard + incoming.customerReceipts + incoming.supplierReturns + incoming.supplierReceived + incoming.ownerReturns;

    const outgoing = {
      customerPaid:     sumAll(pCustPaid),
      purchases:        sumAll(pPurch),
      supplierPaid:     sumAll(pSupPaid),
      expenses:         sumAll(pExp),
      ownerWithdrawals: sumAll(pWd),
      total: 0,
    };
    outgoing.total = outgoing.customerPaid + outgoing.purchases + outgoing.supplierPaid + outgoing.expenses + outgoing.ownerWithdrawals;

    /* per-branch accumulation */
    type Acc = { inc: number; out: number; before: number };
    const branchMap = new Map<number, Acc>();
    const touchB = (k: number) => { let e = branchMap.get(k); if (!e) { e = { inc: 0, out: 0, before: 0 }; branchMap.set(k, e); } return e; };
    const addB = (arr: { bid: number | null; total: number }[], key: keyof Acc, sign: number) => { for (const r of arr) touchB(r.bid ?? 0)[key] += r.total * sign; };
    [pSales, pCustRecv, pSupRet, pSupRecv, pOwnerRet].forEach(a => addB(a, "inc", 1));
    [pCustPaid, pPurch, pSupPaid, pExp, pWd].forEach(a => addB(a, "out", 1));
    [before.bS, before.bCR, before.bSR, before.bSRv, before.bOR].forEach(a => addB(a, "before", 1));
    [before.bCP, before.bP, before.bSP, before.bE, before.bWd].forEach(a => addB(a, "before", -1));

    const beforeNetTotal = Array.from(branchMap.values()).reduce((s, e) => s + e.before, 0);
    const carryForward = openingBalance + beforeNetTotal;
    const balance = carryForward + incoming.total - outgoing.total;

    /* per-branch report rows */
    let byBranch: any[] = [];
    if (allBranches && branchMap.size > 0) {
      const branchRows = await db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable);
      const nameOf = new Map(branchRows.map(b => [b.id, b.name]));
      byBranch = Array.from(branchMap.entries()).map(([k, e]) => ({
        branchId: k === 0 ? null : k,
        branchName: k === 0 ? "بدون فرع" : (nameOf.get(k) ?? `فرع #${k}`),
        incomingTotal: e.inc,
        outgoingTotal: e.out,
        balance: e.before + e.inc - e.out,
      })).sort((a, b) => (a.branchName || "").localeCompare(b.branchName || "", "ar"));
    }

    /* per-card accumulation (only when allCards) */
    const cardMap = new Map<number, Acc>();
    const touchC = (k: number) => { let e = cardMap.get(k); if (!e) { e = { inc: 0, out: 0, before: 0 }; cardMap.set(k, e); } return e; };
    const addC = (arr: { cid: number | null; total: number }[], key: keyof Acc, sign: number) => {
      for (const r of arr) if (r.cid !== null) touchC(r.cid)[key] += r.total * sign;
    };
    if (allCards) {
      [pSales, pCustRecv, pSupRet, pSupRecv, pOwnerRet].forEach(a => addC(a, "inc", 1));
      [pCustPaid, pPurch, pSupPaid, pExp, pWd].forEach(a => addC(a, "out", 1));
      [before.bS, before.bCR, before.bSR, before.bSRv, before.bOR].forEach(a => addC(a, "before", 1));
      [before.bCP, before.bP, before.bSP, before.bE, before.bWd].forEach(a => addC(a, "before", -1));
    }

    let byCard: any[] = [];
    if (allCards && cardMap.size > 0) {
      const cardRows = await db.select({ id: paymentCardsTable.id, name: paymentCardsTable.name }).from(paymentCardsTable);
      const nameOf = new Map(cardRows.map(c => [c.id, c.name]));
      byCard = Array.from(cardMap.entries()).map(([k, e]) => ({
        cardId: k,
        cardName: nameOf.get(k) ?? `بطاقة #${k}`,
        incomingTotal: e.inc,
        outgoingTotal: e.out,
        balance: e.before + e.inc - e.out,
      })).sort((a, b) => (a.cardName || "").localeCompare(b.cardName || "", "ar"));
    }

    res.json({
      scope: allBranches ? "all" : "single",
      cardScope: allCards ? "all" : "single",
      openingBalance,
      carryForward,
      incoming,
      outgoing,
      balance,
      byBranch,
      byCard,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل جلب بيانات قاصة البطاقات" });
  }
});

/* ── GET /detail ── */
router.get("/detail", async (req, res) => {
  try {
    const cat  = String((req.query as any).category || "");
    const from = String((req.query as any).fromDate  || "");
    const to   = String((req.query as any).toDate    || "");
    const bid  = resolveReadBranch(req, req.query.branchId);

    const cidRaw = req.query.cardId;
    const cid    = cidRaw && cidRaw !== "all" ? parseInt(String(cidRaw)) : null;
    const allCards = cid === null;

    const labels: Record<string, string> = {
      salesCard:        "مبيعات (بطاقة)",
      customerReceipts: "واصل من حركة الزبائن",
      supplierReturns:  "مرجوعات الموردين (بطاقة)",
      supplierReceived: "واصل من دفع الموردين",
      ownerReturns:     "مرجوعات صاحب المحل",
      customerPaid:     "مدفوع من حركة الزبائن",
      purchases:        "المشتريات (بطاقة)",
      supplierPaid:     "مدفوعات الموردين",
      expenses:         "المصاريف",
      ownerWithdrawals: "سحوبات صاحب المحل",
    };
    if (!labels[cat]) return res.status(400).json({ error: "تصنيف غير معروف" });

    const bCond  = bid !== null ? sql` AND t.branch_id = ${bid}` : sql``;
    const cCond  = allCards ? sql` AND t.card_id IS NOT NULL` : sql` AND t.card_id = ${cid}`;

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

    type R = { date: string; ref: string; name: string; notes: string; amount: number; branchName: string; cardName: string };
    let rows: R[] = [];

    if (cat === "salesCard") {
      const r = await db.execute<any>(sql`
        SELECT t.sale_date AS date, coalesce(t.list_number::text,'') AS ref,
               coalesce(t.customer_name,'') AS name, coalesce(t.notes,'') AS notes,
               t.net_amount::float AS amount, coalesce(t.branch_name,'') AS branch_name,
               coalesce(pc.name,'') AS card_name
        FROM sales t
        LEFT JOIN payment_cards pc ON pc.id = t.card_id
        WHERE 1=1 ${cCond} ${bCond} ${dRange("sale_date")}
        ORDER BY t.sale_date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name, cardName: x.card_name }));

    } else if (cat === "customerReceipts" || cat === "customerPaid") {
      const tc = cat === "customerReceipts" ? sql`AND t.type = 'received'` : sql`AND t.type = 'paid'`;
      const r = await db.execute<any>(sql`
        SELECT t.date, coalesce(t.list_number::text,'') AS ref,
               coalesce(t.customer_name,'') AS name, coalesce(t.notes,'') AS notes,
               t.amount::float AS amount, coalesce(t.branch_name,'') AS branch_name,
               coalesce(pc.name,'') AS card_name
        FROM customer_transactions t
        LEFT JOIN payment_cards pc ON pc.id = t.card_id
        WHERE 1=1 ${cCond} ${tc} ${bCond} ${dRange("date")}
        ORDER BY t.date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name, cardName: x.card_name }));

    } else if (cat === "supplierReturns") {
      const r = await db.execute<any>(sql`
        SELECT coalesce(t.invoice_date, t.created_at)::date::text AS date,
               coalesce(t.list_number::text, t.invoice_number, '') AS ref,
               coalesce(s.name,'') AS name, coalesce(t.notes,'') AS notes,
               t.paid_amount::float AS amount, coalesce(t.branch_name,'') AS branch_name,
               coalesce(pc.name,'') AS card_name
        FROM supplier_returns t
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN payment_cards pc ON pc.id = t.card_id
        WHERE 1=1 ${cCond} ${bCond} ${tsRange()}
        ORDER BY coalesce(t.invoice_date, t.created_at)::date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name, cardName: x.card_name }));

    } else if (cat === "supplierReceived" || cat === "supplierPaid") {
      const tc = cat === "supplierReceived" ? sql`AND t.type = 'received'` : sql`AND t.type = 'paid'`;
      const r = await db.execute<any>(sql`
        SELECT t.date::text AS date, coalesce(t.list_number::text,'') AS ref,
               coalesce(s.name,'') AS name, coalesce(t.notes,'') AS notes,
               t.amount::float AS amount, coalesce(t.branch_name,'') AS branch_name,
               coalesce(pc.name,'') AS card_name
        FROM supplier_payments t
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN payment_cards pc ON pc.id = t.card_id
        WHERE 1=1 ${cCond} ${tc} ${bCond} ${dRange("date")}
        ORDER BY t.date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name, cardName: x.card_name }));

    } else if (cat === "ownerReturns") {
      const r = await db.execute<any>(sql`
        SELECT t.date, coalesce(t.list_number::text,'') AS ref,
               '' AS name, coalesce(t.notes,'') AS notes,
               t.amount::float AS amount, coalesce(t.branch_name,'') AS branch_name,
               coalesce(pc.name,'') AS card_name
        FROM owner_returns t
        LEFT JOIN payment_cards pc ON pc.id = t.card_id
        WHERE 1=1 ${cCond} ${bCond} ${dRange("date")}
        ORDER BY t.date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name, cardName: x.card_name }));

    } else if (cat === "purchases") {
      const r = await db.execute<any>(sql`
        SELECT coalesce(t.invoice_date, t.created_at)::date::text AS date,
               coalesce(t.list_number::text, t.invoice_number, '') AS ref,
               coalesce(s.name,'') AS name, coalesce(t.notes,'') AS notes,
               t.paid_amount::float AS amount, coalesce(t.branch_name,'') AS branch_name,
               coalesce(pc.name,'') AS card_name
        FROM purchases t
        LEFT JOIN suppliers s ON s.id = t.supplier_id
        LEFT JOIN payment_cards pc ON pc.id = t.card_id
        WHERE 1=1 ${cCond} ${bCond} ${tsRange()}
        ORDER BY coalesce(t.invoice_date, t.created_at)::date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name, cardName: x.card_name }));

    } else if (cat === "expenses") {
      const r = await db.execute<any>(sql`
        SELECT t.date, coalesce(t.list_number::text,'') AS ref,
               coalesce(t.expense_type_name,'') AS name, coalesce(t.notes,'') AS notes,
               t.amount::float AS amount, coalesce(t.branch_name,'') AS branch_name,
               coalesce(pc.name,'') AS card_name
        FROM expenses t
        LEFT JOIN payment_cards pc ON pc.id = t.card_id
        WHERE 1=1 ${cCond} ${bCond} ${dRange("date")}
        ORDER BY t.date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name, cardName: x.card_name }));

    } else if (cat === "ownerWithdrawals") {
      const r = await db.execute<any>(sql`
        SELECT t.date, coalesce(t.list_number::text,'') AS ref,
               '' AS name, coalesce(t.notes,'') AS notes,
               t.amount::float AS amount, coalesce(t.branch_name,'') AS branch_name,
               coalesce(pc.name,'') AS card_name
        FROM owner_withdrawals t
        LEFT JOIN payment_cards pc ON pc.id = t.card_id
        WHERE 1=1 ${cCond} ${bCond} ${dRange("date")}
        ORDER BY t.date DESC, t.id DESC
      `);
      rows = r.rows.map((x: any) => ({ date: x.date, ref: x.ref, name: x.name, notes: x.notes, amount: +x.amount, branchName: x.branch_name, cardName: x.card_name }));
    }

    const total = rows.reduce((s, r) => s + r.amount, 0);
    res.json({ category: cat, labelAr: labels[cat], rows, total, fromDate: from, toDate: to });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل جلب تفاصيل قاصة البطاقات" });
  }
});

export default router;
