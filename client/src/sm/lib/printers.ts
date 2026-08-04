import { showAlert } from "@/sm/components/AlertDialog";

export const LOCAL_PRINTERS_KEY = "sm_printer_settings";

export type PrinterMap = Record<string, string>;

/** أسماء الطابعات المُهيّأة في صفحة الإعدادات (تُحفظ محلياً في المتصفّح). */
export function loadLocalPrinters(): PrinterMap {
  try {
    const raw = localStorage.getItem(LOCAL_PRINTERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalPrinters(data: PrinterMap) {
  localStorage.setItem(LOCAL_PRINTERS_KEY, JSON.stringify(data));
}

/** يتحقق من تحديد اسم طابعة الفواتير (الحرارية) قبل أي طباعة حرارية.
    يعرض رسالة احترافية ويُرجع false عند عدم تحديدها. */
export function requireInvoicePrinter(): boolean {
  const name = (loadLocalPrinters().printer_invoice || "").trim();
  if (!name) {
    showAlert({
      title: "لم يتم تحديد طابعة الفواتير",
      message: "يرجى اختيار طابعة الفواتير (الحرارية) من صفحة الإعدادات ← الطابعات قبل الطباعة.",
      variant: "printer",
    });
    return false;
  }
  return true;
}

/** يتحقق من تحديد اسم طابعة التقارير (A4) قبل أي طباعة A4.
    يعرض رسالة احترافية ويُرجع false عند عدم تحديدها (الإعداد محفوظ لكل جهاز). */
export function requireReportPrinter(): boolean {
  const name = (loadLocalPrinters().printer_report || "").trim();
  if (!name) {
    showAlert({
      title: "لم يتم تحديد طابعة التقارير",
      message: "يرجى اختيار طابعة التقارير (A4) من صفحة الإعدادات ← الطابعات قبل الطباعة.",
      variant: "printer",
    });
    return false;
  }
  return true;
}

/** فحص صامت لوجود اسم طابعة تقارير (A4) مُهيّأ — يُستخدم للتحكّم بإظهار زر الطباعة دون عرض رسالة. */
export function hasReportPrinter(): boolean {
  return !!(loadLocalPrinters().printer_report || "").trim();
}

/** فحص صامت لوجود اسم طابعة فواتير (حرارية) مُهيّأ — يُستخدم للتحكّم بإظهار زر الطباعة الحرارية دون رسالة. */
export function hasInvoicePrinter(): boolean {
  return !!(loadLocalPrinters().printer_invoice || "").trim();
}

// ─── شهادة QZ Tray ────────────────────────────────────────────────────────────
const QZ_CERT_KEY = "sm_qz_certificate";
const QZ_KEY_KEY  = "sm_qz_private_key";

export function loadQzCert(): { cert: string; privateKey: string } {
  return {
    cert:       localStorage.getItem(QZ_CERT_KEY) ?? "",
    privateKey: localStorage.getItem(QZ_KEY_KEY)  ?? "",
  };
}

export function saveQzCert(cert: string, privateKey: string): void {
  localStorage.setItem(QZ_CERT_KEY, cert);
  localStorage.setItem(QZ_KEY_KEY,  privateKey);
}

export function clearQzCert(): void {
  localStorage.removeItem(QZ_CERT_KEY);
  localStorage.removeItem(QZ_KEY_KEY);
}

/** هل الشهادة مُهيّأة (يوجد نص في كلا الحقلين)؟ */
export function hasQzCert(): boolean {
  const { cert, privateKey } = loadQzCert();
  return cert.includes("CERTIFICATE") && privateKey.includes("KEY");
}
