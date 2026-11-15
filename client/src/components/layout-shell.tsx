import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  Moon,
  Sun,
  Globe,
  Bell,
  TrendingUp,
  TrendingDown,
  Gift,
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
  UserCheck,
  Banknote,
  MapPin,
} from "lucide-react";
import {
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
  IconCurrencyExchange,
  IconSettings,
  IconUserManagement,
  IconDataReset,
  IconCompany,
  IconAccounts,
  IconAddress,
  IconCustomers,
  IconInvoiceUsd,
  IconPosIqd,
  IconReturnUsd,
  IconReceiptUsd,
  IconStatementUsd,
  IconSupplierList,
  IconPurchaseIqd,
  IconSupplierPayment,
  IconSupplierAdjust,
  IconSupplierDebt,
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
import { OPEN_HOME_EVENT, ExitToHomeButton } from "@/components/exit-to-home-button";

interface LayoutShellProps {
  children: React.ReactNode;
}

type NavItem = { href: string; icon: any; label: string; color?: string };
type NavGroup = { type: 'group'; label: string; icon: any; color: string; children: NavItem[]; href?: string };
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
    const openHome = () => {
      setMenuOpen(true);
      setActiveGroup(null);
    };
    window.addEventListener(OPEN_HOME_EVENT, openHome);
    return () => window.removeEventListener(OPEN_HOME_EVENT, openHome);
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

  const salesNavItems: NavItem[] = [
    { href: "/customers", icon: IconCustomers, label: "Customers", color: "blue" },
    { href: "/sales-invoice-iqd", icon: IconInvoiceUsd, label: "Sales Invoice IQD", color: "green" },
    { href: "/pos-iqd", icon: IconPosIqd, label: "POS IQD", color: "violet" },
    { href: "/sales-return-iqd", icon: IconReturnUsd, label: "Sales Return IQD", color: "orange" },
    { href: "/customer-receipt-iqd", icon: IconReceiptUsd, label: "Customer Receipt IQD", color: "cyan" },
    { href: "/agent-statement-iqd", icon: IconStatementUsd, label: "Agent Statement IQD", color: "indigo" },
    { href: "/customer-debts", icon: IconDebtReceipt, label: "Customer Debts", color: "red" },
  ];

  const supplierNavItems: NavItem[] = [
    { href: "/suppliers", icon: IconSupplierList, label: "Suppliers", color: "purple" },
    { href: "/purchase-invoice-iqd", icon: IconPurchaseIqd, label: "Purchase Invoice IQD", color: "blue" },
    { href: "/purchase-return-iqd", icon: IconReturnUsd, label: "Purchase Return IQD", color: "orange" },
    { href: "/supplier-payments", icon: IconSupplierPayment, label: "Supplier Payments", color: "green" },
    { href: "/supplier-adjustments", icon: IconSupplierAdjust, label: "Supplier Adjustments", color: "teal" },
    { href: "/supplier-statement-iqd", icon: IconStatementUsd, label: "Supplier Statement IQD", color: "indigo" },
    { href: "/supplier-debts", icon: IconSupplierDebt, label: "Supplier Debts", color: "red" },
    { href: "/supplier-order-iqd", icon: IconSupplierOrderIqd, label: "Supplier Order IQD", color: "rose" },
  ];

  const bankNavItems: NavItem[] = [
    { href: "/banks", icon: IconBank, label: "Banks", color: "emerald" },
    { href: "/bank-receipts", icon: IconBankReceipt, label: "Bank Receipts", color: "green" },
    { href: "/bank-payments", icon: IconBankPayment, label: "Bank Payments", color: "red" },
    { href: "/bank-statement-iqd", icon: IconStatementUsd, label: "Bank Statement IQD", color: "blue" },
  ];

  const clearanceNavItems: NavItem[] = [
    { href: "/customs-clearances", icon: IconClearance, label: "Customs Clearances", color: "teal" },
    { href: "/clearance-receipts", icon: IconClearanceReceipt, label: "Clearance Receipts", color: "green" },
    { href: "/clearance-payments", icon: IconClearancePayment, label: "Clearance Payments", color: "red" },
    { href: "/clearance-purchase-invoices", icon: IconClearanceInvoice, label: "Clearance Purchase Invoices", color: "blue" },
    { href: "/clearance-statement-iqd", icon: IconStatementUsd, label: "Clearance Statement IQD", color: "indigo" },
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
    { href: "/sm/branches", icon: Building2, label: "الفروع", color: "indigo" },
  ];

  const cardNavItems: NavItem[] = [
    { href: "/sm/payment-cards", icon: Banknote, label: "Payment Cards", color: "purple" },
    { href: "/sm/card-cashier", icon: CreditCard, label: "Card Cashier", color: "orange" },
  ];

  const sidebarItems: NavEntry[] = [
    ...supermarketNavItems,
    { type: 'group', label: "Card Management", icon: CreditCard, color: "orange", href: "/card-management", children: cardNavItems },
    { type: 'group', label: "Sales Management", icon: ShoppingCart, color: "green", href: "/sales-management", children: salesNavItems },
    { type: 'group', label: "Supplier Management", icon: Store, color: "red", href: "/supplier-management", children: supplierNavItems },
    { type: 'group', label: "Agent Management", icon: Users, color: "purple", href: "/agent-management", children: agentManagementNavItems },
    { type: 'group', label: "Material Management", icon: Package2, color: "teal", href: "/material-management", children: materialNavItems },
    { type: 'group', label: "Reports", icon: BarChart2, color: "indigo", children: reportsNavItems },
    { type: 'group', label: "Bank Management", icon: Landmark, color: "emerald", href: "/bank-management", children: bankNavItems },
    { type: 'group', label: "Clearance Management", icon: BadgePercent, color: "cyan", href: "/clearance-management", children: clearanceNavItems },
    { type: 'group', label: "Office Management", icon: Headset, color: "orange", href: "/office-management", children: officeNavItems },
    { type: 'group', label: "Expense Management", icon: Calculator, color: "amber", href: "/expense-management", children: expenseNavItems },
    { type: 'group', label: "External Debt Management", icon: TrendingDown, color: "rose", href: "/external-debt-management", children: externalDebtNavItems },
    { type: 'group', label: "Owner Management", icon: HandCoins, color: "violet", href: "/owner-management", children: ownerNavItems },
    { href: "/addresses", icon: MapPin, label: "Customer Addresses", color: "sky" },
    { href: "/supplier-addresses", icon: MapPin, label: "Supplier Addresses", color: "cyan" },
    { type: 'group', label: "Warehouse Management", icon: IconWarehouse, color: "teal", children: warehouseNavItems },
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
      if (entry.href) {
        navigate(entry.href);
        setMenuOpen(false);
        setActiveGroup(null);
        return;
      }
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
          group relative flex flex-col items-center justify-center gap-3 p-4 rounded-3xl cursor-pointer min-h-[150px] min-w-[148px] overflow-hidden
          transition-all duration-300 ease-out
          hover:-translate-y-1.5 hover:scale-[1.04]
          active:scale-[0.97] active:translate-y-0
          ${isActive
            ? `shadow-lg ${c.bg} border-2 ${c.text} border-current/30`
            : "bg-white dark:bg-white/[0.05] border border-gray-200/80 dark:border-white/10 hover:border-transparent hover:shadow-xl"
          }
        `}
        style={isActive ? {} : undefined}
      >
        {/* Gradient border glow on hover */}
        <span
          className={`pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300`}
          style={{
            background: `linear-gradient(135deg, transparent 40%, color-mix(in srgb, currentColor 15%, transparent))`,
            boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, currentColor 35%, transparent)`,
          }}
          aria-hidden="true"
        />
        {/* Coloured background wash */}
        <span
          className={`pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${c.bg}`}
          style={{ opacity: undefined }}
          aria-hidden="true"
        />
        {/* Shine sweep */}
        <span
          className="pointer-events-none absolute -top-1/2 -left-1/2 w-[200%] h-[200%] rotate-12 bg-gradient-to-r from-transparent via-white/25 dark:via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-1/3 transition-all duration-700 ease-out"
          aria-hidden="true"
        />
        {/* Icon — no frame */}
        <div className={`relative z-10 flex items-center justify-center ${c.text} transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-5deg]`}>
          <Icon className={`w-14 h-14 transition-transform duration-300 group-hover:scale-105`} />
        </div>
        <span dir="auto" className={`relative z-10 text-[15px] font-bold text-center leading-snug line-clamp-3 w-full px-1 break-words transition-colors duration-200 ${isActive ? c.text : "text-foreground group-hover:" + c.text}`} title={t(label)}>
          {t(label)}
        </span>
      </button>
    );
  };

  const headerIconBtn =
    "h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors";
  const brandColor = companyProfile?.primaryColor || "#e11d48";

  const notificationsMenu = (
    <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`${headerIconBtn} relative`} data-testid="button-notifications">
          <Bell className="w-[18px] h-[18px]" />
          {(unreadCount?.count || 0) > 0 && (
            <span className="absolute top-0.5 end-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold ring-2 ring-background" data-testid="text-notification-count">
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
  );

  const languageMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={headerIconBtn} data-testid="button-language">
          <Globe className="w-[18px] h-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')}>English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('ar')}>العربية</DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('ckb')}>کوردی</DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('tr')}>Türkçe</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {menuOpen ? (
      <header className="sticky top-0 z-30 px-3 sm:px-5 pt-3 pb-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 h-[58px] px-2 sm:px-3 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-white/75 dark:bg-zinc-900/70 backdrop-blur-2xl shadow-[0_8px_28px_-12px_rgba(15,23,42,0.28)]">
          <div className="flex items-center gap-2 min-w-0">
            {user && (
              <div className="hidden sm:flex items-center gap-2 h-10 ps-1 pe-3 rounded-full bg-muted/50 ring-1 ring-black/[0.04] dark:ring-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm ring-2 ring-white/80 dark:ring-zinc-900">
                  <span className="text-white font-bold text-[11px]">
                    {user?.fullName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex flex-col leading-tight pe-1">
                  <span className="text-[12px] font-semibold truncate max-w-[120px]" data-testid="text-header-user-name">{user?.fullName || user?.username}</span>
                  <span className="text-[10px] text-muted-foreground capitalize truncate max-w-[120px]">{user?.role}</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_4px_12px_-3px_rgba(245,158,11,0.7)]">
              <span className="text-white font-black text-[11px] tracking-wide">JR</span>
            </div>
          </div>

          <div className="flex items-center justify-center min-w-0 px-1">
            {(companyProfile?.logo || companyProfile?.name) && (
              <div
                className="relative inline-flex items-center gap-2.5 h-11 ps-1.5 pe-4 rounded-full bg-background/90 max-w-full shadow-[0_2px_10px_-2px_rgba(0,0,0,0.12)]"
                style={{ boxShadow: `0 2px 14px -4px ${brandColor}55, inset 0 0 0 1.5px ${brandColor}40` }}
              >
                {companyProfile?.logo ? (
                  <img
                    src={companyProfile.logo}
                    alt=""
                    className="w-9 h-9 rounded-full object-contain bg-white p-0.5 shrink-0 shadow-sm"
                    data-testid="img-header-company-logo"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
                    }}
                  >
                    <span className="text-white font-bold text-sm">
                      {companyProfile?.name?.charAt(0)?.toUpperCase() || "C"}
                    </span>
                  </div>
                )}
                {companyProfile?.name && (
                  <span
                    className="text-[14px] sm:text-[15px] font-bold truncate tracking-wide leading-none"
                    style={{ color: brandColor, maxWidth: "260px" }}
                    data-testid="text-header-company-name"
                    title={companyProfile.name}
                  >
                    {companyProfile.name}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end min-w-0">
            <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-muted/50 ring-1 ring-black/[0.04] dark:ring-white/10">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className={headerIconBtn} data-testid="button-theme">
                {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
              </Button>
              {languageMenu}
              {(user?.role === 'admin' || user?.role === 'user') && notificationsMenu}
              {(user?.role === 'admin' || user?.role === 'user') && <AgentSummaryBell />}
            </div>
          </div>
        </div>
      </header>
      ) : (
      <div className="sticky top-0 z-30 flex items-center px-4 pt-3 pb-1">
        <ExitToHomeButton />
      </div>
      )}

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
          <div className={`${location === "/customers" || location === "/products" ? "max-w-[1680px]" : "max-w-7xl"} mx-auto animate-fade-in`}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
