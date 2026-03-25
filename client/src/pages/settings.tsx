import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings, Printer, Save, FileText, BarChart3, StickyNote, Cog, Eye, Monitor, Smartphone, TabletSmartphone } from "lucide-react";
import { IconOwner, IconCustomers, IconSales, IconSupplierList, IconDollar, IconDinar } from "@/components/erp-icons";

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
}

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
  customer_oldDebtUsd: boolean;
  customer_oldDebtIqd: boolean;
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
  customer_oldDebtUsd: true,
  customer_oldDebtIqd: true,
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
    if (saved) return { ...defaultGeneralSettings, ...JSON.parse(saved) };
  } catch {}
  return defaultGeneralSettings;
}

function saveGeneralSettings(settings: GeneralSettings) {
  localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(settings));
}

export function loadFieldVisibility(): FieldVisibilitySettings {
  try {
    const saved = localStorage.getItem(FIELD_VISIBILITY_KEY);
    if (saved) return { ...defaultFieldVisibility, ...JSON.parse(saved) };
  } catch {}
  return defaultFieldVisibility;
}

function saveFieldVisibility(settings: FieldVisibilitySettings) {
  localStorage.setItem(FIELD_VISIBILITY_KEY, JSON.stringify(settings));
}

type SettingsTab = "printers" | "general" | "field_visibility";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("printers");

  const [deviceName, setDeviceName] = useState<string>(loadDeviceName);
  const [deviceType, setDeviceType] = useState<DeviceType>(loadDeviceType);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(loadPrinterSettings);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(loadGeneralSettings);
  const [fieldVisibility, setFieldVisibility] = useState<FieldVisibilitySettings>(loadFieldVisibility);

  const tabs: { key: SettingsTab; label: string; icon: typeof Printer }[] = [
    { key: "printers", label: t("Printer Settings"), icon: Printer },
    { key: "general", label: t("General Settings"), icon: Cog },
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
    saveGeneralSettings(generalSettings);
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
    <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <Label className="text-sm font-semibold cursor-pointer" htmlFor={fieldKey}>{label}</Label>
      <Switch
        id={fieldKey}
        checked={fieldVisibility[fieldKey]}
        onCheckedChange={() => toggleField(fieldKey)}
        data-testid={`switch-field-${fieldKey}`}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">{t('Settings')}</h1>
          <p className="text-sm text-muted-foreground">{t('Manage application settings')}</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-56 shrink-0">
          <Card>
            <CardContent className="p-2">
              <div className="space-y-1">
                {tabs.map(tab => (
                  <Button
                    key={tab.key}
                    variant={activeTab === tab.key ? "default" : "ghost"}
                    className={`w-full justify-start gap-2 ${activeTab === tab.key ? "bg-primary text-white" : ""}`}
                    onClick={() => setActiveTab(tab.key)}
                    data-testid={`button-settings-tab-${tab.key}`}
                  >
                    <tab.icon className="h-5 w-5" />
                    {tab.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          {activeTab === "printers" && (
            <div className="space-y-6">
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Monitor className="h-5 w-5" />
                    {t('Device Identification')}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t('Set a name for this device so printer settings are unique per computer/phone')}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-base font-bold">{t('Device Name')}</Label>
                      <Input
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        placeholder={t('e.g. Office PC, Warehouse Laptop, Android POS...')}
                        className="h-11 text-base font-semibold"
                        data-testid="input-settings-device-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base font-bold">{t('Device Type')}</Label>
                      <div className="flex gap-2">
                        {deviceTypeOptions.map(opt => (
                          <Button
                            key={opt.value}
                            variant={deviceType === opt.value ? "default" : "outline"}
                            className={`flex-1 gap-2 ${deviceType === opt.value ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
                            onClick={() => setDeviceType(opt.value)}
                            data-testid={`button-device-type-${opt.value}`}
                          >
                            <opt.icon className="h-5 w-5" />
                            <span className="text-xs font-semibold">{opt.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {deviceName && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-lg px-3 py-2">
                      {deviceType === "desktop" && <Monitor className="h-4 w-4" />}
                      {deviceType === "mobile" && <Smartphone className="h-4 w-4" />}
                      {deviceType === "pos_android" && <TabletSmartphone className="h-4 w-4" />}
                      {t('Current device')}: <span className="font-bold">{deviceName}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="h-5 w-5 text-blue-600" />
                    {t('Printer Settings')}
                    {deviceName && (
                      <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {deviceName}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-base font-bold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-orange-500" />
                        {t('Invoice Printer')}
                        <span className="text-xs font-normal text-muted-foreground">(ACM)</span>
                      </Label>
                      <Input
                        value={printerSettings.invoicePrinter}
                        onChange={(e) => setPrinterSettings(prev => ({ ...prev, invoicePrinter: e.target.value }))}
                        placeholder={t('Enter invoice printer name...')}
                        className="h-11 text-base font-semibold"
                        data-testid="input-settings-invoice-printer"
                      />
                      <p className="text-xs text-muted-foreground">{t('Thermal receipt printer for invoices')}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-bold flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-green-500" />
                        {t('Reports Printer')}
                        <span className="text-xs font-normal text-muted-foreground">(A4)</span>
                      </Label>
                      <Input
                        value={printerSettings.reportsPrinter}
                        onChange={(e) => setPrinterSettings(prev => ({ ...prev, reportsPrinter: e.target.value }))}
                        placeholder={t('Enter reports printer name...')}
                        className="h-11 text-base font-semibold"
                        data-testid="input-settings-reports-printer"
                      />
                      <p className="text-xs text-muted-foreground">{t('A4 paper printer for reports')}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-bold flex items-center gap-2">
                        <StickyNote className="h-5 w-5 text-purple-500" />
                        {t('Barcode Printer')}
                        <span className="text-xs font-normal text-muted-foreground">(STICKER)</span>
                      </Label>
                      <Input
                        value={printerSettings.barcodePrinter}
                        onChange={(e) => setPrinterSettings(prev => ({ ...prev, barcodePrinter: e.target.value }))}
                        placeholder={t('Enter barcode printer name...')}
                        className="h-11 text-base font-semibold"
                        data-testid="input-settings-barcode-printer"
                      />
                      <p className="text-xs text-muted-foreground">{t('Sticker printer for barcodes')}</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSavePrinterSettings} className="bg-green-600 hover:bg-green-700 text-white gap-2" data-testid="button-settings-save-printers">
                      <Save className="h-5 w-5" />
                      {t('Save Settings')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "general" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5 text-blue-600" />
                  {t('General Settings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-base font-bold flex items-center gap-2">
                      <IconOwner className="h-5 w-5 text-blue-500" />
                      {t('Sales Print Mode (Admin/User)')}
                    </Label>
                    <Select
                      value={generalSettings.adminSalesPrintMode}
                      onValueChange={(val) => setGeneralSettings(prev => ({ ...prev, adminSalesPrintMode: val }))}
                    >
                      <SelectTrigger className="h-11 text-base font-semibold" data-testid="select-settings-admin-sales-print">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thermal_80mm">{t('Thermal Print 80mm')}</SelectItem>
                        <SelectItem value="a4">{t('A4 Print')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('Print format when admin or user creates a sales invoice')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-bold flex items-center gap-2">
                      <IconCustomers className="h-5 w-5 text-orange-500" />
                      {t('Sales Print Mode (Agent)')}
                    </Label>
                    <Select
                      value={generalSettings.agentSalesPrintMode}
                      onValueChange={(val) => setGeneralSettings(prev => ({ ...prev, agentSalesPrintMode: val }))}
                    >
                      <SelectTrigger className="h-11 text-base font-semibold" data-testid="select-settings-agent-sales-print">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thermal_80mm">{t('Thermal Print 80mm')}</SelectItem>
                        <SelectItem value="no_print">{t('No Print')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('Print format when agent creates a sales invoice')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
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
                    className="h-11 text-base font-semibold"
                    data-testid="input-settings-invoice-footer"
                  />
                  <p className="text-xs text-muted-foreground text-end">{generalSettings.invoiceFooterText.length} / 80</p>
                  <p className="text-xs text-muted-foreground">{t('This text will appear at the bottom of every sales invoice')}</p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveGeneralSettings} className="bg-green-600 hover:bg-green-700 text-white gap-2" data-testid="button-settings-save-general">
                    <Save className="h-5 w-5" />
                    {t('Save Settings')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "field_visibility" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconSales className="h-5 w-5 text-blue-600" />
                    {t('Sales Invoice Fields')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldToggle fieldKey="salesInvoice_address" label={t("Address")} />
                    <FieldToggle fieldKey="salesInvoice_mobile" label={t("Mobile")} />
                    <FieldToggle fieldKey="salesInvoice_representative" label={t("Representative")} />
                    <FieldToggle fieldKey="salesInvoice_note" label={t("Notes")} />
                    <FieldToggle fieldKey="salesInvoice_driverName" label={t("Driver Name")} />
                    <FieldToggle fieldKey="salesInvoice_driverMobile" label={t("Driver Mobile")} />
                    <FieldToggle fieldKey="salesInvoice_vehicleNumber" label={t("Vehicle Number")} />
                    <FieldToggle fieldKey="salesInvoice_discount" label={t("Discount")} />
                    <FieldToggle fieldKey="salesInvoice_amountPaid" label={t("Amount Paid")} />
                    <FieldToggle fieldKey="salesInvoice_weight" label={t("Weight")} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconCustomers className="h-5 w-5 text-green-600" />
                    {t('Customer Fields')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldToggle fieldKey="customer_address" label={t("Address")} />
                    <FieldToggle fieldKey="customer_agent" label={t("Agent")} />
                    <FieldToggle fieldKey="customer_oldDebtUsd" label={t("Opening Balance (USD)")} />
                    <FieldToggle fieldKey="customer_oldDebtIqd" label={t("Opening Balance (IQD)")} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconSupplierList className="h-5 w-5 text-orange-600" />
                    {t('Purchase Invoice Fields')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldToggle fieldKey="purchaseInvoice_listNumber" label={t("List Number")} />
                    <FieldToggle fieldKey="purchaseInvoice_carNumber" label={t("Car Number")} />
                    <FieldToggle fieldKey="purchaseInvoice_manifestNumber" label={t("Manifest")} />
                    <FieldToggle fieldKey="purchaseInvoice_transportFee" label={t("Transport Fee")} />
                    <FieldToggle fieldKey="purchaseInvoice_customs" label={t("Customs")} />
                    <FieldToggle fieldKey="purchaseInvoice_amountReceived" label={t("Amount Received from Supplier")} />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveFieldVisibility} className="bg-green-600 hover:bg-green-700 text-white gap-2" data-testid="button-settings-save-field-visibility">
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
