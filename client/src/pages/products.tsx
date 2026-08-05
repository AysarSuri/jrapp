import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/routes";
import { products } from "@shared/schema";
type Product = typeof products.$inferSelect;
import { z } from "zod";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useUnits } from "@/hooks/use-units";
import { useDefaultCurrency } from "@/hooks/use-default-currency";
import { useCategories, useCategoryGroups } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus, Loader2, Pencil, Trash2, Upload, ImageIcon, ArrowLeft, RotateCcw,
  ChevronLeft, ChevronRight, Filter, X, EyeOff, Star, Shuffle, Search,
  Package, Scale, Tag, Layers, BadgeCheck
} from "lucide-react";
import { IconProduct } from "@/components/erp-icons";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ─── schema extension ──────────────────────────────────────────────────── */
const productFormSchema = insertProductSchema.extend({
  barcode: z.string().min(1, "Barcode is required"),
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  bigUnit: z.string().min(1, "Big Unit is required"),
  smallUnit: z.string().min(1, "Small Unit is required"),
  weight: z.string().min(1, "Weight is required"),
  openingQty: z.coerce.number().int().min(0),
  hasScale: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
  if (data.bigUnit && data.smallUnit && data.bigUnit === data.smallUnit && data.conversionFactor !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Conversion factor must be 1 when units are the same", path: ["conversionFactor"] });
  }
});

type FormValues = z.infer<typeof productFormSchema>;

const defaultValues: FormValues = {
  name: "", nameEn: "", barcode: "", category: "", groupName: null,
  bigUnit: "", smallUnit: "", conversionFactor: 1, weight: "0",
  bigUnitPriceUsd: "0", bigUnitPriceIqd: "0",
  smallUnitPriceUsd: "0", smallUnitPriceIqd: "0",
  bigUnitBuyPriceUsd: "0", bigUnitBuyPriceIqd: "0",
  smallUnitBuyPriceUsd: "0", smallUnitBuyPriceIqd: "0",
  bigUnitWholesalePriceUsd: "0", bigUnitWholesalePriceIqd: "0",
  smallUnitWholesalePriceUsd: "0", smallUnitWholesalePriceIqd: "0",
  minStock: 0, openingQty: 0, image: null,
  hidden: false, favorite: false, hasScale: false,
};

const ITEMS_PER_PAGE = 12;

