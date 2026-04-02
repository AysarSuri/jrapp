export interface PermissionModule {
  key: string;
  labelKey: string;
  routes: string[];
}

export interface FormPermission {
  key: string;
  labelKey: string;
  route: string;
}

export interface DetailedFormPermissions {
  create?: boolean;
  edit?: boolean;
  editDays?: number;
  delete?: boolean;
  viewHistory?: boolean;
  print?: boolean;
}

export interface DetailedPermissions {
  [moduleKey: string]: {
    [formRoute: string]: DetailedFormPermissions;
  };
}

export const SUB_PERMISSION_ACTIONS = [
  { key: "create", labelKey: "Create" },
  { key: "edit", labelKey: "Edit" },
  { key: "delete", labelKey: "Delete" },
  { key: "viewHistory", labelKey: "View History" },
  { key: "print", labelKey: "Print" },
] as const;

export const MODULE_FORMS: Record<string, FormPermission[]> = {
  sales_management: [
    { key: "customers", labelKey: "Customers", route: "/customers" },
    { key: "sales_invoice_usd", labelKey: "Sales Invoice USD", route: "/sales-invoice-usd" },
    { key: "sales_invoice_iqd", labelKey: "Sales Invoice IQD", route: "/sales-invoice-iqd" },
    { key: "pos_usd", labelKey: "POS USD", route: "/sales-by-category" },
    { key: "pos_iqd", labelKey: "POS IQD", route: "/pos-iqd" },
    { key: "sales_return_usd", labelKey: "Sales Return USD", route: "/sales-return-usd" },
    { key: "sales_return_iqd", labelKey: "Sales Return IQD", route: "/sales-return-iqd" },
    { key: "customer_receipt_usd", labelKey: "Customer Receipt USD", route: "/customer-receipt-usd" },
    { key: "customer_receipt_iqd", labelKey: "Customer Receipt IQD", route: "/customer-receipt-iqd" },
    { key: "agent_payment_usd", labelKey: "Customer Payment USD", route: "/agent-payment-usd" },
    { key: "agent_payment_iqd", labelKey: "Customer Payment IQD", route: "/agent-payment-iqd" },
    { key: "agent_statement_usd", labelKey: "Customer Statement USD", route: "/agent-statement-usd" },
    { key: "agent_statement_iqd", labelKey: "Customer Statement IQD", route: "/agent-statement-iqd" },
    { key: "customer_debts", labelKey: "Customer Debts", route: "/customer-debts" },
  ],
  supplier_management: [
    { key: "suppliers", labelKey: "Suppliers", route: "/suppliers" },
    { key: "purchase_invoice_usd", labelKey: "Purchase Invoice USD", route: "/purchase-invoice-usd" },
    { key: "purchase_invoice_iqd", labelKey: "Purchase Invoice IQD", route: "/purchase-invoice-iqd" },
    { key: "purchase_return_usd", labelKey: "Purchase Return USD", route: "/purchase-return-usd" },
    { key: "purchase_return_iqd", labelKey: "Purchase Return IQD", route: "/purchase-return-iqd" },
    { key: "supplier_payments", labelKey: "Supplier Payments", route: "/supplier-payments" },
    { key: "supplier_adjustments", labelKey: "Supplier Adjustments", route: "/supplier-adjustments" },
    { key: "supplier_statement_usd", labelKey: "Supplier Statement USD", route: "/supplier-statement-usd" },
    { key: "supplier_statement_iqd", labelKey: "Supplier Statement IQD", route: "/supplier-statement-iqd" },
    { key: "supplier_debts", labelKey: "Supplier Debts", route: "/supplier-debts" },
    { key: "supplier_order_usd", labelKey: "Supplier Order USD", route: "/supplier-order-usd" },
    { key: "supplier_order_iqd", labelKey: "Supplier Order IQD", route: "/supplier-order-iqd" },
  ],
  agent_management: [
    { key: "agent_clients", labelKey: "Agent Clients", route: "/agent-clients" },
    { key: "agent_product_load", labelKey: "Agent Product Load", route: "/agent-product-load" },
    { key: "agent_gps", labelKey: "Agent GPS", route: "/agent-gps" },
    { key: "rep_statement", labelKey: "Rep Statement", route: "/rep-statement" },
  ],
  material_management: [
    { key: "products", labelKey: "Products", route: "/products" },
    { key: "units", labelKey: "Units", route: "/units" },
    { key: "categories", labelKey: "Categories", route: "/categories" },
  ],
  reports: [
    { key: "inventory_report", labelKey: "Inventory Report", route: "/inventory-report" },
    { key: "expiry_report", labelKey: "Expiry Report", route: "/expiry-report" },
    { key: "max_stock_report", labelKey: "Max Stock Report", route: "/max-stock-report" },
    { key: "profits_report", labelKey: "Profits Report", route: "/profits-report" },
    { key: "sales_discounts_gifts", labelKey: "Sales Discounts & Gifts Report", route: "/sales-discounts-gifts-report" },
    { key: "supplier_discounts_gifts", labelKey: "Supplier Discounts & Gifts Report", route: "/supplier-discounts-gifts-report" },
  ],
  bank_management: [
    { key: "banks", labelKey: "Banks", route: "/banks" },
    { key: "bank_receipts", labelKey: "Bank Receipts", route: "/bank-receipts" },
    { key: "bank_payments", labelKey: "Bank Payments", route: "/bank-payments" },
    { key: "bank_statement_usd", labelKey: "Bank Statement USD", route: "/bank-statement-usd" },
    { key: "bank_statement_iqd", labelKey: "Bank Statement IQD", route: "/bank-statement-iqd" },
  ],
  clearance_management: [
    { key: "customs_clearances", labelKey: "Customs Clearances", route: "/customs-clearances" },
    { key: "clearance_receipts", labelKey: "Clearance Receipts", route: "/clearance-receipts" },
    { key: "clearance_payments", labelKey: "Clearance Payments", route: "/clearance-payments" },
    { key: "clearance_purchase_invoices", labelKey: "Clearance Purchase Invoices", route: "/clearance-purchase-invoices" },
    { key: "clearance_statement_usd", labelKey: "Clearance Statement USD", route: "/clearance-statement-usd" },
    { key: "clearance_statement_iqd", labelKey: "Clearance Statement IQD", route: "/clearance-statement-iqd" },
  ],
  office_management: [
    { key: "transfer_offices", labelKey: "Transfer Offices", route: "/transfer-offices" },
    { key: "office_receipts", labelKey: "Office Receipts", route: "/office-receipts" },
    { key: "office_payments", labelKey: "Office Payments", route: "/office-payments" },
    { key: "office_statement_usd", labelKey: "Office Account Statement USD", route: "/office-statement-usd" },
    { key: "office_statement_iqd", labelKey: "Office Account Statement IQD", route: "/office-statement-iqd" },
  ],
  expense_management: [
    { key: "expense_types", labelKey: "Expense Types", route: "/expense-types" },
    { key: "expenses", labelKey: "Expenses", route: "/expenses" },
  ],
  external_debt_management: [
    { key: "external_debts", labelKey: "External Debts", route: "/external-debts" },
    { key: "external_debt_receipts", labelKey: "External Debt Receipts", route: "/external-debt-receipts" },
    { key: "external_debt_payments", labelKey: "External Debt Payments", route: "/external-debt-payments" },
    { key: "external_debt_statement_usd", labelKey: "External Debt Statement USD", route: "/external-debt-statement-usd" },
    { key: "external_debt_statement_iqd", labelKey: "External Debt Statement IQD", route: "/external-debt-statement-iqd" },
  ],
  owner_management: [
    { key: "owners", labelKey: "Owner Names", route: "/owners" },
    { key: "owner_withdrawals", labelKey: "Owner Withdrawals", route: "/owner-withdrawals" },
    { key: "owner_returns", labelKey: "Owner Returns", route: "/owner-returns" },
    { key: "owner_statement_usd", labelKey: "Owner Statement USD", route: "/owner-statement-usd" },
    { key: "owner_statement_iqd", labelKey: "Owner Statement IQD", route: "/owner-statement-iqd" },
  ],
  warehouse_management: [
    { key: "warehouses", labelKey: "Warehouses", route: "/warehouses" },
    { key: "warehouse_transfer", labelKey: "Warehouse Transfer", route: "/warehouse-transfer" },
  ],
  accounts: [
    { key: "accounts", labelKey: "Accounts", route: "/accounts" },
  ],
  currency_exchange: [
    { key: "currency_exchange", labelKey: "Currency Exchange", route: "/currency-exchange" },
  ],
  product_damage: [
    { key: "product_damage", labelKey: "Product Damage", route: "/product-damage" },
  ],
  barcode_print: [
    { key: "barcode_print", labelKey: "Barcode Print", route: "/barcode-print" },
  ],
  company_book: [
    { key: "company_book", labelKey: "Company Book", route: "/company-book" },
  ],
  company_profile: [
    { key: "company_profile", labelKey: "Company Profile", route: "/company-profile" },
  ],
  addresses: [
    { key: "addresses", labelKey: "Customer Addresses", route: "/addresses" },
    { key: "supplier_addresses", labelKey: "Supplier Addresses", route: "/supplier-addresses" },
  ],
};

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
      "/sales-by-category", "/pos-iqd",
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
    key: "company_book",
    labelKey: "Company Book Management",
    routes: ["/company-book"],
  },
  {
    key: "company_profile",
    labelKey: "Company Profile",
    routes: ["/company-profile"],
  },
  {
    key: "addresses",
    labelKey: "Addresses",
    routes: ["/addresses", "/supplier-addresses"],
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

export function getModuleForRoute(route: string): string | null {
  for (const mod of PERMISSION_MODULES) {
    if (mod.routes.includes(route)) {
      return mod.key;
    }
  }
  return null;
}

export function hasRoutePermission(role: string, permissions: string[] | null, route: string, detailedPerms?: DetailedPermissions | null): boolean {
  if (role === "admin") return true;
  if (route === "/auth") return true;

  const effectivePerms = getEffectivePermissions(role, permissions);

  const moduleKey = getModuleForRoute(route);
  if (!moduleKey) return true;

  if (!effectivePerms.includes(moduleKey)) return false;

  if (detailedPerms && detailedPerms[moduleKey]) {
    const modulePerms = detailedPerms[moduleKey];
    const formForRoute = Object.keys(modulePerms).find(formRoute => formRoute === route);
    if (formForRoute !== undefined) {
      return true;
    }
    const moduleForms = MODULE_FORMS[moduleKey];
    if (moduleForms) {
      const formDef = moduleForms.find(f => f.route === route);
      if (formDef && !(route in modulePerms)) {
        return false;
      }
    }
  }

  return true;
}

export function hasFormAction(
  role: string,
  detailedPerms: DetailedPermissions | null | undefined,
  route: string,
  action: keyof DetailedFormPermissions
): boolean {
  if (role === "admin") return true;

  if (!detailedPerms) return true;

  const moduleKey = getModuleForRoute(route);
  if (!moduleKey) return true;

  const modulePerms = detailedPerms[moduleKey];
  if (!modulePerms) return true;

  const formPerms = modulePerms[route];
  if (!formPerms) return true;

  if (action === "editDays") {
    return true;
  }

  return formPerms[action] !== false;
}

export function getEditDays(
  role: string,
  detailedPerms: DetailedPermissions | null | undefined,
  route: string
): number {
  if (role === "admin") return 0;

  if (!detailedPerms) return 0;

  const moduleKey = getModuleForRoute(route);
  if (!moduleKey) return 0;

  const modulePerms = detailedPerms[moduleKey];
  if (!modulePerms) return 0;

  const formPerms = modulePerms[route];
  if (!formPerms) return 0;

  return formPerms.editDays ?? 0;
}

export function canEditRecord(
  role: string,
  detailedPerms: DetailedPermissions | null | undefined,
  route: string,
  recordDate: string | Date
): boolean {
  if (role === "admin") return true;

  if (!hasFormAction(role, detailedPerms, route, "edit")) return false;

  const editDays = getEditDays(role, detailedPerms, route);
  if (editDays === 0) return true;

  const recordDateObj = typeof recordDate === "string" ? new Date(recordDate) : recordDate;
  const now = new Date();
  const diffMs = now.getTime() - recordDateObj.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays <= editDays;
}

export function getAssignableModules(): PermissionModule[] {
  return PERMISSION_MODULES.filter(m => m.key !== "user_management");
}
