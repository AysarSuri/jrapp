import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, canSeeAllBranches } from "@/sm/contexts/AuthContext";

export type Branch = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  notes: string | null;
  isActive: boolean;
  isUsed?: boolean;
  headerImage: string | null;
  qrImage: string | null;
  storeName: string | null;
  storeLogo: string | null;
  color: string | null;
  createdAt: string | null;
};

type BranchContextValue = {
  branches: Branch[];
  activeBranches: Branch[];
  selectedBranchId: number | null;
  selectedBranch: Branch | null;
  setSelectedBranchId: (id: number | null) => void;
  isLoading: boolean;
  /** True when the user is locked to their branch and cannot switch */
  isBranchLocked: boolean;
};

const BranchContext = createContext<BranchContextValue>({
  branches: [],
  activeBranches: [],
  selectedBranchId: null,
  selectedBranch: null,
  setSelectedBranchId: () => {},
  isLoading: false,
  isBranchLocked: false,
});

const STORAGE_KEY = "selectedBranchId";

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  /* Any non-global user (not admin/supervisor) is locked to their own branch —
     they can never switch or see other branches, even if no branch is assigned
     yet (in which case an admin must assign one). */
  const isLocked = !!user && !canSeeAllBranches(user.role);

  const [selectedBranchId, setSelectedBranchIdState] = useState<number | null>(() => {
    /* Non-global users are pinned to their own branch — never read a (possibly
       stale) branch left in localStorage by a previous privileged session. */
    if (user && !canSeeAllBranches(user.role)) {
      return user.branchId ?? null;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored) : null;
  });

  /* When the logged-in user changes (login / logout), recalculate the branch */
  useEffect(() => {
    if (!user) {
      setSelectedBranchIdState(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (!canSeeAllBranches(user.role)) {
      /* Non-admin: force their assigned branch (or null if no branch assigned) */
      const forced = user.branchId ?? null;
      setSelectedBranchIdState(forced);
      if (forced !== null) {
        localStorage.setItem(STORAGE_KEY, String(forced));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      /* Admin / Supervisor: restore from storage */
      const stored = localStorage.getItem(STORAGE_KEY);
      setSelectedBranchIdState(stored ? parseInt(stored) : null);
    }
  }, [user?.id, user?.role, user?.branchId]);

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: () => fetch("/api/branches").then(r => r.json()),
    staleTime: 30_000,
    enabled: !!user,
  });

  const activeBranches = branches.filter(b => b.isActive);

  function setSelectedBranchId(id: number | null) {
    if (isLocked) return;
    setSelectedBranchIdState(id);
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  }

  const selectedBranch = selectedBranchId !== null
    ? branches.find(b => b.id === selectedBranchId) ?? null
    : null;

  return (
    <BranchContext.Provider value={{
      branches,
      activeBranches,
      selectedBranchId,
      selectedBranch,
      setSelectedBranchId,
      isLoading,
      isBranchLocked: isLocked,
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
