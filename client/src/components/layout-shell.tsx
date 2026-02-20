import { Link, useLocation } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  CreditCard, 
  FileText, 
  ArrowLeftRight,
  LogOut,
  Languages,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useUser();
  const logout = useLogout();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const navItems = [
    { href: "/", label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: "/products", label: t('nav.products'), icon: Package },
    { href: "/clients", label: t('nav.clients'), icon: Users },
    { href: "/accounts", label: t('nav.accounts'), icon: CreditCard },
    { href: "/invoices", label: t('nav.invoices'), icon: FileText },
    { href: "/transactions", label: t('nav.transactions'), icon: ArrowLeftRight },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${i18n.language === 'ar' ? 'right-0 left-auto' : ''}
        ${isSidebarOpen && i18n.language === 'ar' ? 'translate-x-0' : i18n.language === 'ar' ? 'translate-x-full lg:translate-x-0' : ''}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              ERP System
            </h1>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-slate-400 hover:text-white"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                  `}>
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                <span className="font-bold text-sm text-white">
                  {user?.username?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                onClick={() => logout.mutate()}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-4 ml-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleLanguage}
              className="flex items-center gap-2"
            >
              <Languages className="w-4 h-4" />
              <span>{i18n.language === 'en' ? 'Arabic' : 'English'}</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto animate-enter">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
