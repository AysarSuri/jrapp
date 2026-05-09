import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import CustomerReceiptUsdPage from "./customer-receipt-usd";
import CustomerReceiptIqdPage from "./customer-receipt-iqd";

export default function CustomerReceiptPage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:customer-receipt"
      UsdComponent={CustomerReceiptUsdPage}
      IqdComponent={CustomerReceiptIqdPage}
      testId="select-customer-receipt-currency"
    />
  );
}
