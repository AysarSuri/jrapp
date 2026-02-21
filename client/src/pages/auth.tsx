import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Shield, User, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const [isPending, setIsPending] = useState(false);
  const queryClient = useQueryClient();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
    const dir = (lng === "ar" || lng === "ckb") ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
  };

  async function handleEnter() {
    setIsPending(true);
    try {
      const res = await fetch("/api/login-by-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login failed");
      }
      const user = await res.json();
      queryClient.setQueryData([api.auth.me.path], user);
      toast({ title: t("loginSuccess"), description: t("loginSuccessDesc") });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: t("loginFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }

  const languages = [
    { code: "en", label: "English" },
    { code: "ar", label: "العربية" },
    { code: "ckb", label: "کوردی" },
    { code: "tr", label: "Türkçe" },
  ];

  const roles = [
    { value: "admin", icon: Shield, labelKey: "roleAdmin" },
    { value: "user", icon: User, labelKey: "roleUser" },
    { value: "sales_rep", icon: Truck, labelKey: "roleRepresentative" },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background z-0 pointer-events-none" />

      <div className="absolute top-4 right-4 z-20 flex gap-1">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={i18n.language === lang.code ? "default" : "outline"}
            size="sm"
            onClick={() => changeLanguage(lang.code)}
            className="text-sm font-bold"
            data-testid={`lang-${lang.code}`}
          >
            {lang.label}
          </Button>
        ))}
      </div>

      <div className="w-full max-w-md z-10">
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">ProERP</h1>
          <p className="text-muted-foreground text-lg">{t("erpSystem")}</p>
        </div>

        <Card className="border-border/50 shadow-xl shadow-black/5 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">
              {t("selectRole")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <RadioGroup
                value={selectedRole}
                onValueChange={setSelectedRole}
                className="flex gap-3"
                data-testid="radio-role"
              >
                {roles.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole === role.value;
                  return (
                    <label
                      key={role.value}
                      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      data-testid={`role-${role.value}`}
                    >
                      <RadioGroupItem value={role.value} className="sr-only" />
                      <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-bold text-sm">{t(role.labelKey)}</span>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            <Button
              onClick={handleEnter}
              className="w-full h-11 text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              disabled={isPending}
              data-testid="button-enter"
            >
              {isPending ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("authenticating")}
                </>
              ) : (
                t("signIn")
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground font-bold">
          {t("protectedSystem")}
        </p>
      </div>
    </div>
  );
}