/* ─── toggle button for boolean fields ──────────────────────────────────── */
function ToggleField({
  value, onChange, icon: Icon, label, activeClass,
}: {
  value: boolean; onChange: (v: boolean) => void;
  icon: React.ElementType; label: string; activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-semibold text-sm transition-all duration-200 select-none ${
        value
          ? `${activeClass} border-transparent shadow-md`
          : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className={`h-4 w-4 ${value ? "" : "opacity-60"}`} />
      {label}
      {value && <BadgeCheck className="h-3.5 w-3.5 opacity-80" />}
    </button>
  );
}

/* ─── main component ─────────────────────────────────────────────────────── */
export default function ProductsPage() {
  const { t } = useTranslation();
  const { data: productsList, isLoading } = useProducts();
  const { data: unitsData } = useUnits();
  const unitsList = unitsData || [];
  const { data: categoriesList } = useCategories();
  const { data: allGroups } = useCategoryGroups();
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { mutate: deleteProduct } = useDeleteProduct();
  const { toast } = useToast();

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchName, setSearchName]       = useState("");
  const [searchBarcode, setSearchBarcode] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [flagFilter, setFlagFilter]       = useState<"" | "hidden" | "favorite" | "hasScale">("");
  const [currentPage, setCurrentPage]     = useState(1);
  const [formOpen, setFormOpen]           = useState(false);

  const defaultCurrency = useDefaultCurrency();
  const isUsdDefault = defaultCurrency.code === "USD";
  const sellBigField = isUsdDefault ? "bigUnitPriceUsd" : "bigUnitPriceIqd";
  const sellSmallField = isUsdDefault ? "smallUnitPriceUsd" : "smallUnitPriceIqd";
  const buyBigField = isUsdDefault ? "bigUnitBuyPriceUsd" : "bigUnitBuyPriceIqd";
  const buySmallField = isUsdDefault ? "smallUnitBuyPriceUsd" : "smallUnitBuyPriceIqd";
  const wholesaleBigField = isUsdDefault ? "bigUnitWholesalePriceUsd" : "bigUnitWholesalePriceIqd";
  const wholesaleSmallField = isUsdDefault ? "smallUnitWholesalePriceUsd" : "smallUnitWholesalePriceIqd";
  const priceStep = isUsdDefault ? "0.01" : "250";
  const currencyCode = defaultCurrency.code;
  const fmtPrice = (usd: string | null | undefined, iqd: string | null | undefined) =>
    isUsdDefault ? `$${Number(usd ?? 0).toFixed(2)}` : `${Number(iqd ?? 0).toLocaleString()} ${currencyCode}`;

  const form = useForm<FormValues>({ resolver: zodResolver(productFormSchema), defaultValues });
  const bigUnit = form.watch("bigUnit");
  const smallUnit = form.watch("smallUnit");
  const sameUnits = bigUnit && smallUnit && bigUnit === smallUnit;

  useEffect(() => { if (sameUnits) form.setValue("conversionFactor", 1); }, [bigUnit, smallUnit, sameUnits]);

  const openAddForm = () => { setEditingProduct(null); form.reset(defaultValues); setFormOpen(true); };
  const cancelEdit = () => { setEditingProduct(null); form.reset(defaultValues); setFormOpen(false); };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
    form.reset({
      name: product.name, nameEn: product.nameEn || "", barcode: product.barcode,
      category: product.category, groupName: product.groupName || null,
      bigUnit: product.bigUnit, smallUnit: product.smallUnit,
      conversionFactor: product.conversionFactor, weight: product.weight,
      bigUnitPriceUsd: product.bigUnitPriceUsd, bigUnitPriceIqd: product.bigUnitPriceIqd,
      smallUnitPriceUsd: product.smallUnitPriceUsd, smallUnitPriceIqd: product.smallUnitPriceIqd,
      bigUnitBuyPriceUsd: product.bigUnitBuyPriceUsd ?? "0", bigUnitBuyPriceIqd: product.bigUnitBuyPriceIqd ?? "0",
      smallUnitBuyPriceUsd: product.smallUnitBuyPriceUsd ?? "0", smallUnitBuyPriceIqd: product.smallUnitBuyPriceIqd ?? "0",
      bigUnitWholesalePriceUsd: product.bigUnitWholesalePriceUsd ?? "0", bigUnitWholesalePriceIqd: product.bigUnitWholesalePriceIqd ?? "0",
      smallUnitWholesalePriceUsd: product.smallUnitWholesalePriceUsd ?? "0", smallUnitWholesalePriceIqd: product.smallUnitWholesalePriceIqd ?? "0",
      minStock: product.minStock, openingQty: product.openingQty ?? 0,
      image: product.image || null, hidden: product.hidden ?? false,
      favorite: product.favorite ?? false,
      hasScale: (product as any).hasScale ?? false,
    });
  };

  const generateRandomBarcode = () => {
    const existing = new Set((productsList || []).map(p => p.barcode));
    let bc = "";
    do { bc = String(Math.floor(1000000000000 + Math.random() * 9000000000000)); } while (existing.has(bc));
    form.setValue("barcode", bc);
  };

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, minStock: Number(values.minStock), openingQty: Number(values.openingQty), conversionFactor: Number(values.conversionFactor) };
    if (editingProduct) {
      updateProduct({ id: editingProduct.id, data: payload }, {
        onSuccess: () => { cancelEdit(); toast({ title: t("Product updated successfully") }); },
        onError: (err) => toast({ title: t("Failed to update product"), description: t(err.message), variant: "destructive" }),
      });
    } else {
      createProduct(payload, {
        onSuccess: () => { form.reset(defaultValues); setFormOpen(false); toast({ title: t("Product added successfully") }); },
        onError: (err) => toast({ title: t("Failed to add product"), description: t(err.message), variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteProduct(id, {
      onSuccess: () => { toast({ title: t("Product deleted successfully") }); if (editingProduct?.id === id) cancelEdit(); },
      onError: () => toast({ title: t("Failed to delete product"), variant: "destructive" }),
    });
  };

  const allProducts = productsList || [];
  const filtered = allProducts.filter((p) => {
    const matchName    = !searchName    || p.name.toLowerCase().includes(searchName.toLowerCase());
    const matchBarcode = !searchBarcode || p.barcode.toLowerCase().includes(searchBarcode.toLowerCase());
    const matchCat     = !categoryFilter || p.category === categoryFilter;
    const matchFlag    =
      flagFilter === ""         ? true :
      flagFilter === "hidden"   ? (p.hidden   ?? false) :
      flagFilter === "favorite" ? (p.favorite ?? false) :
      flagFilter === "hasScale" ? ((p as any).hasScale ?? false) : true;
    return matchName && matchBarcode && matchCat && matchFlag;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const isSaving = isCreating || isUpdating;

  /* ── section label ── */
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="col-span-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">{children}</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-5 p-1">

        {/* Back */}
        <Link href="/material-management" data-testid="link-back-material">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t("Material Management")}
          </Button>
        </Link>

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold">{t("Products")}</h1>
              </div>
              <p className="text-emerald-100 text-sm">{t("Manage your inventory items")}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-center px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm min-w-[70px]">
                <div className="text-2xl font-bold">{allProducts.length}</div>
                <div className="text-xs text-emerald-100">{t("Total")}</div>
              </div>
              <div className="text-center px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm min-w-[70px]">
                <div className="text-2xl font-bold">{new Set(allProducts.map(p => p.category)).size}</div>
                <div className="text-xs text-emerald-100">{t("Categories")}</div>
              </div>
              <div className="text-center px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm min-w-[70px]">
                <div className="text-2xl font-bold">{allProducts.filter(p => p.favorite).length}</div>
                <div className="text-xs text-emerald-100">{t("Favorites")}</div>
              </div>
              <Button onClick={openAddForm} className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold gap-2 shadow-lg" data-testid="button-open-add-product">
                <Plus className="h-5 w-5" />
                {t("Add Product")}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Search + Filter ── */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

            {/* 1 — بحث بالاسم */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="ps-9 pe-9 h-10 rounded-xl border-border/60 bg-background text-sm"
                placeholder={t("Product Name")}
                value={searchName}
                onChange={(e) => { setSearchName(e.target.value); setCurrentPage(1); }}
                data-testid="input-search-name"
              />
              {searchName && (
                <button onClick={() => { setSearchName(""); setCurrentPage(1); }}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 2 — بحث بالباركود */}
            <div className="relative">
              <Shuffle className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="ps-9 pe-9 h-10 rounded-xl border-border/60 bg-background text-sm font-mono"
                placeholder={t("Barcode")}
                value={searchBarcode}
                onChange={(e) => { setSearchBarcode(e.target.value); setCurrentPage(1); }}
                data-testid="input-search-barcode"
              />
              {searchBarcode && (
                <button onClick={() => { setSearchBarcode(""); setCurrentPage(1); }}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 3 — فلتر الفئة */}
            <Select value={categoryFilter || "__all__"} onValueChange={(v) => { setCategoryFilter(v === "__all__" ? "" : v); setCurrentPage(1); }}>
              <SelectTrigger className="h-10 rounded-xl border-border/60 text-sm font-medium" data-testid="select-filter-category">
                <Filter className="h-4 w-4 text-muted-foreground me-1.5 shrink-0" />
                <SelectValue placeholder={t("All Categories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("All Categories")}</SelectItem>
                {categoriesList?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 4 — فلتر الخصائص */}
            <div className="flex gap-1.5">
              {([
                { value: "hidden",   label: t("Hidden"),   icon: EyeOff, active: "bg-slate-700 text-white border-slate-700" },
                { value: "favorite", label: t("Favorite"), icon: Star,   active: "bg-amber-500 text-white border-amber-500" },
                { value: "hasScale", label: t("Has Scale"), icon: Shuffle, active: "bg-blue-600 text-white border-blue-600" },
              ] as const).map(({ value, label, icon: Icon, active }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => { setFlagFilter(f => f === value ? "" : value); setCurrentPage(1); }}
                  className={`flex-1 h-10 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1 transition-all duration-150
                    ${flagFilter === value
                      ? active
                      : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Summary + clear all */}
          {(searchName || searchBarcode || categoryFilter || flagFilter) && (
            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-xs text-muted-foreground font-medium">
                {filtered.length} {t("products")} {t("found") || "نتيجة"}
              </span>
              <button
                onClick={() => { setSearchName(""); setSearchBarcode(""); setCategoryFilter(""); setFlagFilter(""); setCurrentPage(1); }}
                className="text-xs text-destructive hover:text-destructive/80 font-bold flex items-center gap-1 transition-colors"
              >
                <X className="h-3 w-3" />
                {t("Clear All") || "مسح الكل"}
              </button>
            </div>
          )}
        </div>

        {/* ── Product Dialog ── */}
        <Dialog open={formOpen} onOpenChange={(open) => { if (!open) cancelEdit(); else setFormOpen(true); }}>
          <DialogContent className="max-w-[96vw] w-[96vw] max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  {editingProduct ? <Pencil className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
                </div>
                {editingProduct ? t("Edit Product") : t("Add New Product")}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">

                {/* ════════════════════════════════════════
                    ROW 1 — بيانات أساسية (4 حقول)
                ════════════════════════════════════════ */}
                <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden mb-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b border-border/40 flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{t("Basic Information")}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 p-4">

                    {/* 1. Barcode */}
                    <FormField control={form.control} name="barcode" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Barcode")}</FormLabel>
                        <div className="flex gap-1">
                          <FormControl><Input placeholder="SCAN-123" className="h-10 font-mono text-sm" {...field} data-testid="input-barcode" /></FormControl>
                          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={generateRandomBarcode} title={t("Generate")} data-testid="button-generate-barcode">
                            <Shuffle className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* 2. Arabic Name */}
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Name")}</FormLabel>
                        <FormControl><Input placeholder={t("Product Name")} className="h-10 text-sm" {...field} data-testid="input-product-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* 3. Latin Name */}
                    <FormField control={form.control} name="nameEn" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">الاسم اللاتيني</FormLabel>
                        <FormControl><Input placeholder="Latin / English name" className="h-10 text-sm" {...field} data-testid="input-product-name-en" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* 4. Weight */}
                    <FormField control={form.control} name="weight" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Weight (KG)")}</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="0.00" className="h-10 text-sm" {...field} data-testid="input-weight" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* ════════════════════════════════════════
                    ROW 2 — فئة / مجموعة / وحدات (4 حقول)
                ════════════════════════════════════════ */}
                <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden mb-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border-b border-border/40 flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">{t("Category & Units")}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 p-4">

                    {/* 1. Category */}
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Category")}</FormLabel>
                        <Select onValueChange={(val) => { field.onChange(val); form.setValue("groupName", null); }} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 text-sm" data-testid="select-category">
                              <SelectValue placeholder={t("Select Category")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoriesList?.map((cat) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* 2. Group */}
                    <FormField control={form.control} name="groupName" render={({ field }) => {
                      const selCat = categoriesList?.find(c => c.name === form.watch("category"));
                      const groups = selCat ? (allGroups || []).filter((g: any) => g.categoryId === selCat.id) : [];
                      return (
                        <FormItem>
                          <FormLabel className="font-bold text-sm">{t("Group")}</FormLabel>
                          <Select onValueChange={(val) => field.onChange(val === "__none__" ? null : val)} value={field.value || "__none__"}>
                            <FormControl>
                              <SelectTrigger className="h-10 text-sm" data-testid="select-group">
                                <SelectValue placeholder={t("Select Group")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">{t("No Group")}</SelectItem>
                              {groups.map((g: any) => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }} />

                    {/* 3. Big Unit */}
                    <FormField control={form.control} name="bigUnit" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Big Unit")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 text-sm" data-testid="select-big-unit">
                              <SelectValue placeholder={t("Select Unit")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>{unitsList?.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* 4. Conversion Factor */}
                    <FormField control={form.control} name="conversionFactor" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Conversion Factor")}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1" className="h-10 text-sm"
                            {...field} onChange={e => field.onChange(Number(e.target.value))}
                            disabled={!!sameUnits} data-testid="input-conversion-factor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* 5. Small Unit */}
                    <FormField control={form.control} name="smallUnit" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Small Unit")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 text-sm" data-testid="select-small-unit">
                              <SelectValue placeholder={t("Select Unit")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>{unitsList?.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* ════════════════════════════════════════
                    ROW 3 — أسعار البيع (4 حقول)
                ════════════════════════════════════════ */}
                <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden mb-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-b border-border/40 flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-500 to-cyan-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">{t("Selling Prices")} — {currencyCode}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 p-4">
                    {[
                      { name: sellBigField,       label: t("Big Unit Price") },
                      { name: sellSmallField,     label: t("Small Unit Price") },
                      { name: wholesaleBigField,  label: t("Big Unit Wholesale") },
                      { name: wholesaleSmallField,label: t("Small Unit Wholesale") },
                    ].map(({ name, label }) => (
                      <FormField key={name} control={form.control} name={name as any} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-sm">{label}</FormLabel>
                          <FormControl><Input type="number" step={priceStep} placeholder="0" className="h-10 text-sm font-mono" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                  </div>
                </div>

                {/* ════════════════════════════════════════
                    ROW 4 — تكلفة / مخزون / معامل (4 حقول)
                ════════════════════════════════════════ */}
                <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden mb-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-b border-border/40 flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">{t("Cost & Stock")}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 p-4">

                    {/* 1. Big Unit Cost */}
                    <FormField control={form.control} name={buyBigField as any} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Big Unit Cost")} ({currencyCode})</FormLabel>
                        <FormControl><Input type="number" step={priceStep} readOnly className="h-10 text-sm font-mono bg-muted/60 cursor-not-allowed" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* 2. Small Unit Cost */}
                    <FormField control={form.control} name={buySmallField as any} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Small Unit Cost")} ({currencyCode})</FormLabel>
                        <FormControl><Input type="number" step={priceStep} readOnly className="h-10 text-sm font-mono bg-muted/60 cursor-not-allowed" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* 3. Min Stock */}
                    <FormField control={form.control} name="minStock" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Min Stock Alert")}</FormLabel>
                        <FormControl><Input type="number" placeholder="0" className="h-10 text-sm" {...field} onChange={e => field.onChange(Number(e.target.value))} data-testid="input-min-stock" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* ════════════════════════════════════════
                    ROW 5 — خيارات (4 حقول)
                ════════════════════════════════════════ */}
                <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden mb-4">
                  <div className="px-4 py-2 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border-b border-border/40 flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-rose-500 to-pink-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">{t("Options")}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 p-4 items-end">

                    {/* 1. Opening Qty */}
                    <FormField control={form.control} name="openingQty" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-sm">{t("Opening Qty (Big Unit)")}</FormLabel>
                        <FormControl><Input type="number" placeholder="0" className="h-10 text-sm" {...field} onChange={e => field.onChange(Number(e.target.value))} data-testid="input-opening-qty" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* 2. Toggles */}
                    <div className="space-y-1.5">
                      <FormLabel className="font-bold text-sm block">{t("Flags")}</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormField control={form.control} name="hidden" render={({ field }) => (
                          <FormItem className="space-y-0 flex-1">
                            <FormControl>
                              <ToggleField value={field.value} onChange={field.onChange} icon={EyeOff} label={t("Hidden")}
                                activeClass="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" />
                            </FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    {/* 3. Favorite + Scale toggles */}
                    <div className="space-y-1.5">
                      <FormLabel className="font-bold text-sm block invisible">.</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormField control={form.control} name="favorite" render={({ field }) => (
                          <FormItem className="space-y-0 flex-1">
                            <FormControl>
                              <ToggleField value={field.value} onChange={field.onChange} icon={Star} label={t("Favorite")}
                                activeClass="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" />
                            </FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    {/* 4. Image + HasScale */}
                    <div className="space-y-1.5">
                      <FormLabel className="font-bold text-sm block invisible">.</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormField control={form.control} name="hasScale" render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ToggleField value={field.value ?? false} onChange={field.onChange} icon={Scale} label={t("Has Scale")}
                                activeClass="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />
                            </FormControl>
                          </FormItem>
                        )} />

                        {/* Image upload */}
                        {form.watch("image") ? (
                          <div className="relative group">
                            <img src={form.watch("image")!} alt="" className="h-10 w-10 object-cover rounded-lg border bg-white p-0.5" data-testid="img-product-image" />
                            <Button variant="destructive" size="icon" type="button" className="absolute -top-1 -right-1 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" onClick={() => form.setValue("image", null)} data-testid="button-remove-product-image">
                              <X className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="h-10 w-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:bg-muted/40 transition-colors shrink-0"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file"; input.accept = "image/*";
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) { toast({ title: t("Image size must be less than 2MB"), variant: "destructive" }); return; }
                                const reader = new FileReader();
                                reader.onload = () => form.setValue("image", reader.result as string);
                                reader.readAsDataURL(file);
                              };
                              input.click();
                            }}
                            title={t("Product Image")}
                            data-testid="upload-product-image-area"
                          >
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Submit ── */}
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={isSaving} className="flex-1 h-11 font-bold text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" data-testid="button-save-product">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                    {editingProduct ? t("Update") : t("Save")}
                  </Button>
                  <Button type="button" variant="outline" className="h-11 px-5" onClick={() => form.reset(defaultValues)} data-testid="button-reset-form">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* ── Table ── */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
                  <Package className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold mb-1">{searchName || searchBarcode || categoryFilter || flagFilter ? t("No products found") : t("No products yet")}</h3>
                <p className="text-muted-foreground text-sm mb-4">{searchName || searchBarcode || categoryFilter || flagFilter ? t("Try a different search term") : t("Add a new product to get started.")}</p>
                {!searchName && !searchBarcode && !categoryFilter && !flagFilter && (
                  <Button onClick={openAddForm} className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600">
                    <Plus className="h-4 w-4" /> {t("Add Product")}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                        <TableHead className="font-bold text-sm py-3 ps-4 w-[220px]">{t("Product")}</TableHead>
                        <TableHead className="font-bold text-sm">{t("Category / Group")}</TableHead>
                        <TableHead className="font-bold text-sm text-center">{t("Units")}</TableHead>
                        <TableHead className="font-bold text-sm text-end">{t("Sell Price")} ({currencyCode})</TableHead>
                        <TableHead className="font-bold text-sm text-end">{t("Cost Price")} ({currencyCode})</TableHead>
                        <TableHead className="font-bold text-sm text-center">{t("Weight")}</TableHead>
                        <TableHead className="font-bold text-sm text-center w-[100px]">{t("Flags")}</TableHead>
                        <TableHead className="font-bold text-sm text-center w-[90px]">{t("Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((product) => (
                        <TableRow
                          key={product.id}
                          data-testid={`row-product-${product.id}`}
                          className={`border-b border-border/40 transition-colors ${editingProduct?.id === product.id ? "bg-emerald-50/60 dark:bg-emerald-950/20" : "hover:bg-muted/30"}`}
                        >
                          {/* Name + Barcode */}
                          <TableCell className="ps-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-9 h-9 rounded-lg object-cover border shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                                  <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-sm leading-tight truncate max-w-[170px]">{getProductName(product)}</div>
                                <div className="font-mono text-xs text-muted-foreground mt-0.5">{product.barcode}</div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Category + Group */}
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Tag className="h-3 w-3 text-violet-500 shrink-0" />
                                <span className="text-xs font-bold text-violet-700 dark:text-violet-300">{product.category}</span>
                              </div>
                              {product.groupName && (
                                <div className="flex items-center gap-1">
                                  <Layers className="h-3 w-3 text-blue-400 shrink-0" />
                                  <span className="text-xs text-muted-foreground">{product.groupName}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Units */}
                          <TableCell className="text-center">
                            <div className="text-xs font-semibold whitespace-nowrap">
                              1 {resolveUnitName(product.bigUnit, unitsList)}
                              <span className="text-muted-foreground mx-1">=</span>
                              {product.conversionFactor} {resolveUnitName(product.smallUnit, unitsList)}
                            </div>
                          </TableCell>

                          {/* Sell Price (big / small) */}
                          <TableCell className="text-end">
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold font-mono">{fmtPrice(product.bigUnitPriceUsd, product.bigUnitPriceIqd)}</div>
                              <div className="text-xs text-muted-foreground font-mono">{fmtPrice(product.smallUnitPriceUsd, product.smallUnitPriceIqd)}</div>
                            </div>
                          </TableCell>

                          {/* Cost Price (big / small) */}
                          <TableCell className="text-end">
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold font-mono">{fmtPrice(product.bigUnitBuyPriceUsd, product.bigUnitBuyPriceIqd)}</div>
                              <div className="text-xs text-muted-foreground font-mono">{fmtPrice(product.smallUnitBuyPriceUsd, product.smallUnitBuyPriceIqd)}</div>
                            </div>
                          </TableCell>

                          {/* Weight */}
                          <TableCell className="text-center">
                            <span className="text-xs font-mono font-semibold">{product.weight} kg</span>
                          </TableCell>

                          {/* Flags: favorite / hidden / hasScale */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${product.favorite ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600" : "text-muted-foreground/30"}`} data-testid={`badge-product-favorite-${product.id}`}>
                                    <Star className={`h-3.5 w-3.5 ${product.favorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>{t("Favorite")}</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${product.hidden ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600" : "text-muted-foreground/30"}`} data-testid={`badge-product-hidden-${product.id}`}>
                                    <EyeOff className="h-3.5 w-3.5" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>{t("Hidden")}</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${(product as any).hasScale ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600" : "text-muted-foreground/30"}`} data-testid={`badge-product-scale-${product.id}`}>
                                    <Scale className="h-3.5 w-3.5" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>{t("Has Scale")}</p></TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => startEdit(product)} data-testid={`button-edit-product-${product.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-product-${product.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t("Delete Product")}</AlertDialogTitle>
                                    <AlertDialogDescription>{t("Are you sure you want to delete this product?")} ({product.name})</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid={`button-confirm-delete-product-${product.id}`}>
                                      {t("Delete")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                    <span className="text-sm text-muted-foreground">
                      {t("Page")} {safePage} / {totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)} data-testid="button-prev-page">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        const page = totalPages <= 7 ? i + 1 : safePage <= 4 ? i + 1 : safePage >= totalPages - 3 ? totalPages - 6 + i : safePage - 3 + i;
                        return (
                          <Button key={page} variant={page === safePage ? "default" : "outline"} size="sm" className={`h-8 w-8 p-0 rounded-lg ${page === safePage ? "bg-emerald-600 hover:bg-emerald-700 border-transparent" : ""}`} onClick={() => setCurrentPage(page)} data-testid={`button-page-${page}`}>
                            {page}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)} data-testid="button-next-page">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
