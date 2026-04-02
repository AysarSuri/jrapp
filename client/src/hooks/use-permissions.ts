import { useUser } from "./use-auth";
import {
  hasFormAction,
  canEditRecord,
  getEditDays,
  hasRoutePermission,
  type DetailedPermissions,
  type DetailedFormPermissions,
} from "@/lib/permissions";

export function usePermissions() {
  const { data: user } = useUser();

  const role = user?.role || "user";
  const permissions = (user as any)?.permissions || [];
  const detailedPerms: DetailedPermissions =
    (user as any)?.detailedPermissions || {};

  return {
    role,
    permissions,
    detailedPermissions: detailedPerms,

    hasRouteAccess(route: string): boolean {
      return hasRoutePermission(role, permissions, route, detailedPerms);
    },

    canCreate(route: string): boolean {
      return hasFormAction(role, detailedPerms, route, "create");
    },

    canEdit(route: string): boolean {
      return hasFormAction(role, detailedPerms, route, "edit");
    },

    canDelete(route: string): boolean {
      return hasFormAction(role, detailedPerms, route, "delete");
    },

    canViewHistory(route: string): boolean {
      return hasFormAction(role, detailedPerms, route, "viewHistory");
    },

    canPrint(route: string): boolean {
      return hasFormAction(role, detailedPerms, route, "print");
    },

    canEditRecord(route: string, recordDate: string | Date): boolean {
      return canEditRecord(role, detailedPerms, route, recordDate);
    },

    getEditDays(route: string): number {
      return getEditDays(role, detailedPerms, route);
    },
  };
}
