import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Printer, Save, FileText, BarChart3, StickyNote, Cog, UserCog, Users } from "lucide-react";

const PRINTER_SETTINGS_KEY = "erp_printer_settings";
const GENERAL_SETTINGS_KEY = "erp_general_settings";

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

type SettingsTab = "printers" | "general";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("printers");

  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(loadPrinterSettings);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(loadGeneralSettings);

  const tabs: { key: SettingsTab; label: string; icon: typeof Printer }[] = [
    { key: "printers", label: t("Printer Settings"), icon: Printer },
    { key: "general", label: t("General Settings"), icon: Cog },
  ];

  const handleSavePrinterSettings = () => {
    savePrinterSettings(printerSettings);
    toast({ title: t("Settings saved successfully") });
  };

  const handleSaveGeneralSettings = () => {
    saveGeneralSettings(generalSettings);
    toast({ title: t("Settings saved successfully") });
  };

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
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          {activeTab === "printers" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-blue-600" />
                  {t('Printer Settings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-base font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-500" />
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
                      <BarChart3 className="h-4 w-4 text-green-500" />
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
                      <StickyNote className="h-4 w-4 text-purple-500" />
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
                    <Save className="h-4 w-4" />
                    {t('Save Settings')}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                      <UserCog className="h-4 w-4 text-blue-500" />
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
                      <Users className="h-4 w-4 text-orange-500" />
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
                    <FileText className="h-4 w-4 text-green-500" />
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
                    <Save className="h-4 w-4" />
                    {t('Save Settings')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
