import { createContext, useContext } from "react";
import type { PermAction } from "@/sm/lib/permissions";

type PermissionsContextValue = {
  can: (module: string, action: PermAction) => boolean;
  isFullAccess: boolean;
};

/** Ported supermarket views: permissions are fully open. */
const PermissionsContext = createContext<PermissionsContextValue>({
  can: () => true,
  isFullAccess: true,
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  return (
    <PermissionsContext.Provider value={{ can: () => true, isFullAccess: true }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
