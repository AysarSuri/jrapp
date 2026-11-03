import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowRight, Banknote, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
export default function CardManagementPage() {
  const { t } = useTranslation();

  const sections = [
    {
      href: "/sm/payment-cards",
      icon: Banknote,
      label: "Payment Cards",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      href: "/sm/card-cashier",
      icon: CreditCard,
      label: "Card Cashier",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("Card Management")}</h1>
          <p className="text-muted-foreground text-sm">{t("Manage all card operations from one place")}</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card
              data-testid={`card-cards-${section.href.replace(/\//g, "")}`}
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
