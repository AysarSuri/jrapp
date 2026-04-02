import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconCustomers, IconSupplierList, IconAddress, IconAgent } from "@/components/erp-icons";

export default function AgentManagementPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const sections = [
    {
      href: "/agent-clients",
      icon: IconCustomers,
      label: "Agent Clients",
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
    },
    {
      href: "/agent-product-load",
      icon: IconSupplierList,
      label: "Agent Product Load",
      gradient: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    },
    {
      href: "/agent-receipt",
      icon: IconAgent,
      label: "Receipt from Agent",
      gradient: "from-violet-500 to-violet-600",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      iconColor: "text-violet-600 dark:text-violet-400",
      hoverBorder: "hover:border-violet-300 dark:hover:border-violet-700",
    },
    {
      href: "/agent-gps",
      icon: IconAddress,
      label: "Agent GPS",
      gradient: "from-orange-500 to-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      hoverBorder: "hover:border-orange-300 dark:hover:border-orange-700",
    },
  ];

  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Agent Management")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t("Manage all agent operations from one place")}</p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <div
              data-testid={`card-agent-${section.href.replace(/\//g, '')}`}
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
