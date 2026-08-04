import { Router } from "express";
import { db } from "../../db";
import { branchesTable } from "@shared/schema";
import { eq, sql, and, ne } from "drizzle-orm";
import { requireAuth } from "../lib/smAuth";

const router = Router();

function mapBranch(b: typeof branchesTable.$inferSelect, isUsed = false) {
  return {
    id: b.id,
    name: b.name,
    address: b.address ?? null,
    phone: b.phone ?? null,
    mobile: b.mobile ?? null,
    notes: b.notes ?? null,
    isActive: b.isActive,
    isUsed,
    headerImage: b.headerImage ?? null,
    qrImage: b.qrImage ?? null,
    storeName: b.storeName ?? null,
    storeLogo: b.storeLogo ?? null,
    color: b.color ?? "teal",
    quickKeys: (b.quickKeys ?? {}) as Record<string, (number | null)[]>,
    createdAt: b.createdAt?.toISOString() ?? null,
  };
}

function mapBranchLight(b: typeof branchesTable.$inferSelect, isUsed = false) {
  return {
    id: b.id,
    name: b.name,
    address: b.address ?? null,
    phone: b.phone ?? null,
    mobile: b.mobile ?? null,
    notes: b.notes ?? null,
    isActive: b.isActive,
    isUsed,
    storeName: b.storeName ?? null,
    color: b.color ?? "teal",
    quickKeys: (b.quickKeys ?? {}) as Record<string, (number | null)[]>,
    createdAt: b.createdAt?.toISOString() ?? null,
  };
}

async function getUsedBranchIdSet(): Promise<Set<number>> {
  const set = new Set<number>();
  const tables: Array<{ tbl: string; col: string }> = [
    { tbl: "sales",                col: "branch_id" },
    { tbl: "purchases",            col: "branch_id" },
    { tbl: "supplier_returns",     col: "branch_id" },
    { tbl: "supplier_payments",    col: "branch_id" },
    { tbl: "expenses",             col: "branch_id" },
    { tbl: "owner_withdrawals",    col: "branch_id" },
    { tbl: "owner_returns",        col: "branch_id" },
    { tbl: "customer_transactions",col: "branch_id" },
    { tbl: "damages",              col: "branch_id" },
    { tbl: "shifts",               col: "branch_id" },
    { tbl: "productions",          col: "branch_id" },
    { tbl: "stock_transfers",      col: "from_branch_id" },
    { tbl: "stock_transfers",      col: "to_branch_id" },
    { tbl: "orders",               col: "branch_id" },
  ];
  for (const { tbl, col } of tables) {
    try {
      const r = await db.execute(
        sql.raw(`SELECT DISTINCT ${col} AS id FROM ${tbl} WHERE ${col} IS NOT NULL`)
      );
      for (const row of r.rows as any[]) {
        const id = Number(row.id);
        if (Number.isFinite(id)) set.add(id);
      }
    } catch {
      /* table may not exist in this environment — skip it */
    }
  }
  return set;
}

router.get("/", async (_req, res) => {
  const rows = await db.select().from(branchesTable).orderBy(branchesTable.id);
  const usedSet = await getUsedBranchIdSet();
  res.json(rows.map(b => mapBranch(b, usedSet.has(b.id))));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [row] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));
  if (!row) return res.status(404).json({ error: "Not found" });
  const usedSet = await getUsedBranchIdSet();
  res.json(mapBranch(row, usedSet.has(id)));
});

