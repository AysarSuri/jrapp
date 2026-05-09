import CurrencyPageSwitcher from "@/components/currency-page-switcher";
import AgentStatementUsdPage from "./agent-statement-usd";
import AgentStatementIqdPage from "./agent-statement-iqd";

export default function AgentStatementPage() {
  return (
    <CurrencyPageSwitcher
      storageKey="page-cur:agent-statement"
      UsdComponent={AgentStatementUsdPage}
      IqdComponent={AgentStatementIqdPage}
      testId="select-agent-statement-currency"
    />
  );
}
