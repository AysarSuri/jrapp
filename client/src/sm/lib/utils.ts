import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** خطأ يحمل رمز حالة HTTP حتى يتمكن المعالج المركزي من اكتشاف 401 عبر .status */
export class FetchError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message || `HTTP ${status}`);
    this.name = "FetchError";
    this.status = status;
  }
}

/* جسر مركزي لانتهاء الجلسة (401): يسجّله App.tsx مرة واحدة عند الإقلاع، فيُستدعى
   من داخل fetchJson لأي طلب 401 — حتى الطلبات خارج React Query (useEffect/سلاسل
   الوعود) تُعيد التوجيه لتسجيل الدخول، لا فقط طلبات الكويري/الميوتيشن. */
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

/** جلب JSON مع رمي خطأ يحمل .status عند الاستجابة غير الناجحة (خاصة 401)
 *  حتى يقوم معالج 401 المركزي بإعادة التوجيه لتسجيل الدخول بدل عرض شاشة معطلة.
 *  عند 401 يُستدعى الجسر المركزي مباشرةً قبل الرمي، حتى لو ابتلع المستدعي الخطأ
 *  عبر .catch تبقى إعادة التوجيه فعّالة. */
export async function fetchJson<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { credentials: "include", ...init });
  if (!res.ok) {
    if (res.status === 401) {
      try { unauthorizedHandler?.(); } catch { /* ignore */ }
    }
    throw new FetchError(res.status);
  }
  return res.json() as Promise<T>;
}

/** مثل fetchJson لكن لا يحلّل جسم الاستجابة — لطلبات الكتابة التي قد تُعيد 204
 *  أو جسماً فارغاً (مثل DELETE). عند 401 يُستدعى الجسر المركزي قبل رمي خطأ
 *  يحمل .status حتى تبقى إعادة التوجيه لتسجيل الدخول فعّالة. */
export async function fetchOk(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, { credentials: "include", ...init });
  if (!res.ok) {
    if (res.status === 401) {
      try { unauthorizedHandler?.(); } catch { /* ignore */ }
    }
    throw new FetchError(res.status);
  }
  return res;
}

/* ── Global formatting config — set once when app settings load ── */
export const appFmtConfig = {
  decimalPlaces: 0,
  currency: "IQD",
};

export function setAppFmtConfig(opts: { decimalPlaces?: number; currency?: string }) {
  if (opts.decimalPlaces !== undefined) appFmtConfig.decimalPlaces = opts.decimalPlaces;
  if (opts.currency !== undefined) appFmtConfig.currency = opts.currency;
}

/** تنسيق مبلغ مالي — فاصلة آلاف + عدد الخانات العشرية من الإعدادات */
export function fmtN(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: appFmtConfig.decimalPlaces,
    maximumFractionDigits: appFmtConfig.decimalPlaces,
    useGrouping: true,
  }).format(n);
}

/** تنسيق مبلغ مع رمز العملة */
export function fmtMoney(n: number, currencyOverride?: string): string {
  const cur = currencyOverride ?? appFmtConfig.currency;
  return `${fmtN(n)} ${cur}`;
}

/** تنسيق الكميات — خانات عشرية ثابتة (لا تتأثر بإعداد العملة) */
export function fmtQty(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(n);
}

/** يقسم كمية مخزّنة بالوحدة الصغرى إلى جزأين (كبرى + صغرى) للعرض.
 *  - إذا لم يكن هناك تقسيم فعلي (cf<=1 أو لا توجد وحدة صغرى مختلفة) تُعاد الكمية
 *    كما هي على أنها "كبرى" مع الوحدة المتاحة و hasTwo=false.
 *  - يحافظ على الإشارة (سالب/موجب) لدعم صافي الحركات. */
export function splitUnitQty(
  smallQty: number,
  conversionFactor?: number | null,
  bigUnit?: string | null,
  smallUnit?: string | null,
): { bigQty: number; smallQty: number; bigUnit: string; smallUnit: string; hasTwo: boolean } {
  const cf = conversionFactor && conversionFactor > 1 ? conversionFactor : 1;
  const big = (bigUnit ?? "").trim();
  const small = (smallUnit ?? "").trim();
  const hasTwo = cf > 1 && !!small && !!big && small !== big;
  if (!hasTwo) {
    return { bigQty: smallQty, smallQty: 0, bigUnit: big || small, smallUnit: small, hasTwo: false };
  }
  const sign = smallQty < 0 ? -1 : 1;
  const abs = Math.abs(smallQty);
  const bigQty = Math.floor(abs / cf) * sign;
  const rem = (abs % cf) * sign;
  return { bigQty, smallQty: rem, bigUnit: big, smallUnit: small, hasTwo: true };
}

/** نص عرض الكمية: "كمية-كبرى وحدة-كبرى و كمية-صغرى وحدة-صغرى".
 *  - يُخفي الجزء الذي كميته 0.
 *  - إذا الوحدتان متساويتان (أو لا يوجد تقسيم) يعرض الكبرى فقط.
 *  - إذا كان كلا الجزأين 0 يعرض "0 وحدة-كبرى". */
export function formatUnitQty(
  smallQty: number,
  conversionFactor?: number | null,
  bigUnit?: string | null,
  smallUnit?: string | null,
): string {
  const p = splitUnitQty(smallQty, conversionFactor, bigUnit, smallUnit);
  if (!p.hasTwo) {
    return `${fmtQty(p.bigQty)}${p.bigUnit ? " " + p.bigUnit : ""}`;
  }
  const parts: string[] = [];
  if (p.bigQty !== 0) parts.push(`${fmtQty(p.bigQty)} ${p.bigUnit}`);
  if (p.smallQty !== 0) parts.push(`${fmtQty(p.smallQty)} ${p.smallUnit}`);
  if (parts.length === 0) parts.push(`${fmtQty(0)} ${p.bigUnit}`);
  return parts.join(" و ");
}
