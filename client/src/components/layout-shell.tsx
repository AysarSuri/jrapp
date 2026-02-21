import { useState, useEffect, useCallback } from "react";
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
  HandCoins
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

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const [location] = useLocation();
  const { t, i18n } = useTranslation();
  const { mutate: logout } = useLogout();
  const { data: user } = useUser();
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check system preference on mount
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
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
    document.dir = (lng === 'en' || lng === 'tr') ? 'ltr' : 'rtl';
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

  const supplierSubRoutes = [
    "/supplier-management",
    "/suppliers",
    "/purchase-invoice-usd",
    "/purchase-invoice-iqd",
    "/supplier-payments",
    "/supplier-adjustments",
    "/supplier-statement",
  ];

  const bankSubRoutes = [
    "/banks",
    "/bank-receipts",
    "/bank-payments",
    "/bank-statement",
  ];

  const clearanceSubRoutes = [
    "/customs-clearances",
    "/clearance-receipts",
    "/clearance-payments",
    "/clearance-statement",
  ];

  const officeSubRoutes = [
    "/transfer-offices",
    "/office-receipts",
    "/office-payments",
    "/office-statement",
  ];

  const expenseSubRoutes = [
    "/expense-types",
    "/expenses",
  ];

  const externalDebtSubRoutes = [
    "/external-debts",
    "/external-debt-receipts",
    "/external-debt-payments",
    "/external-debt-statement",
  ];

  const isSupplierSection = supplierSubRoutes.includes(location);
  const isBankSection = bankSubRoutes.includes(location);
  const isClearanceSection = clearanceSubRoutes.includes(location);
  const isOfficeSection = officeSubRoutes.includes(location);
  const isExpenseSection = expenseSubRoutes.includes(location);
  const isExternalDebtSection = externalDebtSubRoutes.includes(location);
  const [supplierOpen, setSupplierOpen] = useState(isSupplierSection);
  const [bankOpen, setBankOpen] = useState(isBankSection);
  const [clearanceOpen, setClearanceOpen] = useState(isClearanceSection);
  const [officeOpen, setOfficeOpen] = useState(isOfficeSection);
  const [expenseOpen, setExpenseOpen] = useState(isExpenseSection);
  const [externalDebtOpen, setExternalDebtOpen] = useState(isExternalDebtSection);

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

  type NavItem = { href: string; icon: any; label: string };
  type NavEntry = NavItem | { type: 'group'; label: string; icon: any; children: NavItem[] };

  const supplierNavItems: NavItem[] = [
    { href: "/suppliers", icon: Truck, label: "Suppliers" },
    { href: "/purchase-invoice-usd", icon: Receipt, label: "Purchase Invoice USD" },
    { href: "/purchase-invoice-iqd", icon: Receipt, label: "Purchase Invoice IQD" },
    { href: "/supplier-payments", icon: Banknote, label: "Supplier Payments" },
    { href: "/supplier-adjustments", icon: ArrowDownToLine, label: "Supplier Adjustments" },
    { href: "/supplier-statement", icon: FileText, label: "Supplier Account Statement" },
  ];

  const bankNavItems: NavItem[] = [
    { href: "/banks", icon: Landmark, label: "Banks" },
    { href: "/bank-receipts", icon: ArrowDownToLine, label: "Bank Receipts" },
    { href: "/bank-payments", icon: ArrowUpFromLine, label: "Bank Payments" },
    { href: "/bank-statement", icon: FileText, label: "Bank Account Statement" },
  ];

  const clearanceNavItems: NavItem[] = [
    { href: "/customs-clearances", icon: ShieldCheck, label: "Customs Clearances" },
    { href: "/clearance-receipts", icon: ArrowDownToLine, label: "Clearance Receipts" },
    { href: "/clearance-payments", icon: ArrowUpFromLine, label: "Clearance Payments" },
    { href: "/clearance-statement", icon: FileText, label: "Clearance Account Statement" },
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
    { href: "/external-debt-statement", icon: FileText, label: "External Debt Statement" },
  ];

  const sidebarItems: NavEntry[] = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/products", icon: Package, label: "Products" },
    { href: "/units", icon: Ruler, label: "Units" },
    { href: "/categories", icon: FolderOpen, label: "Categories" },
    { href: "/customers", icon: Users, label: "Customers" },
    { type: 'group', label: "Supplier Management", icon: ClipboardList, children: supplierNavItems },
    { type: 'group', label: "Bank Management", icon: Landmark, children: bankNavItems },
    { type: 'group', label: "Clearance Management", icon: ShieldCheck, children: clearanceNavItems },
    { type: 'group', label: "Office Management", icon: Building, children: officeNavItems },
    { type: 'group', label: "Expense Management", icon: Receipt, children: expenseNavItems },
    { type: 'group', label: "External Debt Management", icon: HandCoins, children: externalDebtNavItems },
    { href: "/addresses", icon: MapPin, label: "Addresses" },
    { href: "/warehouses", icon: Warehouse, label: "Warehouses" },
    { href: "/representatives", icon: UserCheck, label: "Representatives" },
    { href: "/accounts", icon: CreditCard, label: "Accounts" },
    { href: "/invoices", icon: FileText, label: "Invoices" },
    { href: "/transactions", icon: ArrowRightLeft, label: "Transactions" },
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
        <span className={indent ? "text-sm" : ""}>{t(item.label)}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6 border-b border-border/50">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          ProERP
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Enterprise Management</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {sidebarItems.map((entry) => {
          if ('type' in entry && entry.type === 'group') {
            const groupMap: Record<string, { isOpen: boolean; setOpen: (v: boolean) => void; isActive: boolean }> = {
              "Supplier Management": { isOpen: supplierOpen, setOpen: setSupplierOpen, isActive: isSupplierSection },
              "Bank Management": { isOpen: bankOpen, setOpen: setBankOpen, isActive: isBankSection },
              "Clearance Management": { isOpen: clearanceOpen, setOpen: setClearanceOpen, isActive: isClearanceSection },
              "Office Management": { isOpen: officeOpen, setOpen: setOfficeOpen, isActive: isOfficeSection },
              "Expense Management": { isOpen: expenseOpen, setOpen: setExpenseOpen, isActive: isExpenseSection },
              "External Debt Management": { isOpen: externalDebtOpen, setOpen: setExternalDebtOpen, isActive: isExternalDebtSection },
            };
            const group = groupMap[entry.label] || { isOpen: false, setOpen: () => {}, isActive: false };
            const isOpen = group.isOpen;
            const setOpen = group.setOpen;
            const isActiveSection = group.isActive;
            const isSupplierGroup = entry.label === "Supplier Management";
            const landingRoute = isSupplierGroup ? "/supplier-management" : entry.children[0]?.href || "/";
            const isLandingActive = location === landingRoute;
            const testIdName = entry.label.toLowerCase().replace(/\s+/g, '-');
            return (
              <div key={entry.label} className="space-y-0.5">
                <button
                  onClick={() => {
                    if (!isOpen) setOpen(true);
                    if (isSupplierGroup) navigate("/supplier-management");
                    else setOpen(!isOpen);
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
        <SidebarContent />
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
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="font-bold text-lg">ProERP</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
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
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
