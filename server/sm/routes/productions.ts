import { Router } from "express";
import { db } from "../../db";
import {
  productionsTable,
  productionItemsTable,
  productsSmTable as productsTable,
  branchesTable,
  productStocksTable,
} from "@shared/schema";
import { eq, sql, max, and, inArray } from "drizzle-orm";
import { recomputeProductStock } from "../lib/recomputeStock";
import { recomputeProductCost } from "../lib/recomputeCost";
import { resolveReadBranch, resolveWriteBranch, ALL_BRANCHES_ROLES } from "../lib/branchWrite";

const router = Router();

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function branchNameMap() {
  const rows = await db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable);
  return new Map(rows.map(r => [r.id, r.name]));
}

function mapProduction(p: any, names: Map<number, string>) {
  return {
    id: p.id,
    productionNumber: p.productionNumber,
    branchId: p.branchId,
    branchName: names.get(p.branchId) ?? null,
    sourceProductId: p.sourceProductId,
    sourceProductName: p.sourceProductName ?? null,
    sourceProductNameAr: p.sourceProductNameAr ?? null,
    sourceQuantity: p.sourceQuantity != null ? parseFloat(String(p.sourceQuantity)) : 0,
    productionDate: p.productionDate ?? null,
    productionTime: p.productionTime ?? null,
    notes: p.notes ?? null,
    createdBy: p.createdBy ?? null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

/* ── Next production number ── */
router.get("/next-number", async (_req, res) => {
  const [row] = await db.select({ maxNum: max(productionsTable.productionNumber) }).from(productionsTable);
  res.json({ nextNumber: (row?.maxNum ?? 0) + 1 });
});

/* ── List all productions ── */
router.get("/", async (req, res) => {
  const { branchId } = req.query as { branchId?: string };
  const rows = await db
    .select({
      id: productionsTable.id,
      productionNumber: productionsTable.productionNumber,
      branchId: productionsTable.branchId,
      sourceProductId: productionsTable.sourceProductId,
      sourceProductName: productsTable.name,
      sourceProductNameAr: productsTable.nameAr,
      sourceQuantity: productionsTable.sourceQuantity,
      productionDate: productionsTable.productionDate,
      productionTime: productionsTable.productionTime,
      notes: productionsTable.notes,
      createdBy: productionsTable.createdBy,
      createdAt: productionsTable.createdAt,
    })
    .from(productionsTable)
    .leftJoin(productsTable, eq(productsTable.id, productionsTable.sourceProductId))
    .orderBy(sql`${productionsTable.createdAt} desc`);

  const names = await branchNameMap();
  let mapped = rows.map(p => mapProduction(p, names));
  const b = resolveReadBranch(req, branchId);
  if (b !== null) {
    mapped = mapped.filter(p => p.branchId === b);
  }
  res.json(mapped);
});

/* ── Single production with produced items ── */
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [production] = await db
    .select({
      id: productionsTable.id,
      productionNumber: productionsTable.productionNumber,
      branchId: productionsTable.branchId,
      sourceProductId: productionsTable.sourceProductId,
      sourceProductName: productsTable.name,
      sourceProductNameAr: productsTable.nameAr,
      sourceQuantity: productionsTable.sourceQuantity,
      productionDate: productionsTable.productionDate,
      productionTime: productionsTable.productionTime,
      notes: productionsTable.notes,
      createdBy: productionsTable.createdBy,
      createdAt: productionsTable.createdAt,
    })
    .from(productionsTable)
    .leftJoin(productsTable, eq(productsTable.id, productionsTable.sourceProductId))
    .where(eq(productionsTable.id, id));
  if (!production) return res.status(404).json({ error: "Not found" });

  const [source] = await db
    .select({ unit: productsTable.unit, barcode: productsTable.barcode })
    .from(productsTable)
    .where(eq(productsTable.id, production.sourceProductId));

  const items = await db
    .select({
      id: productionItemsTable.id,
      productId: productionItemsTable.productId,
      productName: productsTable.name,
      productNameAr: productsTable.nameAr,
      barcode: productsTable.barcode,
      unit: productsTable.unit,
      quantity: productionItemsTable.quantity,
    })
    .from(productionItemsTable)
    .leftJoin(productsTable, eq(productsTable.id, productionItemsTable.productId))
    .where(eq(productionItemsTable.productionId, id));

  const names = await branchNameMap();
  return res.json({
    ...mapProduction(production, names),
    sourceUnit: source?.unit ?? null,
    sourceBarcode: source?.barcode ?? null,
    items: items.map(i => ({ ...i, quantity: parseFloat(String(i.quantity)) })),
  });
});

