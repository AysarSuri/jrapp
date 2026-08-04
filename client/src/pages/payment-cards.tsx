import { useState, type ChangeEvent } from "react";
import { useLang } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useBranch } from "@/contexts/BranchContext";
import {
  CreditCard, Plus, Pencil, Trash2, X, Check, Loader2,
  Wifi, Shield, BadgePercent, HelpCircle, ToggleLeft, ToggleRight,
  Phone, QrCode, Wallet, Upload, Lock,
} from "lucide-react";
import { useConfirm } from "@/contexts/ConfirmDialogContext";
import { fetchJson, fetchOk } from "@/lib/utils";

/* Resize an uploaded image to a max dimension and return a data URL (keeps QR scannable, avoids 413) */
function resizeImageFile(file: File, maxSize: number, mime = "image/png"): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image_failed"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) { height = Math.round((height * maxSize) / width); width = maxSize; }
          else { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no_canvas_ctx"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(mime, 0.92));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const CARD_TYPES = [
  { value: "fib",        label: "FIB",        color: "bg-green-500",   icon: "🏦" },
  { value: "tbi",        label: "TBI",         color: "bg-blue-500",    icon: "🏦" },
  { value: "mastercard", label: "Mastercard",  color: "bg-red-500",     icon: "💳" },
  { value: "visa",       label: "Visa",        color: "bg-indigo-500",  icon: "💳" },
  { value: "amex",       label: "Amex",        color: "bg-sky-500",     icon: "💳" },
  { value: "fastpay",    label: "FastPay",     color: "bg-orange-500",  icon: "📱" },
  { value: "zaincash",   label: "ZainCash",    color: "bg-yellow-500",  icon: "📱" },
  { value: "other",      label: "أخرى",        color: "bg-slate-500",   icon: "💰" },
];

const typeMap = Object.fromEntries(CARD_TYPES.map(t => [t.value, t]));

type Card = { id: number; name: string; type: string; notes: string | null; mobile: string | null; barcode: string | null; openingBalance: string; isActive: boolean; isUsed: boolean; createdAt: string; branchIds?: number[] };

const EMPTY = { name: "", type: "other", notes: "", mobile: "", barcode: "", openingBalance: "0", isActive: true, branchIds: [] as number[] };

