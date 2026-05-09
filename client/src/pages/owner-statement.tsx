import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import OwnerStatementUsdPage from "./owner-statement-usd";
import OwnerStatementIqdPage from "./owner-statement-iqd";

export default function OwnerStatementPage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:owner-statement"
      UsdComponent={OwnerStatementUsdPage}
      IqdComponent={OwnerStatementIqdPage}
      testId="select-owner-statement-currency"
    />
  );
}
