import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Phone, MapPin, Save, MessageCircle, Globe, Navigation, Facebook, Instagram, Camera } from "lucide-react";
import type { CompanyProfile } from "@shared/schema";

export default function CompanyContactPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<CompanyProfile | null>({
    queryKey: ["/api/company-profile"],
  });

  const [form, setForm] = useState({
    addressName: "",
    mobile1: "",
    mobile1Whatsapp: "",
    mobile2: "",
    mobile2Whatsapp: "",
    gpsLocation: "",
    facebookLink: "",
    instagramLink: "",
    tiktokLink: "",
    snapchatLink: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        addressName: profile.addressName || "",
        mobile1: profile.mobile1 || "",
        mobile1Whatsapp: profile.mobile1Whatsapp || "",
        mobile2: profile.mobile2 || "",
        mobile2Whatsapp: profile.mobile2Whatsapp || "",
        gpsLocation: profile.gpsLocation || "",
        facebookLink: profile.facebookLink || "",
        instagramLink: profile.instagramLink || "",
        tiktokLink: profile.tiktokLink || "",
        snapchatLink: profile.snapchatLink || "",
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
      toast({ title: t("Contact information saved successfully") });
    },
    onError: () => {
      toast({ title: t("Error saving contact information"), variant: "destructive" });
    },
  });

  const handleSave = () => {
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Globe className="w-7 h-7" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('Company Contact & Social Media')}</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          data-testid="button-save-contact"
        >
          <Save className="w-4 h-4 ltr:mr-1.5 rtl:ml-1.5" />
          {saveMutation.isPending ? t('Saving...') : t('Save')}
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {t('Address & Location')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="addressName" className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {t('Address Name')}
            </Label>
            <Input
              id="addressName"
              value={form.addressName}
              onChange={(e) => setForm((p) => ({ ...p, addressName: e.target.value }))}
              placeholder={t('Enter address name')}
              data-testid="input-address-name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gpsLocation" className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              {t('GPS Location')}
            </Label>
            <Input
              id="gpsLocation"
              value={form.gpsLocation}
              onChange={(e) => setForm((p) => ({ ...p, gpsLocation: e.target.value }))}
              placeholder={t('Enter GPS coordinates or Google Maps link')}
              data-testid="input-gps-location"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {t('Mobile & WhatsApp')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Label htmlFor="mobile1Whatsapp" className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                {t('WhatsApp Link')} 1
              </Label>
              <Input
                id="mobile1Whatsapp"
                value={form.mobile1Whatsapp}
                onChange={(e) => setForm((p) => ({ ...p, mobile1Whatsapp: e.target.value }))}
                placeholder="https://wa.me/964XXXXXXXXX"
                data-testid="input-mobile1-whatsapp"
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-1.5">
              <Label htmlFor="mobile2Whatsapp" className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                {t('WhatsApp Link')} 2
              </Label>
              <Input
                id="mobile2Whatsapp"
                value={form.mobile2Whatsapp}
                onChange={(e) => setForm((p) => ({ ...p, mobile2Whatsapp: e.target.value }))}
                placeholder="https://wa.me/964XXXXXXXXX"
                data-testid="input-mobile2-whatsapp"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t('Social Media')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="facebookLink" className="flex items-center gap-1.5">
                <Facebook className="w-3.5 h-3.5" />
                {t('Facebook')}
              </Label>
              <Input
                id="facebookLink"
                value={form.facebookLink}
                onChange={(e) => setForm((p) => ({ ...p, facebookLink: e.target.value }))}
                placeholder="https://facebook.com/..."
                data-testid="input-facebook-link"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagramLink" className="flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5" />
                {t('Instagram')}
              </Label>
              <Input
                id="instagramLink"
                value={form.instagramLink}
                onChange={(e) => setForm((p) => ({ ...p, instagramLink: e.target.value }))}
                placeholder="https://instagram.com/..."
                data-testid="input-instagram-link"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tiktokLink" className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                {t('TikTok')}
              </Label>
              <Input
                id="tiktokLink"
                value={form.tiktokLink}
                onChange={(e) => setForm((p) => ({ ...p, tiktokLink: e.target.value }))}
                placeholder="https://tiktok.com/@..."
                data-testid="input-tiktok-link"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="snapchatLink" className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                {t('Snapchat')}
              </Label>
              <Input
                id="snapchatLink"
                value={form.snapchatLink}
                onChange={(e) => setForm((p) => ({ ...p, snapchatLink: e.target.value }))}
                placeholder="https://snapchat.com/add/..."
                data-testid="input-snapchat-link"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
