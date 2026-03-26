import { useState, useEffect, useRef } from "react";
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
import { useCategories, useCategoryGroups } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Loader2, Pencil, Trash2, Upload, ImageIcon, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Filter, X, FileText, Printer, EyeOff, Star, Shuffle } from "lucide-react";
import { IconProduct, IconDollar } from "@/components/erp-icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import { formatDate } from "@/lib/format-utils";
import { PRINT_FONT_LINKS } from "@/lib/print-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const productFormSchema = insertProductSchema.extend({
  barcode: z.string().min(1, "Barcode is required"),
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  bigUnit: z.string().min(1, "Big Unit is required"),
  smallUnit: z.string().min(1, "Small Unit is required"),
  weight: z.string().min(1, "Weight is required").refine(v => v !== "" && v !== undefined, "Weight is required"),
}).superRefine((data, ctx) => {
  if (data.bigUnit && data.smallUnit && data.bigUnit === data.smallUnit && data.conversionFactor !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Conversion factor must be 1 when units are the same",
      path: ["conversionFactor"],
    });
  }
});

type FormValues = z.infer<typeof productFormSchema>;

const defaultValues: FormValues = {
  name: "",
  nameEn: "",
  barcode: "",
  category: "",
  groupName: null,
  bigUnit: "",
  smallUnit: "",
  conversionFactor: 1,
  weight: "0",
  bigUnitPriceUsd: "0",
  bigUnitPriceIqd: "0",
  smallUnitPriceUsd: "0",
  smallUnitPriceIqd: "0",
  bigUnitBuyPriceUsd: "0",
  bigUnitBuyPriceIqd: "0",
  smallUnitBuyPriceUsd: "0",
  smallUnitBuyPriceIqd: "0",
  minStock: 0,
  image: null,
  hidden: false,
  favorite: false,
};

const ITEMS_PER_PAGE = 10;

