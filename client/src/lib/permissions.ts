export interface PermissionModule {
  key: string;
  labelKey: string;
  routes: string[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: "dashboard",
    labelKey: "Dashboard",
    routes: ["/"],
  },
  {
    key: "sales_management",
    labelKey: "Sales Management",
    routes: [
      "/sales-management", "/customers",
      "/sales-invoice-usd", "/sales-invoice-iqd",
      "/sales-return-usd", "/sales-return-iqd",
      "/customer-receipt-usd", "/customer-receipt-iqd",
      "/agent-payment-usd", "/agent-payment-iqd",
      "/agent-statement-usd", "/agent-statement-iqd",
      "/customer-debts",
    ],
  },
  {
    key: "supplier_management",
    labelKey: "Supplier Management",
    routes: [
      "/supplier-management", "/suppliers",
      "/purchase-invoice-usd", "/purchase-invoice-iqd",
      "/purchase-return-usd", "/purchase-return-iqd",
      "/supplier-payments", "/supplier-adjustments",
      "/supplier-statement-usd", "/supplier-statement-iqd", "/supplier-statement",
      "/supplier-debts",
      "/supplier-order-usd", "/supplier-order-iqd",
    ],
  },
  {
    key: "agent_management",
    labelKey: "Agent Management",
    routes: [
      "/agent-management", "/agent-clients", "/agent-product-load", "/agent-gps",
      "/rep-statement",
    ],
  },
  {
    key: "material_management",
    labelKey: "Material Management",
    routes: [
      "/material-management", "/products", "/units", "/categories",
    ],
  },
  {
    key: "reports",
    labelKey: "Reports",
    routes: [
      "/inventory-report", "/expiry-report", "/max-stock-report", "/profits-report", "/sales-discounts-gifts-report", "/supplier-discounts-gifts-report",
    ],
  },
  {
    key: "bank_management",
    labelKey: "Bank Management",
    routes: [
      "/bank-management", "/banks", "/bank-receipts", "/bank-payments",
      "/bank-statement-usd", "/bank-statement-iqd",
    ],
  },
  {
    key: "clearance_management",
    labelKey: "Clearance Management",
    routes: [
      "/clearance-management", "/customs-clearances",
      "/clearance-receipts", "/clearance-payments",
      "/clearance-purchase-invoices",
      "/clearance-statement-usd", "/clearance-statement-iqd",
    ],
  },
  {
    key: "office_management",
    labelKey: "Office Management",
    routes: [
      "/office-management", "/transfer-offices",
      "/office-receipts", "/office-payments", "/office-statement-usd", "/office-statement-iqd",
    ],
  },
  {
    key: "expense_management",
    labelKey: "Expense Management",
    routes: [
      "/expense-management", "/expense-types", "/expenses",
    ],
  },
  {
    key: "external_debt_management",
    labelKey: "External Debt Management",
    routes: [
      "/external-debt-management", "/external-debts",
      "/external-debt-receipts", "/external-debt-payments",
      "/external-debt-statement-usd", "/external-debt-statement-iqd", "/external-debt-statement",
      "/external-debt-debts",
    ],
  },
  {
    key: "owner_management",
    labelKey: "Owner Management",
    routes: [
      "/owner-management", "/owners", "/owner-withdrawals", "/owner-returns",
      "/owner-statement-usd", "/owner-statement-iqd",
    ],
  },
  {
    key: "warehouse_management",
    labelKey: "Warehouse Management",
    routes: [
      "/warehouses", "/warehouse-transfer",
    ],
  },
  {
    key: "accounts",
    labelKey: "Accounts",
    routes: ["/accounts"],
  },
  {
    key: "currency_exchange",
    labelKey: "Currency Exchange",
    routes: ["/currency-exchange"],
  },
  {
    key: "product_damage",
    labelKey: "Product Damage",
    routes: ["/product-damage"],
  },
  {
    key: "barcode_print",
    labelKey: "Barcode Print",
    routes: ["/barcode-print"],
  },
  {
    key: "company_profile",
    labelKey: "Company Profile",
    routes: ["/company-profile"],
  },
  {
    key: "addresses",
    labelKey: "Addresses",
    routes: ["/addresses"],
  },
  {
    key: "user_management",
    labelKey: "User Management",
    routes: ["/user-management"],
  },
  {
    key: "data_reset",
    labelKey: "Data Reset",
    routes: ["/data-reset"],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_MODULES.map(m => m.key);

export const SALES_REP_PERMISSIONS = [
  "dashboard",
  "sales_management",
  "agent_management",
];

export function getDefaultPermissions(role: string): string[] {
  if (role === "admin") return ALL_PERMISSION_KEYS;
  if (role === "sales_rep") return SALES_REP_PERMISSIONS;
  return [];
}

export function getEffectivePermissions(role: string, permissions: string[] | null): string[] {
  if (role === "admin") return ALL_PERMISSION_KEYS;
  if (role === "sales_rep") return SALES_REP_PERMISSIONS;
  return permissions || [];
}

export function hasRoutePermission(role: string, permissions: string[] | null, route: string): boolean {
  if (role === "admin") return true;

  if (route === "/auth") return true;

  const effectivePerms = getEffectivePermissions(role, permissions);

  for (const mod of PERMISSION_MODULES) {
    if (mod.routes.includes(route)) {
      return effectivePerms.includes(mod.key);
    }
  }

  return true;
}

export function getAssignableModules(): PermissionModule[] {
  return PERMISSION_MODULES.filter(m => m.key !== "user_management");
}
