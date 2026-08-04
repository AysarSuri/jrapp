import { Router } from "express";
import { db } from "../../db";
import {
  branchesTable,
  productsSmTable as productsTable,
  productStocksTable,
  customersSmTable as customersTable,
  suppliersSmTable as suppliersTable,
} from "@shared/schema";
import { eq, sql, and, ne } from "drizzle-orm";

const router = Router();

/* ── رأس المال: جرد المواد + ديون الزبائن لكل فرع، وديون الموردين إجمالاً ──
   رأس المال = (قيمة جرد المواد بسعر التكلفة) + (ديون جميع الزبائن) − (ديون جميع الموردين)
   مُتاح فقط للمدير والمشرف لأنه يكشف بيانات مالية مجمّعة عبر كل الفروع. */
router.get("/", async (req, res) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "supervisor") {
    return res.status(403).json({ message: "forbidden" });
  }

  /* الفروع الفعّالة */
  const branches = await db
    .select({ id: branchesTable.id, name: branchesTable.name })
    .from(branchesTable)
    .where(eq(branchesTable.isActive, true))
    .orderBy(branchesTable.name);

  /* قيمة جرد المواد لكل فرع = Σ (الكمية المتبقية × سعر التكلفة) للمواد غير المخفية */
  const invRows = await db
    .select({
      branchId: productStocksTable.branchId,
      value: sql<number>`COALESCE(SUM(${productStocksTable.quantity} * COALESCE(NULLIF(${productStocksTable.costPrice}, 0), ${productsTable.purchasePrice}) / GREATEST(COALESCE(${productsTable.conversionFactor}, 1), 1)), 0)`,
    })
    .from(productStocksTable)
    .innerJoin(productsTable, eq(productsTable.id, productStocksTable.productId))
    .where(eq(productsTable.isHidden, false))
    .groupBy(productStocksTable.branchId);
  const invMap = new Map<number, number>();
  for (const r of invRows) invMap.set(r.branchId, Number(r.value) || 0);

  /* ديون الزبائن لكل فرع = Σ رصيد الزبائن (باستثناء "عميل نقداً") */
  const debtRows = await db
    .select({
      branchId: customersTable.branchId,
      debt: sql<number>`COALESCE(SUM(${customersTable.balance}), 0)`,
    })
    .from(customersTable)
    .where(ne(customersTable.name, "عميل نقداً"))
    .groupBy(customersTable.branchId);
  const debtMap = new Map<number, number>();
  for (const r of debtRows) {
    if (r.branchId != null) debtMap.set(r.branchId, Number(r.debt) || 0);
  }

  /* ديون جميع الموردين (إجمالي عام، الموردون غير مرتبطين بفرع) */
  const [supRow] = await db
    .select({ debt: sql<number>`COALESCE(SUM(${suppliersTable.balance}), 0)` })
    .from(suppliersTable);
  const supplierDebt = Number(supRow?.debt) || 0;

  /* باقي القاصة (نقداً): رصيد الافتتاح + كل الداخل النقدي − كل الخارج النقدي */
  const cashResult = await db.execute(sql`
    SELECT (
      COALESCE((SELECT value::numeric FROM settings WHERE key = 'opening_balance'), 0)
      + COALESCE((SELECT SUM(net_amount)  FROM sales                WHERE payment_method='cash' AND card_id IS NULL), 0)
      + COALESCE((SELECT SUM(amount)      FROM customer_transactions WHERE type='received'       AND card_id IS NULL), 0)
      + COALESCE((SELECT SUM(paid_amount) FROM supplier_returns      WHERE payment_method='cash' AND card_id IS NULL), 0)
      + COALESCE((SELECT SUM(amount)      FROM supplier_payments      WHERE type='received'       AND card_id IS NULL), 0)
      + COALESCE((SELECT SUM(amount)      FROM owner_returns          WHERE card_id IS NULL), 0)
      - COALESCE((SELECT SUM(amount)      FROM customer_transactions  WHERE type='paid'           AND card_id IS NULL), 0)
      - COALESCE((SELECT SUM(paid_amount) FROM purchases              WHERE payment_method='cash' AND card_id IS NULL), 0)
      - COALESCE((SELECT SUM(amount)      FROM supplier_payments      WHERE type='paid'           AND card_id IS NULL), 0)
      - COALESCE((SELECT SUM(amount)      FROM expenses               WHERE card_id IS NULL), 0)
      - COALESCE((SELECT SUM(amount)      FROM owner_withdrawals      WHERE card_id IS NULL), 0)
    ) AS cash_balance
  `);
  const cashBalance = parseFloat((cashResult.rows[0] as any)?.cash_balance ?? "0") || 0;

  /* باقي جميع البطاقات: رصيد افتتاحي البطاقات + كل المعاملات بالبطاقة */
  const cardsResult = await db.execute(sql`
    SELECT (
      COALESCE((SELECT SUM(opening_balance::numeric) FROM payment_cards), 0)
      + COALESCE((SELECT SUM(net_amount)  FROM sales                WHERE card_id IS NOT NULL), 0)
      + COALESCE((SELECT SUM(amount)      FROM customer_transactions WHERE type='received'  AND card_id IS NOT NULL), 0)
      + COALESCE((SELECT SUM(paid_amount) FROM supplier_returns      WHERE card_id IS NOT NULL), 0)
      + COALESCE((SELECT SUM(amount)      FROM supplier_payments      WHERE type='received' AND card_id IS NOT NULL), 0)
      + COALESCE((SELECT SUM(amount)      FROM owner_returns          WHERE card_id IS NOT NULL), 0)
      - COALESCE((SELECT SUM(amount)      FROM customer_transactions  WHERE type='paid'     AND card_id IS NOT NULL), 0)
      - COALESCE((SELECT SUM(paid_amount) FROM purchases              WHERE card_id IS NOT NULL), 0)
      - COALESCE((SELECT SUM(amount)      FROM supplier_payments      WHERE type='paid'     AND card_id IS NOT NULL), 0)
      - COALESCE((SELECT SUM(amount)      FROM expenses               WHERE card_id IS NOT NULL), 0)
      - COALESCE((SELECT SUM(amount)      FROM owner_withdrawals      WHERE card_id IS NOT NULL), 0)
    ) AS cards_balance
  `);
  const cardsBalance = parseFloat((cardsResult.rows[0] as any)?.cards_balance ?? "0") || 0;

  /* تفصيل لكل فرع + الإجماليات */
  const perBranch = branches.map((b) => {
    const inventoryValue = invMap.get(b.id) ?? 0;
    const customerDebt = debtMap.get(b.id) ?? 0;
    return {
      branchId: b.id,
      branchName: b.name,
      inventoryValue,
      customerDebt,
      subtotal: inventoryValue + customerDebt,
    };
  });

  const totalInventory = perBranch.reduce((a, x) => a + x.inventoryValue, 0);
  const totalCustomerDebt = perBranch.reduce((a, x) => a + x.customerDebt, 0);
  const capital = totalInventory + totalCustomerDebt + cashBalance + cardsBalance - supplierDebt;

  res.json({
    branches: perBranch,
    totals: {
      inventoryValue: totalInventory,
      customerDebt: totalCustomerDebt,
      supplierDebt,
      capital,
      cashBalance,
      cardsBalance,
    },
  });
});

export default router;
