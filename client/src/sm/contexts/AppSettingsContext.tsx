import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setAppFmtConfig, fmtN, appFmtConfig } from "@/sm/lib/utils";
import { loadLocalPrinters } from "@/sm/lib/printers";
import { connectQz } from "@/sm/lib/qz-print";

interface AppSettings {
  currency: string;
  decimalPlaces: number;
  fullscreenMode: boolean;
  showWeight: boolean;
  storeName: string;
  storeLogo: string;
  /** اسم طابعة التقارير (A4) الفعّال — من التخزين المحلي وإلا من الخادم (تفاعلي). */
  printerReport: string;
  /** السماح بالبيع عند نفاد المخزون — false = منع استخدام منتج صفر/سالب */
  allowNegativeStock: boolean;
  /** تعبئة سعر الشراء تلقائياً بسعر بيع الجملة عند اختيار المنتج في فاتورة المشتريات */
  purchaseAutoPrice: boolean;
  /** إظهار حقلي تاريخ الإنتاج وتاريخ الانتهاء في فاتورة المشتريات — false افتراضياً (مخفيان) */
  purchaseShowDates: boolean;
  /** بعد إضافة منتج (بيع/شراء/مرجوعات/طلبيات/تلف): إلى أين ينتقل المؤشر تلقائياً — حقل البحث عن المنتج أو حقل الباركود */
  focusAfterAddItem: 'product' | 'barcode';
  /** إظهار أيقونة حذف الصنف داخل قائمة الطلب الحالي في نقطة البيع — true افتراضياً (ظاهرة) */
  showPosDeleteIcon: boolean;
  /** إظهار لوحة المفاتيح السريعة في فورم المبيعات — true افتراضياً (ظاهرة) */
  showSalesQuickKeys: boolean;
  /** تنسيق مبلغ مالي مع رمز العملة */
  fmtMoney: (n: number) => string;
}

const AppSettingsContext = createContext<AppSettings>({
  currency: appFmtConfig.currency,
  decimalPlaces: appFmtConfig.decimalPlaces,
  fullscreenMode: false,
  showWeight: true,
  storeName: "",
  storeLogo: "",
  printerReport: "",
  allowNegativeStock: true,
  purchaseAutoPrice: false,
  purchaseShowDates: false,
  focusAfterAddItem: 'product',
  showPosDeleteIcon: true,
  showSalesQuickKeys: true,
  fmtMoney: (n) => `${fmtN(n)} ${appFmtConfig.currency}`,
});

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState(appFmtConfig.currency);
  const [decimalPlaces, setDecimalPlaces] = useState(appFmtConfig.decimalPlaces);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [showWeight, setShowWeight] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [storeLogo, setStoreLogo] = useState("");
  const [printerReport, setPrinterReport] = useState("");
  const [allowNegativeStock, setAllowNegativeStock] = useState(true);
  const [purchaseAutoPrice, setPurchaseAutoPrice] = useState(false);
  const [purchaseShowDates, setPurchaseShowDates] = useState(false);
  const [focusAfterAddItem, setFocusAfterAddItem] = useState<'product' | 'barcode'>('product');
  const [showPosDeleteIcon, setShowPosDeleteIcon] = useState(true);
  const [showSalesQuickKeys, setShowSalesQuickKeys] = useState(true);

  const loadSettings = () => {
    /* أسماء الطابعات تخصّ كل جهاز على حدة (localStorage فقط) — لا نسحبها من الخادم
       حتى لا يعرض جهازٌ طابعاتِ جهازٍ آخر. تُقرأ مستقلةً عن طلب الخادم حتى تعمل بوابة
       طباعة A4 حتى لو فشل جلب /api/settings. */
    setPrinterReport((loadLocalPrinters().printer_report || "").trim());
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Record<string, string>) => {
        const cur = d.currency || "IQD";
        const dp = Math.max(0, Math.min(6, parseInt(d.decimal_places || "0", 10) || 0));
        setAppFmtConfig({ currency: cur, decimalPlaces: dp });
        setCurrency(cur);
        setDecimalPlaces(dp);
        setFullscreenMode(d.fullscreen_mode !== "false");
        setShowWeight(d.show_weight !== "false");
        setStoreName(d.store_name || "");
        setStoreLogo(d.store_logo || "");
        setAllowNegativeStock(d.allow_negative_stock !== "false");
        setPurchaseAutoPrice(d.purchase_auto_price === "true");
        setPurchaseShowDates(d.purchase_show_dates === "true");
        setFocusAfterAddItem(d.focus_after_add_item === "barcode" ? "barcode" : "product");
        setShowPosDeleteIcon(d.show_pos_delete_icon !== "false");
        setShowSalesQuickKeys(d.show_sales_quick_keys !== "false");
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadSettings();
    /* محاولة الاتصال المبكّر بـ QZ Tray عند الإقلاع (بصمت) حتى تكون الطباعة المباشرة
       جاهزة فور أول ضغطة طباعة؛ يفشل بهدوء إن لم يكن مثبّتاً على الجهاز. */
    connectQz().catch(() => {});
    window.addEventListener("app-settings-saved", loadSettings);
    return () => window.removeEventListener("app-settings-saved", loadSettings);
  }, []);

  const fmtMoney = (n: number) => {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      useGrouping: true,
    }).format(n);
    return `${formatted} ${currency}`;
  };

  return (
    <AppSettingsContext.Provider value={{ currency, decimalPlaces, fullscreenMode, showWeight, storeName, storeLogo, printerReport, allowNegativeStock, purchaseAutoPrice, purchaseShowDates, focusAfterAddItem, showPosDeleteIcon, showSalesQuickKeys, fmtMoney }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettings {
  return useContext(AppSettingsContext);
}
