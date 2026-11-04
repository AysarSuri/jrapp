import { useEffect, useState, ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { useDefaultCurrency, getCurrencyMeta } from "@/hooks/use-default-currency";
import { getPurchaseFormCurrencies, getSalesDefaultCurrency, getSalesFormCurrencies, getPurchaseDefaultCurrency } from "@/pages/settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Cur = "USD" | "IQD";

interface Props {
  storageKey: string;
  UsdComponent: ComponentType<any>;
  IqdComponent: ComponentType<any>;
  testId?: string;
  scope?: "sales" | "purchase";
}

export default function CurrencyPageSwitcher({ storageKey, UsdComponent, IqdComponent, testId, scope }: Props) {
  const { t } = useTranslation();
  const { code: defaultCur } = useDefaultCurrency();
  const allowed = scope === "purchase" ? getPurchaseFormCurrencies() : getSalesFormCurrencies();
  const allowedSet = new Set(allowed.filter((c) => c === "USD" || c === "IQD"));
  const fallback = (scope === "purchase" ? getPurchaseDefaultCurrency() : getSalesDefaultCurrency()) as Cur;

  const [currency, setCurrency] = useState<Cur>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if ((saved === "USD" || saved === "IQD") && (!allowedSet.size || allowedSet.has(saved))) return saved as Cur;
    if (fallback === "USD" || fallback === "IQD") return fallback;
    return defaultCur === "USD" ? "USD" : "IQD";
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, currency); } catch {}
  }, [storageKey, currency]);

  const usdMeta = getCurrencyMeta("USD");
  const iqdMeta = getCurrencyMeta("IQD");

  return (
    <div>
      <div className="flex items-center gap-3 px-6 pt-4 pb-2 bg-amber-50/40 dark:bg-amber-950/10 border-b border-amber-200/50 dark:border-amber-900/30">
        <Label className="!text-base !font-bold mb-0">{t("Currency")}:</Label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as Cur)}>
          <SelectTrigger className="w-56" data-testid={testId || "select-page-currency"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(!allowedSet.size || allowedSet.has("USD")) && (
            <SelectItem value="USD" data-testid="opt-cur-usd">
              <span className="flex items-center gap-2">
                <span>{usdMeta.flag}</span>
                <span className="font-bold">{usdMeta.symbol}</span>
                <span>USD</span>
              </span>
            </SelectItem>
            )}
            {(!allowedSet.size || allowedSet.has("IQD")) && (
            <SelectItem value="IQD" data-testid="opt-cur-iqd">
              <span className="flex items-center gap-2">
                <span>{iqdMeta.flag}</span>
                <span className="font-bold">{iqdMeta.symbol}</span>
                <span>IQD</span>
              </span>
            </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      {currency === "USD" ? <UsdComponent /> : <IqdComponent />}
    </div>
  );
}
