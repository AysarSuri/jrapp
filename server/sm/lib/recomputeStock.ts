import { db } from "../../db";
import {
  productsSmTable as productsTable,
  productStocksTable,
  purchasesTable, purchaseItemsTable,
  salesTable, saleItemsTable,
  supplierReturnsTable, supplierReturnItemsTable,
  productionsTable, productionItemsTable,
  damagesTable,
  stockTransfersTable, stockTransferItemsTable,
  inventoryAdjustmentsTable,
  branchesTable,
} from "@shared/schema";
import { eq, inArray, sql, asc } from "drizzle-orm";

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** product -> branch -> qty accumulator */
type Acc = Map<number, Map<number, number>>;

function add(acc: Acc, productId: number, branchId: number, qty: number) {
  if (!qty) return;
  let m = acc.get(productId);
  if (!m) { m = new Map(); acc.set(productId, m); }
  m.set(branchId, (m.get(branchId) ?? 0) + qty);
}

async function defaultBranchId(executor: Executor): Promise<number | null> {
  const [b] = await executor
    .select({ id: branchesTable.id })
    .from(branchesTable)
    .where(eq(branchesTable.isActive, true))
    .orderBy(asc(branchesTable.id))
    .limit(1);
  return b?.id ?? null;
}

/**
 * Sum every stock movement for the given products into a (product -> branch -> qty)
 * map, expressed in SMALL units. Inflows are positive, outflows negative. Documents
 * with no branch are attributed to the default branch (mirrors the legacy fallback).
 */
