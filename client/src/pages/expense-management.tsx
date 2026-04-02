import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { IconExpenseType, IconExpenseEntry } from "@/components/erp-icons";
import { Card, CardContent } from "@/components/ui/card";

export default function ExpenseManagementPage() {
  const { t } = useTranslation();

  const sections = [
    {
      href: "/expense-types",
      icon: IconExpenseType,
      label: "Expense Types",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      href: "/expenses",
      icon: IconExpenseEntry,
      label: "Expenses",
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Expense Management")}</h1>
        <p className="text-muted-foreground text-sm">{t("Manage all expense operations from one place")}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card
              data-testid={`card-expense-${section.href.replace(/\//g, '')}`}
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
