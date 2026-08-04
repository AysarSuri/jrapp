import { db } from "../../db";
import {
  productsSmTable as productsTable,
  productStocksTable,
  purchasesTable, purchaseItemsTable,
  supplierReturnsTable, supplierReturnItemsTable,
  productionsTable, productionItemsTable,
  branchesTable,
} from "@shared/schema";
import { eq, inArray, asc, sql } from "drizzle-orm";

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function defaultBranchId(executor: Executor): Promise<number | null> {
  const [b] = await executor
    .select({ id: branchesTable.id })
    .from(branchesTable)
    .where(eq(branchesTable.isActive, true))
    .orderBy(asc(branchesTable.id))
    .limit(1);
  return b?.id ?? null;
}

/* A purchase (in) / supplier-return (out) line, or a production (conversion) that
   consumes one source product and produces one or more — all in SMALL units. */
type FlowEv = {
  kind: "in" | "out";
  productId: number;
  qtySmall: number;
  pxSmall: number;
  ts: number; id: number; seq: number;
};
type ProdEv = {
  kind: "prod";
  sourceId: number;
  srcQtySmall: number;
  produced: { productId: number; qtySmall: number }[];
  ts: number; id: number; seq: number;
};
type Ev = FlowEv | ProdEv;

/* Productions couple products together (the produced cost depends on the source
   cost at conversion time, and conversions can chain A→B→C). Expand the requested
   ids to the full set of products linked by any production touching them, so the
   per-branch replay below has every cost it needs. */
async function expandProductionClosure(initial: number[], executor: Executor): Promise<number[]> {
  const set = new Set<number>(initial);
  let frontier = Array.from(set);
  while (frontier.length > 0) {
    const asSource = await executor
      .select({ produced: productionItemsTable.productId })
      .from(productionItemsTable)
      .innerJoin(productionsTable, eq(productionsTable.id, productionItemsTable.productionId))
      .where(inArray(productionsTable.sourceProductId, frontier));
    const asProduced = await executor
      .select({ source: productionsTable.sourceProductId })
      .from(productionItemsTable)
      .innerJoin(productionsTable, eq(productionsTable.id, productionItemsTable.productionId))
      .where(inArray(productionItemsTable.productId, frontier));

    const next: number[] = [];
    for (const r of asSource) if (r.produced != null && !set.has(r.produced)) { set.add(r.produced); next.push(r.produced); }
    for (const r of asProduced) if (r.source != null && !set.has(r.source)) { set.add(r.source); next.push(r.source); }
    frontier = next;
  }
  return Array.from(set);
}

/**
 * Recompute the DERIVED per-branch cost (product_stocks.cost_price) for the given
 * products. Cost is a weighted-average that diverges per branch: each branch replays
 * its OWN purchases (cost up), supplier-returns (cost down) and productions/conversions
 * chronologically, seeded from the product's base cost (products.purchasePrice) valued
 * against that branch's opening stock. All math is in SMALL units; the stored cost_price
 * is per BIG unit.
 *
 * Productions (تحويل وإنتاج) flow cost: the source is consumed at its current WAC (an
 * outflow that doesn't change the source's own cost), and that consumed value is spread
 * EQUALLY PER PRODUCED SMALL UNIT across the produced products (unitCost = totalSourceCost
 * / Σ produced qty), each produced line receiving it as an inflow that raises its WAC.
 * Because produced cost depends on the source, callers may pass only the touched products —
 * the closure expansion pulls in linked source/produced products (incl. chains).
 *
 * This is the single source of truth for cost — every purchase/return/production/product
 * mutation calls it so the stored number always equals the replay and self-heals on
 * edit/delete. products.purchasePrice stays the user-entered SEED (never written here) so
 * the replay never double-counts. The global "all branches" cost is a quantity-weighted
 * average of the per-branch cost_price, computed by readers (not stored).
 *
 * Pass a transaction as `executor` to keep the recompute atomic with the doc write.
 */
