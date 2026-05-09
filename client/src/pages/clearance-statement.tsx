import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import ClearanceStatementUsdPage from "./clearance-statement-usd";
import ClearanceStatementIqdPage from "./clearance-statement-iqd";

export default function ClearanceStatementPage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:clearance-statement"
      UsdComponent={ClearanceStatementUsdPage}
      IqdComponent={ClearanceStatementIqdPage}
      testId="select-clearance-statement-currency"
    />
  );
}
