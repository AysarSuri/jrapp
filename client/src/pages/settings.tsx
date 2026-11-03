import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Printer, Save, FileText, BarChart3, StickyNote, Cog, Eye, Monitor, Smartphone, TabletSmartphone, Volume2, MousePointerClick, Coins, Hash, Building } from "lucide-react";
import { IconBarcode } from "@/components/erp-icons";
import { loadSoundSettings, saveSoundSettings, type SoundSettings } from "@/lib/sounds";
import { IconOwner, IconCustomers, IconSales, IconSupplierList, IconDollar, IconDinar, IconAgent, IconProduct } from "@/components/erp-icons";

const DEVICE_NAME_KEY = "erp_device_name";
const DEVICE_TYPE_KEY = "erp_device_type";
const PRINTER_SETTINGS_KEY = "erp_printer_settings";
const GENERAL_SETTINGS_KEY = "erp_general_settings";
const FIELD_VISIBILITY_KEY = "erp_field_visibility";

type DeviceType = "desktop" | "mobile" | "pos_android";

interface PrinterSettings {
  invoicePrinter: string;
  reportsPrinter: string;
  barcodePrinter: string;
}

interface GeneralSettings {
  adminSalesPrintMode: string;
  agentSalesPrintMode: string;
  invoiceFooterText: string;
  defaultSaleType: string;
  defaultCurrency: string;
  decimalPlaces: number;
}

