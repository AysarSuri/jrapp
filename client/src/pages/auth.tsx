import { useState, useEffect } from "react";
import { useLogin } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Shield, User, LogIn, Eye, EyeOff, Building2,
  ChevronRight, ArrowRight, ArrowLeft, Lock, Sparkles,
} from "lucide-react";
import { IconClearance } from "@/components/erp-icons";
import { useTranslation } from "react-i18next";

type LoginBranch = { id: number; name: string; color: string | null };
type LoginUser   = { id: string; username: string; fullName: string; role: string };
type Step        = "branch" | "users" | "password";

const branchGradients: Record<string, string> = {
  teal:   "from-teal-500 to-cyan-600",
  blue:   "from-blue-500 to-indigo-600",
  green:  "from-emerald-500 to-teal-600",
  red:    "from-rose-500 to-red-600",
  purple: "from-purple-500 to-violet-600",
  orange: "from-orange-500 to-amber-600",
  indigo: "from-indigo-500 to-blue-600",
  pink:   "from-pink-500 to-rose-600",
  amber:  "from-amber-500 to-orange-600",
  cyan:   "from-cyan-500 to-teal-600",
};

function getBranchGradient(color?: string | null) {
  return branchGradients[color ?? "teal"] ?? branchGradients.teal;
}

function getRoleGradient(role: string) {
  if (role === "admin")    return "from-rose-500 to-red-600";
  if (role === "sales_rep") return "from-blue-500 to-indigo-600";
  return "from-emerald-500 to-teal-600";
}
function getRoleIcon(role: string) {
  if (role === "admin")    return Shield;
  if (role === "sales_rep") return User;
  return User;
}

