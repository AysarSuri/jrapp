import {
  createContext, useCallback, useContext, useRef, useState, type ReactNode,
} from "react";
import { AlertTriangle, Trash2, Info, HelpCircle, CheckCircle, X, Check } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
export type ConfirmVariant = "danger" | "warning" | "info" | "success" | "default";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Aliases used by some ported pages. */
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

/* ─── Context ───────────────────────────────────────────── */
const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmDialogProvider");
  return ctx;
}

/* ─── Variant config ────────────────────────────────────── */
const VARIANTS: Record<ConfirmVariant, {
  icon: React.ElementType;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  confirmBg: string;
  confirmHover: string;
  confirmShadow: string;
  defaultTitle: string;
  defaultConfirm: string;
}> = {
  danger: {
    icon: Trash2,
    iconBg: "bg-red-500/15",
    iconBorder: "border-red-500/40",
    iconColor: "text-red-500",
    confirmBg: "bg-red-500",
    confirmHover: "hover:bg-red-600",
    confirmShadow: "shadow-red-500/30",
    defaultTitle: "تأكيد الحذف",
    defaultConfirm: "نعم، احذف",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-500/15",
    iconBorder: "border-amber-500/40",
    iconColor: "text-amber-500",
    confirmBg: "bg-amber-500",
    confirmHover: "hover:bg-amber-600",
    confirmShadow: "shadow-amber-500/30",
    defaultTitle: "تنبيه",
    defaultConfirm: "نعم، متأكد",
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-500/15",
    iconBorder: "border-blue-500/40",
    iconColor: "text-blue-500",
    confirmBg: "bg-blue-600",
    confirmHover: "hover:bg-blue-700",
    confirmShadow: "shadow-blue-500/30",
    defaultTitle: "تأكيد",
    defaultConfirm: "نعم",
  },
  success: {
    icon: CheckCircle,
    iconBg: "bg-emerald-500/15",
    iconBorder: "border-emerald-500/40",
    iconColor: "text-emerald-500",
    confirmBg: "bg-emerald-600",
    confirmHover: "hover:bg-emerald-700",
    confirmShadow: "shadow-emerald-500/30",
    defaultTitle: "تأكيد",
    defaultConfirm: "نعم",
  },
  default: {
    icon: HelpCircle,
    iconBg: "bg-primary/15",
    iconBorder: "border-primary/40",
    iconColor: "text-primary",
    confirmBg: "bg-primary",
    confirmHover: "hover:bg-primary/90",
    confirmShadow: "shadow-primary/30",
    defaultTitle: "تأكيد",
    defaultConfirm: "نعم",
  },
};

/* ─── Internal dialog state ─────────────────────────────── */
interface DialogState {
  open: boolean;
  options: ConfirmOptions;
}

/* ─── Provider ──────────────────────────────────────────── */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    open: false,
    options: { message: "" },
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, options });
    });
  }, []);

  const handleConfirm = () => {
    setState(s => ({ ...s, open: false }));
    setTimeout(() => resolveRef.current?.(true), 150);
  };

  const handleCancel = () => {
    setState(s => ({ ...s, open: false }));
    setTimeout(() => resolveRef.current?.(false), 150);
  };

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <ConfirmDialogUI
        open={state.open}
        options={state.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmDialogContext.Provider>
  );
}

/* ─── Dialog UI ─────────────────────────────────────────── */
function ConfirmDialogUI({
  open, options, onConfirm, onCancel,
}: {
  open: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const variant = options.variant ?? "default";
  const cfg = VARIANTS[variant];
  const Icon = cfg.icon;

  const title       = options.title       ?? cfg.defaultTitle;
  const confirmText = options.confirmText ?? options.confirmLabel ?? cfg.defaultConfirm;
  const cancelText  = options.cancelText  ?? options.cancelLabel  ?? "لا";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      dir="rtl"
      onKeyDown={e => {
        if (e.key === "Enter")  onConfirm();
        if (e.key === "Escape") onCancel();
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-90 fade-in duration-200">

        {/* Top accent bar */}
        <div className={`h-1.5 w-full ${
          variant === "danger"  ? "bg-gradient-to-l from-red-400 to-red-600" :
          variant === "warning" ? "bg-gradient-to-l from-amber-400 to-amber-600" :
          variant === "info"    ? "bg-gradient-to-l from-blue-400 to-blue-600" :
          variant === "success" ? "bg-gradient-to-l from-emerald-400 to-emerald-600" :
          "bg-gradient-to-l from-primary/60 to-primary"
        }`} />

        <div className="p-8">
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-5 start-5 w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon + Title */}
          <div className="flex flex-col items-center text-center gap-5 mb-8">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center border-2 ${cfg.iconBg} ${cfg.iconBorder}`}>
              <Icon className={`w-12 h-12 ${cfg.iconColor}`} />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">{title}</h2>
              <p className="text-base text-muted-foreground mt-2 leading-relaxed">{options.message}</p>
            </div>
          </div>

          {/* Buttons — large touch-friendly */}
          <div className="flex gap-4">
            {/* Cancel — لا */}
            <button
              onClick={onCancel}
              className="flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-border bg-muted/50 text-xl font-black text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all select-none"
            >
              <X className="w-9 h-9 stroke-[3]" />
              <span>{cancelText}</span>
            </button>

            {/* Confirm — نعم */}
            <button
              onClick={onConfirm}
              autoFocus
              className={`flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-2xl text-xl font-black text-white shadow-lg active:scale-95 transition-all select-none ${cfg.confirmBg} ${cfg.confirmHover} ${cfg.confirmShadow}`}
            >
              <Check className="w-9 h-9 stroke-[3]" />
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
