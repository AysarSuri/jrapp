import { useTranslation } from "react-i18next";

export default function SupplierManagementPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Supplier Management")}</h1>
        <p className="text-muted-foreground mt-1">{t("Manage all supplier operations from one place")}</p>
      </div>
    </div>
  );
}
