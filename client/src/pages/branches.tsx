import React, { useState, useRef } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Pencil, Trash2, X, Check, Loader2, Phone, MapPin, Smartphone, Image, UploadCloud, QrCode, Lock } from "lucide-react";
import type { Branch } from "@/contexts/BranchContext";
import { BRANCH_COLORS as COLORS, getBranchColor as getColor } from "@/lib/branchColors";
import { fetchJson, fetchOk, FetchError } from "@/lib/utils";

const emptyForm = { name: "", address: "", phone: "", mobile: "", notes: "", isActive: true, headerImage: "", qrImage: "", storeName: "", storeLogo: "", color: "teal" };

/* تصغير الصورة قبل تحويلها إلى نص base64 وحفظها مع الفرع.
   يمنع فشل الحفظ بسبب كبر حجم الصورة (تجاوز حد الطلب) ويبقي البيانات خفيفة وسريعة. */
function resizeImageFile(file: File, maxSize: number, mime = "image/png"): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = () => {
      // These callbacks run async (outside the Promise executor body), so a throw
      // here would NOT reject the promise — it would hang forever. Wrap in try/catch
      // and always reject so the caller's `finally` runs and the spinner can't stick.
      try {
        // Use window.Image — the bare `Image` is shadowed by the lucide-react icon imported above.
        const img = new window.Image();
        img.onerror = () => reject(new Error("image_failed"));
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxSize || height > maxSize) {
              if (width >= height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("no_canvas_ctx"));
            if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height); }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL(mime, 0.9));
          } catch (e) {
            reject(e instanceof Error ? e : new Error("resize_failed"));
          }
        };
        img.src = reader.result as string;
      } catch (e) {
        reject(e instanceof Error ? e : new Error("resize_failed"));
      }
    };
    reader.readAsDataURL(file);
  });
}