type TabType = "products" | "report" | "prices";

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
  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; primaryColor: string; secondaryColor: string; address: string; mobile1: string; mobile2: string; businessType: string }>({ queryKey: ["/api/company-profile"] });
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  const bigUnit = form.watch("bigUnit");
  const smallUnit = form.watch("smallUnit");
  const sameUnits = bigUnit && smallUnit && bigUnit === smallUnit;

  useEffect(() => {
    if (sameUnits) {
      form.setValue("conversionFactor", 1);
    }
  }, [bigUnit, smallUnit, sameUnits, form]);

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      nameEn: product.nameEn || "",
      barcode: product.barcode,
      category: product.category,
      groupName: product.groupName || null,
      bigUnit: product.bigUnit,
      smallUnit: product.smallUnit,
      conversionFactor: product.conversionFactor,
      weight: product.weight,
      bigUnitPriceUsd: product.bigUnitPriceUsd,
      bigUnitPriceIqd: product.bigUnitPriceIqd,
      smallUnitPriceUsd: product.smallUnitPriceUsd,
      smallUnitPriceIqd: product.smallUnitPriceIqd,
      bigUnitBuyPriceUsd: product.bigUnitBuyPriceUsd ?? "0",
      bigUnitBuyPriceIqd: product.bigUnitBuyPriceIqd ?? "0",
      smallUnitBuyPriceUsd: product.smallUnitBuyPriceUsd ?? "0",
      smallUnitBuyPriceIqd: product.smallUnitBuyPriceIqd ?? "0",
      minStock: product.minStock,
      image: product.image || null,
      hidden: product.hidden ?? false,
      favorite: product.favorite ?? false,
    });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    form.reset(defaultValues);
  };

  const generateRandomBarcode = () => {
    const existingBarcodes = new Set((productsList || []).map(p => p.barcode));
    let barcode = "";
    do {
      barcode = String(Math.floor(1000000000000 + Math.random() * 9000000000000));
    } while (existingBarcodes.has(barcode));
    form.setValue("barcode", barcode);
  };

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, minStock: Number(values.minStock), conversionFactor: Number(values.conversionFactor) };

    if (editingProduct) {
      updateProduct({ id: editingProduct.id, data: payload }, {
        onSuccess: () => {
          cancelEdit();
          toast({ title: t('Product updated successfully') });
        },
        onError: (err) => toast({ title: t('Failed to update product'), description: t(err.message), variant: "destructive" }),
      });
    } else {
      createProduct(payload, {
        onSuccess: () => {
          form.reset(defaultValues);
          toast({ title: t('Product added successfully') });
        },
        onError: (err) => toast({ title: t('Failed to add product'), description: t(err.message), variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteProduct(id, {
      onSuccess: () => {
        toast({ title: t('Product deleted successfully') });
        if (editingProduct?.id === id) cancelEdit();
      },
      onError: () => toast({ title: t('Failed to delete product'), variant: "destructive" }),
    });
  };

  const allProducts = productsList || [];
  const filtered = allProducts.filter((p) => {
    const matchesSearch = searchTerm.trim() === "" ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const isSaving = isCreating || isUpdating;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
    setSearchTerm("");
    setCategoryFilter("");
    setCurrentPage(1);
    setSearchOpen(false);
  };

  const handlePrint = () => {
    const isReport = activeTab === "report";
    const title = isReport ? t('Material Report') : t('Price List');
    const dir = (document.documentElement.dir || "ltr") as "rtl" | "ltr";
    const accent = companyProfile?.primaryColor || "#6b8e23";
    const companyName = companyProfile?.name || "";
    const companyLogo = companyProfile?.logo || "";
    const companyAddress = companyProfile?.address || "";
    const companyMobile = companyProfile?.mobile1 || "";
    const today = formatDate(new Date());

    const categoryCounts = new Map<string, number>();
    filtered.forEach(p => categoryCounts.set(p.category, (categoryCounts.get(p.category) || 0) + 1));
    const uniqueCategories = categoryCounts.size;

    let tableHeaders = "";
    let tableRows = "";

    if (isReport) {
      tableHeaders = `
        <th>#</th>
        <th>${t('Barcode')}</th>
        <th>${t('Name')}</th>
        <th>${t('Category')}</th>
        <th>${t('Units')}</th>
        <th>${t('Weight (KG)')}</th>
        <th>${t('Big Unit Price (USD)')}</th>
        <th>${t('Big Unit Price (IQD)')}</th>
        <th>${t('Small Unit Price (USD)')}</th>
        <th>${t('Small Unit Price (IQD)')}</th>
        <th>${t('Big Unit Buy Price (USD)')}</th>
        <th>${t('Big Unit Buy Price (IQD)')}</th>
        <th>${t('Small Unit Buy Price (USD)')}</th>
        <th>${t('Small Unit Buy Price (IQD)')}</th>
        <th>${t('Min Stock Alert')}</th>
      `;
      tableRows = filtered.map((p, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="mono">${p.barcode}</td>
          <td class="name-cell">${getProductName(p)}</td>
          <td>${p.category}</td>
          <td>1 ${resolveUnitName(p.bigUnit, unitsList)} = ${p.conversionFactor} ${resolveUnitName(p.smallUnit, unitsList)}</td>
          <td class="mono">${p.weight} kg</td>
          <td class="mono price-usd">$${p.bigUnitPriceUsd}</td>
          <td class="mono price-iqd">IQD ${Number(p.bigUnitPriceIqd).toLocaleString()}</td>
          <td class="mono price-usd">$${p.smallUnitPriceUsd}</td>
          <td class="mono price-iqd">IQD ${Number(p.smallUnitPriceIqd).toLocaleString()}</td>
          <td class="mono price-usd">$${p.bigUnitBuyPriceUsd}</td>
          <td class="mono price-iqd">IQD ${Number(p.bigUnitBuyPriceIqd).toLocaleString()}</td>
          <td class="mono price-usd">$${p.smallUnitBuyPriceUsd}</td>
          <td class="mono price-iqd">IQD ${Number(p.smallUnitBuyPriceIqd).toLocaleString()}</td>
          <td class="mono">${p.minStock}</td>
        </tr>
      `).join("");
    } else {
      tableHeaders = `
        <th>#</th>
        <th>${t('Product Name')}</th>
        <th>${t('Barcode')}</th>
        <th>${t('Big Unit')}</th>
        <th>${t('Big Unit Price (USD)')}</th>
        <th>${t('Big Unit Price (IQD)')}</th>
        <th>${t('Small Unit')}</th>
        <th>${t('Small Unit Price (USD)')}</th>
        <th>${t('Small Unit Price (IQD)')}</th>
        <th>${t('Big Unit')}</th>
        <th>${t('Big Unit Buy Price (USD)')}</th>
        <th>${t('Big Unit Buy Price (IQD)')}</th>
        <th>${t('Small Unit')}</th>
        <th>${t('Small Unit Buy Price (USD)')}</th>
        <th>${t('Small Unit Buy Price (IQD)')}</th>
      `;
      tableRows = filtered.map((p, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="name-cell">${getProductName(p)}</td>
          <td class="mono">${p.barcode}</td>
          <td>${resolveUnitName(p.bigUnit, unitsList)}</td>
          <td class="mono price-usd">$${p.bigUnitPriceUsd}</td>
          <td class="mono price-iqd">IQD ${Number(p.bigUnitPriceIqd).toLocaleString()}</td>
          <td>${resolveUnitName(p.smallUnit, unitsList)}</td>
          <td class="mono price-usd">$${p.smallUnitPriceUsd}</td>
          <td class="mono price-iqd">IQD ${Number(p.smallUnitPriceIqd).toLocaleString()}</td>
          <td>${resolveUnitName(p.bigUnit, unitsList)}</td>
          <td class="mono price-usd">$${p.bigUnitBuyPriceUsd}</td>
          <td class="mono price-iqd">IQD ${Number(p.bigUnitBuyPriceIqd).toLocaleString()}</td>
          <td>${resolveUnitName(p.smallUnit, unitsList)}</td>
          <td class="mono price-usd">$${p.smallUnitBuyPriceUsd}</td>
          <td class="mono price-iqd">IQD ${Number(p.smallUnitBuyPriceIqd).toLocaleString()}</td>
        </tr>
      `).join("");
    }

    const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
  ${PRINT_FONT_LINKS}
  <meta charset="utf-8">
  <title>${title} — ${companyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Noto Kufi Arabic', 'Inter', -apple-system, sans-serif;
      padding: 18px 24px;
      font-size: 10pt;
      direction: ${dir};
      color: #1a1a2e;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ===== HEADER ===== */
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      margin-bottom: 14px;
      border: 2px solid ${accent}30;
      border-radius: 14px;
      background: linear-gradient(135deg, #fafbfc, ${accent}08);
    }
    .header-center {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      justify-content: center;
    }
    .header-center img {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 10px;
    }
    .header-center .company-name {
      font-size: 18pt;
      font-weight: 800;
      color: ${accent};
      letter-spacing: -0.3px;
    }
    .header-right {
      text-align: ${dir === "rtl" ? "right" : "left"};
      min-width: 180px;
    }
    .header-right .report-title {
      font-size: 16pt;
      font-weight: 800;
      color: ${accent};
      margin-bottom: 2px;
    }
    .header-right .report-date {
      font-size: 9pt;
      color: #64748b;
      font-weight: 500;
    }
    .header-left {
      text-align: ${dir === "rtl" ? "left" : "right"};
      min-width: 200px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 8.5pt;
      color: #64748b;
    }
    .header-left .contact-item {
      display: flex;
      align-items: center;
      gap: 5px;
      justify-content: ${dir === "rtl" ? "flex-start" : "flex-end"};
    }

    /* ===== SUMMARY CARDS ===== */
    .summary-row {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
    }
    .stat-card {
      flex: 1;
      border-radius: 10px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      opacity: 0.08;
      border-radius: 10px;
    }
    .stat-card.blue {
      border: 2px solid #3b82f6;
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
    }
    .stat-card.green {
      border: 2px solid #22c55e;
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    }
    .stat-card .stat-label {
      font-size: 9pt;
      font-weight: 600;
      color: #475569;
    }
    .stat-card .stat-value {
      font-size: 18pt;
      font-weight: 800;
    }
    .stat-card.blue .stat-value { color: #2563eb; }
    .stat-card.green .stat-value { color: #16a34a; }

    /* ===== TABLE ===== */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 9pt;
      border-radius: 10px;
      overflow: hidden;
      border: 1.5px solid #d4d4d8;
    }
    th {
      background: linear-gradient(145deg, ${accent}, ${accent}dd);
      color: #fff;
      padding: 8px 7px;
      text-align: center;
      font-weight: 700;
      font-size: 8.5pt;
      white-space: nowrap;
      letter-spacing: 0.2px;
    }
    td {
      border-bottom: 1px solid #e5e7eb;
      padding: 6px 7px;
      text-align: center;
      font-size: 9pt;
      color: #334155;
      font-weight: 500;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    tr:hover {
      background: #f1f5f9;
    }
    .mono {
      font-family: 'Inter', monospace;
      letter-spacing: 0.3px;
    }
    .num {
      font-weight: 700;
      color: #64748b;
      width: 36px;
    }
    .name-cell {
      font-weight: 700;
      color: #1e293b;
      text-align: ${dir === "rtl" ? "right" : "left"};
    }
    .price-usd {
      color: #16a34a;
      font-weight: 700;
    }
    .price-iqd {
      color: #2563eb;
      font-weight: 700;
    }

    /* ===== FOOTER ===== */
    .report-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 14px;
      padding: 10px 20px;
      border-radius: 10px;
      border: 1.5px solid #e2e8f0;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      font-size: 9pt;
      color: #475569;
      font-weight: 600;
    }
    .report-footer .footer-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .report-footer .footer-value {
      font-weight: 800;
      color: ${accent};
      font-size: 10pt;
    }

    @media print {
      body { padding: 6mm 8mm; }
      @page { margin: 5mm; size: A4 landscape; }
      .stat-card, th, .report-footer {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header-row">
    <div class="header-right">
      <div class="report-title">${title}</div>
      <div class="report-date">${today}${categoryFilter ? ` — ${categoryFilter}` : ""}</div>
    </div>
    <div class="header-center">
      ${companyLogo ? `<img src="${companyLogo}" alt="logo" />` : ""}
      <span class="company-name">${companyName}</span>
    </div>
    <div class="header-left">
      ${companyAddress ? `<div class="contact-item">📍 ${companyAddress}</div>` : ""}
      ${companyMobile ? `<div class="contact-item">📞 ${companyMobile}</div>` : ""}
    </div>
  </div>

  <div class="summary-row">
    <div class="stat-card blue">
      <span class="stat-label">${t('Total Products')}</span>
      <span class="stat-value">${filtered.length}</span>
    </div>
    <div class="stat-card green">
      <span class="stat-label">${t('Categories Used')}</span>
      <span class="stat-value">${uniqueCategories}</span>
    </div>
  </div>

  <table>
    <thead><tr>${tableHeaders}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="report-footer">
    <div class="footer-item">${t('Total Products')}: <span class="footer-value">${filtered.length}</span></div>
    <div class="footer-item">${t('Categories Used')}: <span class="footer-value">${uniqueCategories}</span></div>
    <div class="footer-item">${t('Date')}: <span class="footer-value">${today}</span></div>
  </div>

  <script>
    window.onload = function() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() { setTimeout(function() { window.print(); }, 300); });
      } else {
        setTimeout(function() { window.print(); }, 1200);
      }
    };
  </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const renderSearchAndFilter = () => (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-1 min-w-[200px] max-w-sm" ref={searchRef}>
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search products...')}
            className="pl-9"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setSearchOpen(true); }}
            onFocus={() => { if (searchTerm.trim()) setSearchOpen(true); }}
            data-testid="input-search-products"
          />
          {searchOpen && searchTerm.trim() && filtered.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filtered.slice(0, 10).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="w-full text-start px-3 py-2 hover:bg-muted/70 flex items-center justify-between gap-2 font-bold text-sm transition-colors"
                  data-testid={`search-result-product-${product.id}`}
                  onClick={() => {
                    setSearchTerm(product.name);
                    setSearchOpen(false);
                    setCurrentPage(1);
                  }}
                >
                  <span>{getProductName(product)}</span>
                  <Badge variant="outline" className="text-xs font-semibold shrink-0">{product.category}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative min-w-[180px] max-w-[220px]">
          <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val === "__all__" ? "" : val); setCurrentPage(1); }}>
            <SelectTrigger className="h-10 text-sm font-semibold" data-testid="select-filter-category">
              <Filter className="h-5 w-5 text-muted-foreground shrink-0 mr-1" />
              <SelectValue placeholder={t('All Categories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" data-testid="option-filter-all">{t('All Categories')}</SelectItem>
              {categoriesList?.map((cat) => (
                <SelectItem key={cat.id} value={cat.name} data-testid={`option-filter-category-${cat.id}`}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {categoryFilter && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setCategoryFilter(""); setCurrentPage(1); }} data-testid="button-clear-category-filter">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {activeTab !== "products" && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint} data-testid="button-print">
            <Printer className="h-5 w-5" />
            {t('Print')}
          </Button>
        )}
        <div className="text-sm text-muted-foreground font-medium">
          {filtered.length} {t('Total Products')}
        </div>
      </div>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-muted-foreground">
          {t('Page')} {safePage} / {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)} data-testid="button-prev-page">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={page === safePage ? "default" : "outline"}
              size="sm"
              className="min-w-[36px]"
              onClick={() => setCurrentPage(page)}
              data-testid={`button-page-${page}`}
            >
              {page}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)} data-testid="button-next-page">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderProductsTab = () => (
    <>
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {editingProduct ? (
              <><Pencil className="h-5 w-5 text-primary" /> {t('Edit Product')}</>
            ) : (
              <><Plus className="h-5 w-5 text-primary" /> {t('Add New Product')}</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="barcode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Barcode')}</FormLabel>
                    <div className="flex gap-1">
                      <FormControl><Input placeholder="SCAN-123" className="h-11 text-base font-semibold" {...field} data-testid="input-barcode" /></FormControl>
                      <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={generateRandomBarcode} title={t("Generate Barcode")} data-testid="button-generate-barcode">
                        <Shuffle className="w-5 h-5" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Name')}</FormLabel>
                    <FormControl><Input placeholder={t('Product Name')} className="h-11 text-base font-semibold" {...field} data-testid="input-product-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nameEn" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Product Name (English)')}</FormLabel>
                    <FormControl><Input placeholder="Product Name in English" className="h-11 text-base font-semibold" {...field} data-testid="input-product-name-en" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Category')}</FormLabel>
                    <Select onValueChange={(val) => { field.onChange(val); form.setValue("groupName", null); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 text-base font-semibold" data-testid="select-category">
                          <SelectValue placeholder={t('Select Category')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriesList?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name} data-testid={`option-category-${cat.id}`}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="groupName" render={({ field }) => {
                  const selectedCategory = form.watch("category");
                  const selectedCatObj = categoriesList?.find(c => c.name === selectedCategory);
                  const filteredGroups = selectedCatObj ? (allGroups || []).filter((g: any) => g.categoryId === selectedCatObj.id) : [];
                  return (
                    <FormItem>
                      <FormLabel className="text-base font-bold">{t('Group')}</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "__none__" ? null : val)} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger className="h-11 text-base font-semibold" data-testid="select-group">
                            <SelectValue placeholder={t('Select Group')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{t('No Group')}</SelectItem>
                          {filteredGroups.map((g: any) => (
                            <SelectItem key={g.id} value={g.name} data-testid={`option-group-${g.id}`}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }} />
                <FormField control={form.control} name="bigUnit" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Big Unit')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 text-base font-semibold" data-testid="select-big-unit">
                          <SelectValue placeholder={t('Select Unit')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unitsList?.map((unit) => (
                          <SelectItem key={unit.id} value={unit.name} data-testid={`option-big-unit-${unit.id}`}>{unit.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="smallUnit" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Small Unit')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 text-base font-semibold" data-testid="select-small-unit">
                          <SelectValue placeholder={t('Select Unit')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unitsList?.map((unit) => (
                          <SelectItem key={unit.id} value={unit.name} data-testid={`option-small-unit-${unit.id}`}>{unit.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="conversionFactor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Conversion Factor')}</FormLabel>
                    <FormControl><Input type="number" className="h-11 text-base font-semibold" {...field} onChange={e => field.onChange(Number(e.target.value))} disabled={!!sameUnits} data-testid="input-conversion-factor" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="weight" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Weight (KG)')}</FormLabel>
                    <FormControl><Input type="number" step="0.01" className="h-11 text-base font-semibold" {...field} data-testid="input-weight" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <h3 className="text-base font-bold text-primary border-b border-primary/30 pb-1 mb-3">{t('Selling Prices')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField control={form.control} name="bigUnitPriceUsd" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-bold">{t('Big Unit Price (USD)')}</FormLabel>
                        <FormControl><Input type="number" step="0.01" className="h-11 text-base font-semibold" {...field} data-testid="input-big-unit-price-usd" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="bigUnitPriceIqd" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-bold">{t('Big Unit Price (IQD)')}</FormLabel>
                        <FormControl><Input type="number" step="250" className="h-11 text-base font-semibold" {...field} data-testid="input-big-unit-price-iqd" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="smallUnitPriceUsd" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-bold">{t('Small Unit Price (USD)')}</FormLabel>
                        <FormControl><Input type="number" step="0.01" className="h-11 text-base font-semibold" {...field} data-testid="input-small-unit-price-usd" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="smallUnitPriceIqd" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-bold">{t('Small Unit Price (IQD)')}</FormLabel>
                        <FormControl><Input type="number" step="250" className="h-11 text-base font-semibold" {...field} data-testid="input-small-unit-price-iqd" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <h3 className="text-base font-bold text-primary border-b border-primary/30 pb-1 mb-3">{t('Purchase Prices')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField control={form.control} name="bigUnitBuyPriceUsd" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-bold">{t('Big Unit Buy Price (USD)')}</FormLabel>
                        <FormControl><Input type="number" step="0.01" className="h-11 text-base font-semibold" {...field} data-testid="input-big-unit-buy-price-usd" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="bigUnitBuyPriceIqd" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-bold">{t('Big Unit Buy Price (IQD)')}</FormLabel>
                        <FormControl><Input type="number" step="250" className="h-11 text-base font-semibold" {...field} data-testid="input-big-unit-buy-price-iqd" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="smallUnitBuyPriceUsd" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-bold">{t('Small Unit Buy Price (USD)')}</FormLabel>
                        <FormControl><Input type="number" step="0.01" className="h-11 text-base font-semibold" {...field} data-testid="input-small-unit-buy-price-usd" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="smallUnitBuyPriceIqd" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-bold">{t('Small Unit Buy Price (IQD)')}</FormLabel>
                        <FormControl><Input type="number" step="250" className="h-11 text-base font-semibold" {...field} data-testid="input-small-unit-buy-price-iqd" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-wrap items-end gap-4">
                  <FormField control={form.control} name="minStock" render={({ field }) => (
                    <FormItem className="flex-1 min-w-[120px]">
                      <FormLabel className="text-base font-bold">{t('Min Stock Alert')}</FormLabel>
                      <FormControl><Input type="number" className="h-11 text-base font-semibold" {...field} onChange={e => field.onChange(Number(e.target.value))} data-testid="input-min-stock" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="hidden" render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0 pb-1">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-product-hidden"
                          className="h-5 w-5"
                        />
                      </FormControl>
                      <FormLabel className="text-base font-bold flex items-center gap-1.5 cursor-pointer">
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                        {t('Hide')}
                      </FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="favorite" render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0 pb-1">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-product-favorite"
                          className="h-5 w-5"
                        />
                      </FormControl>
                      <FormLabel className="text-base font-bold flex items-center gap-1.5 cursor-pointer">
                        <Star className="h-5 w-5 text-yellow-500" />
                        {t('Favorite')}
                      </FormLabel>
                    </FormItem>
                  )} />
                  <div className="space-y-1.5">
                    <FormLabel className="flex items-center gap-1.5 text-base font-bold">
                      <ImageIcon className="w-5 h-5" />
                      {t('Product Image')}
                    </FormLabel>
                    {form.watch("image") ? (
                      <div className="relative group inline-block">
                        <img
                          src={form.watch("image")!}
                          alt={t('Product Image')}
                          className="max-h-24 object-contain rounded-lg border bg-white p-2"
                          data-testid="img-product-image"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          type="button"
                          className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => form.setValue("image", null)}
                          data-testid="button-remove-product-image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="inline-flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg px-4 py-2 cursor-pointer hover:bg-muted/30 transition-colors h-11"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              toast({ title: t("Image size must be less than 2MB"), variant: "destructive" });
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => form.setValue("image", reader.result as string);
                            reader.readAsDataURL(file);
                          };
                          input.click();
                        }}
                        data-testid="upload-product-image-area"
                      >
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{t('Click to upload product image')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Button type="submit" disabled={isSaving} size="lg" className="text-base font-bold h-11" data-testid="button-save-product">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {editingProduct ? t('Update') : t('Save')}
                </Button>
                <Button type="button" variant="outline" size="lg" className="h-11" onClick={cancelEdit} data-testid="button-reset-form">
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>{renderSearchAndFilter()}</CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconProduct className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No products found')}</h3>
              <p>{t('Add a new product to get started.')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold text-sm">{t('Barcode')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Name')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Category')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Group')}</TableHead>
                      <TableHead className="text-center font-bold text-sm">{t('Units')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Weight (KG)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Big Unit Price (USD)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Big Unit Price (IQD)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Small Unit Price (USD)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Small Unit Price (IQD)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Big Unit Buy Price (USD)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Big Unit Buy Price (IQD)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Small Unit Buy Price (USD)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Small Unit Buy Price (IQD)')}</TableHead>
                      <TableHead className="text-center font-bold text-sm">{t('Hide')}</TableHead>
                      <TableHead className="text-center font-bold text-sm">{t('Favorite')}</TableHead>
                      <TableHead className="text-center font-bold text-sm">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((product) => (
                      <TableRow key={product.id} data-testid={`row-product-${product.id}`} className={editingProduct?.id === product.id ? "bg-primary/5 ring-1 ring-primary/20" : ""}>
                        <TableCell className="font-bold font-mono text-sm">{product.barcode}</TableCell>
                        <TableCell className="font-bold text-sm">{getProductName(product)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-bold">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-bold">{product.groupName || "-"}</TableCell>
                        <TableCell className="text-center text-sm font-bold">
                          1 {resolveUnitName(product.bigUnit, unitsList)} = {product.conversionFactor} {resolveUnitName(product.smallUnit, unitsList)}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">{product.weight} kg</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">${product.bigUnitPriceUsd}</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">{Number(product.bigUnitPriceIqd).toLocaleString()} IQD</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">${product.smallUnitPriceUsd}</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">{Number(product.smallUnitPriceIqd).toLocaleString()} IQD</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">${product.bigUnitBuyPriceUsd}</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">{Number(product.bigUnitBuyPriceIqd).toLocaleString()} IQD</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">${product.smallUnitBuyPriceUsd}</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">{Number(product.smallUnitBuyPriceIqd).toLocaleString()} IQD</TableCell>
                        <TableCell className="text-center">
                          {product.hidden ? (
                            <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 font-bold" data-testid={`badge-product-hidden-${product.id}`}>
                              <EyeOff className="h-3 w-3 mr-1" />
                              {t('Hide')}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.favorite ? (
                            <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 font-bold" data-testid={`badge-product-favorite-${product.id}`}>
                              <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                              {t('Favorite')}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(product)} data-testid={`button-edit-product-${product.id}`}>
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-product-${product.id}`}>
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Delete Product')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('Are you sure you want to delete this product?')} ({product.name})
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(product.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-product-${product.id}`}
                                  >
                                    {t('Delete')}
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
              {renderPagination()}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderReportTab = () => (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>{renderSearchAndFilter()}</CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="bg-muted/50 p-4 rounded-full mb-4"><IconProduct className="w-10 h-10" /></div>
            <h3 className="font-semibold text-lg">{t('No products found')}</h3>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold text-sm">#</TableHead>
                    <TableHead className="font-bold text-sm">{t('Barcode')}</TableHead>
                    <TableHead className="font-bold text-sm">{t('Name')}</TableHead>
                    <TableHead className="font-bold text-sm">{t('Category')}</TableHead>
                    <TableHead className="text-center font-bold text-sm">{t('Units')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Weight (KG)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Big Unit Price (USD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Big Unit Price (IQD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Small Unit Price (USD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Small Unit Price (IQD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Big Unit Buy Price (USD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Big Unit Buy Price (IQD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Small Unit Buy Price (USD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Small Unit Buy Price (IQD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Min Stock Alert')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((product, idx) => (
                    <TableRow key={product.id} data-testid={`row-report-${product.id}`}>
                      <TableCell className="font-bold font-mono text-sm">{(safePage - 1) * ITEMS_PER_PAGE + idx + 1}</TableCell>
                      <TableCell className="font-bold font-mono text-sm">{product.barcode}</TableCell>
                      <TableCell className="font-bold text-sm">{getProductName(product)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-bold">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm font-bold">
                        1 {resolveUnitName(product.bigUnit, unitsList)} = {product.conversionFactor} {resolveUnitName(product.smallUnit, unitsList)}
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">{product.weight} kg</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">${product.bigUnitPriceUsd}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">{Number(product.bigUnitPriceIqd).toLocaleString()} IQD</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">${product.smallUnitPriceUsd}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">{Number(product.smallUnitPriceIqd).toLocaleString()} IQD</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">${product.bigUnitBuyPriceUsd}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">{Number(product.bigUnitBuyPriceIqd).toLocaleString()} IQD</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">${product.smallUnitBuyPriceUsd}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">{Number(product.smallUnitBuyPriceIqd).toLocaleString()} IQD</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm">{product.minStock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {renderPagination()}
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderPriceListTab = () => (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>{renderSearchAndFilter()}</CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="bg-muted/50 p-4 rounded-full mb-4"><IconDollar className="w-10 h-10" /></div>
            <h3 className="font-semibold text-lg">{t('No products found')}</h3>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold text-sm">#</TableHead>
                    <TableHead className="font-bold text-sm">{t('Barcode')}</TableHead>
                    <TableHead className="font-bold text-sm">{t('Product Name')}</TableHead>
                    <TableHead className="text-center font-bold text-sm">{t('Big Unit')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Big Unit Price (USD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Big Unit Price (IQD)')}</TableHead>
                    <TableHead className="text-center font-bold text-sm">{t('Small Unit')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Small Unit Price (USD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Small Unit Price (IQD)')}</TableHead>
                    <TableHead className="text-center font-bold text-sm">{t('Big Unit')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Big Unit Buy Price (USD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Big Unit Buy Price (IQD)')}</TableHead>
                    <TableHead className="text-center font-bold text-sm">{t('Small Unit')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Small Unit Buy Price (USD)')}</TableHead>
                    <TableHead className="text-right font-bold text-sm">{t('Small Unit Buy Price (IQD)')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((product, idx) => (
                    <TableRow key={product.id} data-testid={`row-price-${product.id}`}>
                      <TableCell className="font-bold font-mono text-sm">{(safePage - 1) * ITEMS_PER_PAGE + idx + 1}</TableCell>
                      <TableCell className="font-bold font-mono text-sm">{product.barcode}</TableCell>
                      <TableCell className="font-bold text-sm">{getProductName(product)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold">{resolveUnitName(product.bigUnit, unitsList)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm text-green-600">${product.bigUnitPriceUsd}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm text-blue-600">{Number(product.bigUnitPriceIqd).toLocaleString()} IQD</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold">{resolveUnitName(product.smallUnit, unitsList)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm text-green-600">${product.smallUnitPriceUsd}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm text-blue-600">{Number(product.smallUnitPriceIqd).toLocaleString()} IQD</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold">{resolveUnitName(product.bigUnit, unitsList)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm text-orange-600">${product.bigUnitBuyPriceUsd}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm text-purple-600">{Number(product.bigUnitBuyPriceIqd).toLocaleString()} IQD</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold">{resolveUnitName(product.smallUnit, unitsList)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm text-orange-600">${product.smallUnitBuyPriceUsd}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-sm text-purple-600">{Number(product.smallUnitBuyPriceIqd).toLocaleString()} IQD</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {renderPagination()}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Link href="/material-management" data-testid="link-back-material">
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="h-5 w-5" />
          {t("Material Management")}
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Products')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage your inventory items')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Products')}</CardTitle>
            <IconProduct className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-products">{allProducts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Categories Used')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(allProducts.map(p => p.category)).size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Low Stock')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">0</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prices" className="gap-2 font-bold" data-testid="tab-prices">
            <IconDollar className="h-5 w-5" />
            {t('Price List')}
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2 font-bold" data-testid="tab-report">
            <FileText className="h-5 w-5" />
            {t('Material Report')}
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2 font-bold" data-testid="tab-products">
            <IconProduct className="h-5 w-5" />
            {t('Products')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "products" && renderProductsTab()}
      {activeTab === "report" && renderReportTab()}
      {activeTab === "prices" && renderPriceListTab()}
    </div>
  );
}
