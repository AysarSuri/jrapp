import { useEffect, useState } from "react";

const GENERAL_SETTINGS_KEY = "erp_general_settings";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  flag: string;
  decimalPlaces: number;
}

const CURRENCY_META: Record<string, { symbol: string; flag: string }> = {
  IQD: { symbol: "د.ع", flag: "🇮🇶" },
  USD: { symbol: "$",   flag: "🇺🇸" },
  EUR: { symbol: "€",   flag: "🇪🇺" },
  IRR: { symbol: "﷼",   flag: "🇮🇷" },
  GBP: { symbol: "£",   flag: "🇬🇧" },
  TRY: { symbol: "₺",   flag: "🇹🇷" },
  CNY: { symbol: "¥",   flag: "🇨🇳" },
};

export function getCurrencyMeta(code: string) {
  return CURRENCY_META[code] || { symbol: code, flag: "💱" };
}

function readSettings(): { defaultCurrency: string; decimalPlaces: number } {
  try {
    const raw = localStorage.getItem(GENERAL_SETTINGS_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return {
        defaultCurrency: CURRENCY_META[obj.defaultCurrency] ? obj.defaultCurrency : "IQD",
        decimalPlaces: typeof obj.decimalPlaces === "number" ? obj.decimalPlaces : 2,
      };
    }
  } catch {}
  return { defaultCurrency: "IQD", decimalPlaces: 2 };
}

export function useDefaultCurrency(): CurrencyInfo {
  const [info, setInfo] = useState<CurrencyInfo>(() => {
    const s = readSettings();
    const m = getCurrencyMeta(s.defaultCurrency);
    return { code: s.defaultCurrency, symbol: m.symbol, flag: m.flag, decimalPlaces: s.decimalPlaces };
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === GENERAL_SETTINGS_KEY || e.key === null) {
        const s = readSettings();
        const m = getCurrencyMeta(s.defaultCurrency);
        setInfo({ code: s.defaultCurrency, symbol: m.symbol, flag: m.flag, decimalPlaces: s.decimalPlaces });
      }
    };
    window.addEventListener("storage", onStorage);
    const t = setInterval(() => {
      const s = readSettings();
      setInfo(prev => (prev.code !== s.defaultCurrency || prev.decimalPlaces !== s.decimalPlaces)
        ? { code: s.defaultCurrency, symbol: getCurrencyMeta(s.defaultCurrency).symbol, flag: getCurrencyMeta(s.defaultCurrency).flag, decimalPlaces: s.decimalPlaces }
        : prev);
    }, 1500);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(t); };
  }, []);

  return info;
}

export function formatAmount(value: number | string, currencyCode?: string, decimalPlaces?: number): string {
  const s = readSettings();
  const code = currencyCode || s.defaultCurrency;
  const dp = typeof decimalPlaces === "number" ? decimalPlaces : s.decimalPlaces;
  const num = typeof value === "string" ? parseFloat(value || "0") : (value || 0);
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const meta = getCurrencyMeta(code);
  return `${formatted} ${meta.symbol}`;
}