router.post("/", requireAuth, async (req, res) => {
  const { name, address, phone, mobile, notes, isActive, headerImage, qrImage, storeName, storeLogo, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "اسم الفرع مطلوب" });
  const [dup] = await db.select({ id: branchesTable.id }).from(branchesTable)
    .where(eq(sql`LOWER(TRIM(${branchesTable.name}))`, name.trim().toLowerCase()));
  if (dup) return res.status(400).json({ error: "يوجد فرع بهذا الاسم مسبقاً" });
  const [created] = await db.insert(branchesTable).values({
    name,
    address: address || null,
    phone: phone || null,
    mobile: mobile || null,
    notes: notes || null,
    isActive: isActive !== false,
    headerImage: headerImage || null,
    qrImage: qrImage || null,
    storeName: storeName || null,
    storeLogo: storeLogo || null,
    color: color || "teal",
  }).returning();
  res.status(201).json(mapBranchLight(created, false));
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const b = req.body ?? {};
    const set: Partial<typeof branchesTable.$inferInsert> = {};
    if ("name" in b) {
      if (!b.name?.trim()) return res.status(400).json({ error: "اسم الفرع مطلوب" });
      const [existing] = await db.select({ name: branchesTable.name })
        .from(branchesTable).where(eq(branchesTable.id, id));
      const nameActuallyChanged = !existing ||
        b.name.trim().toLowerCase() !== existing.name.trim().toLowerCase();
      if (nameActuallyChanged) {
        const usedSet = await getUsedBranchIdSet();
        if (usedSet.has(id)) return res.status(400).json({ error: "لا يمكن تغيير اسم فرع مستخدم في السجلات" });
        const [dup] = await db.select({ id: branchesTable.id }).from(branchesTable)
          .where(and(eq(sql`LOWER(TRIM(${branchesTable.name}))`, b.name.trim().toLowerCase()), ne(branchesTable.id, id)));
        if (dup) return res.status(400).json({ error: "يوجد فرع بهذا الاسم مسبقاً" });
      }
      set.name = b.name;
    }
    if ("address" in b) set.address = b.address || null;
    if ("phone" in b) set.phone = b.phone || null;
    if ("mobile" in b) set.mobile = b.mobile || null;
    if ("notes" in b) set.notes = b.notes || null;
    if ("isActive" in b) set.isActive = b.isActive !== false;
    if ("headerImage" in b) set.headerImage = b.headerImage || null;
    if ("qrImage" in b) set.qrImage = b.qrImage || null;
    if ("storeName" in b) set.storeName = b.storeName || null;
    if ("storeLogo" in b) set.storeLogo = b.storeLogo || null;
    if ("color" in b) set.color = b.color || "teal";

    if (Object.keys(set).length === 0) {
      const [existing] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const usedSet = await getUsedBranchIdSet();
      return res.json(mapBranchLight(existing, usedSet.has(id)));
    }

    const [updated] = await db.update(branchesTable).set(set).where(eq(branchesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    const usedSetAfter = await getUsedBranchIdSet();
    res.json(mapBranchLight(updated, usedSetAfter.has(id)));
  } catch (err: any) {
    console.error("PUT /branches/:id error:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.put("/:id/quick-keys", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  const raw = req.body?.quickKeys ?? req.body ?? {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return res.status(400).json({ error: "quickKeys must be an object" });
  }
  const clean: Record<string, (number | null)[]> = {};
  for (const k of Object.keys(raw)) {
    const catId = Number(k);
    if (!Number.isFinite(catId)) continue;
    const slots = raw[k];
    if (!Array.isArray(slots)) continue;
    clean[String(catId)] = slots.slice(0, 50).map((v: any) =>
      v == null ? null : (Number.isFinite(Number(v)) ? Number(v) : null)
    );
  }
  if (req.query.ifEmpty === "1") {
    const [existing] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    const cur = (existing.quickKeys ?? {}) as Record<string, unknown>;
    if (cur && Object.keys(cur).length > 0) return res.json(mapBranch(existing));
  }
  const [updated] = await db.update(branchesTable)
    .set({ quickKeys: clean })
    .where(eq(branchesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(mapBranch(updated));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const usedSet = await getUsedBranchIdSet();
  if (usedSet.has(id)) return res.status(400).json({ error: "لا يمكن حذف فرع مستخدم في السجلات، يمكنك إيقاف تفعيله بدلاً من ذلك" });
  await db.delete(branchesTable).where(eq(branchesTable.id, id));
  res.json({ success: true });
});

export default router;
