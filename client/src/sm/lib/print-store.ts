/* Branch-first store identity for printed / displayed documents.
   The store name, logo, mobile and address shown on receipts, reports and
   UI headers must come from the currently selected BRANCH (branches form),
   falling back per-field to the global settings value only to avoid blanks.
   NOTE: supplier-related documents (purchases, supplier statements/…) must
   NOT use this helper — they keep the global settings identity. */

export interface StoreIdentity {
  name: string;
  logo: string;
  phone: string;
  address: string;
}

type BranchLike =
  | {
      storeName?: string | null;
      storeLogo?: string | null;
      mobile?: string | null;
      address?: string | null;
    }
  | null
  | undefined;

const s = (v?: string | null): string => (typeof v === "string" ? v.trim() : "");

/** Resolve the store identity for a printed/displayed document.
 *  Each field prefers the selected branch's value and falls back to the
 *  supplied settings-derived value when the branch field is empty. */
export function resolveStoreIdentity(
  branch: BranchLike,
  fallback: Partial<StoreIdentity> = {},
): StoreIdentity {
  return {
    name: s(branch?.storeName) || fallback.name || "",
    logo: s(branch?.storeLogo) || fallback.logo || "",
    phone: s(branch?.mobile) || fallback.phone || "",
    address: s(branch?.address) || fallback.address || "",
  };
}
