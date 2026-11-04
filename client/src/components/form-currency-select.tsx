import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCY_OPTIONS } from "@/pages/settings";

interface FormCurrencySelectProps {
  value: string;
  onValueChange: (code: string) => void;
  codes: string[];
  testId?: string;
  disabled?: boolean;
}

export function FormCurrencySelect({ value, onValueChange, codes, testId, disabled }: FormCurrencySelectProps) {
  const { t } = useTranslation();
  const options = codes
    .map((code) => CURRENCY_OPTIONS.find((c) => c.code === code))
    .filter(Boolean) as typeof CURRENCY_OPTIONS;
  const selected = CURRENCY_OPTIONS.find((c) => c.code === value) || options[0];
  const lang = i18n.language || "en";

  if (options.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{t("Currency")}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled || options.length === 1}>
        <SelectTrigger
          className={`h-11 text-sm font-bold rounded-xl border-2 ${selected?.color.border || ""} ${selected?.color.bg || ""}`}
          data-testid={testId || "select-form-currency"}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((c) => {
            const localized = lang === "ar" ? c.nameAr : lang === "ckb" ? c.nameKu : lang === "tr" ? c.nameTr : c.nameEn;
            return (
              <SelectItem key={c.code} value={c.code} className={`${c.color.bg} ${c.color.text}`}>
                <span className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full ${c.color.badge} text-white text-[11px] font-black flex items-center justify-center`}>{c.symbol}</span>
                  <span>{c.flag}</span>
                  <span className="font-bold">{localized}</span>
                  <span className="text-xs opacity-70">({c.code})</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
