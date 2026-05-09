import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import BankStatementUsdPage from "./bank-statement-usd";
import BankStatementIqdPage from "./bank-statement-iqd";

export default function BankStatementPage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:bank-statement"
      UsdComponent={BankStatementUsdPage}
      IqdComponent={BankStatementIqdPage}
      testId="select-bank-statement-currency"
    />
  );
}