async function computeMovements(
  ids: number[],
  defId: number,
  executor: Executor,
): Promise<Acc> {
  const acc: Acc = new Map();
  const dLit = sql.raw(String(defId ?? 0));
  const br = (col: any) => sql<number>`coalesce(${col}, ${dLit})`;

  /* conversion factors (for damages big->small) */
  const prodRows = await executor
    .select({ id: productsTable.id, cf: productsTable.conversionFactor })
    .from(productsTable)
    .where(inArray(productsTable.id, ids));
  const cfOf = new Map(prodRows.map((p) => [p.id, p.cf ?? 1]));

  /* purchases (+) */
  const purch = await executor
    .select({
      productId: purchaseItemsTable.productId,
      branchId: br(purchasesTable.branchId),
      qty: sql<number>`coalesce(sum(${purchaseItemsTable.quantity}::numeric), 0)`,
    })
    .from(purchaseItemsTable)
    .innerJoin(purchasesTable, eq(purchasesTable.id, purchaseItemsTable.purchaseId))
    .where(inArray(purchaseItemsTable.productId, ids))
    .groupBy(purchaseItemsTable.productId, br(purchasesTable.branchId));
  for (const r of purch) add(acc, r.productId, Number(r.branchId), Number(r.qty));

  /* sales / POS (−) */
  const sold = await executor
    .select({
      productId: saleItemsTable.productId,
      branchId: br(salesTable.branchId),
      qty: sql<number>`coalesce(sum(${saleItemsTable.quantity}::numeric), 0)`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(salesTable.id, saleItemsTable.saleId))
    .where(inArray(saleItemsTable.productId, ids))
    .groupBy(saleItemsTable.productId, br(salesTable.branchId));
  for (const r of sold) add(acc, r.productId, Number(r.branchId), -Number(r.qty));

  /* supplier returns (−) */
  const sret = await executor
    .select({
      productId: supplierReturnItemsTable.productId,
      branchId: br(supplierReturnsTable.branchId),
      qty: sql<number>`coalesce(sum(${supplierReturnItemsTable.quantity}::numeric), 0)`,
    })
    .from(supplierReturnItemsTable)
    .innerJoin(supplierReturnsTable, eq(supplierReturnsTable.id, supplierReturnItemsTable.returnId))
    .where(inArray(supplierReturnItemsTable.productId, ids))
    .groupBy(supplierReturnItemsTable.productId, br(supplierReturnsTable.branchId));
  for (const r of sret) add(acc, r.productId, Number(r.branchId), -Number(r.qty));

  /* production produced (مفرد, +) */
  const produced = await executor
    .select({
      productId: productionItemsTable.productId,
      branchId: br(productionsTable.branchId),
      qty: sql<number>`coalesce(sum(${productionItemsTable.quantity}::numeric), 0)`,
    })
    .from(productionItemsTable)
    .innerJoin(productionsTable, eq(productionsTable.id, productionItemsTable.productionId))
    .where(inArray(productionItemsTable.productId, ids))
    .groupBy(productionItemsTable.productId, br(productionsTable.branchId));
  for (const r of produced) add(acc, r.productId, Number(r.branchId), Number(r.qty));

  /* production source (جملة, −) */
  const src = await executor
    .select({
      productId: productionsTable.sourceProductId,
      branchId: br(productionsTable.branchId),
      qty: sql<number>`coalesce(sum(${productionsTable.sourceQuantity}::numeric), 0)`,
    })
    .from(productionsTable)
    .where(inArray(productionsTable.sourceProductId, ids))
    .groupBy(productionsTable.sourceProductId, br(productionsTable.branchId));
  for (const r of src) add(acc, r.productId, Number(r.branchId), -Number(r.qty));

  /* damages (−) — converted to small units: qtyBig*cf + qtySmall */
  const dmg = await executor
    .select({
      productId: damagesTable.productId,
      branchId: br(damagesTable.branchId),
      big: sql<number>`coalesce(sum(${damagesTable.qtyBig}::numeric), 0)`,
      small: sql<number>`coalesce(sum(${damagesTable.qtySmall}::numeric), 0)`,
    })
    .from(damagesTable)
    .where(inArray(damagesTable.productId, ids))
    .groupBy(damagesTable.productId, br(damagesTable.branchId));
  for (const r of dmg) {
    if (r.productId == null) continue;
    const cf = cfOf.get(r.productId) ?? 1;
    const small = Number(r.big) * (cf || 1) + Number(r.small);
    add(acc, r.productId, Number(r.branchId), -small);
  }

  /* stock transfers: out from source branch (−), in to destination branch (+) */
  const tOut = await executor
    .select({
      productId: stockTransferItemsTable.productId,
      branchId: stockTransfersTable.fromBranchId,
      qty: sql<number>`coalesce(sum(${stockTransferItemsTable.quantity}::numeric), 0)`,
    })
    .from(stockTransferItemsTable)
    .innerJoin(stockTransfersTable, eq(stockTransfersTable.id, stockTransferItemsTable.transferId))
    .where(inArray(stockTransferItemsTable.productId, ids))
    .groupBy(stockTransferItemsTable.productId, stockTransfersTable.fromBranchId);
  for (const r of tOut) add(acc, r.productId, Number(r.branchId), -Number(r.qty));

  const tIn = await executor
    .select({
      productId: stockTransferItemsTable.productId,
      branchId: stockTransfersTable.toBranchId,
      qty: sql<number>`coalesce(sum(${stockTransferItemsTable.quantity}::numeric), 0)`,
    })
    .from(stockTransferItemsTable)
    .innerJoin(stockTransfersTable, eq(stockTransfersTable.id, stockTransferItemsTable.transferId))
    .where(inArray(stockTransferItemsTable.productId, ids))
    .groupBy(stockTransferItemsTable.productId, stockTransfersTable.toBranchId);
  for (const r of tIn) add(acc, r.productId, Number(r.branchId), Number(r.qty));

  /* manual inventory adjustments (±): correction adds the delta; others subtract |qty| */
  const adj = await executor
    .select({
      productId: inventoryAdjustmentsTable.productId,
      branchId: br(inventoryAdjustmentsTable.branchId),
      delta: sql<number>`coalesce(sum(case when ${inventoryAdjustmentsTable.adjustmentType} = 'correction' then ${inventoryAdjustmentsTable.quantityChange}::numeric else -abs(${inventoryAdjustmentsTable.quantityChange}::numeric) end), 0)`,
    })
    .from(inventoryAdjustmentsTable)
    .where(inArray(inventoryAdjustmentsTable.productId, ids))
    .groupBy(inventoryAdjustmentsTable.productId, br(inventoryAdjustmentsTable.branchId));
  for (const r of adj) add(acc, r.productId, Number(r.branchId), Number(r.delta));

  return acc;
}

/**
 * Recompute stock for the given products from scratch as a DERIVED value:
 *   per-branch quantity = opening_stock(branch) + Σ all document movements(branch)
 *   products.currentStock = Σ per-branch quantities.
 *
 * Movements are always expressed in SMALL units. This is the single source of truth
 * for stock — every document mutation calls this for the affected products so the
 * stored numbers always equal the formula and self-heal on any edit/delete.
 *
 * Pass a transaction as `executor` to keep the recompute atomic with the doc write.
 */
export async function recomputeProductStock(
  productIds: number[],
  executor: Executor = db,
): Promise<void> {
  const ids = Array.from(new Set(productIds.filter((x) => Number.isFinite(x))));
  if (ids.length === 0) return;

  const defId = await defaultBranchId(executor);
  if (defId == null) return; // no branches — nothing to track

  const movements = await computeMovements(ids, defId, executor);

  /* opening per (product, branch) + the set of branches that need a row */
  const opening: Acc = new Map();
  const branchSet = new Map<number, Set<number>>();
  const touch = (productId: number, branchId: number) => {
    let s = branchSet.get(productId);
    if (!s) { s = new Set(); branchSet.set(productId, s); }
    s.add(branchId);
  };

  const stockRows = await executor
    .select({
      productId: productStocksTable.productId,
      branchId: productStocksTable.branchId,
      openingStock: productStocksTable.openingStock,
    })
    .from(productStocksTable)
    .where(inArray(productStocksTable.productId, ids));
  for (const r of stockRows) { add(opening, r.productId, r.branchId, r.openingStock); touch(r.productId, r.branchId); }
  for (const [productId, m] of Array.from(movements.entries())) for (const branchId of Array.from(m.keys())) touch(productId, branchId);

  for (const productId of ids) {
    const branches = branchSet.get(productId);
    const op = opening.get(productId);
    const mv = movements.get(productId);
    let total = 0;

    if (branches) {
      for (const branchId of Array.from(branches)) {
        const qty = Math.round((op?.get(branchId) ?? 0) + (mv?.get(branchId) ?? 0));
        total += qty;
        await executor
          .insert(productStocksTable)
          .values({ productId, branchId, quantity: qty })
          .onConflictDoUpdate({
            target: [productStocksTable.productId, productStocksTable.branchId],
            set: { quantity: qty, updatedAt: sql`now()` },
          });
      }
    }

    await executor
      .update(productsTable)
      .set({ currentStock: total })
      .where(eq(productsTable.id, productId));
  }
}

/**
 * One-time / maintenance rebuild. Sets each branch's opening_stock so the recompute
 * reproduces the CURRENT stored quantity (opening = quantity − movements), preserving
 * today's numbers, then recomputes everything. Idempotent. Also seeds a default-branch
 * row for products that carry global stock but have no per-branch row yet.
 */
export async function rebuildOpeningStock(executor: Executor = db): Promise<{ products: number }> {
  const defId = await defaultBranchId(executor);
  if (defId == null) return { products: 0 };

  const products = await executor
    .select({ id: productsTable.id, currentStock: productsTable.currentStock })
    .from(productsTable);
  const allIds = products.map((p) => p.id);
  if (allIds.length === 0) return { products: 0 };

  /* Seed a default-branch row for products with global stock but no per-branch row,
   * so their stock survives the move to a per-branch model. */
  const existing = await executor
    .select({ productId: productStocksTable.productId })
    .from(productStocksTable);
  const hasRow = new Set(existing.map((r) => r.productId));
  for (const p of products) {
    if (!hasRow.has(p.id) && p.currentStock !== 0) {
      await executor
        .insert(productStocksTable)
        .values({ productId: p.id, branchId: defId, quantity: p.currentStock, openingStock: 0 })
        .onConflictDoNothing();
    }
  }

  /* opening = current quantity − movements, for every existing per-branch row. */
  const movements = await computeMovements(allIds, defId, executor);
  const rows = await executor
    .select({
      id: productStocksTable.id,
      productId: productStocksTable.productId,
      branchId: productStocksTable.branchId,
      quantity: productStocksTable.quantity,
    })
    .from(productStocksTable);
  for (const r of rows) {
    const mv = movements.get(r.productId)?.get(r.branchId) ?? 0;
    const opening = Math.round(r.quantity - mv);
    await executor
      .update(productStocksTable)
      .set({ openingStock: opening })
      .where(eq(productStocksTable.id, r.id));
  }

  await recomputeProductStock(allIds, executor);
  return { products: allIds.length };
}