/* ── Create production (convert one wholesale product into produced retail products) ── */
router.post("/", async (req, res) => {
  const { sourceProductId, sourceQuantity, productionDate, productionTime, notes, items } = req.body as {
    sourceProductId: number; sourceQuantity: number;
    productionDate?: string | null; productionTime?: string | null; notes?: string | null;
    items: { productId: number; quantity: number }[];
  };

  /* Resolve target branch (privileged users choose; others forced to own). */
  const branchRes = await resolveWriteBranch(req, req.body.branchId);
  if (!branchRes.ok) return res.status(branchRes.status).json({ error: branchRes.message });
  const branchId = branchRes.branchId;
  if (branchId == null) {
    return res.status(400).json({ error: "يجب تحديد الفرع" });
  }

  /* Validate source. */
  const srcQty = Number(sourceQuantity);
  if (sourceProductId == null) {
    return res.status(400).json({ error: "يجب اختيار المنتج المصدر (جملة)" });
  }
  if (!Number.isInteger(srcQty) || srcQty <= 0) {
    return res.status(400).json({ error: "يجب أن تكون كمية المصدر عدداً صحيحاً أكبر من صفر" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "يجب إضافة منتج منتَج واحد على الأقل" });
  }

  /* Merge duplicate produced lines and validate each quantity. */
  const merged = new Map<number, number>();
  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: "يجب أن تكون الكمية عدداً صحيحاً أكبر من صفر لكل منتج" });
    }
    if (item.productId === sourceProductId) {
      return res.status(400).json({ error: "لا يمكن أن يكون المنتج المنتَج هو نفسه المنتج المصدر" });
    }
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + qty);
  }
  const mergedItems = Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity }));
  const producedIds = mergedItems.map(i => i.productId);

  /* Validate product existence and types. "اثنين" products work as both
     wholesale and retail, so source accepts جملة|اثنين and produced accepts مفرد|اثنين. */
  const [sourceProduct] = await db
    .select({ id: productsTable.id, productType: productsTable.productType, name: productsTable.name })
    .from(productsTable)
    .where(eq(productsTable.id, sourceProductId));
  if (!sourceProduct) {
    return res.status(400).json({ error: "المنتج المصدر غير موجود" });
  }
  if (sourceProduct.productType !== "جملة" && sourceProduct.productType !== "اثنين") {
    return res.status(400).json({ error: "المنتج المصدر يجب أن يكون من نوع جملة أو اثنين" });
  }

  const producedProducts = await db
    .select({ id: productsTable.id, productType: productsTable.productType, name: productsTable.name })
    .from(productsTable)
    .where(inArray(productsTable.id, producedIds));
  const producedMap = new Map(producedProducts.map(p => [p.id, p]));
  for (const pid of producedIds) {
    const p = producedMap.get(pid);
    if (!p) return res.status(400).json({ error: "أحد المنتجات المنتَجة غير موجود" });
    if (p.productType !== "مفرد" && p.productType !== "اثنين") {
      return res.status(400).json({ error: `المنتج "${p.name}" يجب أن يكون من نوع مفرد أو اثنين` });
    }
  }

  const sessionUser = req.user!;

  try {
    const production = await db.transaction(async (tx) => {
      /* Lock the source per-branch stock row so concurrent conversions can't overdraw. */
      const [sourceStock] = await tx
        .select({ quantity: productStocksTable.quantity })
        .from(productStocksTable)
        .where(and(eq(productStocksTable.branchId, branchId), eq(productStocksTable.productId, sourceProductId)))
        .for("update");
      const available = sourceStock?.quantity ?? 0;
      if (srcQty > available) {
        throw new HttpError(400, `الكمية المطلوبة غير متوفرة في الفرع للمنتج "${sourceProduct.name}" (المتوفر: ${available})`);
      }

      const [numRow] = await tx.select({ maxNum: max(productionsTable.productionNumber) }).from(productionsTable);
      const productionNumber = (numRow?.maxNum ?? 0) + 1;

      const [created] = await tx.insert(productionsTable).values({
        productionNumber,
        branchId,
        sourceProductId,
        sourceQuantity: String(srcQty),
        productionDate: productionDate || null,
        productionTime: productionTime || null,
        notes: notes || null,
        createdBy: sessionUser.username || null,
      }).returning();

      /* Stock is derived: record the produced lines, then recompute. */
      for (const item of mergedItems) {
        await tx.insert(productionItemsTable).values({
          productionId: created.id,
          productId: item.productId,
          quantity: String(item.quantity),
        });
      }

      const touched = [sourceProductId, ...mergedItems.map((i) => i.productId)];
      await recomputeProductStock(touched, tx);
      await recomputeProductCost(touched, tx);

      return created;
    });

    const names = await branchNameMap();
    return res.status(201).json(mapProduction({ ...production, sourceProductName: sourceProduct.name }, names));
  } catch (err: any) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error("Create production error:", err);
    return res.status(500).json({ error: "حدث خطأ أثناء تنفيذ التحويل، يرجى المحاولة مرة أخرى" });
  }
});

