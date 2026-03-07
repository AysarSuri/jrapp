import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Package,
  Ruler,
  FolderOpen,
  Users,
  Truck,
  MapPin,
  Warehouse,
  UserCheck,
  Building,
  Landmark,
  ShieldCheck,
  CreditCard,
  FileText,
  Receipt,
  ArrowRightLeft,
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  LogOut,
  Menu,
  Moon,
  Sun,
  Globe,
  ChevronDown,
  ClipboardList,
  Tags,
  HandCoins,
  UserCog,
  ShoppingCart,
  Bell,
  Undo2,
  DollarSign,
  AlertTriangle,
  QrCode,
  Building2,
  Boxes,
} from "lucide-react";
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
    "/bank-statement",
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
    "/office-statement",
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
  ];

  const materialSubRoutes = [
    "/material-management",
    "/products",
    "/units",
    "/categories",
    "/inventory-report",
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
    "/sales-return-usd",
    "/sales-return-iqd",
    "/customer-receipt-usd",
    "/customer-receipt-iqd",
    "/agent-payment-usd",
    "/agent-payment-iqd",
    "/agent-statement-usd",
    "/agent-statement-iqd",
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
    if (isWarehouseSection) setWarehouseOpen(true);
  }, [isWarehouseSection]);

  useEffect(() => {
    if (isSalesSection) setSalesOpen(true);
  }, [isSalesSection]);

  type NavItem = { href: string; icon: any; label: string };
  type NavEntry = NavItem | { type: 'group'; label: string; icon: any; children: NavItem[] };

  const supplierNavItems: NavItem[] = [
    { href: "/suppliers", icon: Truck, label: "Suppliers" },
    { href: "/purchase-invoice-usd", icon: Receipt, label: "Purchase Invoice USD" },
    { href: "/purchase-invoice-iqd", icon: Receipt, label: "Purchase Invoice IQD" },
    { href: "/purchase-return-usd", icon: Undo2, label: "Purchase Return USD" },
    { href: "/purchase-return-iqd", icon: Undo2, label: "Purchase Return IQD" },
    { href: "/supplier-payments", icon: Banknote, label: "Supplier Payments" },
    { href: "/supplier-adjustments", icon: ArrowDownToLine, label: "Supplier Adjustments" },
    { href: "/supplier-statement-usd", icon: FileText, label: "Supplier Statement USD" },
    { href: "/supplier-statement-iqd", icon: FileText, label: "Supplier Statement IQD" },
    { href: "/supplier-debts", icon: DollarSign, label: "Supplier Debts" },
  ];

  const bankNavItems: NavItem[] = [
    { href: "/banks", icon: Landmark, label: "Banks" },
    { href: "/bank-receipts", icon: ArrowDownToLine, label: "Bank Receipts" },
    { href: "/bank-payments", icon: ArrowUpFromLine, label: "Bank Payments" },
    { href: "/bank-statement-usd", icon: DollarSign, label: "Bank Statement USD" },
    { href: "/bank-statement-iqd", icon: Banknote, label: "Bank Statement IQD" },
  ];

  const clearanceNavItems: NavItem[] = [
    { href: "/customs-clearances", icon: ShieldCheck, label: "Customs Clearances" },
    { href: "/clearance-receipts", icon: ArrowDownToLine, label: "Clearance Receipts" },
    { href: "/clearance-payments", icon: ArrowUpFromLine, label: "Clearance Payments" },
    { href: "/clearance-purchase-invoices", icon: FileText, label: "Clearance Purchase Invoices" },
    { href: "/clearance-statement-usd", icon: DollarSign, label: "Clearance Statement USD" },
    { href: "/clearance-statement-iqd", icon: Banknote, label: "Clearance Statement IQD" },
  ];

  const officeNavItems: NavItem[] = [
    { href: "/transfer-offices", icon: Building, label: "Transfer Offices" },
    { href: "/office-receipts", icon: ArrowDownToLine, label: "Office Receipts" },
    { href: "/office-payments", icon: ArrowUpFromLine, label: "Office Payments" },
    { href: "/office-statement", icon: FileText, label: "Office Account Statement" },
  ];

  const expenseNavItems: NavItem[] = [
    { href: "/expense-types", icon: Tags, label: "Expense Types" },
    { href: "/expenses", icon: Receipt, label: "Expenses" },
  ];

  const externalDebtNavItems: NavItem[] = [
    { href: "/external-debts", icon: HandCoins, label: "External Debts" },
    { href: "/external-debt-receipts", icon: ArrowDownToLine, label: "External Debt Receipts" },
    { href: "/external-debt-payments", icon: ArrowUpFromLine, label: "External Debt Payments" },
    { href: "/external-debt-statement-usd", icon: DollarSign, label: "External Debt Statement USD" },
    { href: "/external-debt-statement-iqd", icon: Banknote, label: "External Debt Statement IQD" },
  ];

  const ownerNavItems: NavItem[] = [
    { href: "/owners", icon: UserCog, label: "Owner Names" },
    { href: "/owner-withdrawals", icon: ArrowUpFromLine, label: "Owner Withdrawals" },
    { href: "/owner-returns", icon: ArrowDownToLine, label: "Owner Returns" },
    { href: "/owner-statement-usd", icon: DollarSign, label: "Owner Statement USD" },
    { href: "/owner-statement-iqd", icon: Banknote, label: "Owner Statement IQD" },
  ];

  const agentManagementNavItems: NavItem[] = [
    { href: "/agent-clients", icon: Users, label: "Agent Clients" },
    { href: "/agent-product-load", icon: Truck, label: "Agent Product Load" },
    { href: "/agent-gps", icon: MapPin, label: "Agent GPS" },
  ];

  const materialNavItems: NavItem[] = [
    { href: "/products", icon: Package, label: "Products" },
    { href: "/units", icon: Ruler, label: "Units" },
    { href: "/categories", icon: FolderOpen, label: "Categories" },
    { href: "/inventory-report", icon: ClipboardList, label: "Inventory Report" },
  ];

  const warehouseNavItems: NavItem[] = [
    { href: "/warehouses", icon: Warehouse, label: "Warehouses" },
    { href: "/warehouse-transfer", icon: ArrowRightLeft, label: "Warehouse Transfer" },
  ];

  const salesNavItems: NavItem[] = [
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/sales-invoice-usd", icon: Receipt, label: "Sales Invoice USD" },
    { href: "/sales-invoice-iqd", icon: Receipt, label: "Sales Invoice IQD" },
    { href: "/sales-return-usd", icon: Undo2, label: "Sales Return USD" },
    { href: "/sales-return-iqd", icon: Undo2, label: "Sales Return IQD" },
    { href: "/customer-receipt-usd", icon: DollarSign, label: "Customer Receipt USD" },
    { href: "/customer-receipt-iqd", icon: Banknote, label: "Customer Receipt IQD" },
    { href: "/agent-payment-usd", icon: DollarSign, label: "Customer Payment USD" },
    { href: "/agent-payment-iqd", icon: Banknote, label: "Customer Payment IQD" },
    { href: "/agent-statement-usd", icon: FileText, label: "Agent Statement USD" },
    { href: "/agent-statement-iqd", icon: FileText, label: "Agent Statement IQD" },
  ];

  const sidebarItems: NavEntry[] = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { type: 'group', label: "Sales Management", icon: ShoppingCart, children: salesNavItems },
    { type: 'group', label: "Supplier Management", icon: ClipboardList, children: supplierNavItems },
    { type: 'group', label: "Agent Management", icon: UserCheck, children: agentManagementNavItems },
    { type: 'group', label: "Material Management", icon: Boxes, children: materialNavItems },
    { type: 'group', label: "Bank Management", icon: Landmark, children: bankNavItems },
    { type: 'group', label: "Clearance Management", icon: ShieldCheck, children: clearanceNavItems },
    { type: 'group', label: "Office Management", icon: Building, children: officeNavItems },
    { type: 'group', label: "Expense Management", icon: Receipt, children: expenseNavItems },
    { type: 'group', label: "External Debt Management", icon: HandCoins, children: externalDebtNavItems },
    { type: 'group', label: "Owner Management", icon: UserCog, children: ownerNavItems },
    { href: "/addresses", icon: MapPin, label: "Addresses" },
    { type: 'group', label: "Warehouse Management", icon: Warehouse, children: warehouseNavItems },
    { href: "/product-damage", icon: AlertTriangle, label: "Product Damage" },
    { href: "/barcode-print", icon: QrCode, label: "Barcode Print" },
    { href: "/company-profile", icon: Building2, label: "Company Profile" },
    { href: "/currency-exchange", icon: ArrowRightLeft, label: "Currency Exchange" },
    { href: "/accounts", icon: CreditCard, label: "Accounts" },
    { href: "/user-management", icon: Users, label: "User Management" },
  ];

  const renderNavLink = (item: NavItem, indent = false) => {
    const isActive = location === item.href;
    const testId = `link-nav-${item.href.replace(/\//g, '') || 'dashboard'}`;
    return (
      <Link key={item.href} href={item.href} data-testid={testId} className={`
        flex items-center gap-3 ${indent ? 'px-4 py-2.5 ms-6' : 'px-4 py-3'} rounded-xl transition-all duration-200
        ${isActive
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }
      `}>
        <item.icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : ""}`} />
        <span className={`${indent ? "text-sm" : ""}`}>{t(item.label)}</span>
      </Link>
    );
  };

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6 border-b border-border/50">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-yellow-500 bg-clip-text text-transparent">
          ProERP
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Enterprise Management</p>
      </div>

      <nav ref={sidebarScrollRef} className="flex-1 p-4 space-y-1 overflow-y-auto">
        {sidebarItems.map((entry) => {
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
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-medium"
                      : isActiveSection
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <entry.icon className={`w-5 h-5 ${isLandingActive ? "text-primary-foreground" : ""}`} />
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

      <div className="p-4 border-t border-border/50 bg-muted/20">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
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
