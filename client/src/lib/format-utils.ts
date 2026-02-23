import i18n from "./i18n";

export function fmtUsd(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function fmtIqd(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function usd(n: number | string): string {
  const formatted = fmtUsd(n);
  const lang = i18n.language;
  if (lang === "ar" || lang === "ckb") {
    return `${formatted}$`;
  }
  return `$${formatted}`;
}