export default function PaymentCardsPage() {
  const { t } = useLang();
  const qc = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { fmtMoney } = useAppSettings();
  const { activeBranches, selectedBranchId } = useBranch();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [form, setForm] = useState(EMPTY);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const [uploading, setUploading] = useState(false);
  const [qrModal, setQrModal] = useState<{ name: string; barcode: string; branches: string[] } | null>(null);

  async function handleQrUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      const dataUrl = await resizeImageFile(file, 512, "image/png");
      set("barcode", dataUrl);
    } catch {
      toast({ title: t("cards.img_read_error"), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const { data: cards = [], isLoading } = useQuery<Card[]>({
    queryKey: ["/api/payment-cards", selectedBranchId],
    queryFn: () => fetchJson(`/api/payment-cards${selectedBranchId != null ? `?branchId=${selectedBranchId}` : ""}`),
  });

  const createMut = useMutation({
    mutationFn: (body: typeof EMPTY) =>
      fetchJson("/api/payment-cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/payment-cards"] }); closeForm(); toast({ title: t("cards.added_toast") }); },
    onError: (e: any) => toast({ title: t("cards.save_error"), description: e?.response?.data?.error || e?.message || t("common.save_error"), variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: typeof EMPTY & { id: number }) =>
      fetchJson(`/api/payment-cards/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/payment-cards"] }); closeForm(); toast({ title: t("cards.edited_toast") }); },
    onError: (e: any) => toast({ title: t("cards.save_error"), description: e?.response?.data?.error || e?.message || t("common.save_error"), variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetchOk(`/api/payment-cards/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/payment-cards"] }); toast({ title: t("common.deleted") }); },
    onError: () => toast({ title: t("cards.delete_error"), variant: "destructive" }),
  });

  function openAdd() { setForm(EMPTY); setEditing(null); setShowForm(true); }
  function openEdit(c: Card) { setForm({ name: c.name, type: c.type, notes: c.notes || "", mobile: c.mobile || "", barcode: c.barcode || "", openingBalance: c.openingBalance ?? "0", isActive: c.isActive, branchIds: c.branchIds ?? [] }); setEditing(c); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY); }

  async function handleSave() {
    if (!form.name.trim()) { toast({ title: t("cards.name_required"), variant: "destructive" }); return; }
    if (editing) updateMut.mutate({ id: editing.id, ...form });
    else createMut.mutate(form);
  }

  async function handleDelete(c: Card) {
    if (c.isUsed) {
      toast({ title: t("cards.cannot_delete"), description: t("cards.in_use_desc"), variant: "destructive" });
      return;
    }
    const ok = await confirm({ title: t("cards.confirm_delete_title"), message: `${t("common.delete_confirm")} "${c.name}"؟`, confirmLabel: t("common.delete"), variant: "danger" });
    if (ok) deleteMut.mutate(c.id);
  }

  const saving = createMut.isPending || updateMut.isPending;
  const active = cards.filter(c => c.isActive);
  const inactive = cards.filter(c => !c.isActive);

  return (
    <div className="p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">{t("cards.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("cards.desc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />{t("cards.new")}</button>
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-violet-600" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("cards.total_count")}</p>
            <p className="text-xl font-black text-foreground">{cards.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <ToggleRight className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("cards.active_lbl")}</p>
            <p className="text-xl font-black text-foreground">{active.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
            <ToggleLeft className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("cards.inactive_lbl")}</p>
            <p className="text-xl font-black text-foreground">{inactive.length}</p>
          </div>
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />{t("common.loading")}</div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
          <CreditCard className="w-16 h-16 opacity-20" />
          <p className="text-lg font-bold">{t("cards.no_cards")}</p>
          <p className="text-sm">{t("cards.add_hint")}</p>
          <button onClick={openAdd} className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors">
            <Plus className="w-4 h-4" />{t("cards.add")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map(card => {
            const cardT = typeMap[card.type] || typeMap.other;
            return (
              <div key={card.id}
                className={`bg-card rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all cursor-pointer ${card.isActive ? "border-border hover:border-primary/30 hover:shadow-md" : "border-border/50 opacity-60"}`}
                onDoubleClick={() => {
                  if (!card.barcode) return;
                  const branches = (card.branchIds || []).map(bid => activeBranches.find(x => x.id === bid)?.name ?? `#${bid}`);
                  setQrModal({ name: card.name, barcode: card.barcode, branches });
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl ${cardT.color}/15 flex items-center justify-center text-lg`}>{cardT.icon}</div>
                    <div>
                      <p className="font-black text-sm text-foreground">{card.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cardT.color}/15 text-${cardT.color.replace("bg-", "")}`}>{cardT.value === "other" ? t("cards.type_other") : cardT.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(card)} className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center transition-colors" title={t("common.edit")}>
                      <Pencil className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                    {card.isUsed ? (
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center cursor-not-allowed" title={t("cards.in_use_locked")}>
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    ) : (
                      <button onClick={() => handleDelete(card)} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors" title={t("common.delete")}>
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <Wallet className="w-3 h-3" /><span dir="ltr">{fmtMoney(Number(card.openingBalance) || 0)}</span>
                  </div>
                  {card.mobile && (
                    <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400">
                      <Phone className="w-3 h-3" /><span dir="ltr">{card.mobile}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(card.branchIds && card.branchIds.length > 0)
                    ? card.branchIds.map(bid => {
                        const b = activeBranches.find(x => x.id === bid);
                        return (
                          <span key={bid} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300">
                            {b?.name ?? `#${bid}`}
                          </span>
                        );
                      })
                    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t("cards.no_branch")}</span>}
                </div>
                {card.notes && <p className="text-xs text-muted-foreground leading-relaxed">{card.notes}</p>}
                {card.barcode && (
                  <button
                    type="button"
                    onClick={() => {
                      const branches = (card.branchIds || []).map(bid => activeBranches.find(x => x.id === bid)?.name ?? `#${bid}`);
                      setQrModal({ name: card.name, barcode: card.barcode!, branches });
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-700 dark:text-violet-300 font-bold text-xs transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    {t("cards.view_qr")}
                  </button>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className={`text-xs font-bold px-2 py-1 rounded-lg ${card.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {card.isActive ? t("cards.active_badge") : t("cards.inactive_badge")}
                  </div>
                  {card.isUsed && (
                    <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <Lock className="w-3 h-3" />{t("cards.in_use_badge")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeForm}>
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-lg">{editing ? t("cards.edit_title") : t("cards.add_title")}</h2>
              <button onClick={closeForm} className="w-8 h-8 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-1.5">
                  {t("cards.name_label")} <span className="text-red-500">*</span>
                  {editing?.isUsed && (
                    <span className="me-2 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <Lock className="w-3 h-3" />{t("cards.name_locked")}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  placeholder={t("cards.name_placeholder")}
                  disabled={!!editing?.isUsed}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  autoFocus={!editing?.isUsed}
                />
              </div>

              {/* Opening balance */}
              <div>
                <label className="flex items-center gap-1 text-sm font-bold mb-1.5"><Wallet className="w-3.5 h-3.5 text-emerald-600" />{t("cards.opening_balance")}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.openingBalance}
                  onChange={e => set("openingBalance", e.target.value)}
                  placeholder="0"
                  dir="ltr"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="flex items-center gap-1 text-sm font-bold mb-1.5"><Phone className="w-3.5 h-3.5 text-blue-600" />{t("cards.mobile_label")}</label>
                <input
                  type="text"
                  inputMode="tel"
                  value={form.mobile}
                  onChange={e => set("mobile", e.target.value)}
                  placeholder="0750..."
                  dir="ltr"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Type */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">{t("cards.type_label")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CARD_TYPES.map(ct => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => set("type", ct.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-bold transition-all ${form.type === ct.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"}`}
                    >
                      <span className="text-lg">{ct.icon}</span>
                      {ct.value === "other" ? t("cards.type_other") : ct.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* QR image upload */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-1 text-sm font-bold mb-1.5"><QrCode className="w-3.5 h-3.5 text-violet-600" />{t("cards.qr_label")}</label>
                {form.barcode ? (
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-border">
                    <img src={form.barcode} alt="QR" className="w-40 h-40 object-contain" />
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({ title: t("cards.qr_delete_title"), message: t("cards.qr_delete_msg"), confirmLabel: t("common.delete"), variant: "danger" });
                        if (ok) set("barcode", "");
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />{t("cards.qr_remove")}
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary/40 transition-all">
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                    <span className="text-xs font-bold text-muted-foreground">{uploading ? t("cards.qr_processing") : t("cards.qr_choose")}</span>
                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>

              {/* Branch assignment (one or more; none = belongs to NO branch) */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-1 text-sm font-bold mb-1.5"><CreditCard className="w-3.5 h-3.5 text-violet-600" />{t("cards.branches_label")}</label>
                <p className="text-[11px] text-muted-foreground mb-2">{t("cards.branches_hint")}</p>
                <div className="flex flex-wrap gap-2">
                  {activeBranches.map(b => {
                    const sel = form.branchIds.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => set("branchIds", sel ? form.branchIds.filter(x => x !== b.id) : [...form.branchIds, b.id])}
                        className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-foreground border-border hover:border-primary/40"}`}
                      >
                        {sel && <Check className="w-3 h-3" />}{b.name}
                      </button>
                    );
                  })}
                  {activeBranches.length === 0 && <span className="text-xs text-muted-foreground">{t("cards.no_branches_list")}</span>}
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-1.5">{t("cards.notes_label")}</label>
                <textarea
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  placeholder={t("cards.notes_placeholder")}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Active toggle */}
              <div className="md:col-span-2 flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                <span className="text-sm font-bold">{t("cards.status_label")}</span>
                <button
                  type="button"
                  onClick={() => set("isActive", !form.isActive)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${form.isActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isActive ? "start-[26px]" : "start-1"}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editing ? t("common.edit") : t("common.add")}
              </button>
              <button onClick={closeForm} className="flex-1 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted/50 transition-colors">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Modal (double-click on card) ── */}
      {qrModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setQrModal(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="h-2 bg-gradient-to-l from-violet-500 to-purple-400 w-full" />
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <p className="font-black text-xl text-foreground">{qrModal.name}</p>
                  {qrModal.branches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {qrModal.branches.map(b => (
                        <span key={b} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300">{b}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setQrModal(null)} className="w-14 h-14 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center transition-colors">
                <X className="w-8 h-8 text-red-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-white p-5 rounded-xl shadow-inner w-full flex items-center justify-center">
                <img src={qrModal.barcode} alt="QR" className="w-full max-h-[28rem] object-contain" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
