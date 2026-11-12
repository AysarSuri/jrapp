import i18n from "./i18n";
import { getCurrencyDecimalPlaces, getCurrencyMeta } from "@/hooks/use-default-currency";

/** Plain number in standard form (en-US separators + currency decimal places). */
export function formatNumber(n: number | string, currencyCode: string = "IQD"): string {
  const num = typeof n === "string" ? parseFloat(n || "0") : n;
  if (!Number.isFinite(num)) {
    const dp = getCurrencyDecimalPlaces(currencyCode);
    return (0).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  const dp = getCurrencyDecimalPlaces(currencyCode);
  return num.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function fmtUsd(n: number | string): string {
  return formatNumber(n, "USD");
}

export function fmtIqd(n: number | string): string {
  return formatNumber(n, "IQD");
}

/** Format by currency code without symbol. */
export function fmtAmount(n: number | string, currencyCode: string = "IQD"): string {
  return formatNumber(n, currencyCode);
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} / ${month} / ${year}`;
}

export function usd(n: number | string): string {
  const formatted = fmtUsd(n);
  const lang = i18n.language;
  if (lang === "ar" || lang === "ckb") {
    return `${formatted}$`;
  }
  return `$${formatted}`;
}

/** Display amount with currency symbol in standard form. */
export function money(n: number | string, currencyCode: string = "IQD"): string {
  const formatted = formatNumber(n, currencyCode);
  const symbol = getCurrencyMeta(currencyCode).symbol;
  const lang = i18n.language;
  if (currencyCode === "USD") {
    if (lang === "ar" || lang === "ckb") return `${formatted}$`;
    return `$${formatted}`;
  }
  return `${formatted} ${symbol}`;
}
