import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  Users,
  Receipt,
  Undo2,
  ArrowRight,
  DollarSign,
  Banknote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SalesManagementPage() {
  const { t } = useTranslation();

  const sections = [
    {
      href: "/customers",
      icon: Users,
      label: "Customers",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      href: "/sales-invoice-usd",
      icon: Receipt,
      label: "Sales Invoice USD",
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      href: "/sales-invoice-iqd",
      icon: Receipt,
      label: "Sales Invoice IQD",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      href: "/sales-return-usd",
      icon: Undo2,
      label: "Sales Return USD",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      href: "/sales-return-iqd",
      icon: Undo2,
      label: "Sales Return IQD",
      color: "from-rose-500 to-rose-600",
      bgColor: "bg-rose-50 dark:bg-rose-950/30",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
    {
      href: "/customer-receipt-usd",
      icon: DollarSign,
      label: "Customer Receipt USD",
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      href: "/customer-receipt-iqd",
      icon: Banknote,
      label: "Customer Receipt IQD",
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Sales Management")}</h1>
        <p className="text-muted-foreground mt-1">{t("Manage all sales operations from one place")}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card
              data-testid={`card-sales-${section.href.replace(/\//g, '')}`}
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