export const CURRENCY_OPTIONS = [
  { code: "IQD", symbol: "د.ع", flag: "🇮🇶", nameEn: "Iraqi Dinar", nameAr: "دينار عراقي", nameKu: "دیناری عێراقی", nameTr: "Irak Dinarı",
    color: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-300 dark:border-amber-700", text: "text-amber-700 dark:text-amber-400", badge: "bg-gradient-to-br from-amber-400 to-orange-500", input: "border-amber-300 focus-visible:ring-amber-400" } },
  { code: "USD", symbol: "$",   flag: "🇺🇸", nameEn: "US Dollar",  nameAr: "دولار أمريكي", nameKu: "دۆلاری ئەمریکی", nameTr: "ABD Doları",
    color: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-300 dark:border-emerald-700", text: "text-emerald-700 dark:text-emerald-400", badge: "bg-gradient-to-br from-emerald-500 to-green-600", input: "border-emerald-300 focus-visible:ring-emerald-400" } },
  { code: "EUR", symbol: "€",   flag: "🇪🇺", nameEn: "Euro",       nameAr: "يورو أوروبي",  nameKu: "یۆرۆی ئەورووپی", nameTr: "Euro",
    color: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-300 dark:border-blue-700", text: "text-blue-700 dark:text-blue-400", badge: "bg-gradient-to-br from-blue-500 to-indigo-600", input: "border-blue-300 focus-visible:ring-blue-400" } },
  { code: "IRR", symbol: "﷼",   flag: "🇮🇷", nameEn: "Iranian Rial", nameAr: "ريال إيراني", nameKu: "ڕیاڵی ئێرانی", nameTr: "İran Riyali",
    color: { bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-300 dark:border-rose-700", text: "text-rose-700 dark:text-rose-400", badge: "bg-gradient-to-br from-rose-500 to-pink-600", input: "border-rose-300 focus-visible:ring-rose-400" } },
  { code: "GBP", symbol: "£",   flag: "🇬🇧", nameEn: "British Pound", nameAr: "جنيه إسترليني", nameKu: "پاوەندی بەریتانی", nameTr: "İngiliz Sterlini",
    color: { bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-300 dark:border-indigo-700", text: "text-indigo-700 dark:text-indigo-400", badge: "bg-gradient-to-br from-indigo-500 to-violet-600", input: "border-indigo-300 focus-visible:ring-indigo-400" } },
  { code: "TRY", symbol: "₺",   flag: "🇹🇷", nameEn: "Turkish Lira", nameAr: "ليرة تركية", nameKu: "لیرەی تورکی", nameTr: "Türk Lirası",
    color: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-300 dark:border-red-700", text: "text-red-700 dark:text-red-400", badge: "bg-gradient-to-br from-red-500 to-red-700", input: "border-red-300 focus-visible:ring-red-400" } },
  { code: "CNY", symbol: "¥",   flag: "🇨🇳", nameEn: "Chinese Renminbi (RMB)", nameAr: "رنمينبي صيني (يوان)",  nameKu: "ڕێنمینبی چینی (یوان)",  nameTr: "Çin Renminbisi (Yuan)",
    color: { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-300 dark:border-orange-700", text: "text-orange-700 dark:text-orange-400", badge: "bg-gradient-to-br from-orange-400 to-red-500", input: "border-orange-300 focus-visible:ring-orange-400" } },
];

interface FieldVisibilitySettings {
  salesInvoice_address: boolean;
  salesInvoice_mobile: boolean;
  salesInvoice_representative: boolean;
  salesInvoice_note: boolean;
  salesInvoice_driverName: boolean;
  salesInvoice_driverMobile: boolean;
  salesInvoice_vehicleNumber: boolean;
  salesInvoice_discount: boolean;
  salesInvoice_amountPaid: boolean;
  salesInvoice_weight: boolean;
  customer_address: boolean;
  customer_agent: boolean;
  customer_oldDebt: boolean;
  customer_oldDebtUsd: boolean;
  customer_oldDebtIqd: boolean;
  rep_mobile: boolean;
  rep_agreementType: boolean;
  rep_debtUsd: boolean;
  rep_debtIqd: boolean;
  purchaseInvoice_listNumber: boolean;
  purchaseInvoice_carNumber: boolean;
  purchaseInvoice_manifestNumber: boolean;
  purchaseInvoice_transportFee: boolean;
  purchaseInvoice_customs: boolean;
  purchaseInvoice_amountReceived: boolean;
}

const defaultPrinterSettings: PrinterSettings = {
  invoicePrinter: "",
  reportsPrinter: "",
  barcodePrinter: "",
};

const defaultGeneralSettings: GeneralSettings = {
  adminSalesPrintMode: "thermal_80mm",
  agentSalesPrintMode: "thermal_80mm",
  invoiceFooterText: "",
  defaultSaleType: "retail",
  defaultCurrency: "IQD",
  decimalPlaces: 2,
};

const defaultFieldVisibility: FieldVisibilitySettings = {
  salesInvoice_address: true,
  salesInvoice_mobile: true,
  salesInvoice_representative: true,
  salesInvoice_note: true,
  salesInvoice_driverName: true,
  salesInvoice_driverMobile: true,
  salesInvoice_vehicleNumber: true,
  salesInvoice_discount: true,
  salesInvoice_amountPaid: true,
  salesInvoice_weight: true,
  customer_address: true,
  customer_agent: true,
  customer_oldDebt: true,
  customer_oldDebtUsd: true,
  customer_oldDebtIqd: true,
  rep_mobile: true,
  rep_agreementType: true,
  rep_debtUsd: true,
  rep_debtIqd: true,
  purchaseInvoice_listNumber: true,
  purchaseInvoice_carNumber: true,
  purchaseInvoice_manifestNumber: true,
  purchaseInvoice_transportFee: true,
  purchaseInvoice_customs: true,
  purchaseInvoice_amountReceived: true,
};

function detectDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua) && /mobile/.test(ua)) return "pos_android";
  if (/mobile|iphone|ipod/.test(ua)) return "mobile";
  if (/android|ipad|tablet/.test(ua)) return "pos_android";
  return "desktop";
}

export function loadDeviceName(): string {
  return localStorage.getItem(DEVICE_NAME_KEY) || "";
}

export function loadDeviceType(): DeviceType {
  const saved = localStorage.getItem(DEVICE_TYPE_KEY) as DeviceType | null;
  return saved || detectDeviceType();
}

function loadPrinterSettings(): PrinterSettings {
  try {
    const saved = localStorage.getItem(PRINTER_SETTINGS_KEY);
    if (saved) return { ...defaultPrinterSettings, ...JSON.parse(saved) };
  } catch {}
  return defaultPrinterSettings;
}

function savePrinterSettings(settings: PrinterSettings) {
  localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(settings));
}

function loadGeneralSettings(): GeneralSettings {
  try {
    const saved = localStorage.getItem(GENERAL_SETTINGS_KEY);
    if (saved) {
      const parsed = { ...defaultGeneralSettings, ...JSON.parse(saved) };
      if (!CURRENCY_OPTIONS.some(c => c.code === parsed.defaultCurrency)) {
        parsed.defaultCurrency = defaultGeneralSettings.defaultCurrency;
      }
      return parsed;
    }
  } catch {}
  return defaultGeneralSettings;
}

function saveGeneralSettings(settings: GeneralSettings) {
  localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(settings));
}

const EXCHANGE_RATES_KEY = "erp_exchange_rates";

interface ExchangeRatesData {
  base: string;
  rates: Record<string, string>;
}

export function loadExchangeRates(): ExchangeRatesData {
  try {
    const saved = localStorage.getItem(EXCHANGE_RATES_KEY);
    if (saved) {
      const obj = JSON.parse(saved);
      if (obj && typeof obj.base === "string" && obj.rates && typeof obj.rates === "object") {
        return { base: obj.base, rates: obj.rates };
      }
    }
  } catch {}
  return { base: loadGeneralSettings().defaultCurrency, rates: {} };
}

function saveExchangeRates(data: ExchangeRatesData) {
  localStorage.setItem(EXCHANGE_RATES_KEY, JSON.stringify(data));
}

export function loadFieldVisibility(): FieldVisibilitySettings {
  try {
    const saved = localStorage.getItem(FIELD_VISIBILITY_KEY);
    if (saved) {
      const raw = JSON.parse(saved);
      const parsed = { ...defaultFieldVisibility, ...raw };
      if (!("customer_oldDebt" in raw)) {
        parsed.customer_oldDebt = (raw.customer_oldDebtIqd ?? true) || (raw.customer_oldDebtUsd ?? true);
      }
      return parsed;
    }
  } catch {}
  return defaultFieldVisibility;
}

function saveFieldVisibility(settings: FieldVisibilitySettings) {
  localStorage.setItem(FIELD_VISIBILITY_KEY, JSON.stringify(settings));
}

type SettingsTab = "printers" | "general" | "currency" | "field_visibility";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("printers");

  const [deviceName, setDeviceName] = useState<string>(loadDeviceName);
  const [deviceType, setDeviceType] = useState<DeviceType>(loadDeviceType);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(loadPrinterSettings);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(loadGeneralSettings);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(loadSoundSettings);
  const [fieldVisibility, setFieldVisibility] = useState<FieldVisibilitySettings>(loadFieldVisibility);
  const [exchangeRate, setExchangeRate] = useState<string>("1500");
  const [exchangeRates, setExchangeRates] = useState<Record<string, string>>(() => {
    const stored = loadExchangeRates();
    return stored.base === loadGeneralSettings().defaultCurrency ? stored.rates : {};
  });

  const { data: exchangeRateData } = useQuery<{ key: string; value: string | null }>({
    queryKey: ['/api/system-settings', 'usd_to_iqd_rate'],
    queryFn: () => fetch('/api/system-settings/usd_to_iqd_rate').then(r => r.json()),
  });

  useEffect(() => {
    if (exchangeRateData?.value) {
      setExchangeRate(exchangeRateData.value);
    }
  }, [exchangeRateData]);

  const tabs: { key: SettingsTab; label: string; icon: typeof Printer }[] = [
    { key: "printers", label: t("Printer Settings"), icon: Printer },
    { key: "general", label: t("General Settings"), icon: Cog },
    { key: "currency", label: t("Currency Settings"), icon: Coins },
    { key: "field_visibility", label: t("Show & Hide Fields"), icon: Eye },
  ];

  const deviceTypeOptions: { value: DeviceType; label: string; icon: typeof Monitor }[] = [
    { value: "desktop", label: t("Desktop / Laptop"), icon: Monitor },
    { value: "mobile", label: t("Mobile Phone"), icon: Smartphone },
    { value: "pos_android", label: t("POS / Android Cashier"), icon: TabletSmartphone },
  ];

  const handleSavePrinterSettings = () => {
    localStorage.setItem(DEVICE_NAME_KEY, deviceName);
    localStorage.setItem(DEVICE_TYPE_KEY, deviceType);
    savePrinterSettings(printerSettings);
    toast({ title: t("Settings saved successfully") });
  };

  const handleSaveGeneralSettings = () => {
    const stored = loadGeneralSettings();
    saveGeneralSettings({
      ...stored,
      adminSalesPrintMode: generalSettings.adminSalesPrintMode,
      agentSalesPrintMode: generalSettings.agentSalesPrintMode,
      invoiceFooterText: generalSettings.invoiceFooterText,
      defaultSaleType: generalSettings.defaultSaleType,
    });
    toast({ title: t("Settings saved successfully") });
  };

  const handleChangeDefaultCurrency = (val: string) => {
    setGeneralSettings(prev => ({ ...prev, defaultCurrency: val }));
    const stored = loadExchangeRates();
    setExchangeRates(stored.base === val ? stored.rates : {});
  };

  const handleSaveCurrencySettings = async () => {
    for (const v of Object.values(exchangeRates)) {
      if (v !== "" && (!isFinite(parseFloat(v)) || parseFloat(v) <= 0)) {
        toast({ title: t("Invalid exchange rate value"), variant: "destructive" });
        return;
      }
    }
    const stored = loadGeneralSettings();
    saveGeneralSettings({
      ...stored,
      defaultCurrency: generalSettings.defaultCurrency,
      decimalPlaces: generalSettings.decimalPlaces,
    });
    saveExchangeRates({ base: generalSettings.defaultCurrency, rates: exchangeRates });

    let usdIqd = exchangeRate;
    if (generalSettings.defaultCurrency === "IQD") {
      const r = parseFloat(exchangeRates["USD"] || "");
      if (r > 0) usdIqd = String(r);
    } else if (generalSettings.defaultCurrency === "USD") {
      const r = parseFloat(exchangeRates["IQD"] || "");
      if (r > 0) usdIqd = String(Math.round(1 / r));
    }
    try {
      await apiRequest('PUT', '/api/system-settings/usd_to_iqd_rate', { value: usdIqd });
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] });
      setExchangeRate(usdIqd);
    } catch (err) {
      console.error("Failed to save exchange rate:", err);
    }
    toast({ title: t("Settings saved successfully") });
  };

  const handleSaveFieldVisibility = () => {
    saveFieldVisibility(fieldVisibility);
    toast({ title: t("Settings saved successfully") });
  };

  const toggleField = (key: keyof FieldVisibilitySettings) => {
    setFieldVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const FieldToggle = ({ fieldKey, label }: { fieldKey: keyof FieldVisibilitySettings; label: string }) => (
    <label
      htmlFor={fieldKey}
      className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl border border-black/[0.05] dark:border-white/10 bg-muted/20 hover:bg-muted/40 hover:shadow-sm transition-all cursor-pointer"
    >
      <span className="text-sm font-semibold">{label}</span>
      <Switch
        id={fieldKey}
        checked={fieldVisibility[fieldKey]}
        onCheckedChange={() => toggleField(fieldKey)}
        data-testid={`switch-field-${fieldKey}`}
      />
    </label>
  );

  const panelClass = "rounded-2xl border border-black/[0.05] dark:border-white/10 bg-white dark:bg-zinc-900/60 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.28)]";
  const saveBtnClass = "h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md shadow-emerald-600/20";

  const selectedCurrency = CURRENCY_OPTIONS.find(x => x.code === generalSettings.defaultCurrency);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-white flex items-center justify-center shadow-md shadow-primary/25">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">{t('Settings')}</h1>
          <p className="text-sm text-muted-foreground">{t('Manage application settings')}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <aside className={`w-full lg:w-60 shrink-0 ${panelClass} p-2 lg:sticky lg:top-3 h-fit`}>
          <div className="flex lg:flex-col gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  variant="ghost"
                  className={`flex-1 lg:flex-none lg:w-full justify-center lg:justify-start gap-2.5 h-11 rounded-xl px-2.5 whitespace-nowrap ${
                    active
                      ? "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary hover:text-white"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                  data-testid={`button-settings-tab-${tab.key}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-white/20" : "bg-muted"}`}>
                    <tab.icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs sm:text-[13px] font-semibold">{tab.label}</span>
                </Button>
              );
            })}
            <div className="hidden lg:block h-px bg-border/70 my-1.5 mx-2" />
            <Button
              variant="ghost"
              className="flex-1 lg:flex-none lg:w-full justify-center lg:justify-start gap-2.5 h-11 rounded-xl px-2.5 whitespace-nowrap text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              onClick={() => navigate("/barcode-print")}
              data-testid="button-settings-barcode-print"
            >
              <span className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center shrink-0">
                <IconBarcode className="h-4 w-4" />
              </span>
              <span className="text-xs sm:text-[13px] font-semibold">{t("Barcode Print Page")}</span>
            </Button>
            <Button
              variant="ghost"
              className="flex-1 lg:flex-none lg:w-full justify-center lg:justify-start gap-2.5 h-11 rounded-xl px-2.5 whitespace-nowrap text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              onClick={() => navigate("/company-profile")}
              data-testid="button-settings-company-profile"
            >
              <span className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center shrink-0">
                <Building className="h-4 w-4" />
              </span>
              <span className="text-xs sm:text-[13px] font-semibold">{t("Company Profile Page")}</span>
            </Button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {activeTab === "printers" && (
            <div className="space-y-4">
              <div className={`${panelClass} p-5 space-y-5`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center shrink-0">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">{t('Device Identification')}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('Set a name for this device so printer settings are unique per computer/phone')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">{t('Device Name')}</Label>
                    <Input
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder={t('e.g. Office PC, Warehouse Laptop, Android POS...')}
                      className="h-11 text-base font-semibold rounded-xl"
                      data-testid="input-settings-device-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">{t('Device Type')}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {deviceTypeOptions.map(opt => {
                        const selected = deviceType === opt.value;
                        return (
                          <Button
                            key={opt.value}
                            variant="outline"
                            className={`h-auto flex-col gap-1.5 py-3 rounded-xl border-2 ${
                              selected
                                ? "bg-sky-600 text-white border-sky-600 hover:bg-sky-700 hover:text-white"
                                : "bg-muted/30 hover:bg-muted"
                            }`}
                            onClick={() => setDeviceType(opt.value)}
                            data-testid={`button-device-type-${opt.value}`}
                          >
                            <opt.icon className="h-5 w-5" />
                            <span className="text-[10px] sm:text-xs font-semibold leading-tight text-center">{opt.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {deviceName && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 rounded-xl px-3 py-2">
                    {deviceType === "desktop" && <Monitor className="h-4 w-4" />}
                    {deviceType === "mobile" && <Smartphone className="h-4 w-4" />}
                    {deviceType === "pos_android" && <TabletSmartphone className="h-4 w-4" />}
                    {t('Current device')}: <span className="font-bold">{deviceName}</span>
                  </div>
                )}
              </div>

              <div className={`${panelClass} p-5 space-y-5`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center shrink-0">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-base font-bold">{t('Printer Settings')}</h2>
                    {deviceName && (
                      <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate">
                        {deviceName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 p-4 space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-500" />
                      {t('Invoice Printer')}
                      <span className="text-[10px] font-normal text-muted-foreground">(ACM)</span>
                    </Label>
                    <Input
                      value={printerSettings.invoicePrinter}
                      onChange={(e) => setPrinterSettings(prev => ({ ...prev, invoicePrinter: e.target.value }))}
                      placeholder={t('Enter invoice printer name...')}
                      className="h-11 text-base font-semibold rounded-xl bg-white dark:bg-background"
                      data-testid="input-settings-invoice-printer"
                    />
                  </div>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-500" />
                      {t('Reports Printer')}
                      <span className="text-[10px] font-normal text-muted-foreground">(A4)</span>
                    </Label>
                    <Input
                      value={printerSettings.reportsPrinter}
                      onChange={(e) => setPrinterSettings(prev => ({ ...prev, reportsPrinter: e.target.value }))}
                      placeholder={t('Enter reports printer name...')}
                      className="h-11 text-base font-semibold rounded-xl bg-white dark:bg-background"
                      data-testid="input-settings-reports-printer"
                    />
                  </div>
                  <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-violet-500" />
                      {t('Barcode Printer')}
                      <span className="text-[10px] font-normal text-muted-foreground">(STICKER)</span>
                    </Label>
                    <Input
                      value={printerSettings.barcodePrinter}
                      onChange={(e) => setPrinterSettings(prev => ({ ...prev, barcodePrinter: e.target.value }))}
                      placeholder={t('Enter barcode printer name...')}
                      className="h-11 text-base font-semibold rounded-xl bg-white dark:bg-background"
                      data-testid="input-settings-barcode-printer"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSavePrinterSettings} className={saveBtnClass} data-testid="button-settings-save-printers">
                    <Save className="h-5 w-5" />
                    {t('Save Settings')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "general" && (
            <div className="space-y-4">
              <div className={`${panelClass} p-5 space-y-5`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                    <Cog className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">{t('General Settings')}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('Manage application settings')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <IconOwner className="h-5 w-5 text-blue-500" />
                      {t('Sales Print Mode (Admin/User)')}
                    </Label>
                    <Select
                      value={generalSettings.adminSalesPrintMode}
                      onValueChange={(val) => setGeneralSettings(prev => ({ ...prev, adminSalesPrintMode: val }))}
                    >
                      <SelectTrigger className="h-11 text-base font-semibold rounded-xl bg-white dark:bg-background" data-testid="select-settings-admin-sales-print">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thermal_80mm">{t('Thermal Print 80mm')}</SelectItem>
                        <SelectItem value="a4">{t('A4 Print')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('Print format when admin or user creates a sales invoice')}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <IconCustomers className="h-5 w-5 text-orange-500" />
                      {t('Sales Print Mode (Agent)')}
                    </Label>
                    <Select
                      value={generalSettings.agentSalesPrintMode}
                      onValueChange={(val) => setGeneralSettings(prev => ({ ...prev, agentSalesPrintMode: val }))}
                    >
                      <SelectTrigger className="h-11 text-base font-semibold rounded-xl bg-white dark:bg-background" data-testid="select-settings-agent-sales-print">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thermal_80mm">{t('Thermal Print 80mm')}</SelectItem>
                        <SelectItem value="no_print">{t('No Print')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('Print format when agent creates a sales invoice')}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <IconProduct className="h-5 w-5 text-emerald-600" />
                      {t('Default Sale Type')}
                    </Label>
                    <Select
                      value={generalSettings.defaultSaleType || "retail"}
                      onValueChange={(val) => setGeneralSettings(prev => ({ ...prev, defaultSaleType: val }))}
                    >
                      <SelectTrigger className="h-11 text-base font-semibold rounded-xl bg-white dark:bg-background" data-testid="select-settings-default-sale-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">{t('Retail Sale')}</SelectItem>
                        <SelectItem value="wholesale">{t('Wholesale Sale')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('The default sale type used in sales invoices')}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-500" />
                      {t('Invoice Footer Text')}
                    </Label>
                    <Input
                      value={generalSettings.invoiceFooterText}
                      onChange={(e) => {
                        if (e.target.value.length <= 80) {
                          setGeneralSettings(prev => ({ ...prev, invoiceFooterText: e.target.value }));
                        }
                      }}
                      maxLength={80}
                      placeholder={t('Enter text to display at the bottom of sales invoices...')}
                      className="h-11 text-base font-semibold rounded-xl bg-white dark:bg-background"
                      data-testid="input-settings-invoice-footer"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">{t('This text will appear at the bottom of every sales invoice')}</p>
                      <p className="text-xs text-muted-foreground shrink-0" dir="ltr">{generalSettings.invoiceFooterText.length} / 80</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${panelClass} p-5 space-y-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center shrink-0">
                    <Volume2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">{t('Sound Effects')}</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                        <MousePointerClick className="h-4 w-4" />
                      </span>
                      <div>
                        <Label className="text-sm font-bold">{t('Click Sound')}</Label>
                        <p className="text-xs text-muted-foreground">{t('Play a sound when clicking buttons')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={soundSettings.clickEnabled}
                      onCheckedChange={(v) => {
                        const next = { ...soundSettings, clickEnabled: v };
                        setSoundSettings(next);
                        saveSoundSettings(next);
                      }}
                      data-testid="switch-sound-click"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center">
                        <Volume2 className="h-4 w-4" />
                      </span>
                      <div>
                        <Label className="text-sm font-bold">{t('Hover Sound')}</Label>
                        <p className="text-xs text-muted-foreground">{t('Play a sound when hovering over sidebar buttons')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={soundSettings.hoverEnabled}
                      onCheckedChange={(v) => {
                        const next = { ...soundSettings, hoverEnabled: v };
                        setSoundSettings(next);
                        saveSoundSettings(next);
                      }}
                      data-testid="switch-sound-hover"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveGeneralSettings} className={saveBtnClass} data-testid="button-settings-save-general">
                    <Save className="h-5 w-5" />
                    {t('Save Settings')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "currency" && (
            <div className="space-y-4">
              <div className={`${panelClass} p-5 space-y-5`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">{t('Currency & Number Format')}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('Currency icon and country shown across the system')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">{t('Default Currency')}</Label>
                    <Select
                      value={generalSettings.defaultCurrency}
                      onValueChange={handleChangeDefaultCurrency}
                    >
                      <SelectTrigger
                        className={`h-11 text-base font-semibold rounded-xl border-2 ${selectedCurrency?.color.border || ""} ${selectedCurrency?.color.bg || ""}`}
                        data-testid="select-settings-currency"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map(c => {
                          const lang = i18n.language || 'en';
                          const localized = lang === 'ar' ? c.nameAr : lang === 'ckb' ? c.nameKu : lang === 'tr' ? c.nameTr : c.nameEn;
                          return (
                            <SelectItem key={c.code} value={c.code} className={`${c.color.bg} ${c.color.text}`}>
                              <span className="flex items-center gap-2">
                                <span className={`w-7 h-7 rounded-full ${c.color.badge} text-white text-[11px] font-black flex items-center justify-center shadow-sm`}>{c.symbol}</span>
                                <span className="text-lg">{c.flag}</span>
                                <span className={`font-bold ${c.color.text}`}>{localized}</span>
                                <span className="text-xs opacity-70">({c.code})</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Hash className="h-4 w-4 text-violet-600" />
                      {t('Decimal Places')}
                    </Label>
                    <Select
                      value={String(generalSettings.decimalPlaces)}
                      onValueChange={(val) => setGeneralSettings(prev => ({ ...prev, decimalPlaces: Number(val) }))}
                    >
                      <SelectTrigger className="h-11 text-base font-semibold rounded-xl" data-testid="select-settings-decimal-places">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {n} — {(1234.56789).toFixed(n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('Number of digits after decimal point in amounts')}</p>
                  </div>
                </div>
              </div>

              <div className={`${panelClass} p-5 space-y-4`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                    <IconDollar className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2">
                      {t('Exchange Rates')}
                      <IconDinar className="h-4 w-4 text-amber-600" />
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('Set the exchange rate of each currency against the default currency')} — {t('Leave empty for currencies you do not use')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {CURRENCY_OPTIONS.filter(c => c.code !== generalSettings.defaultCurrency).map(c => {
                    const lang = i18n.language || 'en';
                    const localized = lang === 'ar' ? c.nameAr : lang === 'ckb' ? c.nameKu : lang === 'tr' ? c.nameTr : c.nameEn;
                    const def = selectedCurrency;
                    return (
                      <div key={c.code} className={`flex items-center gap-3 p-3 rounded-xl border-2 ${c.color.bg} ${c.color.border} hover:shadow-md transition-shadow`}>
                        <span className={`w-10 h-10 rounded-full ${c.color.badge} text-white text-sm font-black flex items-center justify-center shadow-sm shrink-0`}>{c.symbol}</span>
                        <span className="text-2xl shrink-0">{c.flag}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold truncate ${c.color.text}`}>{localized}</p>
                          <p className={`text-xs ${c.color.text} opacity-70`} dir="ltr">1 {c.code} =</p>
                        </div>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          inputMode="decimal"
                          value={exchangeRates[c.code] ?? ""}
                          onChange={(e) => setExchangeRates(prev => ({ ...prev, [c.code]: e.target.value }))}
                          className={`h-10 w-28 sm:w-32 text-base font-bold text-center shrink-0 bg-white dark:bg-background rounded-xl ${c.color.input} ${c.color.text}`}
                          placeholder="0"
                          data-testid={`input-exchange-rate-${c.code}`}
                        />
                        <span className={`text-sm font-bold shrink-0 flex items-center gap-1.5 ${def?.color.text || ""}`}>
                          {def && (
                            <span className={`w-6 h-6 rounded-full ${def.color.badge} text-white text-[10px] font-black flex items-center justify-center`}>{def.symbol}</span>
                          )}
                          {generalSettings.defaultCurrency}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveCurrencySettings} className={saveBtnClass} data-testid="button-settings-save-currency">
                    <Save className="h-5 w-5" />
                    {t('Save Settings')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "field_visibility" && (
            <div className="space-y-4">
              {[
                { icon: IconSales, color: "bg-blue-50 dark:bg-blue-950/40 text-blue-600", title: t("Sales Invoice Fields"), fields: [
                  ["salesInvoice_address", t("Address")],
                  ["salesInvoice_mobile", t("Mobile")],
                  ["salesInvoice_representative", t("Representative")],
                  ["salesInvoice_note", t("Notes")],
                  ["salesInvoice_driverName", t("Driver Name")],
                  ["salesInvoice_driverMobile", t("Driver Mobile")],
                  ["salesInvoice_vehicleNumber", t("Vehicle Number")],
                  ["salesInvoice_discount", t("Discount")],
                  ["salesInvoice_amountPaid", t("Amount Paid")],
                  ["salesInvoice_weight", t("Weight")],
                ] as const },
                { icon: IconCustomers, color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600", title: t("Customer Fields"), fields: [
                  ["customer_address", t("Address")],
                  ["customer_agent", t("Agent")],
                  ["customer_oldDebt", t("Opening Balance")],
                ] as const },
                { icon: IconAgent, color: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600", title: t("Representative Fields"), fields: [
                  ["rep_mobile", t("Mobile")],
                  ["rep_agreementType", t("Agreement Type")],
                  ["rep_debtUsd", t("Opening Balance (USD)")],
                  ["rep_debtIqd", t("Opening Balance (IQD)")],
                ] as const },
                { icon: IconSupplierList, color: "bg-orange-50 dark:bg-orange-950/40 text-orange-600", title: t("Purchase Invoice Fields"), fields: [
                  ["purchaseInvoice_listNumber", t("List Number")],
                  ["purchaseInvoice_carNumber", t("Car Number")],
                  ["purchaseInvoice_manifestNumber", t("Manifest")],
                  ["purchaseInvoice_transportFee", t("Transport Fee")],
                  ["purchaseInvoice_customs", t("Customs")],
                  ["purchaseInvoice_amountReceived", t("Amount Received from Supplier")],
                ] as const },
              ].map(group => (
                <div key={group.title} className={`${panelClass} p-5 space-y-4`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${group.color} flex items-center justify-center shrink-0`}>
                      <group.icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-base font-bold">{group.title}</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {group.fields.map(([key, label]) => (
                      <FieldToggle key={key} fieldKey={key} label={label} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={handleSaveFieldVisibility} className={saveBtnClass} data-testid="button-settings-save-field-visibility">
                  <Save className="h-5 w-5" />
                  {t('Save Settings')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
