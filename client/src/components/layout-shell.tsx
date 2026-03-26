import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  Menu,
  Moon,
  Sun,
  Globe,
  ChevronDown,
  Bell,
  TrendingUp,
  Gift,
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
  IconDollar,
  IconDinar,
} from "@/components/erp-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLogout, useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { hasRoutePermission, PERMISSION_MODULES } from "@/lib/permissions";
import { useUnreadNotificationCount, useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import { useApproveSalesInvoice } from "@/hooks/use-sales-invoices";

interface LayoutShellProps {
  children: React.ReactNode;
}

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

  const [, navigate] = useLocation();
  const sidebarScrollRef = useRef<HTMLElement>(null);

  const supplierSubRoutes = [
    "/supplier-management",
    "/suppliers",
    "/purchase-invoice-usd",
    "/purchase-invoice-iqd",
    "/purchase-return-usd",
    "/purchase-return-iqd",
    "/supplier-payments",
    "/supplier-adjustments",
    "/supplier-statement-usd",
    "/supplier-statement-iqd",
    "/supplier-debts",
  ];

  const bankSubRoutes = [
    "/bank-management",
    "/banks",
    "/bank-receipts",
    "/bank-payments",
    "/bank-statement-usd",
    "/bank-statement-iqd",
  ];

  const clearanceSubRoutes = [
    "/clearance-management",
    "/customs-clearances",
    "/clearance-receipts",
    "/clearance-payments",
    "/clearance-purchase-invoices",
    "/clearance-statement-usd",
    "/clearance-statement-iqd",
  ];

  const officeSubRoutes = [
    "/office-management",
    "/transfer-offices",
    "/office-receipts",
    "/office-payments",
    "/office-statement-usd",
    "/office-statement-iqd",
  ];

  const expenseSubRoutes = [
    "/expense-management",
    "/expense-types",
    "/expenses",
  ];

  const externalDebtSubRoutes = [
    "/external-debt-management",
    "/external-debts",
    "/external-debt-receipts",
    "/external-debt-payments",
    "/external-debt-statement-usd",
    "/external-debt-statement-iqd",
  ];

  const ownerSubRoutes = [
    "/owner-management",
    "/owners",
    "/owner-withdrawals",
    "/owner-returns",
    "/owner-statement-usd",
    "/owner-statement-iqd",
  ];

  const agentSubRoutes = [
    "/agent-management",
    "/agent-clients",
    "/agent-product-load",
    "/agent-gps",
    "/rep-statement",
  ];

  const materialSubRoutes = [
    "/material-management",
    "/products",
    "/units",
    "/categories",
  ];

  const reportsSubRoutes = [
    "/inventory-report",
    "/expiry-report",
    "/max-stock-report",
    "/profits-report",
    "/sales-discounts-gifts-report",
  ];

  const warehouseSubRoutes = [
    "/warehouse-management",
    "/warehouses",
    "/warehouse-transfer",
  ];

  const salesSubRoutes = [
    "/sales-management",
    "/customers",
    "/sales-invoice-usd",
    "/sales-invoice-iqd",
    "/sales-by-category",
    "/pos-iqd",
    "/sales-return-usd",
    "/sales-return-iqd",
    "/customer-receipt-usd",
    "/customer-receipt-iqd",
    "/agent-payment-usd",
    "/agent-payment-iqd",
    "/agent-statement-usd",
    "/agent-statement-iqd",
    "/customer-debts",
  ];

  const isSupplierSection = supplierSubRoutes.includes(location);
  const isBankSection = bankSubRoutes.includes(location);
  const isClearanceSection = clearanceSubRoutes.includes(location);
  const isOfficeSection = officeSubRoutes.includes(location);
  const isExpenseSection = expenseSubRoutes.includes(location);
  const isExternalDebtSection = externalDebtSubRoutes.includes(location);
  const isOwnerSection = ownerSubRoutes.includes(location);
  const isAgentSection = agentSubRoutes.includes(location);
  const isMaterialSection = materialSubRoutes.includes(location);
  const isReportsSection = reportsSubRoutes.includes(location);
  const isWarehouseSection = warehouseSubRoutes.includes(location);
  const isSalesSection = salesSubRoutes.includes(location);
  const [supplierOpen, setSupplierOpen] = useState(isSupplierSection);
  const [bankOpen, setBankOpen] = useState(isBankSection);
  const [clearanceOpen, setClearanceOpen] = useState(isClearanceSection);
  const [officeOpen, setOfficeOpen] = useState(isOfficeSection);
  const [expenseOpen, setExpenseOpen] = useState(isExpenseSection);
  const [externalDebtOpen, setExternalDebtOpen] = useState(isExternalDebtSection);
  const [ownerOpen, setOwnerOpen] = useState(isOwnerSection);
  const [agentOpen, setAgentOpen] = useState(isAgentSection);
  const [materialOpen, setMaterialOpen] = useState(isMaterialSection);
  const [reportsOpen, setReportsOpen] = useState(isReportsSection);
  const [warehouseOpen, setWarehouseOpen] = useState(isWarehouseSection);
  const [salesOpen, setSalesOpen] = useState(isSalesSection);

  useEffect(() => {
    if (isSupplierSection) setSupplierOpen(true);
  }, [isSupplierSection]);

  useEffect(() => {
    if (isBankSection) setBankOpen(true);
  }, [isBankSection]);

  useEffect(() => {
    if (isClearanceSection) setClearanceOpen(true);
  }, [isClearanceSection]);

  useEffect(() => {
    if (isOfficeSection) setOfficeOpen(true);
  }, [isOfficeSection]);

  useEffect(() => {
    if (isExpenseSection) setExpenseOpen(true);
  }, [isExpenseSection]);

  useEffect(() => {
    if (isExternalDebtSection) setExternalDebtOpen(true);
  }, [isExternalDebtSection]);

  useEffect(() => {
    if (isOwnerSection) setOwnerOpen(true);
  }, [isOwnerSection]);

  useEffect(() => {
    if (isAgentSection) setAgentOpen(true);
  }, [isAgentSection]);

  useEffect(() => {
    if (isMaterialSection) setMaterialOpen(true);
  }, [isMaterialSection]);

  useEffect(() => {
    if (isReportsSection) setReportsOpen(true);
  }, [isReportsSection]);

  useEffect(() => {
    if (isWarehouseSection) setWarehouseOpen(true);
  }, [isWarehouseSection]);

  useEffect(() => {
    if (isSalesSection) setSalesOpen(true);
  }, [isSalesSection]);

  type NavItem = { href: string; icon: any; label: string };
  type NavEntry = NavItem | { type: 'group'; label: string; icon: any; children: NavItem[] };

  const supplierNavItems: NavItem[] = [
    { href: "/suppliers", icon: IconSupplierList, label: "Suppliers" },
    { href: "/purchase-invoice-usd", icon: IconPurchaseUsd, label: "Purchase Invoice USD" },
    { href: "/purchase-invoice-iqd", icon: IconPurchaseIqd, label: "Purchase Invoice IQD" },
    { href: "/purchase-return-usd", icon: IconReturnUsd, label: "Purchase Return USD" },
    { href: "/purchase-return-iqd", icon: IconReturnIqd, label: "Purchase Return IQD" },
    { href: "/supplier-payments", icon: IconSupplierPayment, label: "Supplier Payments" },
    { href: "/supplier-adjustments", icon: IconSupplierAdjust, label: "Supplier Adjustments" },
    { href: "/supplier-statement-usd", icon: IconStatementUsd, label: "Supplier Statement USD" },
    { href: "/supplier-statement-iqd", icon: IconStatementIqd, label: "Supplier Statement IQD" },
    { href: "/supplier-debts", icon: IconSupplierDebt, label: "Supplier Debts" },
  ];

  const bankNavItems: NavItem[] = [
    { href: "/banks", icon: IconBank, label: "Banks" },
    { href: "/bank-receipts", icon: IconBankReceipt, label: "Bank Receipts" },
    { href: "/bank-payments", icon: IconBankPayment, label: "Bank Payments" },
    { href: "/bank-statement-usd", icon: IconStatementUsd, label: "Bank Statement USD" },
    { href: "/bank-statement-iqd", icon: IconStatementIqd, label: "Bank Statement IQD" },
  ];

  const clearanceNavItems: NavItem[] = [
    { href: "/customs-clearances", icon: IconClearance, label: "Customs Clearances" },
    { href: "/clearance-receipts", icon: IconClearanceReceipt, label: "Clearance Receipts" },
    { href: "/clearance-payments", icon: IconClearancePayment, label: "Clearance Payments" },
    { href: "/clearance-purchase-invoices", icon: IconClearanceInvoice, label: "Clearance Purchase Invoices" },
    { href: "/clearance-statement-usd", icon: IconStatementUsd, label: "Clearance Statement USD" },
    { href: "/clearance-statement-iqd", icon: IconStatementIqd, label: "Clearance Statement IQD" },
  ];

  const officeNavItems: NavItem[] = [
    { href: "/transfer-offices", icon: IconOffice, label: "Transfer Offices" },
    { href: "/office-receipts", icon: IconOfficeReceipt, label: "Office Receipts" },
    { href: "/office-payments", icon: IconOfficePayment, label: "Office Payments" },
    { href: "/office-statement-usd", icon: IconStatementUsd, label: "Office Account Statement USD" },
    { href: "/office-statement-iqd", icon: IconStatementIqd, label: "Office Account Statement IQD" },
  ];

  const expenseNavItems: NavItem[] = [
    { href: "/expense-types", icon: IconExpenseType, label: "Expense Types" },
    { href: "/expenses", icon: IconExpenseEntry, label: "Expenses" },
  ];

  const externalDebtNavItems: NavItem[] = [
    { href: "/external-debts", icon: IconExternalDebt, label: "External Debts" },
    { href: "/external-debt-receipts", icon: IconDebtReceipt, label: "External Debt Receipts" },
    { href: "/external-debt-payments", icon: IconDebtPayment, label: "External Debt Payments" },
    { href: "/external-debt-statement-usd", icon: IconStatementUsd, label: "External Debt Statement USD" },
    { href: "/external-debt-statement-iqd", icon: IconStatementIqd, label: "External Debt Statement IQD" },
  ];

  const ownerNavItems: NavItem[] = [
    { href: "/owners", icon: IconOwnerNames, label: "Owner Names" },
    { href: "/owner-withdrawals", icon: IconOwnerWithdraw, label: "Owner Withdrawals" },
    { href: "/owner-returns", icon: IconOwnerReturn, label: "Owner Returns" },
    { href: "/owner-statement-usd", icon: IconStatementUsd, label: "Owner Statement USD" },
    { href: "/owner-statement-iqd", icon: IconStatementIqd, label: "Owner Statement IQD" },
  ];

  const agentManagementNavItems: NavItem[] = [
    { href: "/agent-clients", icon: IconAgentClients, label: "Agent Clients" },
    { href: "/agent-product-load", icon: IconAgentLoad, label: "Agent Product Load" },
    { href: "/agent-gps", icon: IconAgentGps, label: "Agent GPS" },
    { href: "/rep-statement", icon: IconStatementUsd, label: "Rep Statement" },
  ];

  const materialNavItems: NavItem[] = [
    { href: "/products", icon: IconProduct, label: "Products" },
    { href: "/units", icon: IconUnit, label: "Units" },
    { href: "/categories", icon: IconCategory, label: "Categories" },
  ];

  const reportsNavItems: NavItem[] = [
    { href: "/inventory-report", icon: IconInventory, label: "Inventory Report" },
    { href: "/expiry-report", icon: IconExpiry, label: "Expiry Report" },
    { href: "/max-stock-report", icon: IconReport, label: "Max Stock Report" },
    { href: "/profits-report", icon: TrendingUp, label: "Profits Report" },
    { href: "/sales-discounts-gifts-report", icon: Gift, label: "Sales Discounts & Gifts Report" },
  ];

  const warehouseNavItems: NavItem[] = [
    { href: "/warehouses", icon: IconWarehouse, label: "Warehouses" },
    { href: "/warehouse-transfer", icon: IconWarehouseTransfer, label: "Warehouse Transfer" },
  ];

  const salesNavItems: NavItem[] = [
    { href: "/customers", icon: IconCustomers, label: "Customers" },
    { href: "/sales-invoice-usd", icon: IconInvoiceUsd, label: "Sales Invoice USD" },
    { href: "/sales-invoice-iqd", icon: IconInvoiceIqd, label: "Sales Invoice IQD" },
    { href: "/sales-by-category", icon: IconPosUsd, label: "POS USD" },
    { href: "/pos-iqd", icon: IconPosIqd, label: "POS IQD" },
    { href: "/sales-return-usd", icon: IconReturnUsd, label: "Sales Return USD" },
    { href: "/sales-return-iqd", icon: IconReturnIqd, label: "Sales Return IQD" },
    { href: "/customer-receipt-usd", icon: IconReceiptUsd, label: "Customer Receipt USD" },
    { href: "/customer-receipt-iqd", icon: IconReceiptIqd, label: "Customer Receipt IQD" },
    { href: "/agent-payment-usd", icon: IconPaymentUsd, label: "Customer Payment USD" },
    { href: "/agent-payment-iqd", icon: IconPaymentIqd, label: "Customer Payment IQD" },
    { href: "/agent-statement-usd", icon: IconStatementUsd, label: "Agent Statement USD" },
    { href: "/agent-statement-iqd", icon: IconStatementIqd, label: "Agent Statement IQD" },
    { href: "/customer-debts", icon: IconDebtReceipt, label: "Customer Debts" },
  ];

  const sidebarItems: NavEntry[] = [
    { href: "/", icon: IconDashboard, label: "Dashboard" },
    { type: 'group', label: "Sales Management", icon: IconSales, children: salesNavItems },
    { type: 'group', label: "Supplier Management", icon: IconSupplier, children: supplierNavItems },
    { type: 'group', label: "Agent Management", icon: IconAgent, children: agentManagementNavItems },
    { type: 'group', label: "Material Management", icon: IconMaterial, children: materialNavItems },
    { type: 'group', label: "Reports", icon: IconReport, children: reportsNavItems },
    { type: 'group', label: "Bank Management", icon: IconBank, children: bankNavItems },
    { type: 'group', label: "Clearance Management", icon: IconClearance, children: clearanceNavItems },
    { type: 'group', label: "Office Management", icon: IconOffice, children: officeNavItems },
    { type: 'group', label: "Expense Management", icon: IconExpense, children: expenseNavItems },
    { type: 'group', label: "External Debt Management", icon: IconExternalDebt, children: externalDebtNavItems },
    { type: 'group', label: "Owner Management", icon: IconOwner, children: ownerNavItems },
    { href: "/addresses", icon: IconAddress, label: "Addresses" },
    { type: 'group', label: "Warehouse Management", icon: IconWarehouse, children: warehouseNavItems },
    { href: "/product-damage", icon: IconDamage, label: "Product Damage" },
    { href: "/barcode-print", icon: IconBarcode, label: "Barcode Print" },
    { href: "/company-profile", icon: IconCompany, label: "Company Profile" },
    { href: "/currency-exchange", icon: IconCurrencyExchange, label: "Currency Exchange" },
    { href: "/accounts", icon: IconAccounts, label: "Accounts" },
    { href: "/settings", icon: IconSettings, label: "Settings" },
    { href: "/user-management", icon: IconUserManagement, label: "User Management" },
    { href: "/data-reset", icon: IconDataReset, label: "Data Reset" },
  ];

  const userRole = user?.role || "user";
  const userPermissions = (user as any)?.permissions || [];

  const filteredSidebarItems = sidebarItems.filter((entry) => {
    if ('type' in entry && entry.type === 'group') {
      const firstChildRoute = entry.children[0]?.href;
      if (firstChildRoute) {
        return hasRoutePermission(userRole, userPermissions, firstChildRoute);
      }
      return true;
    }
    return hasRoutePermission(userRole, userPermissions, entry.href);
  });

  const renderNavLink = (item: NavItem, indent = false) => {
    const isActive = location === item.href;
    const testId = `link-nav-${item.href.replace(/\//g, '') || 'dashboard'}`;
    return (
      <Link key={item.href} href={item.href} data-testid={testId} className={`
        flex items-center gap-3 ${indent ? 'px-4 py-2.5 ms-6' : 'px-4 py-3'} rounded-xl transition-all duration-200
        ${isActive
          ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-md shadow-orange-500/20 font-medium"
          : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"
        }
      `}>
        <item.icon className={`w-5 h-5 ${isActive ? "text-[hsl(var(--sidebar-primary-foreground))]" : ""}`} />
        <span className={`${indent ? "text-sm" : ""}`}>{t(item.label)}</span>
      </Link>
    );
  };

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))]">
      <div className="p-6 border-b border-[hsl(var(--sidebar-border))]">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
          ProERP
        </h1>
        <p className="text-xs text-[hsl(var(--sidebar-foreground))]/60 mt-1">Enterprise Management</p>
      </div>

      <nav ref={sidebarScrollRef} className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredSidebarItems.map((entry) => {
          if ('type' in entry && entry.type === 'group') {
            const groupMap: Record<string, { isOpen: boolean; setOpen: (v: boolean) => void; isActive: boolean }> = {
              "Sales Management": { isOpen: salesOpen, setOpen: setSalesOpen, isActive: isSalesSection },
              "Supplier Management": { isOpen: supplierOpen, setOpen: setSupplierOpen, isActive: isSupplierSection },
              "Bank Management": { isOpen: bankOpen, setOpen: setBankOpen, isActive: isBankSection },
              "Clearance Management": { isOpen: clearanceOpen, setOpen: setClearanceOpen, isActive: isClearanceSection },
              "Office Management": { isOpen: officeOpen, setOpen: setOfficeOpen, isActive: isOfficeSection },
              "Expense Management": { isOpen: expenseOpen, setOpen: setExpenseOpen, isActive: isExpenseSection },
              "External Debt Management": { isOpen: externalDebtOpen, setOpen: setExternalDebtOpen, isActive: isExternalDebtSection },
              "Owner Management": { isOpen: ownerOpen, setOpen: setOwnerOpen, isActive: isOwnerSection },
              "Agent Management": { isOpen: agentOpen, setOpen: setAgentOpen, isActive: isAgentSection },
              "Material Management": { isOpen: materialOpen, setOpen: setMaterialOpen, isActive: isMaterialSection },
              "Reports": { isOpen: reportsOpen, setOpen: setReportsOpen, isActive: isReportsSection },
              "Warehouse Management": { isOpen: warehouseOpen, setOpen: setWarehouseOpen, isActive: isWarehouseSection },
            };
            const group = groupMap[entry.label] || { isOpen: false, setOpen: () => {}, isActive: false };
            const isOpen = group.isOpen;
            const setOpen = group.setOpen;
            const isActiveSection = group.isActive;
            const landingRouteMap: Record<string, string> = {
              "Sales Management": "/sales-management",
              "Supplier Management": "/supplier-management",
              "Bank Management": "/bank-management",
              "Clearance Management": "/clearance-management",
              "Office Management": "/office-management",
              "Expense Management": "/expense-management",
              "External Debt Management": "/external-debt-management",
              "Owner Management": "/owner-management",
              "Agent Management": "/agent-management",
              "Material Management": "/material-management",
              "Reports": "/inventory-report",
              "Warehouse Management": "/warehouses",
            };
            const landingRoute = landingRouteMap[entry.label] || entry.children[0]?.href || "/";
            const isLandingActive = location === landingRoute;
            const testIdName = entry.label.toLowerCase().replace(/\s+/g, '-');
            return (
              <div key={entry.label} className="space-y-0.5">
                <button
                  onClick={() => {
                    const scrollPos = sidebarScrollRef.current?.scrollTop || 0;
                    setOpen(true);
                    navigate(landingRoute);
                    requestAnimationFrame(() => {
                      if (sidebarScrollRef.current) sidebarScrollRef.current.scrollTop = scrollPos;
                    });
                  }}
                  data-testid={`button-${testIdName}`}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isLandingActive
                      ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-md shadow-orange-500/20 font-medium"
                      : isActiveSection
                        ? "bg-[hsl(var(--sidebar-accent))] text-orange-400 font-medium"
                        : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"
                    }
                  `}
                >
                  <entry.icon className={`w-5 h-5 ${isLandingActive ? "text-[hsl(var(--sidebar-primary-foreground))]" : ""}`} />
                  <span className="flex-1 text-start">{t(entry.label)}</span>
                  <ChevronDown
                    onClick={(e) => { e.stopPropagation(); setOpen(!isOpen); }}
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isLandingActive ? "text-primary-foreground" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-0.5">
                    {entry.children.map((subItem) => renderNavLink(subItem, true))}
                  </div>
                )}
              </div>
            );
          }
          return renderNavLink(entry as NavItem);
        })}
      </nav>

      <div className="p-4 border-t border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-[hsl(var(--sidebar-foreground))]">{user?.username}</p>
            <p className="text-xs text-[hsl(var(--sidebar-foreground))]/50 truncate capitalize">{user?.role}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-[hsl(var(--sidebar-foreground))]/60 hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 z-30">
        {renderSidebar()}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-r">
                {renderSidebar()}
              </SheetContent>
            </Sheet>
            <span className="font-bold text-lg">ProERP</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
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

        {/* Page Content */}
        <div className="flex-1 p-6 lg:p-10 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
