import { useState } from "react";
import { useLogin, useRegister } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, insertUserSchema } from "@shared/schema";
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
import { Loader2, ShieldCheck, Globe, UserPlus, LogIn } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

const registerSchema = insertUserSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user", "sales_rep"]),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { mutate: login, isPending: isLoginPending } = useLogin();
  const { mutate: register, isPending: isRegisterPending } = useRegister();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<"login" | "register">("login");

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
    const dir = (lng === "ar" || lng === "ckb") ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
  };

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "user",
    },
  });

  function onLogin(values: z.infer<typeof loginSchema>) {
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

  function onRegister(values: z.infer<typeof registerSchema>) {
    register(values, {
      onSuccess: () => {
        toast({ title: t("registerSuccess"), description: t("registerSuccessDesc") });
        setLocation("/");
      },
      onError: (error) => {
        toast({
          title: t("registerFailed"),
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

        <div className="flex mb-4 gap-2">
          <Button
            variant={mode === "login" ? "default" : "outline"}
            className="flex-1 font-bold"
            onClick={() => setMode("login")}
            data-testid="tab-login"
          >
            <LogIn className="w-4 h-4 me-2" />
            {t("login")}
          </Button>
          <Button
            variant={mode === "register" ? "default" : "outline"}
            className="flex-1 font-bold"
            onClick={() => setMode("register")}
            data-testid="tab-register"
          >
            <UserPlus className="w-4 h-4 me-2" />
            {t("register")}
          </Button>
        </div>

        <Card className="border-border/50 shadow-xl shadow-black/5 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">
              {mode === "login" ? t("login") : t("register")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "login" ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
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
                    control={loginForm.control}
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
                    disabled={isLoginPending}
                    data-testid="button-login"
                  >
                    {isLoginPending ? (
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
            ) : (
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">{t("username")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("username")} className="h-11 font-bold" data-testid="input-reg-username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">{t("password")}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="h-11 font-bold" data-testid="input-reg-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">{t("selectRole")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 font-bold" data-testid="select-role">
                              <SelectValue placeholder={t("selectRole")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin" className="font-bold">{t("roleAdmin")}</SelectItem>
                            <SelectItem value="user" className="font-bold">{t("roleUser")}</SelectItem>
                            <SelectItem value="sales_rep" className="font-bold">{t("roleRepresentative")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                    disabled={isRegisterPending}
                    data-testid="button-register"
                  >
                    {isRegisterPending ? (
                      <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        {t("registering")}
                      </>
                    ) : (
                      t("createAccount")
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground font-bold">
          {t("protectedSystem")}
        </p>
      </div>
    </div>
  );
}
