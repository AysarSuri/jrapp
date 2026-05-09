import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import PurchaseInvoiceUsdPage from "./purchase-invoice-usd";
import PurchaseInvoiceIqdPage from "./purchase-invoice-iqd";

export default function PurchaseInvoicePage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:purchase-invoice"
      UsdComponent={PurchaseInvoiceUsdPage}
      IqdComponent={PurchaseInvoiceIqdPage}
      testId="select-purchase-invoice-currency"
    />
  );
}
