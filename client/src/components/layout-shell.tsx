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
  TrendingDown,
  Gift,
  X,
  ArrowRight,
  ArrowLeft,
  ShoppingCart,
  Store,
  Users,
  Package2,
  BarChart2,
  Landmark,
  BadgePercent,
  Headset,
  Calculator,
  HandCoins,
  CreditCard,
  Wallet,
  Factory,
  Building2,
  Building,
  UserCheck,
  Monitor,
  Banknote,
  MapPin,
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
import { playSidebarClickSound, playHoverSound } from "@/lib/sounds";
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

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        'button, a, [role="button"], [role="menuitem"], [role="option"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], summary'
      ) as HTMLElement | null;
      if (!interactive) return;
      if (interactive.hasAttribute("disabled") || interactive.getAttribute("aria-disabled") === "true") return;
      if (interactive.dataset.silent === "true") return;
      playSidebarClickSound();
    };
    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
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
    { href: "/sales-invoice", icon: IconInvoiceUsd, label: "Sales Invoice", color: "green" },
    { href: "/sales-by-category", icon: IconPosUsd, label: "POS USD", color: "purple" },
    { href: "/pos-iqd", icon: IconPosIqd, label: "POS IQD", color: "violet" },
    { href: "/sales-return", icon: IconReturnUsd, label: "Sales Return", color: "orange" },
    { href: "/customer-receipt", icon: IconReceiptUsd, label: "Customer Receipt", color: "cyan" },
    { href: "/agent-payment", icon: IconPaymentUsd, label: "Customer Payment", color: "pink" },
    { href: "/agent-statement", icon: IconStatementUsd, label: "Agent Statement", color: "indigo" },
    { href: "/customer-debts", icon: IconDebtReceipt, label: "Customer Debts", color: "red" },
  ];

  const supplierNavItems: NavItem[] = [
    { href: "/suppliers", icon: IconSupplierList, label: "Suppliers", color: "purple" },
    { href: "/purchase-invoice", icon: IconPurchaseUsd, label: "Purchase Invoice", color: "blue" },
    { href: "/purchase-return", icon: IconReturnUsd, label: "Purchase Return", color: "orange" },
    { href: "/supplier-payments", icon: IconSupplierPayment, label: "Supplier Payments", color: "green" },
    { href: "/supplier-adjustments", icon: IconSupplierAdjust, label: "Supplier Adjustments", color: "teal" },
    { href: "/supplier-statement", icon: IconStatementUsd, label: "Supplier Statement", color: "indigo" },
    { href: "/supplier-debts", icon: IconSupplierDebt, label: "Supplier Debts", color: "red" },
    { href: "/supplier-order-usd", icon: IconSupplierOrderUsd, label: "Supplier Order USD", color: "pink" },
    { href: "/supplier-order-iqd", icon: IconSupplierOrderIqd, label: "Supplier Order IQD", color: "rose" },
  ];

  const bankNavItems: NavItem[] = [
    { href: "/banks", icon: IconBank, label: "Banks", color: "emerald" },
    { href: "/bank-receipts", icon: IconBankReceipt, label: "Bank Receipts", color: "green" },
    { href: "/bank-payments", icon: IconBankPayment, label: "Bank Payments", color: "red" },
    { href: "/bank-statement", icon: IconStatementUsd, label: "Bank Statement", color: "blue" },
  ];

  const clearanceNavItems: NavItem[] = [
    { href: "/customs-clearances", icon: IconClearance, label: "Customs Clearances", color: "teal" },
    { href: "/clearance-receipts", icon: IconClearanceReceipt, label: "Clearance Receipts", color: "green" },
    { href: "/clearance-payments", icon: IconClearancePayment, label: "Clearance Payments", color: "red" },
    { href: "/clearance-purchase-invoices", icon: IconClearanceInvoice, label: "Clearance Purchase Invoices", color: "blue" },
    { href: "/clearance-statement", icon: IconStatementUsd, label: "Clearance Statement", color: "indigo" },
  ];

  const officeNavItems: NavItem[] = [
    { href: "/transfer-offices", icon: IconOffice, label: "Transfer Offices", color: "orange" },
    { href: "/office-receipts", icon: IconOfficeReceipt, label: "Office Receipts", color: "green" },
    { href: "/office-payments", icon: IconOfficePayment, label: "Office Payments", color: "red" },
    { href: "/office-statement", icon: IconStatementUsd, label: "Office Account Statement", color: "blue" },
  ];

  const expenseNavItems: NavItem[] = [
    { href: "/expense-types", icon: IconExpenseType, label: "Expense Types", color: "amber" },
    { href: "/expenses", icon: IconExpenseEntry, label: "Expenses", color: "orange" },
  ];

  const externalDebtNavItems: NavItem[] = [
    { href: "/external-debts", icon: IconExternalDebt, label: "External Debts", color: "red" },
    { href: "/external-debt-receipts", icon: IconDebtReceipt, label: "External Debt Receipts", color: "green" },
    { href: "/external-debt-payments", icon: IconDebtPayment, label: "External Debt Payments", color: "orange" },
    { href: "/external-debt-statement", icon: IconStatementUsd, label: "External Debt Statement", color: "blue" },
  ];

  const ownerNavItems: NavItem[] = [
    { href: "/owners", icon: IconOwnerNames, label: "Owner Names", color: "amber" },
    { href: "/owner-withdrawals", icon: IconOwnerWithdraw, label: "Owner Withdrawals", color: "red" },
    { href: "/owner-returns", icon: IconOwnerReturn, label: "Owner Returns", color: "green" },
    { href: "/owner-statement", icon: IconStatementUsd, label: "Owner Statement", color: "blue" },
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
    { href: "/sm/shifts", icon: IconStatementUsd, label: "كشف المواعيد", color: "blue" },
    { href: "/sm/capital", icon: IconBank, label: "رأس المال", color: "emerald" },
    { href: "/company-book", icon: IconCompanyBook, label: "Company Book Management", color: "indigo" },
    { href: "/accounts", icon: IconAccounts, label: "Accounts", color: "blue" },
    { href: "/audit-logs", icon: IconAuditLog, label: "Audit Logs", color: "red" },
    { href: "/data-reset", icon: IconDataReset, label: "Data Reset", color: "red" },
  ];

  const warehouseNavItems: NavItem[] = [
    { href: "/warehouses", icon: IconWarehouse, label: "Warehouses", color: "teal" },
    { href: "/warehouse-transfer", icon: IconWarehouseTransfer, label: "Warehouse Transfer", color: "blue" },
  ];

  const supermarketNavItems: NavItem[] = [
    { href: "/sm/productions", icon: Factory, label: "تحويل وإنتاج", color: "teal" },
    { href: "/sm/cashier", icon: Wallet, label: "القاصة", color: "green" },
    { href: "/sm/card-cashier", icon: CreditCard, label: "قاصة البطاقات", color: "orange" },
    { href: "/sm/branches", icon: Building2, label: "الفروع", color: "indigo" },
    { href: "/sm/payment-cards", icon: Banknote, label: "بطاقات الدفع", color: "purple" },
  ];

  const sidebarItems: NavEntry[] = [
    { href: "/", icon: Monitor, label: "Dashboard", color: "blue" },
    ...supermarketNavItems,
    { type: 'group', label: "Sales Management", icon: ShoppingCart, color: "green", children: salesNavItems },
    { type: 'group', label: "Supplier Management", icon: Store, color: "red", children: supplierNavItems },
    { type: 'group', label: "Agent Management", icon: Users, color: "purple", children: agentManagementNavItems },
    { type: 'group', label: "Material Management", icon: Package2, color: "teal", children: materialNavItems },
    { type: 'group', label: "Reports", icon: BarChart2, color: "indigo", children: reportsNavItems },
    { type: 'group', label: "Bank Management", icon: Landmark, color: "emerald", children: bankNavItems },
    { type: 'group', label: "Clearance Management", icon: BadgePercent, color: "cyan", children: clearanceNavItems },
    { type: 'group', label: "Office Management", icon: Headset, color: "orange", children: officeNavItems },
    { type: 'group', label: "Expense Management", icon: Calculator, color: "amber", children: expenseNavItems },
    { type: 'group', label: "External Debt Management", icon: TrendingDown, color: "rose", children: externalDebtNavItems },
    { type: 'group', label: "Owner Management", icon: HandCoins, color: "violet", children: ownerNavItems },
    { href: "/addresses", icon: MapPin, label: "Customer Addresses", color: "sky" },
    { href: "/supplier-addresses", icon: MapPin, label: "Supplier Addresses", color: "cyan" },
    { type: 'group', label: "Warehouse Management", icon: IconWarehouse, color: "teal", children: warehouseNavItems },
    { href: "/barcode-print", icon: IconBarcode, label: "Barcode Print", color: "slate" },
    { href: "/company-profile", icon: Building, label: "Company Profile", color: "emerald" },
    { href: "/currency-exchange", icon: IconCurrencyExchange, label: "Currency Exchange", color: "green" },
    { href: "/backup-restore", icon: IconBackupRestore, label: "Backup & Restore", color: "purple" },
    { href: "/settings", icon: IconSettings, label: "Settings", color: "slate" },
    { href: "/user-management", icon: UserCheck, label: "User Management", color: "pink" },
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
    playSidebarClickSound();
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
        onMouseEnter={() => playHoverSound()}
        data-testid={testId}
        className={`
          group relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl cursor-pointer min-h-[138px] min-w-[143px] overflow-hidden border border-transparent
          transition-all duration-300 ease-out
          hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/40 hover:border-current/20
          active:scale-[0.98] active:translate-y-0
          ${isActive
            ? "bg-gray-200 dark:bg-white/10 shadow-sm ring-2 ring-offset-1 ring-blue-400/40"
            : "bg-gray-50 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08]"
          }
        `}
      >
        <span
          className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${c.bg}`}
          style={{ filter: "blur(24px)", transform: "scale(0.85)" }}
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -top-1/2 -left-1/2 w-[200%] h-[200%] rotate-12 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-1/4 transition-all duration-700 ease-out"
          aria-hidden="true"
        />
        <div className={`relative z-10 w-16 h-16 rounded-xl flex items-center justify-center ${c.bg} transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-6deg] group-hover:shadow-lg`}>
          <Icon className={`w-9 h-9 ${c.text} transition-transform duration-300 group-hover:scale-110`} />
        </div>
        <span dir="auto" className="relative z-10 text-[14px] font-bold text-center leading-snug line-clamp-3 w-full px-1 text-foreground break-words" title={t(label)}>
          {t(label)}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 h-14 border-b border-border/60 bg-background/90 backdrop-blur-xl px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
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

          {user && (
            <div className="hidden md:flex items-center gap-2 h-9 px-2.5 rounded-lg bg-muted/40 border border-border/50 ms-1">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
                <span className="text-white font-bold text-[11px]">
                  {user?.fullName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[12px] font-semibold truncate max-w-[140px]" data-testid="text-header-user-name">{user?.fullName || user?.username}</span>
                <span className="text-[10px] text-muted-foreground capitalize truncate max-w-[140px]">{user?.role}</span>
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center justify-center min-w-0">
          {(companyProfile?.logo || companyProfile?.name) && (
            <div className="inline-flex items-center gap-3 h-11 ps-2 pe-4 rounded-full bg-background border-2 shadow-md max-w-full"
              style={{
                borderColor: companyProfile?.primaryColor ? `${companyProfile.primaryColor}40` : undefined,
              }}
            >
              {companyProfile?.logo ? (
                <img
                  src={companyProfile.logo}
                  alt=""
                  className="w-8 h-8 rounded-full object-contain bg-white p-0.5 shrink-0 ring-1 ring-border/50"
                  data-testid="img-header-company-logo"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: companyProfile?.primaryColor
                      ? `linear-gradient(135deg, ${companyProfile.primaryColor}, ${companyProfile.primaryColor}cc)`
                      : "linear-gradient(135deg, #10b981, #059669)",
                  }}
                >
                  <span className="text-white font-bold text-sm">
                    {companyProfile?.name?.charAt(0)?.toUpperCase() || "C"}
                  </span>
                </div>
              )}
              {companyProfile?.name && (
                <span
                  className="text-[15px] font-extrabold truncate tracking-wide leading-none"
                  style={{ color: companyProfile?.primaryColor || undefined, maxWidth: "280px" }}
                  data-testid="text-header-company-name"
                  title={companyProfile.name}
                >
                  {companyProfile.name}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
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
          <div className="flex-1 overflow-y-auto p-6">
            <div className="w-full">
              {!activeGroup ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
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
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
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
