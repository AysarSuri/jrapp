import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  Menu,
  Moon,
  Sun,
  Globe,
  Bell,
  TrendingUp,
  Gift,
  X,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  IconDashboard,
  IconSales,
  IconSupplier,
  IconAgent,
  IconMaterial,
  IconBank,
  IconClearance,
  IconOffice,
  IconExpense,
  IconExternalDebt,
  IconOwner,
  IconWarehouse,
  IconDamage,
  IconBarcode,
  IconCurrencyExchange,
  IconSettings,
  IconUserManagement,
  IconDataReset,
  IconCompany,
  IconAccounts,
  IconAddress,
  IconCustomers,
  IconInvoiceUsd,
  IconInvoiceIqd,
  IconPosUsd,
  IconPosIqd,
  IconReturnUsd,
  IconReturnIqd,
  IconReceiptUsd,
  IconReceiptIqd,
  IconPaymentUsd,
  IconPaymentIqd,
  IconStatementUsd,
  IconStatementIqd,
  IconSupplierList,
  IconPurchaseUsd,
  IconPurchaseIqd,
  IconSupplierPayment,
  IconSupplierAdjust,
  IconSupplierDebt,
  IconSupplierOrderUsd,
  IconSupplierOrderIqd,
  IconCompanyBook,
  IconAuditLog,
  IconBackupRestore,
  IconBankReceipt,
  IconBankPayment,
  IconClearanceReceipt,
  IconClearancePayment,
  IconClearanceInvoice,
  IconOfficeReceipt,
  IconOfficePayment,
  IconExpenseType,
  IconExpenseEntry,
  IconDebtReceipt,
  IconDebtPayment,
  IconOwnerNames,
  IconOwnerWithdraw,
  IconOwnerReturn,
  IconAgentClients,
  IconAgentLoad,
  IconAgentGps,
  IconProduct,
  IconUnit,
  IconCategory,
  IconInventory,
  IconReport,
  IconExpiry,
  IconWarehouseTransfer,
} from "@/components/erp-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useLogout, useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { hasRoutePermission } from "@/lib/permissions";
import { useUnreadNotificationCount, useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import { useApproveSalesInvoice } from "@/hooks/use-sales-invoices";
import AgentSummaryBell from "@/components/agent-summary-bell";

interface LayoutShellProps {
  children: React.ReactNode;
}

type NavItem = { href: string; icon: any; label: string; color?: string };
type NavGroup = { type: 'group'; label: string; icon: any; color: string; children: NavItem[] };
type NavEntry = (NavItem & { color?: string }) | NavGroup;

const COLORS: Record<string, { bg: string; text: string }> = {
  blue:    { bg: "bg-blue-100 dark:bg-blue-900/40",    text: "text-blue-600 dark:text-blue-400" },
  green:   { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400" },
  red:     { bg: "bg-red-100 dark:bg-red-900/40",      text: "text-red-500 dark:text-red-400" },
  purple:  { bg: "bg-purple-100 dark:bg-purple-900/40",  text: "text-purple-600 dark:text-purple-400" },
  orange:  { bg: "bg-orange-100 dark:bg-orange-900/40",  text: "text-orange-500 dark:text-orange-400" },
  teal:    { bg: "bg-teal-100 dark:bg-teal-900/40",    text: "text-teal-600 dark:text-teal-400" },
  pink:    { bg: "bg-pink-100 dark:bg-pink-900/40",    text: "text-pink-500 dark:text-pink-400" },
  indigo:  { bg: "bg-indigo-100 dark:bg-indigo-900/40",  text: "text-indigo-600 dark:text-indigo-400" },
  amber:   { bg: "bg-amber-100 dark:bg-amber-900/40",   text: "text-amber-600 dark:text-amber-500" },
  cyan:    { bg: "bg-cyan-100 dark:bg-cyan-900/40",    text: "text-cyan-600 dark:text-cyan-400" },
  rose:    { bg: "bg-rose-100 dark:bg-rose-900/40",    text: "text-rose-500 dark:text-rose-400" },
  lime:    { bg: "bg-lime-100 dark:bg-lime-900/40",    text: "text-lime-600 dark:text-lime-500" },
  violet:  { bg: "bg-violet-100 dark:bg-violet-900/40",  text: "text-violet-600 dark:text-violet-400" },
  sky:     { bg: "bg-sky-100 dark:bg-sky-900/40",      text: "text-sky-600 dark:text-sky-400" },
  fuchsia: { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/40", text: "text-fuchsia-500 dark:text-fuchsia-400" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400" },
  slate:   { bg: "bg-slate-200 dark:bg-slate-700/40",   text: "text-slate-600 dark:text-slate-400" },
};

export function LayoutShell({ children }: LayoutShellProps) {
  const [location] = useLocation();
  const { t, i18n } = useTranslation();
  const { mutate: logout } = useLogout();
  const { data: user } = useUser();
  const { toast } = useToast();
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notificationsList } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: approveInvoice } = useApproveSalesInvoice();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [menuOpen, setMenuOpen] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
    const lng = i18n.language;
    const dir = (lng === 'en' || lng === 'tr') ? 'ltr' : 'rtl';
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
  }, []);

  useEffect(() => {
    const handleEnterAsTab = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === "textarea") return;
      if (tag === "button" || tag === "a" || target.getAttribute("role") === "button" || target.getAttribute("role") === "menuitem" || target.getAttribute("role") === "option") {
        e.preventDefault();
        return;
      }
      if (tag === "input" || tag === "select") {
        e.preventDefault();
        e.stopPropagation();
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"])'
          )
        ).filter(el => el.offsetParent !== null);
        const currentIndex = focusable.indexOf(target);
        if (currentIndex >= 0 && currentIndex < focusable.length - 1) {
          focusable[currentIndex + 1].focus();
        }
      }
    };
    window.addEventListener("keydown", handleEnterAsTab, true);
    return () => window.removeEventListener("keydown", handleEnterAsTab, true);
  }, []);

  const { data: companyProfile } = useQuery<{ name: string; logo: string | null; primaryColor?: string }>({
    queryKey: ["/api/company-profile"],
  });

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
    const dir = (lng === 'en' || lng === 'tr') ? 'ltr' : 'rtl';
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
  };

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast({ title: "Logged out successfully" });
        window.location.href = "/auth";
      },
    });
  };

  const isRtl = i18n.language === 'ar' || i18n.language === 'ckb';
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const salesNavItems: NavItem[] = [
    { href: "/customers", icon: IconCustomers, label: "Customers", color: "blue" },
    { href: "/sales-invoice-usd", icon: IconInvoiceUsd, label: "Sales Invoice USD", color: "green" },
    { href: "/sales-invoice-iqd", icon: IconInvoiceIqd, label: "Sales Invoice IQD", color: "teal" },
    { href: "/sales-by-category", icon: IconPosUsd, label: "POS USD", color: "purple" },
    { href: "/pos-iqd", icon: IconPosIqd, label: "POS IQD", color: "violet" },
    { href: "/sales-return-usd", icon: IconReturnUsd, label: "Sales Return USD", color: "orange" },
    { href: "/sales-return-iqd", icon: IconReturnIqd, label: "Sales Return IQD", color: "amber" },
    { href: "/customer-receipt-usd", icon: IconReceiptUsd, label: "Customer Receipt USD", color: "cyan" },
    { href: "/customer-receipt-iqd", icon: IconReceiptIqd, label: "Customer Receipt IQD", color: "sky" },
    { href: "/agent-payment-usd", icon: IconPaymentUsd, label: "Customer Payment USD", color: "pink" },
    { href: "/agent-payment-iqd", icon: IconPaymentIqd, label: "Customer Payment IQD", color: "rose" },
    { href: "/agent-statement-usd", icon: IconStatementUsd, label: "Agent Statement USD", color: "indigo" },
    { href: "/agent-statement-iqd", icon: IconStatementIqd, label: "Agent Statement IQD", color: "fuchsia" },
    { href: "/customer-debts", icon: IconDebtReceipt, label: "Customer Debts", color: "red" },
  ];

  const supplierNavItems: NavItem[] = [
    { href: "/suppliers", icon: IconSupplierList, label: "Suppliers", color: "purple" },
    { href: "/purchase-invoice-usd", icon: IconPurchaseUsd, label: "Purchase Invoice USD", color: "blue" },
    { href: "/purchase-invoice-iqd", icon: IconPurchaseIqd, label: "Purchase Invoice IQD", color: "cyan" },
    { href: "/purchase-return-usd", icon: IconReturnUsd, label: "Purchase Return USD", color: "orange" },
    { href: "/purchase-return-iqd", icon: IconReturnIqd, label: "Purchase Return IQD", color: "amber" },
    { href: "/supplier-payments", icon: IconSupplierPayment, label: "Supplier Payments", color: "green" },
    { href: "/supplier-adjustments", icon: IconSupplierAdjust, label: "Supplier Adjustments", color: "teal" },
    { href: "/supplier-statement-usd", icon: IconStatementUsd, label: "Supplier Statement USD", color: "indigo" },
    { href: "/supplier-statement-iqd", icon: IconStatementIqd, label: "Supplier Statement IQD", color: "violet" },
    { href: "/supplier-debts", icon: IconSupplierDebt, label: "Supplier Debts", color: "red" },
    { href: "/supplier-order-usd", icon: IconSupplierOrderUsd, label: "Supplier Order USD", color: "pink" },
    { href: "/supplier-order-iqd", icon: IconSupplierOrderIqd, label: "Supplier Order IQD", color: "rose" },
  ];

  const bankNavItems: NavItem[] = [
    { href: "/banks", icon: IconBank, label: "Banks", color: "emerald" },
    { href: "/bank-receipts", icon: IconBankReceipt, label: "Bank Receipts", color: "green" },
    { href: "/bank-payments", icon: IconBankPayment, label: "Bank Payments", color: "red" },
    { href: "/bank-statement-usd", icon: IconStatementUsd, label: "Bank Statement USD", color: "blue" },
    { href: "/bank-statement-iqd", icon: IconStatementIqd, label: "Bank Statement IQD", color: "indigo" },
  ];

  const clearanceNavItems: NavItem[] = [
    { href: "/customs-clearances", icon: IconClearance, label: "Customs Clearances", color: "teal" },
    { href: "/clearance-receipts", icon: IconClearanceReceipt, label: "Clearance Receipts", color: "green" },
    { href: "/clearance-payments", icon: IconClearancePayment, label: "Clearance Payments", color: "red" },
    { href: "/clearance-purchase-invoices", icon: IconClearanceInvoice, label: "Clearance Purchase Invoices", color: "blue" },
    { href: "/clearance-statement-usd", icon: IconStatementUsd, label: "Clearance Statement USD", color: "indigo" },
    { href: "/clearance-statement-iqd", icon: IconStatementIqd, label: "Clearance Statement IQD", color: "violet" },
  ];

  const officeNavItems: NavItem[] = [
    { href: "/transfer-offices", icon: IconOffice, label: "Transfer Offices", color: "orange" },
    { href: "/office-receipts", icon: IconOfficeReceipt, label: "Office Receipts", color: "green" },
    { href: "/office-payments", icon: IconOfficePayment, label: "Office Payments", color: "red" },
    { href: "/office-statement-usd", icon: IconStatementUsd, label: "Office Account Statement USD", color: "blue" },
    { href: "/office-statement-iqd", icon: IconStatementIqd, label: "Office Account Statement IQD", color: "indigo" },
  ];

  const expenseNavItems: NavItem[] = [
    { href: "/expense-types", icon: IconExpenseType, label: "Expense Types", color: "amber" },
    { href: "/expenses", icon: IconExpenseEntry, label: "Expenses", color: "orange" },
  ];

  const externalDebtNavItems: NavItem[] = [
    { href: "/external-debts", icon: IconExternalDebt, label: "External Debts", color: "red" },
    { href: "/external-debt-receipts", icon: IconDebtReceipt, label: "External Debt Receipts", color: "green" },
    { href: "/external-debt-payments", icon: IconDebtPayment, label: "External Debt Payments", color: "orange" },
    { href: "/external-debt-statement-usd", icon: IconStatementUsd, label: "External Debt Statement USD", color: "blue" },
    { href: "/external-debt-statement-iqd", icon: IconStatementIqd, label: "External Debt Statement IQD", color: "indigo" },
  ];

  const ownerNavItems: NavItem[] = [
    { href: "/owners", icon: IconOwnerNames, label: "Owner Names", color: "amber" },
    { href: "/owner-withdrawals", icon: IconOwnerWithdraw, label: "Owner Withdrawals", color: "red" },
    { href: "/owner-returns", icon: IconOwnerReturn, label: "Owner Returns", color: "green" },
    { href: "/owner-statement-usd", icon: IconStatementUsd, label: "Owner Statement USD", color: "blue" },
    { href: "/owner-statement-iqd", icon: IconStatementIqd, label: "Owner Statement IQD", color: "indigo" },
  ];

  const agentManagementNavItems: NavItem[] = [
    { href: "/agent-clients", icon: IconAgentClients, label: "Agent Clients", color: "purple" },
    { href: "/agent-product-load", icon: IconAgentLoad, label: "Agent Product Load", color: "blue" },
    { href: "/agent-gps", icon: IconAgentGps, label: "Agent GPS", color: "green" },
    { href: "/rep-statement", icon: IconStatementUsd, label: "Rep Statement", color: "indigo" },
  ];

  const materialNavItems: NavItem[] = [
    { href: "/products", icon: IconProduct, label: "Products", color: "blue" },
    { href: "/units", icon: IconUnit, label: "Units", color: "teal" },
    { href: "/categories", icon: IconCategory, label: "Categories", color: "green" },
    { href: "/product-damage", icon: IconDamage, label: "Product Damage", color: "orange" },
  ];

  const reportsNavItems: NavItem[] = [
    { href: "/inventory-report", icon: IconInventory, label: "Inventory Report", color: "blue" },
    { href: "/expiry-report", icon: IconExpiry, label: "Expiry Report", color: "red" },
    { href: "/max-stock-report", icon: IconReport, label: "Max Stock Report", color: "purple" },
    { href: "/profits-report", icon: TrendingUp, label: "Profits Report", color: "green" },
    { href: "/sales-discounts-gifts-report", icon: Gift, label: "Sales Discounts & Gifts Report", color: "pink" },
    { href: "/supplier-discounts-gifts-report", icon: Gift, label: "Supplier Discounts & Gifts Report", color: "orange" },
  ];

  const warehouseNavItems: NavItem[] = [
    { href: "/warehouses", icon: IconWarehouse, label: "Warehouses", color: "teal" },
    { href: "/warehouse-transfer", icon: IconWarehouseTransfer, label: "Warehouse Transfer", color: "blue" },
  ];

  const sidebarItems: NavEntry[] = [
    { href: "/", icon: IconDashboard, label: "Dashboard", color: "blue" },
    { type: 'group', label: "Sales Management", icon: IconSales, color: "green", children: salesNavItems },
    { type: 'group', label: "Supplier Management", icon: IconSupplier, color: "red", children: supplierNavItems },
    { type: 'group', label: "Agent Management", icon: IconAgent, color: "purple", children: agentManagementNavItems },
    { type: 'group', label: "Material Management", icon: IconMaterial, color: "teal", children: materialNavItems },
    { type: 'group', label: "Reports", icon: IconReport, color: "indigo", children: reportsNavItems },
    { type: 'group', label: "Bank Management", icon: IconBank, color: "emerald", children: bankNavItems },
    { type: 'group', label: "Clearance Management", icon: IconClearance, color: "cyan", children: clearanceNavItems },
    { type: 'group', label: "Office Management", icon: IconOffice, color: "orange", children: officeNavItems },
    { type: 'group', label: "Expense Management", icon: IconExpense, color: "amber", children: expenseNavItems },
    { type: 'group', label: "External Debt Management", icon: IconExternalDebt, color: "rose", children: externalDebtNavItems },
    { type: 'group', label: "Owner Management", icon: IconOwner, color: "violet", children: ownerNavItems },
    { href: "/addresses", icon: IconAddress, label: "Customer Addresses", color: "sky" },
    { href: "/supplier-addresses", icon: IconAddress, label: "Supplier Addresses", color: "cyan" },
    { type: 'group', label: "Warehouse Management", icon: IconWarehouse, color: "teal", children: warehouseNavItems },
    { href: "/barcode-print", icon: IconBarcode, label: "Barcode Print", color: "slate" },
    { href: "/company-book", icon: IconCompanyBook, label: "Company Book Management", color: "indigo" },
    { href: "/company-profile", icon: IconCompany, label: "Company Profile", color: "emerald" },
    { href: "/currency-exchange", icon: IconCurrencyExchange, label: "Currency Exchange", color: "green" },
    { href: "/accounts", icon: IconAccounts, label: "Accounts", color: "blue" },
    { href: "/audit-logs", icon: IconAuditLog, label: "Audit Logs", color: "red" },
    { href: "/backup-restore", icon: IconBackupRestore, label: "Backup & Restore", color: "purple" },
    { href: "/settings", icon: IconSettings, label: "Settings", color: "slate" },
    { href: "/user-management", icon: IconUserManagement, label: "User Management", color: "pink" },
    { href: "/data-reset", icon: IconDataReset, label: "Data Reset", color: "red" },
  ];

  const userRole = user?.role || "user";
  const userPermissions = (user as any)?.permissions || [];
  const userDetailedPerms = (user as any)?.detailedPermissions || null;

  const filteredSidebarItems = sidebarItems.reduce<NavEntry[]>((acc, entry) => {
    if ('type' in entry && entry.type === 'group') {
      const filteredChildren = entry.children.filter(child =>
        hasRoutePermission(userRole, userPermissions, child.href, userDetailedPerms)
      );
      if (filteredChildren.length > 0) {
        acc.push({ ...entry, children: filteredChildren });
      }
    } else {
      if (hasRoutePermission(userRole, userPermissions, (entry as NavItem).href, userDetailedPerms)) {
        acc.push(entry);
      }
    }
    return acc;
  }, []);

  const handleCardClick = (entry: NavEntry) => {
    if ('type' in entry && entry.type === 'group') {
      setActiveGroup(entry.label);
    } else {
      const item = entry as NavItem;
      navigate(item.href);
      setMenuOpen(false);
      setActiveGroup(null);
    }
  };

  const activeGroupData = activeGroup
    ? filteredSidebarItems.find(e => 'type' in e && e.type === 'group' && e.label === activeGroup) as NavGroup | undefined
    : null;

  const renderGridCard = (
    icon: any,
    label: string,
    colorName: string,
    onClick: () => void,
    isActive: boolean,
    testId: string,
  ) => {
    const c = COLORS[colorName] || COLORS.blue;
    const Icon = icon;
    return (
      <button
        key={label}
        onClick={onClick}
        data-testid={testId}
        className={`
          flex flex-col items-center justify-center gap-3.5 p-6 rounded-2xl transition-all duration-200 cursor-pointer min-h-[140px]
          ${isActive
            ? "bg-gray-200 dark:bg-white/10 shadow-sm ring-2 ring-offset-1 ring-blue-400/40"
            : "bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:shadow-md"
          }
        `}
      >
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${c.bg}`}>
          <Icon className={`w-8 h-8 ${c.text}`} />
        </div>
        <span className="text-[16px] font-semibold text-center text-foreground/80 leading-tight line-clamp-2 max-w-[130px]">
          {t(label)}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 h-14 border-b border-border/60 bg-background/90 backdrop-blur-xl px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setMenuOpen(true); setActiveGroup(null); }}
            data-testid="button-menu-toggle"
          >
            <Menu className="w-5 h-5" />
          </Button>
          {!menuOpen && (
            <Button
              variant="outline"
              onClick={() => { setMenuOpen(true); setActiveGroup(null); }}
              className="gap-2.5 h-10 px-5 text-[14px] font-bold rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary/50 text-primary shadow-sm transition-all duration-200"
              data-testid="button-exit-to-sidebar"
            >
              <BackArrow className="w-5 h-5" />
              {t("Exit")}
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline">ProERP</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(user?.role === 'admin' || user?.role === 'user') && (
            <AgentSummaryBell />
          )}
          {(user?.role === 'admin' || user?.role === 'user') && (
            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground relative" data-testid="button-notifications">
                  <Bell className="w-5 h-5" />
                  {(unreadCount?.count || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold" data-testid="text-notification-count">
                      {unreadCount?.count}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                {(!notificationsList || notificationsList.length === 0) ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t('No notifications')}</div>
                ) : (
                  notificationsList.slice(0, 20).map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
                      className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${notif.isRead === 0 ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                      onClick={() => {
                        if (notif.isRead === 0) markRead(notif.id);
                        if (notif.referenceType === 'sales_invoice' && notif.referenceId) {
                          approveInvoice(notif.referenceId, {
                            onSuccess: () => {
                              toast({ title: t("Invoice approved successfully") });
                            },
                          });
                        }
                      }}
                      data-testid={`notification-item-${notif.id}`}
                    >
                      <span className="text-sm font-medium">{notif.title}</span>
                      <span className="text-xs text-muted-foreground">{notif.message}</span>
                      {notif.referenceType === 'sales_invoice' && (
                        <span className="text-xs font-semibold text-green-600 mt-1">{t('Click to approve')}</span>
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Globe className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('en')}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('ar')}>العربية</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('ckb')}>کوردی</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('tr')}>Türkçe</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {menuOpen ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border/40 bg-gradient-to-r from-muted/30 via-muted/10 to-muted/30">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {activeGroup && (
                <button
                  onClick={() => setActiveGroup(null)}
                  className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg border-2 border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary/50 text-primary font-bold text-[13px] shadow-sm transition-all duration-200"
                  data-testid="button-nav-back"
                >
                  <BackArrow className="w-4 h-4" />
                  {t("Exit")}
                </button>
              )}

              {(companyProfile?.logo || companyProfile?.name) && (
                <div className="shrink-0 flex items-center gap-2 h-9 px-2.5 rounded-lg bg-background/70 border border-border/60 shadow-sm">
                  {companyProfile?.logo ? (
                    <img
                      src={companyProfile.logo}
                      alt=""
                      className="w-7 h-7 rounded-md object-contain bg-white"
                      data-testid="img-sidebar-company-logo"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <span className="text-white font-bold text-[11px]">
                        {companyProfile?.name?.charAt(0)?.toUpperCase() || "C"}
                      </span>
                    </div>
                  )}
                  {companyProfile?.name && (
                    <span
                      className="text-[13px] font-bold truncate max-w-[180px]"
                      style={{ color: companyProfile?.primaryColor || undefined }}
                      data-testid="text-sidebar-company-name"
                    >
                      {companyProfile.name}
                    </span>
                  )}
                </div>
              )}

              <div className="shrink-0 hidden md:flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-background/70 border border-border/60 shadow-sm">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">P</span>
                </div>
                <span className="text-[13px] font-bold text-foreground/80">ProERP</span>
              </div>

              <div className="shrink-0 flex items-center gap-2 h-9 px-2.5 rounded-lg bg-background/70 border border-border/60 shadow-sm">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
                  <span className="text-white font-bold text-[11px]">
                    {user?.fullName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-[12px] font-semibold truncate max-w-[140px]">{user?.fullName || user?.username}</span>
                  <span className="text-[10px] text-muted-foreground capitalize truncate max-w-[140px]">{user?.role}</span>
                </div>
              </div>

              {activeGroup && (
                <span className="hidden lg:inline text-[13px] font-semibold text-muted-foreground truncate ms-1">
                  · {t(activeGroup)}
                </span>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 text-muted-foreground" data-testid="button-sidebar-theme">
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" data-testid="button-sidebar-language">
                    <Globe className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => changeLanguage('en')}>English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage('ar')}>العربية</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage('ckb')}>کوردی</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage('tr')}>Türkçe</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => { setMenuOpen(false); setActiveGroup(null); }}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                data-testid="button-close-menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              {!activeGroup ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                  {filteredSidebarItems.map((entry) => {
                    const isGroup = 'type' in entry && entry.type === 'group';
                    const label = isGroup ? (entry as NavGroup).label : (entry as NavItem).label;
                    const icon = isGroup ? (entry as NavGroup).icon : (entry as NavItem).icon;
                    const color = isGroup ? (entry as NavGroup).color : ((entry as NavItem).color || "blue");
                    const isActive = !isGroup && location === (entry as NavItem).href;
                    const testId = isGroup
                      ? `button-grid-${label.toLowerCase().replace(/\s+/g, '-')}`
                      : `link-grid-${(entry as NavItem).href.replace(/\//g, '') || 'dashboard'}`;
                    return renderGridCard(
                      icon,
                      label,
                      color,
                      () => handleCardClick(entry),
                      isActive,
                      testId,
                    );
                  })}
                </div>
              ) : activeGroupData ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                  {activeGroupData.children.map((item) => {
                    const isActive = location === item.href;
                    return renderGridCard(
                      item.icon,
                      item.label,
                      item.color || "blue",
                      () => {
                        navigate(item.href);
                        setMenuOpen(false);
                        setActiveGroup(null);
                      },
                      isActive,
                      `link-grid-${item.href.replace(/\//g, '')}`,
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-3 border-t border-border/40 bg-muted/20">
            <span className="text-xs text-muted-foreground">ProERP © {new Date().getFullYear()}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 gap-2 text-xs"
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t("Logout")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 px-1 py-3 lg:px-2 lg:py-4 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