const languages = [
  { code: "en",  label: "EN" },
  { code: "ar",  label: "ع" },
  { code: "ckb", label: "ک" },
  { code: "tr",  label: "TR" },
];

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { mutate: login, isPending } = useLogin();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const [step, setStep]                   = useState<Step>("branch");
  const [selectedBranch, setSelectedBranch] = useState<LoginBranch | null>(null);
  const [adminMode, setAdminMode]         = useState(false);
  const [selectedUser, setSelectedUser]   = useState<LoginUser | null>(null);
  const [showPassword, setShowPassword]   = useState(false);
  const [password, setPassword]           = useState("");
  const [animIn, setAnimIn]               = useState(true);

  useEffect(() => {
    const lng = i18n.language;
    document.documentElement.dir  = (lng === "ar" || lng === "ckb") ? "rtl" : "ltr";
    document.documentElement.lang = lng;
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
    document.documentElement.dir  = (lng === "ar" || lng === "ckb") ? "rtl" : "ltr";
    document.documentElement.lang = lng;
  };

  const isRtl    = i18n.language === "ar" || i18n.language === "ckb";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const { data: branches = [] } = useQuery<LoginBranch[]>({ queryKey: ["/api/login-branches"] });

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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    login(
      { username: selectedUser.username, password },
      {
        onSuccess: () => {
          toast({ title: t("loginSuccess"), description: t("loginSuccessDesc") });
          setLocation("/");
        },
        onError: (error) => {
          toast({ title: t("loginFailed"), description: error.message, variant: "destructive" });
        },
      }
    );
  }

  function navigate(nextStep: Step) {
    setAnimIn(false);
    setTimeout(() => { setStep(nextStep); setAnimIn(true); }, 150);
  }

  const handleBranchSelect = (branch: LoginBranch) => {
    setSelectedBranch(branch);
    setAdminMode(false);
    navigate("users");
  };
  const handleAdminMode = () => {
    setSelectedBranch(null);
    setAdminMode(true);
    navigate("users");
  };
  const handleUserSelect = (user: LoginUser) => {
    setSelectedUser(user);
    setPassword("");
    navigate("password");
    setTimeout(() => document.getElementById("pwd-input")?.focus(), 300);
  };
  const handleBackToBranch = () => {
    setSelectedBranch(null);
    setAdminMode(false);
    setSelectedUser(null);
    form.reset();
    navigate("branch");
  };
  const handleBackToUsers = () => {
    setSelectedUser(null);
    setPassword("");
    navigate("users");
  };

  const getRoleLabel = (role: string) => {
    if (role === "admin")    return t("roleAdmin");
    if (role === "sales_rep") return t("roleRepresentative");
    return t("roleUser");
  };

  /* ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen w-full flex overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>

      {/* ══ LEFT PANEL — decorative ══ */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col items-center justify-center overflow-hidden
                      bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">

        {/* Animated blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full
                          bg-indigo-600/20 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full
                          bg-violet-600/20 blur-[140px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full
                          bg-cyan-600/10 blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Floating ring decorations */}
        <div className="absolute top-20 left-20 w-48 h-48 rounded-full border border-white/5" />
        <div className="absolute top-16 left-16 w-64 h-64 rounded-full border border-white/5" />
        <div className="absolute bottom-24 right-20 w-56 h-56 rounded-full border border-white/5" />
        <div className="absolute bottom-16 right-12 w-80 h-80 rounded-full border border-white/5" />

        {/* Brand content */}
        <div className="relative z-10 text-center px-12 space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 blur-xl opacity-60" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600
                              flex items-center justify-center shadow-2xl shadow-indigo-900/60">
                <span className="text-4xl font-black text-white tracking-tighter">JR</span>
              </div>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-5xl font-black text-white tracking-tight leading-tight">
              نظام إدارة
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                الأعمال المتكامل
              </span>
            </h1>
            <p className="text-slate-400 text-lg font-medium max-w-xs mx-auto leading-relaxed">
              منصة ذكية لإدارة المبيعات والمخزون والحسابات بكفاءة عالية
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {["📦 المخزون", "🧾 الفواتير", "📊 التقارير", "👥 العملاء"].map((f) => (
              <span key={f}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10
                               text-slate-300 text-sm font-medium backdrop-blur-sm">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom accent */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            <span>Powered by JR ERP</span>
            <Sparkles className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — form ══ */}
      <div className="flex-1 flex flex-col items-center justify-center relative
                      bg-gradient-to-br from-slate-50 via-white to-slate-100
                      dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 lg:p-12">

        {/* Subtle bg pattern */}
        <div className="absolute inset-0 opacity-30 dark:opacity-10 pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)", backgroundSize: "28px 28px" }} />

        {/* Language switcher */}
        <div className="absolute top-5 end-5 z-20 flex gap-1.5">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              data-testid={`lang-${lang.code}`}
              className={`w-9 h-9 rounded-xl text-sm font-bold transition-all duration-200
                ${i18n.language === lang.code
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"}`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600
                          items-center justify-center shadow-xl shadow-indigo-500/30 mb-3">
            <span className="text-2xl font-black text-white">JR</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">JR ERP</h1>
        </div>

        {/* Card container */}
        <div className="w-full max-w-[420px] relative z-10">

          {/* ── STEP 1: BRANCH ── */}
          {step === "branch" && (
            <div className={`transition-all duration-150 ${animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              <StepHeader title="اختر الفرع" subtitle="حدد الفرع للمتابعة" icon={Building2} />

              <div className="mt-6 space-y-3">
                {/* Admin */}
                <button
                  onClick={handleAdminMode}
                  data-testid="button-admin-mode"
                  className="group w-full flex items-center gap-4 p-4 rounded-2xl
                             bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30
                             border-2 border-rose-200 dark:border-rose-800/50
                             hover:border-rose-400 dark:hover:border-rose-600
                             hover:shadow-lg hover:shadow-rose-500/10
                             transition-all duration-200 text-start"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600
                                  flex items-center justify-center shadow-lg shadow-rose-500/30 flex-shrink-0
                                  group-hover:scale-110 transition-transform duration-200">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-rose-700 dark:text-rose-400">مدير النظام</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">دخول بدون اختيار فرع</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-rose-400 group-hover:translate-x-0.5 transition-transform ${isRtl ? "rotate-180" : ""}`} />
                </button>

                {branches.length > 0 && (
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">أو</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>
                )}

                {/* Branches */}
                <div className="space-y-2">
                  {branches.map((branch) => {
                    const grad = getBranchGradient(branch.color);
                    return (
                      <button
                        key={branch.id}
                        onClick={() => handleBranchSelect(branch)}
                        data-testid={`button-branch-${branch.id}`}
                        className="group w-full flex items-center gap-4 p-4 rounded-2xl
                                   bg-white dark:bg-slate-800/60
                                   border-2 border-slate-200 dark:border-slate-700/60
                                   hover:border-indigo-300 dark:hover:border-indigo-600
                                   hover:shadow-lg hover:shadow-indigo-500/10
                                   transition-all duration-200 text-start"
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad}
                                        flex items-center justify-center shadow-lg flex-shrink-0
                                        group-hover:scale-110 transition-transform duration-200`}>
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{branch.name}</p>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all ${isRtl ? "rotate-180" : ""}`} />
                      </button>
                    );
                  })}

                  {branches.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-semibold">لا يوجد فروع</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: USERS ── */}
          {step === "users" && (
            <div className={`transition-all duration-150 ${animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              <StepHeader
                title={adminMode ? "مدير النظام" : (selectedBranch?.name ?? "")}
                subtitle="اختر المستخدم للمتابعة"
                icon={adminMode ? Shield : User}
                accentClass={adminMode ? "from-rose-500 to-red-600" : "from-indigo-500 to-violet-600"}
                onBack={handleBackToBranch}
                BackIcon={BackIcon}
              />

              <div className="mt-6">
                {loadingUsers ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                    <p className="text-sm text-slate-400 font-medium">جاري التحميل...</p>
                  </div>
                ) : loginUsers.length > 0 ? (
                  <div className="space-y-2">
                    {loginUsers.map((user) => {
                      const Icon = getRoleIcon(user.role);
                      const grad = getRoleGradient(user.role);
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          data-testid={`button-select-user-${user.username}`}
                          className="group w-full flex items-center gap-4 p-4 rounded-2xl
                                     bg-white dark:bg-slate-800/60
                                     border-2 border-slate-200 dark:border-slate-700/60
                                     hover:border-indigo-300 dark:hover:border-indigo-600
                                     hover:shadow-lg hover:shadow-indigo-500/10
                                     transition-all duration-200 text-start"
                        >
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad}
                                          flex items-center justify-center shadow-lg flex-shrink-0
                                          group-hover:scale-110 transition-transform duration-200`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                              {user.fullName || user.username}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {user.username} · {getRoleLabel(user.role)}
                            </p>
                          </div>
                          <LogIn className={`w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors ${isRtl ? "rotate-180" : ""}`} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-sm">{t("No users found")}</p>
                    <p className="text-xs mt-1 opacity-70">{t("noUsersInBranch") || "لا يوجد مستخدمون في هذا الفرع"}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: PASSWORD ── */}
          {step === "password" && selectedUser && (
            <div className={`transition-all duration-150 ${animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              <StepHeader
                title={t("signIn")}
                subtitle="أدخل كلمة المرور للمتابعة"
                icon={Lock}
                accentClass="from-indigo-500 to-violet-600"
                onBack={handleBackToUsers}
                BackIcon={BackIcon}
              />

              <div className="mt-6 space-y-5">
                {/* Selected user card */}
                <div className="flex items-center gap-4 p-4 rounded-2xl
                                bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40
                                border-2 border-indigo-200 dark:border-indigo-800/50">
                  {(() => {
                    const Icon = getRoleIcon(selectedUser.role);
                    const grad = getRoleGradient(selectedUser.role);
                    return (
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad}
                                      flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {selectedUser.fullName || selectedUser.username}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedUser.username}
                      {!adminMode && selectedBranch && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold"> · {selectedBranch.name}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Password form */}
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                      {t("password")}
                    </label>
                    <div className="relative">
                      <input
                        id="pwd-input"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        data-testid="input-password"
                        autoFocus
                        required
                        className="w-full h-12 rounded-xl px-4 pe-12 text-base font-bold
                                   bg-white dark:bg-slate-800
                                   border-2 border-slate-200 dark:border-slate-700
                                   focus:border-indigo-500 dark:focus:border-indigo-500
                                   focus:ring-4 focus:ring-indigo-500/10
                                   text-slate-900 dark:text-white placeholder-slate-300
                                   outline-none transition-all duration-200"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password"
                        className="absolute end-3.5 top-1/2 -translate-y-1/2 p-1
                                   text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                                   transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || !password}
                    data-testid="button-login"
                    className="w-full h-12 rounded-xl text-base font-bold text-white
                               bg-gradient-to-r from-indigo-600 to-violet-600
                               hover:from-indigo-500 hover:to-violet-500
                               disabled:opacity-50 disabled:cursor-not-allowed
                               shadow-xl shadow-indigo-500/30
                               hover:shadow-indigo-500/50 hover:-translate-y-0.5
                               active:translate-y-0
                               transition-all duration-200
                               flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t("authenticating")}
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        {t("signIn")}
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {(["branch", "users", "password"] as Step[]).map((s, i) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300
                ${step === s
                  ? "w-8 bg-indigo-600"
                  : i < ["branch", "users", "password"].indexOf(step)
                  ? "w-4 bg-indigo-300"
                  : "w-4 bg-slate-200 dark:bg-slate-700"}`}
              />
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400 font-medium">
            🔒 {t("protectedSystem")}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable step header component ── */
function StepHeader({
  title, subtitle, icon: Icon, accentClass = "from-indigo-500 to-violet-600",
  onBack, BackIcon,
}: {
  title: string; subtitle: string; icon: React.ElementType;
  accentClass?: string; onBack?: () => void; BackIcon?: React.ElementType;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        {onBack && BackIcon && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800
                       hover:bg-slate-200 dark:hover:bg-slate-700
                       text-slate-600 dark:text-slate-300
                       transition-colors duration-150 flex-shrink-0"
          >
            <BackIcon className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentClass}
                          flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">{title}</h2>
            <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
