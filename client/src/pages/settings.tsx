import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Printer, Save, FileText, BarChart3, StickyNote } from "lucide-react";

const PRINTER_SETTINGS_KEY = "erp_printer_settings";

interface PrinterSettings {
  invoicePrinter: string;
  reportsPrinter: string;
  barcodePrinter: string;
}

const defaultPrinterSettings: PrinterSettings = {
  invoicePrinter: "",
  reportsPrinter: "",
  barcodePrinter: "",
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

type SettingsTab = "printers";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("printers");

  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(loadPrinterSettings);

  const tabs: { key: SettingsTab; label: string; icon: typeof Printer }[] = [
    { key: "printers", label: t("Printer Settings"), icon: Printer },
  ];

  const handleSavePrinterSettings = () => {
    savePrinterSettings(printerSettings);
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
        </div>
      </div>
    </div>
  );
}
