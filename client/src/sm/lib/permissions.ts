export type PermAction =
  | 'view' | 'view_old'
  | 'create'
  | 'update' | 'update_1d' | 'update_2d' | 'update_old'
  | 'delete' | 'delete_1d' | 'delete_2d' | 'delete_old';

export type ModulePermissions = Partial<Record<PermAction, boolean>>;
export type UserPermissions = Record<string, ModulePermissions>;

export type PermModule = {
  key: string;
  label: string;
  labelKey: string;
  icon: string;
  actions: PermAction[];
};

export type PermGroup = {
  group: string;
  groupLabel: string;
  groupLabelKey: string;
  groupLabelEn: string;
  color: string;
  modules: PermModule[];
};

/* Shorthand action sets */
const A_VIEW:      PermAction[] = ['view'];
const A_VIEW_FULL: PermAction[] = ['view', 'view_old'];
const A_VIEW_CREATE: PermAction[] = ['view', 'view_old', 'create'];
const A_FULL: PermAction[] = [
  'view', 'view_old', 'create',
  'update', 'update_1d', 'update_2d', 'update_old',
  'delete', 'delete_1d', 'delete_2d', 'delete_old',
];
const A_SETTINGS: PermAction[] = ['view', 'update'];

export const PERM_GROUPS: PermGroup[] = [
  {
    group: 'sales',
    groupLabel: 'المبيعات والكاشير',
    groupLabelKey: 'perm.grp_sales',
    groupLabelEn: 'Sales & Cashier',
    color: 'bg-emerald-500',
    modules: [
      { key: 'pos',                   label: 'نقطة البيع (POS)',   labelKey: 'perm.mod_pos',                   icon: '🛒', actions: A_VIEW_CREATE },
      { key: 'sales',                 label: 'قوائم المبيعات',     labelKey: 'perm.mod_sales',                 icon: '🧾', actions: A_FULL },
      { key: 'shifts',                label: 'الشفتات',            labelKey: 'perm.mod_shifts',                icon: '🕐', actions: A_FULL },
      { key: 'cashier',               label: 'الكاشير',            labelKey: 'perm.mod_cashier',               icon: '💰', actions: A_VIEW },
      { key: 'card_cashier',          label: 'كاشير البطاقة',      labelKey: 'perm.mod_card_cashier',          icon: '💳', actions: A_VIEW },
      { key: 'sale_discounts_report', label: 'خصومات المبيعات',   labelKey: 'perm.mod_sale_discounts_report', icon: '🏷️', actions: A_VIEW },
    ],
  },
  {
    group: 'customers',
    groupLabel: 'العملاء',
    groupLabelKey: 'perm.grp_customers',
    groupLabelEn: 'Customers',
    color: 'bg-teal-500',
    modules: [
      { key: 'customers',             label: 'العملاء',           labelKey: 'perm.mod_customers',             icon: '👤', actions: A_FULL },
      { key: 'customer_transactions', label: 'معاملات العملاء',   labelKey: 'perm.mod_customer_transactions', icon: '💬', actions: A_FULL },
      { key: 'customer_debts',        label: 'ديون العملاء',      labelKey: 'perm.mod_customer_debts',        icon: '📋', actions: A_VIEW },
      { key: 'customer_statement',    label: 'كشف حساب العميل',   labelKey: 'perm.mod_customer_statement',    icon: '📄', actions: A_VIEW },
      { key: 'customer_appointments', label: 'كشف مواعيد',        labelKey: 'perm.mod_customer_appointments', icon: '🗓️', actions: A_VIEW_CREATE },
    ],
  },
  {
    group: 'inventory',
    groupLabel: 'المنتجات والمخزون',
    groupLabelKey: 'perm.grp_inventory',
    groupLabelEn: 'Products & Inventory',
    color: 'bg-blue-500',
    modules: [
      { key: 'products',               label: 'المنتجات',              labelKey: 'perm.mod_products',               icon: '📦', actions: A_FULL },
      { key: 'categories',             label: 'الأصناف',               labelKey: 'perm.mod_categories',             icon: '🏷️', actions: A_FULL },
      { key: 'units',                  label: 'الوحدات',               labelKey: 'perm.mod_units',                  icon: '📐', actions: A_FULL },
      { key: 'discounts',              label: 'خصومات المنتجات',       labelKey: 'perm.mod_discounts',              icon: '🎟️', actions: A_FULL },
      { key: 'inventory',              label: 'جرد المخزون',           labelKey: 'perm.mod_inventory',              icon: '🗂️', actions: A_FULL },
      { key: 'product_movement',       label: 'حركة المنتج',           labelKey: 'perm.mod_product_movement',       icon: '📊', actions: A_VIEW_FULL },
      { key: 'barcode_print',          label: 'طباعة الباركود',        labelKey: 'perm.mod_barcode_print',          icon: '🔖', actions: A_VIEW },
      { key: 'damages',                label: 'قوائم التلف',           labelKey: 'perm.mod_damages',                icon: '⚠️', actions: A_FULL },
      { key: 'stock_transfers',        label: 'نقل المخزون',           labelKey: 'perm.mod_stock_transfers',        icon: '🔄', actions: A_FULL },
      { key: 'productions',            label: 'تحويل وإنتاج',          labelKey: 'perm.mod_productions',            icon: '🏭', actions: A_FULL },
      { key: 'orders',                 label: 'الطلبيات',              labelKey: 'perm.mod_orders',                 icon: '📝', actions: A_FULL },
      { key: 'expiry_report',          label: 'تقرير انتهاء الصلاحية', labelKey: 'perm.mod_expiry_report',          icon: '⏰', actions: A_VIEW },
      { key: 'show_cost_price',        label: 'إظهار سعر التكلفة',     labelKey: 'perm.mod_show_cost_price',        icon: '🏷️', actions: A_VIEW },
      { key: 'show_sale_price',        label: 'إظهار سعر البيع',       labelKey: 'perm.mod_show_sale_price',        icon: '💲', actions: A_VIEW },
      { key: 'show_wholesale_price',   label: 'إظهار سعر الجملة',      labelKey: 'perm.mod_show_wholesale_price',   icon: '🏪', actions: A_VIEW },
    ],
  },
  {
    group: 'suppliers',
    groupLabel: 'الموردون والمشتريات',
    groupLabelKey: 'perm.grp_suppliers',
    groupLabelEn: 'Suppliers & Purchases',
    color: 'bg-purple-500',
    modules: [
      { key: 'suppliers',                 label: 'الموردون',              labelKey: 'perm.mod_suppliers',                 icon: '🚚', actions: A_FULL },
      { key: 'purchases',                 label: 'المشتريات',             labelKey: 'perm.mod_purchases',                 icon: '🛍️', actions: A_FULL },
      { key: 'supplier_returns',          label: 'مرتجع الموردين',        labelKey: 'perm.mod_supplier_returns',          icon: '↩️', actions: A_FULL },
      { key: 'supplier_payments',         label: 'دفعات الموردين',        labelKey: 'perm.mod_supplier_payments',         icon: '💳', actions: A_FULL },
      { key: 'supplier_debts',            label: 'ديون الموردين',         labelKey: 'perm.mod_supplier_debts',            icon: '📋', actions: A_VIEW },
      { key: 'supplier_statement',        label: 'كشف حساب المورد',       labelKey: 'perm.mod_supplier_statement',        icon: '📄', actions: A_VIEW },
      { key: 'branch_supplier_statement', label: 'كشف حساب حسب الفرع',   labelKey: 'perm.mod_branch_supplier_statement', icon: '🏬', actions: A_VIEW },
      { key: 'purchase_discounts_report', label: 'خصومات المشتريات',      labelKey: 'perm.mod_purchase_discounts_report', icon: '🏷️', actions: A_VIEW },
    ],
  },
  {
    group: 'expenses',
    groupLabel: 'المصروفات',
    groupLabelKey: 'perm.grp_expenses',
    groupLabelEn: 'Expenses',
    color: 'bg-amber-500',
    modules: [
      { key: 'expenses',      label: 'المصروفات',       labelKey: 'perm.mod_expenses',      icon: '💸', actions: A_FULL },
      { key: 'expense_types', label: 'أنواع المصروفات', labelKey: 'perm.mod_expense_types', icon: '🏷️', actions: A_FULL },
    ],
  },
  {
    group: 'finance',
    groupLabel: 'المالية',
    groupLabelKey: 'perm.grp_finance',
    groupLabelEn: 'Finance',
    color: 'bg-violet-500',
    modules: [
      { key: 'payment_cards',     label: 'بطاقات الدفع',    labelKey: 'perm.mod_payment_cards',     icon: '💳', actions: A_FULL },
      { key: 'card_statement',    label: 'كشف البطاقة',      labelKey: 'perm.mod_card_statement',    icon: '📊', actions: A_VIEW_FULL },
      { key: 'owner_withdrawals', label: 'سحوبات المالك',    labelKey: 'perm.mod_owner_withdrawals', icon: '📤', actions: A_FULL },
      { key: 'owner_returns',     label: 'إعادة المالك',     labelKey: 'perm.mod_owner_returns',     icon: '📥', actions: A_FULL },
      { key: 'capital',           label: 'رأس المال',        labelKey: 'perm.mod_capital',           icon: '🏦', actions: A_VIEW },
      { key: 'financial_reports', label: 'التقارير المالية', labelKey: 'perm.mod_financial_reports', icon: '📈', actions: A_VIEW },
    ],
  },
  {
    group: 'product_reports',
    groupLabel: 'تقارير المنتجات',
    groupLabelKey: 'perm.grp_product_reports',
    groupLabelEn: 'Product Reports',
    color: 'bg-indigo-500',
    modules: [
      { key: 'report_products_cost',      label: 'تقرير أسعار البيع والتكلفة', labelKey: 'perm.mod_report_products_cost',      icon: '📊', actions: A_VIEW },
      { key: 'report_products_units',     label: 'تقرير الأسعار والوحدات',     labelKey: 'perm.mod_report_products_units',     icon: '📋', actions: A_VIEW },
      { key: 'report_products_wholesale', label: 'تقرير أسعار الجملة',         labelKey: 'perm.mod_report_products_wholesale', icon: '📄', actions: A_VIEW },
      { key: 'report_products_retail',    label: 'تقرير أسعار البيع',          labelKey: 'perm.mod_report_products_retail',    icon: '🏷️', actions: A_VIEW },
    ],
  },
  {
    group: 'management',
    groupLabel: 'الإدارة',
    groupLabelKey: 'perm.grp_management',
    groupLabelEn: 'Management',
    color: 'bg-slate-500',
    modules: [
      { key: 'dashboard',                   label: 'لوحة التحكم',           labelKey: 'perm.mod_dashboard',                   icon: '📊', actions: A_VIEW },
      { key: 'reports',                     label: 'التقارير',              labelKey: 'perm.mod_reports',                     icon: '📈', actions: A_VIEW },
      { key: 'top_selling',                 label: 'الأكثر مبيعاً',         labelKey: 'perm.mod_top_selling',                 icon: '📈', actions: A_VIEW },
      { key: 'top_purchased',               label: 'الأكثر شراءً',          labelKey: 'perm.mod_top_purchased',               icon: '📈', actions: A_VIEW },
      { key: 'top_profitable_customers',    label: 'العملاء الأكثر ربحية',  labelKey: 'perm.mod_top_profitable_customers',    icon: '📈', actions: A_VIEW },
      { key: 'top_debt_customers',          label: 'العملاء الأكثر ديناً',  labelKey: 'perm.mod_top_debt_customers',          icon: '📈', actions: A_VIEW },
      { key: 'branch_daily_position',       label: 'الوضع اليومي للفرع',    labelKey: 'perm.mod_branch_daily_position',       icon: '📈', actions: A_VIEW },
      { key: 'profit_report',               label: 'كشف الأرباح',           labelKey: 'perm.mod_profit_report',               icon: '💹', actions: A_VIEW },
      { key: 'price_discounts_report',      label: 'تقرير خصومات الأسعار',  labelKey: 'perm.mod_price_discounts_report',      icon: '🏷️', actions: A_VIEW },
      { key: 'fraud_alerts',                label: 'تنبيهات الاحتيال',      labelKey: 'perm.mod_fraud_alerts',                icon: '🛡️', actions: A_VIEW },
      { key: 'login_logs',                  label: 'سجل تسجيل الدخول',      labelKey: 'perm.mod_login_logs',                  icon: '🔐', actions: A_VIEW },
      { key: 'branches',                    label: 'الفروع',                labelKey: 'perm.mod_branches',                    icon: '🏪', actions: A_FULL },
      { key: 'users',                       label: 'المستخدمون',            labelKey: 'perm.mod_users',                       icon: '👥', actions: A_FULL },
      { key: 'settings',                    label: 'الإعدادات',             labelKey: 'perm.mod_settings',                    icon: '⚙️', actions: A_SETTINGS },
      { key: 'backup',                      label: 'النسخ الاحتياطي',       labelKey: 'perm.mod_backup',                      icon: '💾', actions: A_VIEW },
      { key: 'reset',                       label: 'إعادة التعيين',         labelKey: 'perm.mod_reset',                       icon: '🔄', actions: A_VIEW },
    ],
  },
];

