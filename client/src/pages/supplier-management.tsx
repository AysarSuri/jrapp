import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Undo2, ArrowDownToLine, FileSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { IconSupplierList, IconExpenseEntry, IconDinar, IconInventory, IconSupplierOrderUsd, IconSupplierOrderIqd } from "@/components/erp-icons";

export default function SupplierManagementPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const sections = [
    {
      href: "/suppliers",
      icon: IconSupplierList,
      label: "Suppliers",
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
    },
    {
      href: "/purchase-invoice-usd",
      icon: IconExpenseEntry,
      label: "Purchase Invoice USD",
      gradient: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    },
    {
      href: "/purchase-invoice-iqd",
      icon: IconExpenseEntry,
      label: "Purchase Invoice IQD",
      gradient: "from-orange-500 to-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      hoverBorder: "hover:border-orange-300 dark:hover:border-orange-700",
    },
    {
      href: "/supplier-payments",
      icon: IconDinar,
      label: "Supplier Payments",
      gradient: "from-purple-500 to-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      hoverBorder: "hover:border-purple-300 dark:hover:border-purple-700",
    },
    {
      href: "/purchase-return-usd",
      icon: Undo2,
      label: "Purchase Return USD",
      gradient: "from-pink-500 to-pink-600",
      bg: "bg-pink-50 dark:bg-pink-900/20",
      iconColor: "text-pink-600 dark:text-pink-400",
      hoverBorder: "hover:border-pink-300 dark:hover:border-pink-700",
    },
    {
      href: "/purchase-return-iqd",
      icon: Undo2,
      label: "Purchase Return IQD",
      gradient: "from-fuchsia-500 to-fuchsia-600",
      bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20",
      iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
      hoverBorder: "hover:border-fuchsia-300 dark:hover:border-fuchsia-700",
    },
    {
      href: "/supplier-adjustments",
      icon: ArrowDownToLine,
      label: "Supplier Adjustments",
      gradient: "from-rose-500 to-rose-600",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      iconColor: "text-rose-600 dark:text-rose-400",
      hoverBorder: "hover:border-rose-300 dark:hover:border-rose-700",
    },
    {
      href: "/supplier-statement-usd",
      icon: FileSearch,
      label: "Supplier Statement USD",
      gradient: "from-cyan-500 to-cyan-600",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-700",
    },
    {
      href: "/supplier-statement-iqd",
      icon: FileSearch,
      label: "Supplier Statement IQD",
      gradient: "from-teal-500 to-teal-600",
      bg: "bg-teal-50 dark:bg-teal-900/20",
      iconColor: "text-teal-600 dark:text-teal-400",
      hoverBorder: "hover:border-teal-300 dark:hover:border-teal-700",
    },
    {
      href: "/supplier-debts",
      icon: IconInventory,
      label: "Supplier Debts List",
      gradient: "from-red-500 to-red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400",
      hoverBorder: "hover:border-red-300 dark:hover:border-red-700",
    },
    {
      href: "/supplier-order-usd",
      icon: IconSupplierOrderUsd,
      label: "Supplier Order USD",
      gradient: "from-sky-500 to-sky-600",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      iconColor: "text-sky-600 dark:text-sky-400",
      hoverBorder: "hover:border-sky-300 dark:hover:border-sky-700",
    },
    {
      href: "/supplier-order-iqd",
      icon: IconSupplierOrderIqd,
      label: "Supplier Order IQD",
      gradient: "from-amber-500 to-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
    },
  ];

  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Supplier Management")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t("Manage all supplier operations from one place")}</p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <div
              data-testid={`card-supplier-${section.href.replace(/\//g, '')}`}
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
