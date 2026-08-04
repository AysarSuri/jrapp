import type { Request } from "express";
import { db } from "../../db";
import { branchesTable } from "@shared/schema";
import { eq } from "drizzle-orm";

/* Roles allowed to create records for a branch other than their own.
   JR roles: 'admin' | 'user' | 'sales_rep'. We treat 'admin' (and legacy
   'supervisor') as privileged/all-branches for the SM features. */
export const ALL_BRANCHES_ROLES = new Set(["admin", "supervisor"]);

export type ResolvedBranch =
  | { ok: true; branchId: number | null; branchName: string | null }
  | { ok: false; status: number; message: string };

/**
 * Resolve the target branch for a write operation.
 * - Privileged roles (admin/supervisor) may target any active branch via the
 *   supplied branchId (validated against branchesTable).
 * - Everyone else is forced to their own session branch.
 */
export async function resolveWriteBranch(
  req: Request,
  bodyBranchId: unknown,
): Promise<ResolvedBranch> {
  const user = req.user!;
  let branchId: number | null = user.branchId ?? null;
  let branchName: string | null = user.branchName ?? null;

  const canChoose = ALL_BRANCHES_ROLES.has(user.role ?? "");
  if (canChoose && bodyBranchId != null) {
    const reqBranchId = Number(bodyBranchId);
    if (!Number.isInteger(reqBranchId)) {
      return { ok: false, status: 400, message: "معرّف الفرع غير صالح" };
    }
    const [b] = await db
      .select({ id: branchesTable.id, name: branchesTable.name, isActive: branchesTable.isActive })
      .from(branchesTable)
      .where(eq(branchesTable.id, reqBranchId));
    if (!b || !b.isActive) {
      return { ok: false, status: 400, message: "الفرع المحدد غير موجود أو غير مفعّل" };
    }
    branchId = b.id;
    branchName = b.name;
  }

  return { ok: true, branchId, branchName };
}

/**
 * Resolve the branch filter for a READ (list/aggregate) operation.
 * - Privileged roles: requested branchId or null (= all branches).
 * - Everyone else: forced to their own session branch (or -1 sentinel = no data).
 */
export function resolveReadBranch(req: Request, queryBranchId: unknown): number | null {
  const user = req.user!;
  const canChoose = ALL_BRANCHES_ROLES.has(user.role ?? "");
  if (canChoose) {
    if (queryBranchId == null || queryBranchId === "") return null;
    const n = Number(queryBranchId);
    return Number.isInteger(n) ? n : null;
  }
  return user.branchId ?? -1;
}
