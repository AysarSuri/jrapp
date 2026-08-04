import { Building2 } from "lucide-react";
import { useBranch } from "@/sm/contexts/BranchContext";
import { useLang } from "@/sm/contexts/LanguageContext";

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-base font-semibold";
const labelCls = "text-sm font-bold text-muted-foreground mb-1.5 block";

type Props = {
  value: number | null;
  onChange: (id: number | null) => void;
  /** Disable selection (e.g. when editing an existing record). */
  disabled?: boolean;
  /** Hide the label (when caller renders its own). */
  hideLabel?: boolean;
  className?: string;
  /** Override the select's base classes so it can match a sibling input's size. */
  sizeClassName?: string;
};

/**
 * Branch picker for create forms.
 * - Privileged users (admin/supervisor) can pick any active branch.
 * - Branch-locked users see their own branch, disabled.
 * Shows a "choose branch" placeholder when nothing is selected, so privileged
 * users are forced to make an explicit choice for new records.
 */
export function BranchSelectField({ value, onChange, disabled, hideLabel, className, sizeClassName }: Props) {
  const { activeBranches, isBranchLocked } = useBranch();
  const { t } = useLang();
  const isDisabled = disabled || isBranchLocked;

  return (
    <div className={className}>
      {!hideLabel && (
        <label className={labelCls}>
          <Building2 className="inline w-3 h-3 mb-0.5 me-0.5" />{t("nav.branches")}
        </label>
      )}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={isDisabled}
        className={`${sizeClassName ?? inputCls} ${isDisabled ? "bg-muted/40 cursor-not-allowed" : ""}`}
      >
        <option value="" disabled>— {t("nav.branches")} —</option>
        {activeBranches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  );
}
