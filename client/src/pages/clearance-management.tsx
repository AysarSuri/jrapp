import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ClearanceManagementPage() {
  const { t } = useTranslation();

  const sections = [
    {
      href: "/customs-clearances",
      icon: ShieldCheck,
      label: "Customs Clearances",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      href: "/clearance-receipts",
      icon: ArrowDownToLine,
      label: "Clearance Receipts",
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      href: "/clearance-payments",
      icon: ArrowUpFromLine,
      label: "Clearance Payments",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Clearance Management")}</h1>
        <p className="text-muted-foreground mt-1">{t("Manage all clearance operations from one place")}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card
              data-testid={`card-clearance-${section.href.replace(/\//g, '')}`}
              className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-2 hover:border-primary/30 overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl ${section.bgColor} flex items-center justify-center`}>
                    <section.icon className={`w-7 h-7 ${section.iconColor}`} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mt-2">{t(section.label)}</h3>
                <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${section.color} mt-3`} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