export async function recomputeProductCost(
  productIds: number[],
  executor: Executor = db,
): Promise<void> {
  const initial = Array.from(new Set(productIds.filter((x) => Number.isFinite(x))));
  if (initial.length === 0) return;

  const defId = await defaultBranchId(executor);
  if (defId == null) return;

  /* Linked-product closure so produced costs can read their source cost. */
  const ids = await expandProductionClosure(initial, executor);

  /* product seed cost (per big unit) + conversion factor */
  const prods = await executor
    .select({ id: productsTable.id, cf: productsTable.conversionFactor, seed: productsTable.purchasePrice })
    .from(productsTable)
    .where(inArray(productsTable.id, ids));
  const meta = new Map(prods.map((p) => [p.id, { cf: p.cf || 1, seedBig: parseFloat(p.seed) || 0 }]));

  /* opening balance per (product, branch) — small units */
  const stockRows = await executor
    .select({
      productId: productStocksTable.productId,
      branchId: productStocksTable.branchId,
      openingStock: productStocksTable.openingStock,
    })
    .from(productStocksTable)
    .where(inArray(productStocksTable.productId, ids));

  /* cost-affecting events: purchases (+) and supplier returns (−), small units */
  const purch = await executor
    .select({
      productId: purchaseItemsTable.productId,
      branchId: purchasesTable.branchId,
      qty: purchaseItemsTable.quantity,
      px: purchaseItemsTable.unitPrice,
      ts: sql<string>`coalesce(${purchasesTable.invoiceDate}, ${purchasesTable.createdAt})`,
      id: purchasesTable.id,
    })
    .from(purchaseItemsTable)
    .innerJoin(purchasesTable, eq(purchasesTable.id, purchaseItemsTable.purchaseId))
    .where(inArray(purchaseItemsTable.productId, ids));

  const rets = await executor
    .select({
      productId: supplierReturnItemsTable.productId,
      branchId: supplierReturnsTable.branchId,
      qty: supplierReturnItemsTable.quantity,
      px: supplierReturnItemsTable.unitPrice,
      ts: sql<string>`coalesce(${supplierReturnsTable.invoiceDate}, ${supplierReturnsTable.createdAt})`,
      id: supplierReturnsTable.id,
    })
    .from(supplierReturnItemsTable)
    .innerJoin(supplierReturnsTable, eq(supplierReturnsTable.id, supplierReturnItemsTable.returnId))
    .where(inArray(supplierReturnItemsTable.productId, ids));

  /* productions: source consumed (−) is spread to produced (+). The closure above
     guarantees any production whose produced line is in `ids` also has its source in
     `ids`, so filtering by source captures every relevant conversion. */
  const prodHeaders = await executor
    .select({
      id: productionsTable.id,
      branchId: productionsTable.branchId,
      sourceId: productionsTable.sourceProductId,
      srcQty: productionsTable.sourceQuantity,
      ts: sql<string>`coalesce(nullif(${productionsTable.productionDate}, '')::timestamp, ${productionsTable.createdAt})`,
    })
    .from(productionsTable)
    .where(inArray(productionsTable.sourceProductId, ids));
  const prodHeaderIds = prodHeaders.map((h) => h.id);
  const prodItems = prodHeaderIds.length
    ? await executor
        .select({
          productionId: productionItemsTable.productionId,
          productId: productionItemsTable.productId,
          qty: productionItemsTable.quantity,
        })
        .from(productionItemsTable)
        .where(inArray(productionItemsTable.productionId, prodHeaderIds))
    : [];
  const itemsByProd = new Map<number, { productId: number; qtySmall: number }[]>();
  for (const it of prodItems) {
    let arr = itemsByProd.get(it.productionId);
    if (!arr) { arr = []; itemsByProd.set(it.productionId, arr); }
    arr.push({ productId: it.productId, qtySmall: Number(it.qty) });
  }

  /* group events by branch + track which (branch, product) pairs need a cost row */
  const evByBranch = new Map<number, Ev[]>();
  const activeByBranch = new Map<number, Set<number>>();
  const pushEv = (branchId: number, ev: Ev) => {
    let arr = evByBranch.get(branchId);
    if (!arr) { arr = []; evByBranch.set(branchId, arr); }
    arr.push(ev);
  };
  const markActive = (branchId: number, productId: number) => {
    let s = activeByBranch.get(branchId);
    if (!s) { s = new Set(); activeByBranch.set(branchId, s); }
    s.add(productId);
  };

  let seq = 0;
  for (const r of purch) {
    const b = r.branchId ?? defId;
    pushEv(b, { kind: "in", productId: r.productId, qtySmall: Number(r.qty), pxSmall: Number(r.px), ts: new Date(r.ts).getTime(), id: r.id, seq: seq++ });
    markActive(b, r.productId);
  }
  for (const r of rets) {
    const b = r.branchId ?? defId;
    pushEv(b, { kind: "out", productId: r.productId, qtySmall: Number(r.qty), pxSmall: Number(r.px), ts: new Date(r.ts).getTime(), id: r.id, seq: seq++ });
    markActive(b, r.productId);
  }
  for (const h of prodHeaders) {
    const b = h.branchId ?? defId;
    const produced = itemsByProd.get(h.id) ?? [];
    pushEv(b, { kind: "prod", sourceId: h.sourceId, srcQtySmall: Number(h.srcQty), produced, ts: new Date(h.ts).getTime(), id: h.id, seq: seq++ });
    markActive(b, h.sourceId);
    for (const p of produced) markActive(b, p.productId);
  }

  /* opening per (product, branch) + every branch with opening needs a cost row */
  const openByProdBranch = new Map<number, Map<number, number>>();
  for (const r of stockRows) {
    let bm = openByProdBranch.get(r.productId);
    if (!bm) { bm = new Map(); openByProdBranch.set(r.productId, bm); }
    bm.set(r.branchId, r.openingStock);
    markActive(r.branchId, r.productId);
  }

  const seedSmallOf = (productId: number) => {
    const m = meta.get(productId);
    if (!m) return 0;
    return m.cf > 0 ? m.seedBig / m.cf : m.seedBig;
  };

  /* Replay each branch as ONE chronological timeline across all its products so a
     production can read the source's running cost at the moment of conversion. */
  for (const [branchId, active] of Array.from(activeByBranch.entries())) {
    const stock = new Map<number, number>();
    const costSmall = new Map<number, number>();
    for (const productId of Array.from(active)) {
      stock.set(productId, openByProdBranch.get(productId)?.get(branchId) ?? 0);
      costSmall.set(productId, seedSmallOf(productId));
    }

    const evs = (evByBranch.get(branchId) ?? [])
      .slice()
      .sort((a, b) =>
        a.ts !== b.ts ? a.ts - b.ts
        : rank(a) !== rank(b) ? rank(a) - rank(b)
        : a.id !== b.id ? a.id - b.id
        : a.seq - b.seq);

    for (const e of evs) {
      if (e.kind === "in") {
        applyInflow(stock, costSmall, e.productId, e.qtySmall, e.pxSmall);
      } else if (e.kind === "out") {
        const s = stock.get(e.productId) ?? 0;
        const c = costSmall.get(e.productId) ?? 0;
        const remaining = s - e.qtySmall;
        if (remaining > 0) {
          const wac = (s * c - e.qtySmall * e.pxSmall) / remaining;
          if (Number.isFinite(wac) && wac > 0) costSmall.set(e.productId, wac);
        }
        stock.set(e.productId, remaining);
      } else if (e.kind === "prod") {
        /* production: consume source at its WAC (no source WAC change), then spread
           the consumed value equally per produced small unit as inflows. */
        const srcCost = costSmall.get(e.sourceId) ?? 0;
        const srcStock = stock.get(e.sourceId) ?? 0;
        stock.set(e.sourceId, srcStock - e.srcQtySmall);
        const totalProduced = e.produced.reduce((sum: number, p: { productId: number; qtySmall: number }) => sum + p.qtySmall, 0);
        if (totalProduced > 0) {
          const unitCost = (e.srcQtySmall * srcCost) / totalProduced;
          for (const p of e.produced) applyInflow(stock, costSmall, p.productId, p.qtySmall, unitCost);
        }
      }
    }

    for (const productId of Array.from(active)) {
      const cf = meta.get(productId)?.cf ?? 1;
      const costBig = parseFloat(((costSmall.get(productId) ?? 0) * cf).toFixed(3));
      /* Upsert cost_price ONLY — never touch quantity/opening_stock (owned by recomputeProductStock). */
      await executor
        .insert(productStocksTable)
        .values({ productId, branchId, quantity: 0, costPrice: String(costBig) })
        .onConflictDoUpdate({
          target: [productStocksTable.productId, productStocksTable.branchId],
          set: { costPrice: String(costBig), updatedAt: sql`now()` },
        });
    }
  }
}

/* Purchases/returns settle before same-day productions so a source bought and
   converted on the same date is valued before it is consumed. */
function rank(e: Ev): number {
  return e.kind === "prod" ? 1 : 0;
}

/* Weighted-average inflow: blend existing stock@cost with incoming qty@price. */
function applyInflow(
  stock: Map<number, number>,
  costSmall: Map<number, number>,
  productId: number,
  qtySmall: number,
  pxSmall: number,
) {
  const s = stock.get(productId) ?? 0;
  const c = costSmall.get(productId) ?? 0;
  const total = s + qtySmall;
  const wac = total > 0 ? (s * c + qtySmall * pxSmall) / total : pxSmall;
  if (Number.isFinite(wac) && wac > 0) costSmall.set(productId, wac);
  stock.set(productId, total);
}
