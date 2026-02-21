import { useState } from "react";
import { useLogin } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Shield, User, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { mutate: login, isPending } = useLogin();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<string>("admin");

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
    const dir = (lng === "ar" || lng === "ckb") ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
  };

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    login(values, {
      onSuccess: () => {
        toast({ title: t("loginSuccess"), description: t("loginSuccessDesc") });
        setLocation("/");
      },
      onError: (error) => {
        toast({
          title: t("loginFailed"),
          description: error.message,
          variant: "destructive",
        });
      },
    });
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

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">{t("username")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("username")} className="h-11 font-bold" data-testid="input-username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">{t("password")}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" className="h-11 font-bold" data-testid="input-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  disabled={isPending}
                  data-testid="button-login"
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
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground font-bold">
          {t("protectedSystem")}
        </p>
      </div>
    </div>
  );
}