/* Maps each action to its i18n translation key */
export const ACTION_T_KEYS: Record<PermAction, string> = {
  view:       'user.perm_view',
  view_old:   'user.perm_view_old',
  create:     'user.perm_add',
  update:     'user.perm_edit_today',
  update_1d:  'user.perm_edit_1d',
  update_2d:  'user.perm_edit_2d',
  update_old: 'user.perm_edit_old',
  delete:     'user.perm_del_today',
  delete_1d:  'user.perm_del_1d',
  delete_2d:  'user.perm_del_2d',
  delete_old: 'user.perm_del_old',
};

export const ACTION_LABELS: Record<PermAction, string> = {
  view:       'عرض',
  view_old:   'ع.قديم',
  create:     'إضافة',
  update:     'تعديل',
  update_1d:  'ت.<يوم',
  update_2d:  'ت.يومين',
  update_old: 'ت.قديم',
  delete:     'حذف',
  delete_1d:  'ح.<يوم',
  delete_2d:  'ح.يومين',
  delete_old: 'ح.قديم',
};

export const ACTION_LABELS_FULL: Record<PermAction, string> = {
  view:       'عرض',
  view_old:   'عرض قديم',
  create:     'إضافة',
  update:     'تعديل اليوم',
  update_1d:  'تعديل أقل من يوم',
  update_2d:  'تعديل يومين',
  update_old: 'تعديل قديم',
  delete:     'حذف اليوم',
  delete_1d:  'حذف أقل من يوم',
  delete_2d:  'حذف يومين',
  delete_old: 'حذف قديم',
};

