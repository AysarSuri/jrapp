import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import AgentPaymentUsdPage from "./agent-payment-usd";
import AgentPaymentIqdPage from "./agent-payment-iqd";

export default function AgentPaymentPage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:agent-payment"
      UsdComponent={AgentPaymentUsdPage}
      IqdComponent={AgentPaymentIqdPage}
      testId="select-agent-payment-currency"
    />
  );
}
