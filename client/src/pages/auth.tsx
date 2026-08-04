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
import { Loader2, Shield, User, LogIn, Eye, EyeOff, Building2, ChevronRight, ArrowRight, ArrowLeft } from "lucide-react";
import { IconClearance, IconSupplierList, IconCustomers } from "@/components/erp-icons";
import { useTranslation } from "react-i18next";

type LoginBranch = { id: number; name: string; color: string | null };
type LoginUser = { id: string; username: string; fullName: string; role: string };

// Branch colour mapping
const branchBgMap: Record<string, string> = {
  teal:    "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  blue:    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  green:   "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  red:     "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  purple:  "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  orange:  "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  indigo:  "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  pink:    "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
  amber:   "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  cyan:    "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300",
};
function getBranchClass(color?: string | null) {
  return branchBgMap[color ?? "teal"] ?? branchBgMap.teal;
}

function getRoleIcon(role: string) {
  if (role === "admin") return Shield;
  if (role === "sales_rep") return IconSupplierList;
  return User;
}
function getRoleColor(role: string) {
  if (role === "admin") return "text-red-600 bg-red-100 dark:bg-red-900/30";
  if (role === "sales_rep") return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
  return "text-green-600 bg-green-100 dark:bg-green-900/30";
}

type Step = "branch" | "users" | "password";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { mutate: login, isPending } = useLogin();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  // Steps: branch → users → password
  const [step, setStep] = useState<Step>("branch");
  const [selectedBranch, setSelectedBranch] = useState<LoginBranch | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LoginUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const lng = i18n.language;
    document.documentElement.dir = (lng === "ar" || lng === "ckb") ? "rtl" : "ltr";
    document.documentElement.lang = lng;
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
    document.documentElement.dir = (lng === "ar" || lng === "ckb") ? "rtl" : "ltr";
    document.documentElement.lang = lng;
  };

  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  // Load branches (public)
  const { data: branches = [] } = useQuery<LoginBranch[]>({
    queryKey: ["/api/login-branches"],
  });

  // Load users — only fetch when on users step
  const { data: loginUsers = [], isFetching: loadingUsers } = useQuery<LoginUser[]>({
    queryKey: ["/api/login-users", adminMode ? "admin" : selectedBranch?.id],
    queryFn: async () => {
      const params = adminMode
        ? "?adminOnly=true"
        : selectedBranch
        ? `?branchId=${selectedBranch.id}`
        : "";
      const res = await fetch(`/api/login-users${params}`);
      return res.json();
    },
    enabled: step === "users",
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    login(values, {
      onSuccess: () => {
        toast({ title: t("loginSuccess"), description: t("loginSuccessDesc") });
        setLocation("/");
      },
      onError: (error) => {
        toast({ title: t("loginFailed"), description: error.message, variant: "destructive" });
      },
    });
  }

  // Step 1 → 2: select branch
  const handleBranchSelect = (branch: LoginBranch) => {
    setSelectedBranch(branch);
    setAdminMode(false);
    setStep("users");
  };

  // Step 1 → 2: admin shortcut
  const handleAdminMode = () => {
    setSelectedBranch(null);
    setAdminMode(true);
    setStep("users");
  };

  // Step 2 → 3: select user
  const handleUserSelect = (user: LoginUser) => {
    setSelectedUser(user);
    form.setValue("username", user.username);
    form.setValue("password", "");
    setStep("password");
    setTimeout(() => form.setFocus("password"), 100);
  };

  // Back from users → branches
  const handleBackToBranch = () => {
    setStep("branch");
    setSelectedBranch(null);
    setAdminMode(false);
    setSelectedUser(null);
    form.reset();
  };

  // Back from password → users
  const handleBackToUsers = () => {
    setStep("users");
    setSelectedUser(null);
    form.setValue("password", "");
  };

  const getRoleLabel = (role: string) => {
    if (role === "admin") return t("roleAdmin");
    if (role === "sales_rep") return t("roleRepresentative");
    return t("roleUser");
  };

  const languages = [
    { code: "en", label: "English" },
    { code: "ar", label: "العربية" },
    { code: "ckb", label: "کوردی" },
    { code: "tr", label: "Türkçe" },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />

      {/* Language switcher */}
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
        {/* Logo */}
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <IconClearance className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">ProERP</h1>
          <p className="text-muted-foreground text-lg">{t("erpSystem")}</p>
        </div>

        {/* ── STEP 1: BRANCH SELECTION ── */}
        {step === "branch" && (
          <Card className="border-border/50 shadow-xl shadow-black/5 backdrop-blur-sm bg-card/95">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                اختر الفرع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Admin shortcut */}
              <button
                onClick={handleAdminMode}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-red-200 dark:border-red-800 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all text-start"
                data-testid="button-admin-mode"
              >
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-red-700 dark:text-red-400">
                    مدير النظام
                  </p>
                  <p className="text-xs text-muted-foreground">
                    دخول بدون اختيار فرع
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-bold">
                    أو اختر فرعاً
                  </span>
                </div>
              </div>

              {/* Branches list */}
              {branches.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-bold">لا يوجد فروع</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {branches.map((branch) => {
                    const cls = getBranchClass(branch.color);
                    return (
                      <button
                        key={branch.id}
                        onClick={() => handleBranchSelect(branch)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-start"
                        data-testid={`button-branch-${branch.id}`}
                      >
                        <div className={`p-2 rounded-lg ${cls}`}>
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{branch.name}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: USER SELECTION ── */}
        {step === "users" && (
          <Card className="border-border/50 shadow-xl shadow-black/5 backdrop-blur-sm bg-card/95">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToBranch}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <BackIcon className="h-5 w-5" />
                </button>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  {adminMode ? (
                    <>
                      <Shield className="h-5 w-5 text-red-600" />
                      {t("systemAdmin") || "مدير النظام"}
                    </>
                  ) : (
                    <>
                      <Building2 className="h-5 w-5 text-primary" />
                      {selectedBranch?.name}
                    </>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : loginUsers.length > 0 ? (
                <div className="space-y-2">
                  {loginUsers.map((user) => {
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
                          <p className="font-bold text-sm truncate">{user.fullName || user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.username} — {getRoleLabel(user.role)}
                          </p>
                        </div>
                        <LogIn className="h-5 w-5 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <IconCustomers className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-bold">{t("No users found")}</p>
                  <p className="text-xs mt-1">{t("noUsersInBranch") || "لا يوجد مستخدمون في هذا الفرع"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3: PASSWORD ── */}
        {step === "password" && selectedUser && (
          <Card className="border-border/50 shadow-xl shadow-black/5 backdrop-blur-sm bg-card/95">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToUsers}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <BackIcon className="h-5 w-5" />
                </button>
                <CardTitle className="text-xl font-bold">{t("signIn")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Selected user card */}
              <div className="mb-5">
                <div className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-primary/10">
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
                    <p className="font-bold text-sm truncate">{selectedUser.fullName || selectedUser.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.username} — {getRoleLabel(selectedUser.role)}
                      {!adminMode && selectedBranch && (
                        <span className="ms-2 font-bold text-primary">• {selectedBranch.name}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <input type="hidden" {...field} />
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">{t("password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-11 font-bold pe-10"
                            data-testid="input-password"
                            autoFocus
                            {...field}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-bold shadow-lg shadow-primary/25"
                    disabled={isPending}
                    data-testid="button-login"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        {t("authenticating")}
                      </>
                    ) : t("signIn")}
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