/* ── Default role permission templates ── */
const ALL_ON: ModulePermissions = {
  view: true, view_old: true, create: true,
  update: true, update_1d: true, update_2d: true, update_old: true,
  delete: true, delete_1d: true, delete_2d: true, delete_old: true,
};
const VIEW_ONLY: ModulePermissions = { view: true };
const VIEW_CREATE: ModulePermissions = { view: true, view_old: true, create: true };
const VIEW_CREATE_EDIT: ModulePermissions = {
  view: true, view_old: true, create: true,
  update: true, update_1d: false, update_2d: false, update_old: false,
};

export const DEFAULT_ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {},
  supervisor: {},
  manager: {
    pos: VIEW_CREATE, sales: ALL_ON, shifts: ALL_ON, cashier: VIEW_ONLY, card_cashier: VIEW_ONLY,
    sale_discounts_report: VIEW_ONLY,
    customers: ALL_ON, customer_transactions: ALL_ON, customer_debts: VIEW_ONLY, customer_statement: VIEW_ONLY, customer_appointments: VIEW_CREATE,
    products: ALL_ON, categories: ALL_ON, units: ALL_ON, discounts: ALL_ON,
    inventory: ALL_ON, product_movement: VIEW_ONLY, barcode_print: VIEW_ONLY,
    damages: ALL_ON, stock_transfers: ALL_ON, productions: ALL_ON, orders: ALL_ON, expiry_report: VIEW_ONLY,
    show_cost_price: VIEW_ONLY, show_sale_price: VIEW_ONLY, show_wholesale_price: VIEW_ONLY,
    suppliers: ALL_ON, purchases: ALL_ON, supplier_returns: VIEW_CREATE_EDIT,
    supplier_payments: VIEW_CREATE_EDIT, supplier_debts: VIEW_ONLY, supplier_statement: VIEW_ONLY,
    branch_supplier_statement: VIEW_ONLY,
    purchase_discounts_report: VIEW_ONLY,
    expenses: ALL_ON, expense_types: ALL_ON,
    payment_cards: VIEW_ONLY, card_statement: VIEW_ONLY,
    owner_withdrawals: VIEW_CREATE_EDIT, owner_returns: VIEW_CREATE_EDIT, capital: VIEW_ONLY,
    financial_reports: VIEW_ONLY,
    dashboard: VIEW_ONLY, reports: VIEW_ONLY, profit_report: VIEW_ONLY,
    top_selling: VIEW_ONLY, top_purchased: VIEW_ONLY,
    top_profitable_customers: VIEW_ONLY, top_debt_customers: VIEW_ONLY,
    branch_daily_position: VIEW_ONLY,
    price_discounts_report: VIEW_ONLY,
    fraud_alerts: VIEW_ONLY, login_logs: {},
    branches: VIEW_ONLY, users: VIEW_ONLY, settings: { view: true, update: false },
    backup: {}, reset: {},
  },
  cashier: {
    pos: VIEW_CREATE,
    sales: {
      view: true, view_old: false, create: true,
      update: true, update_1d: false, update_2d: false, update_old: false,
      delete: false, delete_1d: false, delete_2d: false, delete_old: false,
    },
    shifts: VIEW_CREATE_EDIT, cashier: VIEW_ONLY,
    products: VIEW_ONLY, categories: VIEW_ONLY, inventory: VIEW_ONLY, barcode_print: VIEW_ONLY,
    show_cost_price: {}, show_sale_price: VIEW_ONLY, show_wholesale_price: {},
    customers: VIEW_ONLY, customer_transactions: VIEW_CREATE, customer_appointments: VIEW_CREATE,
    expenses: VIEW_CREATE, dashboard: VIEW_ONLY,
    sale_discounts_report: {}, purchase_discounts_report: {}, expiry_report: {},
    profit_report: {}, financial_reports: {}, login_logs: {},
  },
  warehouse: {
    products: ALL_ON, categories: VIEW_ONLY, units: VIEW_ONLY,
    inventory: ALL_ON, product_movement: VIEW_ONLY, barcode_print: VIEW_ONLY,
    damages: VIEW_CREATE_EDIT, expiry_report: VIEW_ONLY,
    show_cost_price: VIEW_ONLY, show_sale_price: VIEW_ONLY, show_wholesale_price: VIEW_ONLY,
    purchases: VIEW_CREATE_EDIT, suppliers: VIEW_ONLY, supplier_returns: VIEW_ONLY,
    stock_transfers: VIEW_CREATE_EDIT, productions: VIEW_CREATE_EDIT, orders: VIEW_CREATE_EDIT,
    dashboard: VIEW_ONLY,
    sale_discounts_report: {}, purchase_discounts_report: {},
    profit_report: {}, financial_reports: {}, login_logs: {},
  },
};

