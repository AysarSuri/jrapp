import { useTranslation } from "react-i18next";
import { Boxes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function MaterialManagementPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('Material Management')}</h1>
        <p className="text-muted-foreground mt-1">{t('Material Management')}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Boxes className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">{t('Material Management')}</h2>
        </CardContent>
      </Card>
    </div>
  );
}
