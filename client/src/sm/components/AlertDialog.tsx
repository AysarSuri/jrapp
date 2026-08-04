import { useEffect, useState } from "react";
import { AlertTriangle, Info, CheckCircle, XCircle, Printer, Check } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
export type AlertVariant = "warning" | "danger" | "info" | "success" | "printer";

export interface AlertOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  variant?: AlertVariant;
}

/* ─── Module-level store (callable from anywhere, even utils) ─ */
interface AlertState { id: number; options: AlertOptions; }

let counter = 0;
let current: AlertState | null = null;
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }

/** يعرض رسالة تنبيه احترافية في منتصف الشاشة — قابلة للاستدعاء من أي مكان. */
export function showAlert(options: AlertOptions) {
  counter += 1;
  current = { id: counter, options };
  emit();
}

function closeAlert() {
  current = null;
  emit();
}

/* ─── Variant styling ───────────────────────────────────── */
const VARIANTS: Record<AlertVariant, {
  icon: React.ElementType;
  iconBg: string; iconBorder: string; iconColor: string;
  btnBg: string; btnHover: string; btnShadow: string;
  accent: string; defaultTitle: string;
}> = {
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-500/15", iconBorder: "border-amber-500/40", iconColor: "text-amber-500",
    btnBg: "bg-amber-500", btnHover: "hover:bg-amber-600", btnShadow: "shadow-amber-500/30",
    accent: "from-amber-400 to-amber-600", defaultTitle: "تنبيه",
  },
  printer: {
    icon: Printer,
    iconBg: "bg-blue-500/15", iconBorder: "border-blue-500/40", iconColor: "text-blue-500",
    btnBg: "bg-blue-600", btnHover: "hover:bg-blue-700", btnShadow: "shadow-blue-500/30",
    accent: "from-blue-400 to-blue-600", defaultTitle: "الطابعة",
  },
  danger: {
    icon: XCircle,
    iconBg: "bg-red-500/15", iconBorder: "border-red-500/40", iconColor: "text-red-500",
    btnBg: "bg-red-500", btnHover: "hover:bg-red-600", btnShadow: "shadow-red-500/30",
    accent: "from-red-400 to-red-600", defaultTitle: "خطأ",
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-500/15", iconBorder: "border-blue-500/40", iconColor: "text-blue-500",
    btnBg: "bg-blue-600", btnHover: "hover:bg-blue-700", btnShadow: "shadow-blue-500/30",
    accent: "from-blue-400 to-blue-600", defaultTitle: "معلومة",
  },
  success: {
    icon: CheckCircle,
    iconBg: "bg-emerald-500/15", iconBorder: "border-emerald-500/40", iconColor: "text-emerald-500",
    btnBg: "bg-emerald-600", btnHover: "hover:bg-emerald-700", btnShadow: "shadow-emerald-500/30",
    accent: "from-emerald-400 to-emerald-600", defaultTitle: "تم",
  },
};

/* ─── Host (mount once near the app root) ────────────────── */
export function AlertDialogHost() {
  const [, force] = useState(0);

  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  if (!current) return null;

  const { options } = current;
  const variant = options.variant ?? "warning";
  const cfg = VARIANTS[variant];
  const Icon = cfg.icon;
  const title = options.title ?? cfg.defaultTitle;
  const confirmText = options.confirmText ?? "حسناً";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      dir="rtl"
      onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") closeAlert(); }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
        onClick={closeAlert}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-90 fade-in duration-200">
        {/* Top accent bar */}
        <div className={`h-1.5 w-full bg-gradient-to-l ${cfg.accent}`} />

        <div className="p-8">
          {/* Icon + Title */}
          <div className="flex flex-col items-center text-center gap-5 mb-8">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center border-2 ${cfg.iconBg} ${cfg.iconBorder}`}>
              <Icon className={`w-12 h-12 ${cfg.iconColor}`} />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">{title}</h2>
              {options.message && (
                <p className="text-base text-muted-foreground mt-2 leading-relaxed">{options.message}</p>
              )}
            </div>
          </div>

          {/* Confirm button */}
          <button
            onClick={closeAlert}
            autoFocus
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-xl font-black text-white shadow-lg active:scale-95 transition-all select-none ${cfg.btnBg} ${cfg.btnHover} ${cfg.btnShadow}`}
          >
            <Check className="w-7 h-7 stroke-[3]" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