export function canCreateRecords(_role: string | null | undefined): boolean {
  return true;
}

export function hasPermission(
  role: string,
  permissions: UserPermissions | null | undefined,
  module: string,
  action: PermAction
): boolean {
  if (role === 'admin' || role === 'supervisor') return true;
  const perms = permissions && Object.keys(permissions).length > 0
    ? permissions
    : (DEFAULT_ROLE_PERMISSIONS[role] ?? {});
  const modulePerms = perms[module];
  if (modulePerms !== undefined && action in modulePerms) {
    return modulePerms[action] === true;
  }
  /* Backward-compat: new modules not in old saved permissions get role defaults */
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? {};
  return defaults[module]?.[action] === true;
}

export function buildEmptyPermissions(): UserPermissions {
  const result: UserPermissions = {};
  for (const group of PERM_GROUPS) {
    for (const mod of group.modules) {
      result[mod.key] = {};
      for (const action of mod.actions) {
        result[mod.key][action] = false;
      }
    }
  }
  return result;
}

export function getEffectivePermissions(
  role: string,
  permissions: UserPermissions | null | undefined
): UserPermissions {
  if (role === 'admin' || role === 'supervisor') return buildFullPermissions();
  if (permissions && Object.keys(permissions).length > 0) return permissions;
  return DEFAULT_ROLE_PERMISSIONS[role] ?? {};
}

export function buildFullPermissions(): UserPermissions {
  const result: UserPermissions = {};
  for (const group of PERM_GROUPS) {
    for (const mod of group.modules) {
      result[mod.key] = {};
      for (const action of mod.actions) {
        result[mod.key][action] = true;
      }
    }
  }
  return result;
}
