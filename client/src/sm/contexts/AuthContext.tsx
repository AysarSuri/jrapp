import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useUser } from "@/hooks/use-auth";

export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  branchId?: number | null;
  branchName?: string | null;
  permissions?: Record<string, Record<string, boolean>> | null;
  shiftPermission?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoggedIn: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Delegates authentication to JR's own auth (`useUser`).
 * The supermarket pages only READ `user` (role / branch visibility), so we
 * map JR's user into the shape they expect and treat the ported views as
 * having full branch visibility ("admin").
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: jrUser, refetch } = useUser();

  const user: AuthUser | null = jrUser
    ? {
        // JR ids are string UUIDs; the ported pages only use branchId for
        // filtering, so a numeric id is not required. Keep 0 as a placeholder.
        id: 0,
        username: (jrUser as any).username ?? "",
        fullName: (jrUser as any).fullName ?? "",
        // Force full branch visibility for the ported supermarket views.
        role: "admin",
        isActive: ((jrUser as any).isActive ?? 1) !== 0,
        branchId: null,
        branchName: null,
        permissions: null,
        shiftPermission: null,
      }
    : null;

  const login = useCallback(() => {
    /* Login is handled by JR's own auth flow — no-op here. */
  }, []);

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const logout = useCallback(() => {
    /* Logout is handled by JR's own auth flow — no-op here. */
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Roles that can see ALL branches and switch freely */
export const ALL_BRANCHES_ROLES = ["admin", "supervisor"];

export function canSeeAllBranches(role: string) {
  return ALL_BRANCHES_ROLES.includes(role);
}
