import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import OfficeStatementUsdPage from "./office-statement-usd";
import OfficeStatementIqdPage from "./office-statement-iqd";

export default function OfficeStatementPage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:office-statement"
      UsdComponent={OfficeStatementUsdPage}
      IqdComponent={OfficeStatementIqdPage}
      testId="select-office-statement-currency"
    />
  );
}
