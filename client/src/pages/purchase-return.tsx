import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import PurchaseReturnUsdPage from "./purchase-return-usd";
import PurchaseReturnIqdPage from "./purchase-return-iqd";

export default function PurchaseReturnPage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:purchase-return"
      UsdComponent={PurchaseReturnUsdPage}
      IqdComponent={PurchaseReturnIqdPage}
      testId="select-purchase-return-currency"
      scope="purchase"
    />
  );
}
