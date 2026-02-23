import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Building2, Save, Upload, Trash2, QrCode, Phone, MapPin, Briefcase, Image, Stamp, Palette } from "lucide-react";
import type { CompanyProfile } from "@shared/schema";

function QRCodeCanvas({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvas, value, {
        width: size,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    });
  }, [value, size]);

  if (!value) {
    return (
      <div
        className="flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-border"
        style={{ width: size, height: size }}
        data-testid="qr-placeholder"
      >
        <QrCode className="w-12 h-12 text-muted-foreground" />
      </div>
    );
  }

  return <canvas ref={canvasRef} data-testid="qr-canvas" />;
}

export default function CompanyProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<CompanyProfile | null>({
    queryKey: ["/api/company-profile"],
  });

  const [form, setForm] = useState({
    name: "",
    address: "",
    mobile1: "",
    mobile2: "",
    businessType: "",
    logo: "" as string | null,
    cliche: "" as string | null,
    stamp: "" as string | null,
    qrAddress: "",
    primaryColor: "#1a1a2e",
    secondaryColor: "#16213e",
    clicheColor: "#1a1a2e",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        address: profile.address || "",
        mobile1: profile.mobile1 || "",
        mobile2: profile.mobile2 || "",
        businessType: profile.businessType || "",
        logo: profile.logo || null,
        cliche: profile.cliche || null,
        stamp: profile.stamp || null,
        qrAddress: profile.qrAddress || "",
        primaryColor: profile.primaryColor || "#1a1a2e",
        secondaryColor: profile.secondaryColor || "#16213e",
        clicheColor: profile.clicheColor || "#1a1a2e",
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/company-profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-profile"] });
      toast({ title: t("Company profile saved successfully") });
    },
    onError: () => {
      toast({ title: t("Error saving profile"), variant: "destructive" });
    },
  });

  const handleImageUpload = useCallback((field: "logo" | "cliche" | "stamp") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: t("Image size must be less than 2MB"), variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [toast, t]);

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: t("Company name is required"), variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('Company Profile')}</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          data-testid="button-save-profile"
        >
          <Save className="w-4 h-4 ltr:mr-1.5 rtl:ml-1.5" />
          {saveMutation.isPending ? t('Saving...') : t('Save')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {t('Company Information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="companyName">{t('Company / Office Name')}</Label>
                <Input
                  id="companyName"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t('Enter company or office name')}
                  data-testid="input-company-name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="businessType" className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  {t('Business Type')}
                </Label>
                <Input
                  id="businessType"
                  value={form.businessType}
                  onChange={(e) => setForm((p) => ({ ...p, businessType: e.target.value }))}
                  placeholder={t('e.g. Trading, Import/Export, Services')}
                  data-testid="input-business-type"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {t('Address')}
                </Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder={t('Enter full address')}
                  rows={2}
                  data-testid="input-address"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mobile1" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {t('Mobile 1')}
                  </Label>
                  <Input
                    id="mobile1"
                    value={form.mobile1}
                    onChange={(e) => setForm((p) => ({ ...p, mobile1: e.target.value }))}
                    placeholder="07XX-XXX-XXXX"
                    data-testid="input-mobile1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mobile2" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {t('Mobile 2')}
                  </Label>
                  <Input
                    id="mobile2"
                    value={form.mobile2}
                    onChange={(e) => setForm((p) => ({ ...p, mobile2: e.target.value }))}
                    placeholder="07XX-XXX-XXXX"
                    data-testid="input-mobile2"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="primaryColor" className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    {t('Field Color')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        id="primaryColor"
                        value={form.primaryColor}
                        onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border p-0.5"
                        data-testid="input-primary-color"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={form.primaryColor}
                        onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                        placeholder="#1a1a2e"
                        data-testid="input-primary-color-text"
                      />
                      <div className="h-2 rounded-full" style={{ backgroundColor: form.primaryColor }} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="secondaryColor" className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    {t('Text Color')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        id="secondaryColor"
                        value={form.secondaryColor}
                        onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border p-0.5"
                        data-testid="input-secondary-color"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={form.secondaryColor}
                        onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                        placeholder="#16213e"
                        data-testid="input-secondary-color-text"
                      />
                      <div className="h-2 rounded-full" style={{ backgroundColor: form.secondaryColor }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clicheColor" className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  {t('Cliché Color')}
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="color"
                      id="clicheColor"
                      value={form.clicheColor}
                      onChange={(e) => setForm((p) => ({ ...p, clicheColor: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border p-0.5"
                      data-testid="input-cliche-color"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input
                      value={form.clicheColor}
                      onChange={(e) => setForm((p) => ({ ...p, clicheColor: e.target.value }))}
                      placeholder="#1a1a2e"
                      data-testid="input-cliche-color-text"
                    />
                    <div className="h-2 rounded-full" style={{ backgroundColor: form.clicheColor }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                {t('QR Code Address')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="qrAddress">{t('QR Address / URL')}</Label>
                <Input
                  id="qrAddress"
                  value={form.qrAddress}
                  onChange={(e) => setForm((p) => ({ ...p, qrAddress: e.target.value }))}
                  placeholder={t('Enter address, URL, or text for QR code')}
                  data-testid="input-qr-address"
                />
              </div>
              <div className="flex justify-center">
                <QRCodeCanvas value={form.qrAddress} size={180} />
              </div>
              {form.qrAddress && (
                <p className="text-xs text-muted-foreground text-center">{t('QR code will encode')}: {form.qrAddress}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="w-4 h-4" />
                {t('Logo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.logo ? (
                <div className="relative group">
                  <img
                    src={form.logo}
                    alt={t('Company Logo')}
                    className="w-full max-h-48 object-contain rounded-lg border bg-white p-2"
                    data-testid="img-logo"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setForm((p) => ({ ...p, logo: null }))}
                    data-testid="button-remove-logo"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => handleImageUpload("logo")}
                  data-testid="upload-logo-area"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">{t('Click to upload logo')}</span>
                  <span className="text-xs text-muted-foreground mt-1">{t('Max 2MB')}</span>
                </div>
              )}
              {form.logo && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleImageUpload("logo")}
                  data-testid="button-change-logo"
                >
                  <Upload className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" />
                  {t('Change Logo')}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stamp className="w-4 h-4" />
                {t('Stamp')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.stamp ? (
                <div className="relative group">
                  <img
                    src={form.stamp}
                    alt={t('Stamp')}
                    className="w-full max-h-48 object-contain rounded-lg border bg-white p-2"
                    data-testid="img-stamp"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setForm((p) => ({ ...p, stamp: null }))}
                    data-testid="button-remove-stamp"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => handleImageUpload("stamp")}
                  data-testid="upload-stamp-area"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">{t('Click to upload stamp')}</span>
                  <span className="text-xs text-muted-foreground mt-1">{t('Max 2MB')}</span>
                </div>
              )}
              {form.stamp && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleImageUpload("stamp")}
                  data-testid="button-change-stamp"
                >
                  <Upload className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" />
                  {t('Change Stamp')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cliché - Full width wide banner like a business header */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="w-4 h-4" />
            {t('Cliché')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.cliche ? (
            <div className="relative group">
              <img
                src={form.cliche}
                alt={t('Cliché')}
                className="w-full object-contain rounded-lg border bg-white p-3"
                style={{ maxHeight: "280px" }}
                data-testid="img-cliche"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setForm((p) => ({ ...p, cliche: null }))}
                data-testid="button-remove-cliche"
              >
                <Trash2 />
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
              style={{ padding: "2rem 3rem", aspectRatio: "4 / 1" }}
              onClick={() => handleImageUpload("cliche")}
              data-testid="upload-cliche-area"
            >
              <Upload className="w-10 h-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{t('Click to upload cliché')}</span>
              <span className="text-xs text-muted-foreground mt-1">{t('Max 2MB')}</span>
            </div>
          )}
          {form.cliche && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleImageUpload("cliche")}
              data-testid="button-change-cliche"
            >
              <Upload className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" />
              {t('Change Cliché')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
