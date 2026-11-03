import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconProduct, IconUnit, IconCategory, IconInventory } from "@/components/erp-icons";
export default function MaterialManagementPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const sections = [
    {
      href: "/products",
      icon: IconProduct,
      label: "Products",
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
    },
    {
      href: "/units",
      icon: IconUnit,
      label: "Units",
      gradient: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    },
    {
      href: "/categories",
      icon: IconCategory,
      label: "Categories",
      gradient: "from-amber-500 to-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
    },
    {
      href: "/inventory-report",
      icon: IconInventory,
      label: "Inventory Report",
      gradient: "from-purple-500 to-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      hoverBorder: "hover:border-purple-300 dark:hover:border-purple-700",
    },
  ];

  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Material Management')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('Material Management')}</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <div
              data-testid={`card-material-${section.href.replace(/\//g, '')}`}
              className={`group relative flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${section.hoverBorder}`}
            >
              <div className={`w-12 h-12 rounded-xl ${section.bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                <section.icon className={`w-6 h-6 ${section.iconColor}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-center leading-tight line-clamp-2">{t(section.label)}</span>
                <ArrowIcon className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 rounded-full bg-gradient-to-r ${section.gradient} transition-all duration-200 group-hover:w-8`} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
