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

const DEFAULT_CURRENCY_DECIMALS: Record<string, number> = {
  IQD: 0, USD: 2, EUR: 2, IRR: 0, GBP: 2, TRY: 2, CNY: 2,
};

function clampDecimals(n: unknown, fallback = 2): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(4, Math.round(v)));
}

function readSettings(): { defaultCurrency: string; decimalPlaces: number; currencyDecimals: Record<string, number> } {
  const currencyDecimals = { ...DEFAULT_CURRENCY_DECIMALS };
  try {
    const raw = localStorage.getItem(GENERAL_SETTINGS_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      const defaultCurrency = CURRENCY_META[obj.defaultCurrency] ? obj.defaultCurrency : "IQD";
      const stored = obj.currencyDecimals && typeof obj.currencyDecimals === "object" ? obj.currencyDecimals : {};
      for (const code of Object.keys(CURRENCY_META)) {
        if (typeof stored[code] === "number") currencyDecimals[code] = clampDecimals(stored[code], currencyDecimals[code] ?? 2);
        else if (code === defaultCurrency && typeof obj.decimalPlaces === "number") currencyDecimals[code] = clampDecimals(obj.decimalPlaces, currencyDecimals[code] ?? 2);
      }
      return {
        defaultCurrency,
        decimalPlaces: currencyDecimals[defaultCurrency] ?? 2,
        currencyDecimals,
      };
    }
  } catch {}
  return { defaultCurrency: "IQD", decimalPlaces: currencyDecimals.IQD ?? 0, currencyDecimals };
}

export function getCurrencyDecimalPlaces(currencyCode?: string): number {
  const s = readSettings();
  const code = currencyCode || s.defaultCurrency;
  return clampDecimals(s.currencyDecimals[code], s.decimalPlaces);
}

export function currencyInputStep(currencyCode?: string): string {
  const dp = getCurrencyDecimalPlaces(currencyCode);
  if (dp <= 0) return "1";
  return (1 / 10 ** dp).toFixed(dp);
}

export function formatAmountInput(value: number | string, currencyCode?: string): string {
  const dp = getCurrencyDecimalPlaces(currencyCode);
  const num = typeof value === "string" ? parseFloat(value || "0") : (value || 0);
  if (!Number.isFinite(num)) return (0).toFixed(dp);
  return num.toFixed(dp);
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

export function productUnitPrice(
  product: {
    bigUnit?: string;
    smallUnit?: string;
    bigUnitPriceUsd?: string | null;
    bigUnitPriceIqd?: string | null;
    smallUnitPriceUsd?: string | null;
    smallUnitPriceIqd?: string | null;
    bigUnitBuyPriceUsd?: string | null;
    bigUnitBuyPriceIqd?: string | null;
    smallUnitBuyPriceUsd?: string | null;
    smallUnitBuyPriceIqd?: string | null;
  },
  currency: string,
  kind: "sell" | "buy" = "sell",
  unitName?: string,
): string {
  const isUsd = currency === "USD";
  const isSmall = !!unitName && unitName === product.smallUnit;
  if (kind === "buy") {
    if (isSmall) return String((isUsd ? product.smallUnitBuyPriceUsd : product.smallUnitBuyPriceIqd) || "0");
    return String((isUsd ? product.bigUnitBuyPriceUsd : product.bigUnitBuyPriceIqd) || "0");
  }
  if (isSmall) return String((isUsd ? product.smallUnitPriceUsd : product.smallUnitPriceIqd) || "0");
  return String((isUsd ? product.bigUnitPriceUsd : product.bigUnitPriceIqd) || "0");
}

export function formatAmount(value: number | string, currencyCode?: string, decimalPlaces?: number): string {
  const s = readSettings();
  const code = currencyCode || s.defaultCurrency;
  const dp = typeof decimalPlaces === "number" ? decimalPlaces : getCurrencyDecimalPlaces(code);
  const num = typeof value === "string" ? parseFloat(value || "0") : (value || 0);
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const meta = getCurrencyMeta(code);
  return `${formatted} ${meta.symbol}`;
}