/* ── Update production (reverse the OLD movement, then apply the NEW one) ──
   Mirrors create's validation/apply and delete's reversal, all in ONE
   transaction so stock can never be left half-adjusted. Keeps id + number. */
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { sourceProductId, sourceQuantity, productionDate, productionTime, notes, items } = req.body as {
    sourceProductId: number; sourceQuantity: number;
    productionDate?: string | null; productionTime?: string | null; notes?: string | null;
    items: { productId: number; quantity: number }[];
  };

  /* Resolve target branch (privileged users choose; others forced to own). */
  const branchRes = await resolveWriteBranch(req, req.body.branchId);
  if (!branchRes.ok) return res.status(branchRes.status).json({ error: branchRes.message });
  const branchId = branchRes.branchId;
  if (branchId == null) {
    return res.status(400).json({ error: "يجب تحديد الفرع" });
  }

  /* Validate source. */
  const srcQty = Number(sourceQuantity);
  if (sourceProductId == null) {
    return res.status(400).json({ error: "يجب اختيار المنتج المصدر (جملة)" });
  }
  if (!Number.isInteger(srcQty) || srcQty <= 0) {
    return res.status(400).json({ error: "يجب أن تكون كمية المصدر عدداً صحيحاً أكبر من صفر" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "يجب إضافة منتج منتَج واحد على الأقل" });
  }

  /* Merge duplicate produced lines and validate each quantity. */
  const merged = new Map<number, number>();
  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: "يجب أن تكون الكمية عدداً صحيحاً أكبر من صفر لكل منتج" });
    }
    if (item.productId === sourceProductId) {
      return res.status(400).json({ error: "لا يمكن أن يكون المنتج المنتَج هو نفسه المنتج المصدر" });
    }
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + qty);
  }
  const mergedItems = Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity }));
  const producedIds = mergedItems.map(i => i.productId);

  /* Validate product existence and types (same rules as create). */
  const [sourceProduct] = await db
    .select({ id: productsTable.id, productType: productsTable.productType, name: productsTable.name })
    .from(productsTable)
    .where(eq(productsTable.id, sourceProductId));
  if (!sourceProduct) {
    return res.status(400).json({ error: "المنتج المصدر غير موجود" });
  }
  if (sourceProduct.productType !== "جملة" && sourceProduct.productType !== "اثنين") {
    return res.status(400).json({ error: "المنتج المصدر يجب أن يكون من نوع جملة أو اثنين" });
  }

  const producedProducts = await db
    .select({ id: productsTable.id, productType: productsTable.productType, name: productsTable.name })
    .from(productsTable)
    .where(inArray(productsTable.id, producedIds));
  const producedMap = new Map(producedProducts.map(p => [p.id, p]));
  for (const pid of producedIds) {
    const p = producedMap.get(pid);
    if (!p) return res.status(400).json({ error: "أحد المنتجات المنتَجة غير موجود" });
    if (p.productType !== "مفرد" && p.productType !== "اثنين") {
      return res.status(400).json({ error: `المنتج "${p.name}" يجب أن يكون من نوع مفرد أو اثنين` });
    }
  }

  try {
    const updated = await db.transaction(async (tx) => {
      /* Lock the production row first so concurrent PUT/DELETE on the same record serialize. */
      const [existing] = await tx.select().from(productionsTable).where(eq(productionsTable.id, id)).for("update");
      if (!existing) throw new HttpError(404, "عملية التحويل غير موجودة");

      /* Authorize against the production's CURRENT branch: non-privileged users
         may only edit a conversion that belongs to their own branch. */
      const user = req.user!;
      if (!ALL_BRANCHES_ROLES.has(user.role ?? "") && existing.branchId !== (user.branchId ?? null)) {
        throw new HttpError(403, "لا تملك صلاحية تعديل تحويل فرع آخر");
      }

      const oldItems = await tx.select().from(productionItemsTable).where(eq(productionItemsTable.productionId, id));
      const oldSrcQty = parseFloat(String(existing.sourceQuantity));

      /* Availability for the NEW source. Stock is derived, so the per-branch quantity
         still reflects this production's OLD consumption; the recompute below reverses
         it, so add it back when the source product+branch is unchanged. */
      const [sourceStock] = await tx
        .select({ quantity: productStocksTable.quantity })
        .from(productStocksTable)
        .where(and(eq(productStocksTable.branchId, branchId), eq(productStocksTable.productId, sourceProductId)))
        .for("update");
      const sameSource = existing.sourceProductId === sourceProductId && existing.branchId === branchId;
      const available = (sourceStock?.quantity ?? 0) + (sameSource ? oldSrcQty : 0);
      if (srcQty > available) {
        throw new HttpError(400, `الكمية المطلوبة غير متوفرة في الفرع للمنتج "${sourceProduct.name}" (المتوفر: ${available})`);
      }

      /* Swap items + update the production row (keep id + productionNumber). */
      await tx.delete(productionItemsTable).where(eq(productionItemsTable.productionId, id));
      await tx.update(productionsTable).set({
        branchId,
        sourceProductId,
        sourceQuantity: String(srcQty),
        productionDate: productionDate || null,
        productionTime: productionTime || null,
        notes: notes || null,
      }).where(eq(productionsTable.id, id));
      for (const item of mergedItems) {
        await tx.insert(productionItemsTable).values({
          productionId: id,
          productId: item.productId,
          quantity: String(item.quantity),
        });
      }

      /* Stock is derived: recompute every product touched by the old + new movement. */
      const affected = new Set<number>([
        existing.sourceProductId, sourceProductId,
        ...oldItems.map((i: any) => i.productId),
        ...producedIds,
      ]);
      await recomputeProductStock(Array.from(affected), tx);
      await recomputeProductCost(Array.from(affected), tx);

      const [row] = await tx.select().from(productionsTable).where(eq(productionsTable.id, id));
      return row;
    });

    const names = await branchNameMap();
    return res.json(mapProduction({ ...updated, sourceProductName: sourceProduct.name }, names));
  } catch (err: any) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error("Update production error:", err);
    return res.status(500).json({ error: "حدث خطأ أثناء تعديل التحويل، يرجى المحاولة مرة أخرى" });
  }
});

/* ── Delete production (reverse the movement) ── */
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const found = await db.transaction(async (tx) => {
      /* Lock the production row so a concurrent PUT/DELETE on the same record can't double-reverse.
         (No per-record branch/role check here — kept in lockstep with stock-transfers DELETE by design.) */
      const [production] = await tx.select().from(productionsTable).where(eq(productionsTable.id, id)).for("update");
      if (!production) return false;

      const items = await tx.select().from(productionItemsTable).where(eq(productionItemsTable.productionId, id));

      await tx.delete(productionItemsTable).where(eq(productionItemsTable.productionId, id));
      await tx.delete(productionsTable).where(eq(productionsTable.id, id));

      /* Stock is derived: recompute after the conversion is removed. */
      const affected = new Set<number>([production.sourceProductId, ...items.map((i: any) => i.productId)]);
      await recomputeProductStock(Array.from(affected), tx);
      await recomputeProductCost(Array.from(affected), tx);
      return true;
    });

    if (!found) return res.status(404).json({ error: "Not found" });
    return res.status(204).end();
  } catch (err: any) {
    console.error("Delete production error:", err);
    return res.status(500).json({ error: "حدث خطأ أثناء حذف التحويل" });
  }
});

export default router;
