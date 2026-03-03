import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  Package,
  Ruler,
  FolderOpen,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function MaterialManagementPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const sections = [
    {
      href: "/products",
      icon: Package,
      label: "Products",
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
    },
    {
      href: "/units",
      icon: Ruler,
      label: "Units",
      gradient: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    },
    {
      href: "/categories",
      icon: FolderOpen,
      label: "Categories",
      gradient: "from-amber-500 to-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
    },
    {
      href: "/inventory-report",
      icon: ClipboardList,
      label: "Inventory Report",
      gradient: "from-purple-500 to-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      hoverBorder: "hover:border-purple-300 dark:hover:border-purple-700",
    },
  ];

  const Arrow = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('Material Management')}</h1>
        <p className="text-muted-foreground mt-1">{t('Material Management')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} data-testid={`link-material-${section.href.replace(/\//g, '')}`}>
            <div className={`group relative overflow-hidden rounded-xl border bg-card p-6 transition-all duration-300 hover:shadow-lg ${section.hoverBorder} cursor-pointer`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              <div className="relative space-y-4">
                <div className={`w-12 h-12 rounded-lg ${section.bg} flex items-center justify-center`}>
                  <section.icon className={`w-6 h-6 ${section.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t(section.label)}</h3>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  <Arrow className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
