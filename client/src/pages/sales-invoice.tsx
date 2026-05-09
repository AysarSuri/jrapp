import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import SalesInvoiceUsdPage from "./sales-invoice-usd";
import SalesInvoiceIqdPage from "./sales-invoice-iqd";

export default function SalesInvoicePage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:sales-invoice"
      UsdComponent={SalesInvoiceUsdPage}
      IqdComponent={SalesInvoiceIqdPage}
      testId="select-sales-invoice-currency"
    />
  );
}
