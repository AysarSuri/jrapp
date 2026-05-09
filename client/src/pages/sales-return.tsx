import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import SalesReturnUsdPage from "./sales-return-usd";
import SalesReturnIqdPage from "./sales-return-iqd";

export default function SalesReturnPage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:sales-return"
      UsdComponent={SalesReturnUsdPage}
      IqdComponent={SalesReturnIqdPage}
      testId="select-sales-return-currency"
    />
  );
}