export default function BranchesPage() {
  const { t } = useLang();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const formSessionRef = useRef(0);
  /* Images loaded into the form when editing — used to detect whether an image
     actually changed, so unchanged base64 isn't re-uploaded on every save. */
  const originalImagesRef = useRef({ headerImage: "", qrImage: "", storeLogo: "" });
  const originalNameRef = useRef("");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [qrPreview, setQrPreview] = useState<string>("");
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [confirmImageDelete, setConfirmImageDelete] = useState<"header" | "qr" | "logo" | null>(null);
  const [processingImages, setProcessingImages] = useState(0);

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: () => fetchJson("/api/branches"),
  });

  type SaveVars = {
    editId: number | null;
    form: typeof emptyForm;
    originalImages: { headerImage: string; qrImage: string; storeLogo: string };
  };

  const save = useMutation({
    mutationFn: async (vars: SaveVars) => {
      const { editId, form, originalImages } = vars;
      const url = editId ? `/api/branches/${editId}` : "/api/branches";
      const method = editId ? "PUT" : "POST";
      const payload: Record<string, any> = {
        address: form.address,
        phone: form.phone,
        mobile: form.mobile,
        notes: form.notes,
        isActive: form.isActive,
        storeName: form.storeName,
        color: form.color,
      };
      /* Only send name when it actually changed — server blocks name changes on
         branches already used in records, so sending unchanged name would fail. */
      if (!editId || form.name !== originalNameRef.current) payload.name = form.name;
      /* Only send an image when it actually changed (a new branch always sends).
         Avoids re-uploading hundreds of KB of base64 on a text-only edit — that
         is what made saves slow and occasionally fail. */
      if (!editId || form.headerImage !== originalImages.headerImage) payload.headerImage = form.headerImage;
      if (!editId || form.qrImage !== originalImages.qrImage) payload.qrImage = form.qrImage;
      if (!editId || form.storeLogo !== originalImages.storeLogo) payload.storeLogo = form.storeLogo;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 413) throw new Error("حجم الصور كبير جداً — يرجى اختيار صور أصغر حجماً أو حذف إحداها");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.error) throw new Error(data.error);
        if (res.status === 403) throw new Error("ليس لديك صلاحية لتنفيذ هذا الإجراء");
        if (res.status === 404) throw new Error("الفرع غير موجود — يرجى تحديث الصفحة والمحاولة مجدداً");
        if (res.status >= 500) throw new Error("حدث خطأ في الخادم — يرجى المحاولة مجدداً أو التواصل مع المسؤول");
        throw new Error("فشل الحفظ — يرجى التحقق من البيانات والمحاولة مجدداً");
      }
      return res.json();
    },
    onSuccess: (saved: any, vars: SaveVars) => {
      const wasEdit = vars.editId !== null;
      const id = vars.editId ?? saved.id;
      const f = vars.form;
      /* Update the cache instantly from the IMMUTABLE snapshot we submitted plus
         the server's authoritative response — no slow refetch of every branch's
         images. Using the snapshot (not live React state) means opening another
         branch while this save is in flight can't corrupt the wrong cache entry.
         `...prev`/`...saved` preserve fields not on the form (e.g. quickKeys);
         images come from the snapshot since the light response omits them. */
      qc.setQueryData<Branch[]>(["/api/branches"], (old = []) => {
        const prev = old.find(b => b.id === id);
        const merged = {
          ...(prev ?? {}),
          ...saved,
          headerImage: f.headerImage || null,
          qrImage: f.qrImage || null,
          storeLogo: f.storeLogo || null,
        } as Branch;
        return wasEdit ? old.map(b => (b.id === id ? merged : b)) : [...old, merged];
      });
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      setImagePreview("");
      setQrPreview("");
      setLogoPreview("");
      toast({ title: wasEdit ? t("common.updated") : t("common.added") });
    },
    onError: (e: Error) => toast({
      title: "⚠️ تعذّر الحفظ",
      description: e.message || "حدث خطأ غير متوقع، يرجى المحاولة مجدداً",
      variant: "destructive",
    }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "فشل الحذف");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/branches"] });
      setDeleteId(null);
      toast({ title: t("common.deleted") });
    },
    onError: (e: Error) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  function openAdd() {
    if (save.isPending) return;
    formSessionRef.current += 1;
    originalImagesRef.current = { headerImage: "", qrImage: "", storeLogo: "" };
    originalNameRef.current = "";
    setEditId(null);
    setForm(emptyForm);
    setImagePreview("");
    setQrPreview("");
    setLogoPreview("");
    setProcessingImages(0);
    setShowForm(true);
  }

  function openEdit(b: Branch) {
    if (save.isPending) return;
    formSessionRef.current += 1;
    originalImagesRef.current = {
      headerImage: b.headerImage ?? "",
      qrImage: b.qrImage ?? "",
      storeLogo: b.storeLogo ?? "",
    };
    originalNameRef.current = b.name;
    setEditId(b.id);
    setForm({
      name: b.name,
      address: b.address ?? "",
      phone: b.phone ?? "",
      mobile: b.mobile ?? "",
      notes: b.notes ?? "",
      isActive: b.isActive,
      headerImage: b.headerImage ?? "",
      qrImage: b.qrImage ?? "",
      storeName: b.storeName ?? "",
      storeLogo: b.storeLogo ?? "",
      color: b.color ?? "teal",
    });
    setImagePreview(b.headerImage ?? "");
    setQrPreview(b.qrImage ?? "");
    setLogoPreview(b.storeLogo ?? "");
    setProcessingImages(0);
    setShowForm(true);
  }

  async function handleImageFile(file: File) {
    if (!file) return;
    const session = formSessionRef.current;
    setProcessingImages(n => n + 1);
    try {
      const src = await resizeImageFile(file, 1400, "image/jpeg");
      if (formSessionRef.current !== session) return;
      setImagePreview(src);
      setForm(f => ({ ...f, headerImage: src }));
    } catch {
      if (formSessionRef.current === session) toast({ title: t("common.error"), description: "تعذر معالجة الصورة، جرّب صورة أخرى", variant: "destructive" });
    } finally {
      setProcessingImages(n => n - 1);
    }
  }

  async function handleQrImageFile(file: File) {
    if (!file) return;
    const session = formSessionRef.current;
    setProcessingImages(n => n + 1);
    try {
      const src = await resizeImageFile(file, 512, "image/png");
      if (formSessionRef.current !== session) return;
      setQrPreview(src);
      setForm(f => ({ ...f, qrImage: src }));
    } catch {
      if (formSessionRef.current === session) toast({ title: t("common.error"), description: "تعذر معالجة الصورة، جرّب صورة أخرى", variant: "destructive" });
    } finally {
      setProcessingImages(n => n - 1);
    }
  }

  async function handleLogoFile(file: File) {
    if (!file) return;
    const session = formSessionRef.current;
    setProcessingImages(n => n + 1);
    try {
      const src = await resizeImageFile(file, 320, "image/png");
      if (formSessionRef.current !== session) return;
      setLogoPreview(src);
      setForm(f => ({ ...f, storeLogo: src }));
    } catch {
      if (formSessionRef.current === session) toast({ title: t("common.error"), description: "تعذر معالجة الصورة، جرّب صورة أخرى", variant: "destructive" });
    } finally {
      setProcessingImages(n => n - 1);
    }
  }

  const inputCls = "w-full border border-border rounded-xl px-3 py-2.5 text-base bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";
  const editingBranch = editId ? branches.find(b => b.id === editId) : null;
  const editingIsUsed = editingBranch?.isUsed ?? false;
  const selectedColor = getColor(form.color);
  const onSel = selectedColor.text ?? "#fff";
  const onLightSel = onSel !== "#fff";

  return (
    <>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0d9488,#06b6d4)" }}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">{t("nav.branches")}</h1>
              <p className="text-sm text-muted-foreground">{branches.length} {t("branches.count")}</p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-base font-bold transition-all shadow hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg,#0d9488,#06b6d4)" }}
          >
            <Plus className="w-4 h-4" />
            {t("branches.add")}
          </button>
        </div>

        {/* Branch cards */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-base">
            {t("branches.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" dir="rtl">
            {branches.map((b, idx) => {
              const col = getColor(b.color);
              const onCol = col.text ?? "#fff";
              return (
                <div
                  key={b.id}
                  className="group rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col"
                >
                  {/* Banner: كليشة or gradient */}
                  <div
                    className="relative h-28 w-full shrink-0"
                    style={{ background: b.headerImage ? "#fff" : col.gradient }}
                  >
                    {b.headerImage ? (
                      <img src={b.headerImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-10 h-10" style={{ color: onCol, opacity: 0.9 }} />
                      </div>
                    )}

                    {/* Index badge */}
                    <span className="absolute top-2.5 right-3 w-7 h-7 rounded-full bg-black/35 backdrop-blur text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>

                    {/* Active badge */}
                    <span
                      className="absolute top-2.5 left-3 text-xs px-2.5 py-1 rounded-full font-bold shadow"
                      style={{ background: b.isActive ? col.gradient : "rgba(0,0,0,0.45)", color: b.isActive ? onCol : "#fff" }}
                    >
                      {b.isActive ? t("common.active") : t("common.inactive")}
                    </span>

                    {/* Store logo overlapping the banner */}
                    <div className="absolute -bottom-7 right-4 w-16 h-16 rounded-2xl border-2 border-card bg-white shadow-md overflow-hidden flex items-center justify-center">
                      {b.storeLogo ? (
                        <img src={b.storeLogo} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: col.gradient }}>
                          <Building2 className="w-6 h-6" style={{ color: onCol }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 pt-9 flex-1 flex flex-col gap-3">
                    {/* Names */}
                    <div className="min-w-0">
                      <div className="font-black text-lg text-foreground break-words">{b.name}</div>
                      {b.storeName
                        ? <div className="text-sm font-bold text-muted-foreground flex items-start gap-1"><Image className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span className="break-words">{b.storeName}</span></div>
                        : null}
                    </div>

                    {/* Info rows */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        {b.phone ? <span className="font-medium text-foreground" dir="ltr">{b.phone}</span> : <span className="text-muted-foreground/40">—</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
                        {b.mobile ? <span className="font-medium text-foreground" dir="ltr">{b.mobile}</span> : <span className="text-muted-foreground/40">—</span>}
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        {b.address ? <span className="text-foreground">{b.address}</span> : <span className="text-muted-foreground/40">—</span>}
                      </div>
                      {b.notes ? (
                        <div className="flex items-start gap-2">
                          <Pencil className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{b.notes}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* QR barcode */}
                    {b.qrImage ? (
                      <div className="mt-auto flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-2.5">
                        <img src={b.qrImage} alt="باركود الفرع" className="w-16 h-16 rounded-lg border border-border bg-white object-contain shrink-0" />
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                          <QrCode className="w-4 h-4" />
                          باركود QR للفرع
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Footer actions */}
                  <div className="border-t border-border p-3 flex items-center justify-end gap-2 bg-muted/20 shrink-0">
                    <button
                      onClick={() => openEdit(b)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-80 active:scale-95 shadow-sm"
                      style={{ background: col.gradient, color: onCol }}
                      title={t("common.edit")}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t("common.edit")}
                    </button>
                    {b.isUsed ? (
                      <span
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 text-sm font-bold cursor-default"
                        title="الفرع مستخدم في السجلات — لا يمكن حذفه"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {t("branches.assigned")}
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeleteId(b.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold transition-colors"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("common.delete")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!save.isPending) setShowForm(false); }} />
          <div className="relative z-10 w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

            {/* Modal header with gradient */}
            <div
              className="px-6 py-4 flex items-center justify-between shrink-0"
              style={{ background: selectedColor.gradient, color: onSel }}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5" />
                <h2 className="text-base font-black">
                  {editId ? t("branches.edit") : t("branches.add")}
                </h2>
              </div>
              <button onClick={() => setShowForm(false)} disabled={save.isPending} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${onLightSel ? "bg-black/10 hover:bg-black/20" : "bg-white/20 hover:bg-white/30"}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* ===== LEFT: branch data ===== */}
                <div className="lg:col-span-7 space-y-4">

                  {/* Branch Name */}
                  <div>
                    <label className="block text-base font-bold text-foreground mb-1 flex items-center gap-2">
                      {t("branches.name")} *
                      {editingIsUsed && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                          <Lock className="w-3 h-3" />
                          {t("branches.assigned")} — لا يمكن تغيير الاسم
                        </span>
                      )}
                    </label>
                    <input
                      className={inputCls + (editingIsUsed ? " opacity-60 cursor-not-allowed bg-muted" : "")}
                      value={form.name}
                      onChange={e => { if (!editingIsUsed) setForm(f => ({ ...f, name: e.target.value })); }}
                      readOnly={editingIsUsed}
                      placeholder={t("branches.name_placeholder")}
                    />
                  </div>

                  {/* Phone + Mobile */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-base font-bold text-foreground mb-1">
                        <Phone className="w-4 h-4 text-muted-foreground" />{t("branches.phone")}
                      </label>
                      <input
                        className={inputCls}
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder={t("branches.phone_placeholder")}
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-base font-bold text-foreground mb-1">
                        <Smartphone className="w-4 h-4 text-muted-foreground" />{t("branch.mobile")}
                      </label>
                      <input
                        className={inputCls}
                        value={form.mobile}
                        onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                        placeholder="07xx-xxx-xxxx"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="flex items-center gap-1.5 text-base font-bold text-foreground mb-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />{t("branches.address")}
                    </label>
                    <input
                      className={inputCls}
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder={t("branches.address_placeholder")}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-base font-bold text-foreground mb-1">{t("common.notes")}</label>
                    <textarea
                      className={inputCls}
                      rows={3}
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>

                  {/* Gradient Color Picker */}
                  <div>
                    <label className="block text-base font-bold text-foreground mb-2">{t("branch.gradient")}</label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map(c => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, color: c.key }))}
                          title={c.label}
                          className="relative w-9 h-9 rounded-xl transition-all hover:scale-110 active:scale-95"
                          style={{
                            background: c.gradient,
                            boxShadow: form.color === c.key ? `0 0 0 3px white, 0 0 0 5px ${c.ring}` : undefined,
                            transform: form.color === c.key ? "scale(1.15)" : undefined,
                          }}
                        >
                          {form.color === c.key && (
                            <Check className="w-4 h-4 absolute inset-0 m-auto drop-shadow" style={{ color: c.text ?? "#fff" }} />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{selectedColor.label}</p>
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <span className="text-base font-bold text-foreground">{t("common.active")}</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                      className="relative w-12 h-6 rounded-full transition-colors"
                      style={{ background: form.isActive ? (selectedColor.text ? selectedColor.ring : selectedColor.from) : undefined }}
                    >
                      {!form.isActive && <span className="absolute inset-0 rounded-full bg-muted" />}
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isActive ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </div>
                </div>

                {/* ===== RIGHT: identity & images ===== */}
                <div className="lg:col-span-5 space-y-4">

                  {/* Store identity for this branch (name + logo shown on reports) */}
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center gap-1.5 text-sm font-black text-foreground">
                      <Image className="w-4 h-4 text-muted-foreground" />
                      {t("branch.store_identity")}
                      <span className="text-xs font-normal text-muted-foreground">({t("branch.report_hint")})</span>
                    </div>

                    {/* Store Name */}
                    <div>
                      <label className="block text-base font-bold text-foreground mb-1">{t("branch.store_name_label")}</label>
                      <input
                        className={inputCls}
                        value={form.storeName}
                        onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
                        placeholder="اسم المحل الذي يظهر في أعلى التقارير"
                      />
                    </div>

                    {/* Store Logo */}
                    <div>
                      <label className="block text-base font-bold text-foreground mb-1">لوجو المحل</label>
                      {logoPreview ? (
                        <div
                          onClick={() => logoFileRef.current?.click()}
                          className="group relative w-32 h-32 rounded-xl overflow-hidden border border-border mb-1 cursor-pointer bg-white"
                        >
                          <img src={logoPreview} alt="معاينة اللوجو" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white font-bold text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60">
                              <UploadCloud className="w-3.5 h-3.5" />
                              تغيير
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmImageDelete("logo"); }}
                            className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10"
                            title="حذف اللوجو"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => logoFileRef.current?.click()}
                          className="w-32 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-primary/5 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                        >
                          <Image className="w-7 h-7 text-muted-foreground" />
                          <span className="text-xs font-bold text-muted-foreground">انقر لرفع اللوجو</span>
                          <span className="text-[10px] text-muted-foreground/60">PNG / JPG / WEBP</span>
                        </div>
                      )}
                      <input
                        ref={logoFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); e.target.value = ""; }}
                      />
                    </div>
                  </div>

                  {/* كليشة */}
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <label className="flex items-center gap-1.5 text-base font-bold text-foreground mb-2">
                      <Image className="w-4 h-4 text-muted-foreground" />
                      كليشة الفرع
                      <span className="text-xs font-normal text-muted-foreground">(2490 × 640)</span>
                    </label>
                    {imagePreview ? (
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="group relative w-full rounded-xl overflow-hidden border border-border mb-2 cursor-pointer"
                        style={{ aspectRatio: "2490/640" }}
                      >
                        <img src={imagePreview} alt="معاينة الكليشة" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-white font-bold text-sm flex items-center gap-2 px-4 py-2 rounded-lg bg-black/60">
                            <UploadCloud className="w-4 h-4" />
                            انقر لتغيير الكليشة
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setConfirmImageDelete("header"); }}
                          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10"
                          title="حذف الكليشة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-primary/5 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 py-5"
                        style={{ aspectRatio: "2490/640" }}
                      >
                        <UploadCloud className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm font-bold text-muted-foreground">انقر لرفع الكليشة</span>
                        <span className="text-xs text-muted-foreground/60">PNG / JPG / WEBP — 2490 × 640 px</span>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
                    />
                    {imagePreview && (
                      <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 text-xs font-bold hover:underline" style={{ color: selectedColor.text ? selectedColor.ring : selectedColor.from }}>
                        تغيير الصورة
                      </button>
                    )}
                  </div>

                  {/* باركود QR */}
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <label className="flex items-center gap-1.5 text-base font-bold text-foreground mb-2">
                      <QrCode className="w-4 h-4 text-muted-foreground" />
                      باركود QR للفرع
                    </label>
                    {qrPreview ? (
                      <div
                        onClick={() => qrFileRef.current?.click()}
                        className="group relative w-40 h-40 rounded-xl overflow-hidden border border-border mb-2 cursor-pointer bg-white"
                      >
                        <img src={qrPreview} alt="معاينة باركود QR" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-white font-bold text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60">
                            <UploadCloud className="w-3.5 h-3.5" />
                            تغيير
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setConfirmImageDelete("qr"); }}
                          className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10"
                          title="حذف الباركود"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => qrFileRef.current?.click()}
                        className="w-40 h-40 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-primary/5 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                      >
                        <QrCode className="w-8 h-8 text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground">انقر لرفع صورة QR</span>
                        <span className="text-[10px] text-muted-foreground/60">PNG / JPG / WEBP</span>
                      </div>
                    )}
                    <input
                      ref={qrFileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleQrImageFile(f); e.target.value = ""; }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-6 pb-5 pt-2 shrink-0">
              <button
                onClick={() => save.mutate({ editId, form, originalImages: originalImagesRef.current })}
                disabled={!form.name.trim() || save.isPending || processingImages > 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-base font-bold transition-all hover:opacity-90 disabled:opacity-50 shadow"
                style={{ background: selectedColor.gradient, color: onSel }}
              >
                {(save.isPending || processingImages > 0) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {processingImages > 0 ? t("common.saving") : t("common.save")}
              </button>
              <button
                onClick={() => setShowForm(false)}
                disabled={save.isPending}
                className="flex-1 py-2.5 rounded-xl text-base font-bold border border-border hover:bg-muted transition-colors disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Image Confirm */}
      {confirmImageDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmImageDelete(null)} />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <p className="font-bold text-base text-foreground">{t("common.delete_image_confirm")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (confirmImageDelete === "header") { setImagePreview(""); setForm(f => ({ ...f, headerImage: "" })); }
                  else if (confirmImageDelete === "logo") { setLogoPreview(""); setForm(f => ({ ...f, storeLogo: "" })); }
                  else { setQrPreview(""); setForm(f => ({ ...f, qrImage: "" })); }
                  setConfirmImageDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base transition-colors"
              >
                {t("common.yes")}
              </button>
              <button
                onClick={() => setConfirmImageDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted font-bold text-base transition-colors"
              >
                {t("common.no")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <p className="font-bold text-base text-foreground">{t("common.delete_confirm")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => remove.mutate(deleteId)}
                disabled={remove.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base transition-colors"
              >
                {remove.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t("common.delete")}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted font-bold text-base transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
