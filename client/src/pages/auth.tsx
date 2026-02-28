import { useState, useEffect } from "react";
import { useLogin } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, ShieldCheck, Shield, User, Truck, Users, LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";

type LoginUser = {
  id: string;
  username: string;
  fullName: string;
  role: string;
};

function getRoleIcon(role: string) {
  switch (role) {
    case "admin": return Shield;
    case "sales_rep": return Truck;
    default: return User;
  }
}

function getRoleColor(role: string) {
  switch (role) {
    case "admin": return "text-red-600 bg-red-100 dark:bg-red-900/30";
    case "sales_rep": return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
    default: return "text-green-600 bg-green-100 dark:bg-green-900/30";
  }
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { mutate: login, isPending } = useLogin();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [selectedUser, setSelectedUser] = useState<LoginUser | null>(null);

  const { data: loginUsers } = useQuery<LoginUser[]>({
    queryKey: ["/api/login-users"],
  });

  useEffect(() => {
    const lng = i18n.language;
    const dir = (lng === "ar" || lng === "ckb") ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
  }, []);

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

  const handleUserSelect = (user: LoginUser) => {
    setSelectedUser(user);
    form.setValue("username", user.username);
    form.setFocus("password");
  };

  const handleBack = () => {
    setSelectedUser(null);
    form.setValue("username", "");
    form.setValue("password", "");
  };

  const languages = [
    { code: "en", label: "English" },
    { code: "ar", label: "العربية" },
    { code: "ckb", label: "کوردی" },
    { code: "tr", label: "Türkçe" },
  ];

  const users = loginUsers || [];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return t("roleAdmin");
      case "sales_rep": return t("roleRepresentative");
      default: return t("roleUser");
    }
  };

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

        {!selectedUser ? (
          <Card className="border-border/50 shadow-xl shadow-black/5 backdrop-blur-sm bg-card/95">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                <Users className="h-6 w-6" />
                {t("selectUser")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user) => {
                    const Icon = getRoleIcon(user.role);
                    const colorClass = getRoleColor(user.role);
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-start"
                        data-testid={`button-select-user-${user.username}`}
                      >
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">
                            {user.fullName || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.username} — {getRoleLabel(user.role)}
                          </p>
                        </div>
                        <LogIn className="h-4 w-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-bold">{t("No users found")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 shadow-xl shadow-black/5 backdrop-blur-sm bg-card/95">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-center">
                {t("signIn")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-5">
                <button
                  onClick={handleBack}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-primary/10 transition-all text-start"
                  data-testid="button-selected-user"
                >
                  {(() => {
                    const Icon = getRoleIcon(selectedUser.role);
                    const colorClass = getRoleColor(selectedUser.role);
                    return (
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {selectedUser.fullName || selectedUser.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.username} — {getRoleLabel(selectedUser.role)}
                    </p>
                  </div>
                  <span className="text-xs text-primary font-bold">{t("Change")}</span>
                </button>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <input type="hidden" {...field} />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">{t("password")}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="h-11 font-bold" data-testid="input-password" autoFocus {...field} />
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
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground font-bold">
          {t("protectedSystem")}
        </p>
      </div>
    </div>
  );
}
