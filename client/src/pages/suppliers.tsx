import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client } from "@shared/routes";
import { z } from "zod";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { useSupplierAddresses, useCreateSupplierAddress, useUpdateSupplierAddress, useDeleteSupplierAddress } from "@/hooks/use-supplier-addresses";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/amount-input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Pencil, Trash2, ArrowLeft, ChevronLeft, ChevronRight, EyeOff, Printer, Building2, Phone, MapPin, Wallet, AlertCircle, Hash, Lock } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconSupplierList, IconAddress } from "@/components/erp-icons";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/format-utils";
import { PRINT_FONT_LINKS } from "@/lib/print-styles";
import { AddressSearchSelect } from "@/components/address-search-select";
import { cn } from "@/lib/utils";
import { CURRENCY_OPTIONS } from "@/pages/settings";
import {
  useDefaultCurrency,
  formatAmount,
  formatAmountInput,
  getCurrencyMeta,
} from "@/hooks/use-default-currency";

const supplierSchema = insertClientSchema.extend({
  type: z.literal("supplier").default("supplier"),
  name: z.string().min(1, "Supplier name is required"),
  oldDebtCurrency: z.string().min(1).default("IQD"),
});

const ITEMS_PER_PAGE = 10;

function openingBalanceOf(
  client: Pick<Client, "oldDebtUsd" | "oldDebtIqd" | "oldDebtCurrency">,
  fallbackCurrency = "IQD",
) {
  const usdAmt = Number(client.oldDebtUsd || 0);
  const iqdAmt = Number(client.oldDebtIqd || 0);
  const stored = client.oldDebtCurrency || "";
  if (stored === "USD") return { amount: usdAmt, currency: "USD" };
  if (stored && stored !== "IQD") return { amount: iqdAmt, currency: stored };
  if (usdAmt !== 0 && iqdAmt === 0) return { amount: usdAmt, currency: "USD" };
  if (iqdAmt !== 0) return { amount: iqdAmt, currency: stored || "IQD" };
  if (usdAmt !== 0) return { amount: usdAmt, currency: "USD" };
  return { amount: 0, currency: stored || fallbackCurrency };
}

function nextSupplierCode(suppliers: Client[]) {
  let max = 0;
  for (const s of suppliers) {
    const fromCode = parseInt(String((s as any).code ?? ""), 10);
    if (Number.isFinite(fromCode) && fromCode > max) max = fromCode;
  }
  if (max === 0) {
    for (const s of suppliers) {
      if (s.id > max) max = s.id;
    }
  }
  return String(max + 1);
}

export default function SuppliersPage() {
  const { t, i18n } = useTranslation();
  const defaultCurrency = useDefaultCurrency();
  const { data: allClients, isLoading } = useClients();
  const { data: dbAddresses } = useSupplierAddresses();
  const { mutate: createSupplierAddr, isPending: isCreatingAddr } = useCreateSupplierAddress();
  const { mutate: updateSupplierAddr, isPending: isUpdatingAddr } = useUpdateSupplierAddress();
  const { mutate: deleteSupplierAddr } = useDeleteSupplierAddress();
  const { mutate: createClient, isPending: isCreating } = useCreateClient();
  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient();
  const { mutate: deleteClient } = useDeleteClient();
  const { toast } = useToast();
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [duplicateNameAlert, setDuplicateNameAlert] = useState(false);
  const [previewCode, setPreviewCode] = useState("1");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addrDialogOpen, setAddrDialogOpen] = useState(false);
  const [addrEditId, setAddrEditId] = useState<number | null>(null);
  const [addrName, setAddrName] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  const emptyForm = {
    name: "",
    type: "supplier" as const,
    contact: "",
    address: "",
    oldDebtUsd: "0",
    oldDebtIqd: "0",
    oldDebtCurrency: defaultCurrency.code || "IQD",
    hidden: false,
  };

  const isSupplierNameTaken = (name: string, excludeId?: number) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return false;
    return (allClients || [])
      .filter((c) => c.type === "supplier")
      .some((s) => s.name.trim().toLowerCase() === normalized && s.id !== excludeId);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const form = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: emptyForm,
  });

  const openCreateDialog = () => {
    const suppliersOnly = (allClients || []).filter((c) => c.type === "supplier");
    setEditingClient(null);
    setDuplicateNameAlert(false);
    setPreviewCode(nextSupplierCode(suppliersOnly));
    form.reset({
      ...emptyForm,
      oldDebtCurrency: defaultCurrency.code || "IQD",
      oldDebtUsd: "0",
      oldDebtIqd: "0",
    });
    setFormOpen(true);
  };

  const startEdit = (client: Client) => {
    const opening = openingBalanceOf(client, defaultCurrency.code || "IQD");
    setEditingClient(client);
    setDuplicateNameAlert(false);
    setPreviewCode(String((client as any).code || client.id));
    form.reset({
      name: client.name,
      type: "supplier",
      contact: client.contact || "",
      address: client.address || "",
      oldDebtUsd: opening.currency === "USD" ? formatAmountInput(opening.amount, "USD") : "0",
      oldDebtIqd: opening.currency !== "USD" ? formatAmountInput(opening.amount, opening.currency) : "0",
      oldDebtCurrency: opening.currency,
      hidden: client.hidden ?? false,
    });
    setFormOpen(true);
  };

  const closeFormDialog = () => {
    setFormOpen(false);
    setEditingClient(null);
    setDuplicateNameAlert(false);
    form.reset(emptyForm);
  };

  const showDuplicateNameError = () => {
    setDuplicateNameAlert(true);
    form.setError("name", {
      type: "duplicate",
      message: t("Supplier name already exists"),
    });
    toast({
      title: t("Supplier name already exists"),
      description: t("Please use a different name"),
      variant: "destructive",
    });
  };

  const onSubmit = (values: z.infer<typeof supplierSchema>) => {
    if (isSupplierNameTaken(values.name, editingClient?.id)) {
      showDuplicateNameError();
      return;
    }

    setDuplicateNameAlert(false);

    if (editingClient) {
      updateClient({ id: editingClient.id, data: { ...values, type: "supplier" } }, {
        onSuccess: () => {
          closeFormDialog();
          toast({ title: t("Supplier updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update supplier"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createClient({ ...values, type: "supplier" }, {
        onSuccess: () => {
          closeFormDialog();
          toast({ title: t("Supplier created successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to create supplier"), description: t(err.message), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteClient(id, {
      onSuccess: () => {
        toast({ title: t("Supplier deleted successfully") });
        if (editingClient?.id === id) closeFormDialog();
      },
      onError: (err) => {
        toast({ title: t("Failed to delete supplier"), description: t(err.message), variant: "destructive" });
      },
    });
  };

  const suppliers = allClients?.filter(c => c.type === "supplier") || [];
  const filtered = suppliers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String((c as any).code || c.id).includes(searchTerm.trim())
  );

  const openingTotalsByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of suppliers) {
      const opening = openingBalanceOf(s, defaultCurrency.code || "IQD");
      if (!opening.amount) continue;
      map.set(opening.currency, (map.get(opening.currency) || 0) + opening.amount);
    }
    return Array.from(map.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }, [suppliers, defaultCurrency.code]);

  const debtCurrency = form.watch("oldDebtCurrency") || defaultCurrency.code || "IQD";
  const selectedDebtCurrency = CURRENCY_OPTIONS.find((c) => c.code === debtCurrency);
  const openingAmountValue = debtCurrency === "USD"
    ? form.watch("oldDebtUsd") || "0"
    : form.watch("oldDebtIqd") || "0";

  const setOpeningAmount = (raw: string) => {
    const formatted = formatAmountInput(raw, debtCurrency);
    if (debtCurrency === "USD") {
      form.setValue("oldDebtUsd", formatted, { shouldDirty: true });
      form.setValue("oldDebtIqd", "0", { shouldDirty: true });
    } else {
      form.setValue("oldDebtIqd", formatted, { shouldDirty: true });
      form.setValue("oldDebtUsd", "0", { shouldDirty: true });
    }
  };

  const setOpeningCurrency = (code: string) => {
    const current = openingAmountValue;
    form.setValue("oldDebtCurrency", code, { shouldDirty: true });
    const formatted = formatAmountInput(current, code);
    if (code === "USD") {
      form.setValue("oldDebtUsd", formatted, { shouldDirty: true });
      form.setValue("oldDebtIqd", "0", { shouldDirty: true });
    } else {
      form.setValue("oldDebtIqd", formatted, { shouldDirty: true });
      form.setValue("oldDebtUsd", "0", { shouldDirty: true });
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const addresses = dbAddresses || [];
  const isSaving = isCreating || isUpdating;

  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; primaryColor: string; address: string; mobile1: string }>({ queryKey: ["/api/company-profile"] });

  const handlePrint = () => {
    const dir = (document.documentElement.dir || "ltr") as "rtl" | "ltr";
    const accent = companyProfile?.primaryColor || "#6b8e23";
    const companyName = companyProfile?.name || "";
    const companyLogo = companyProfile?.logo || "";
    const companyAddress = companyProfile?.address || "";
    const companyMobile = companyProfile?.mobile1 || "";
    const today = formatDate(new Date());
    const title = t('Suppliers');

    const visibleSuppliers = filtered.filter(s => !s.hidden);
    const fallbackCur = defaultCurrency.code || "IQD";

    const printTotals = new Map<string, number>();
    for (const s of visibleSuppliers) {
      const opening = openingBalanceOf(s, fallbackCur);
      if (!opening.amount) continue;
      printTotals.set(opening.currency, (printTotals.get(opening.currency) || 0) + opening.amount);
    }
    const printTotalsList = Array.from(printTotals.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    const tableRows = visibleSuppliers.map((s) => {
      const opening = openingBalanceOf(s, fallbackCur);
      const openingText = opening.amount
        ? `${formatAmount(opening.amount, opening.currency)} ${opening.currency}`
        : "—";
      return `
      <tr>
        <td class="mono num">${String((s as any).code || s.id)}</td>
        <td class="name-cell">${s.name}</td>
        <td class="mono">${s.contact || '-'}</td>
        <td>${s.address || '-'}</td>
        <td class="mono price-usd">${openingText}</td>
      </tr>
    `;
    }).join("");

    const summaryCards = `
    <div class="stat-card blue">
      <span class="stat-label">${t('Total Suppliers')}</span>
      <span class="stat-value">${visibleSuppliers.length}</span>
    </div>
    ${printTotalsList.length === 0
      ? `<div class="stat-card green"><span class="stat-label">${t("Total Opening Balances")}</span><span class="stat-value">—</span></div>`
      : printTotalsList.map(([currency, amount]) => `
    <div class="stat-card green">
      <span class="stat-label">${t("Total Opening Balances")} (${currency})</span>
      <span class="stat-value">${formatAmount(amount, currency)} ${currency}</span>
    </div>`).join("")
    }`;

    const totalsFooter = printTotalsList.length === 0
      ? `<tr class="total-row"><td colspan="4" class="name-cell">${t('Total')}</td><td class="mono">—</td></tr>`
      : printTotalsList.map(([currency, amount], idx) => `
      <tr class="total-row">
        <td colspan="4" class="name-cell">${idx === 0 ? t('Total') : ""} — ${currency}</td>
        <td class="mono price-usd">${formatAmount(amount, currency)} ${currency}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
  ${PRINT_FONT_LINKS}
  <meta charset="utf-8">
  <title>${title} — ${companyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Tajawal', 'Inter', -apple-system, sans-serif;
      padding: 20px;
      font-size: 10pt;
      direction: ${dir};
      color: #1a1a2e;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

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
    .stat-card.blue {
      border: 2px solid #3b82f6;
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
    }
    .stat-card.green {
      border: 2px solid #22c55e;
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    }
    .stat-card.orange {
      border: 2px solid #f59e0b;
      background: linear-gradient(135deg, #fffbeb, #fef3c7);
    }
    .stat-card .stat-label {
      font-size: 9pt;
      font-weight: 600;
      color: #475569;
    }
    .stat-card .stat-value {
      font-size: 16pt;
      font-weight: 800;
    }
    .stat-card.blue .stat-value { color: #2563eb; }
    .stat-card.green .stat-value { color: #16a34a; }
    .stat-card.orange .stat-value { color: #d97706; }

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
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #f1f5f9; }
    .mono { font-family: 'Inter', monospace; letter-spacing: 0.3px; }
    .num { font-weight: 700; color: #64748b; width: 36px; }
    .name-cell { font-weight: 700; color: #1e293b; text-align: ${dir === "rtl" ? "right" : "left"}; }
    .price-usd { color: #16a34a; font-weight: 700; }
    .price-iqd { color: #2563eb; font-weight: 700; }

    .total-row { background: linear-gradient(145deg, #f0f4ff, #e8ecf4) !important; }
    .total-row td { font-weight: 800; font-size: 9.5pt; color: #1e293b; border-top: 2px solid ${accent}; }

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
      @page { margin: 5mm; size: A4; }
      .stat-card, th, .report-footer, .total-row {
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
      <div class="report-date">${today}</div>
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
    ${summaryCards}
  </div>

  <table>
    <thead>
      <tr>
        <th>${t("Supplier Code")}</th>
        <th>${t('Name')}</th>
        <th>${t('Contact')}</th>
        <th>${t('Address')}</th>
        <th>${t("Opening Balance")}</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      ${totalsFooter}
    </tbody>
  </table>

  <div class="report-footer">
    <div class="footer-item">${t('Total Suppliers')}: <span class="footer-value">${visibleSuppliers.length}</span></div>
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Suppliers')}</h1>
          <p className="text-muted-foreground text-sm">{t('Manage your suppliers')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/supplier-management">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
              <ArrowLeft className="h-5 w-5" />
              {t("Supplier Management")}
            </Button>
          </Link>
          <Button
            size="sm"
            className="gap-2 shadow-sm"
            onClick={openCreateDialog}
            data-testid="button-add-supplier"
          >
            <Plus className="h-5 w-5" />
            {t('Add New Supplier')}
          </Button>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeFormDialog(); else setFormOpen(true); }}>
        <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden rounded-2xl border-border/60 shadow-2xl">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 px-6 py-5 text-white">
            <div className="pointer-events-none absolute -top-16 -end-10 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -start-10 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
            <DialogHeader className="relative space-y-2 text-start">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                  {editingClient ? <Pencil className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-white">
                    {editingClient ? t('Edit Supplier') : t('Add New Supplier')}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-white/70">
                    {editingClient ? t('Manage your suppliers') : t('Add a new supplier to get started.')}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card">
              <div className="space-y-4 px-6 py-5">
                {duplicateNameAlert && (
                  <Alert
                    variant="destructive"
                    className="rounded-2xl border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100 [&>svg]:text-rose-600 dark:[&>svg]:text-rose-300"
                    data-testid="alert-duplicate-supplier-name"
                  >
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="font-bold tracking-tight">
                      {t("Supplier name already exists")}
                    </AlertTitle>
                    <AlertDescription className="text-sm font-medium text-rose-700/90 dark:text-rose-200/90">
                      {t("Please use a different name")}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-[132px_1fr] gap-4">
                  <div className="space-y-1.5">
                    <FormLabel className="text-sm font-bold flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-teal-600" />
                      {t("Supplier Code")}
                    </FormLabel>
                    <div className="relative">
                      <Input
                        value={previewCode}
                        readOnly
                        disabled
                        data-testid="input-supplier-code"
                        className="h-11 rounded-xl border-border/70 bg-muted/60 text-base font-black font-mono tracking-wide pe-9"
                      />
                      <Lock className="absolute end-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm font-bold flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-teal-600" />
                        {t('Name')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-supplier-name"
                          placeholder={t('Supplier Name')}
                          className={cn(
                            "h-11 rounded-xl border-border/70 text-base font-semibold shadow-sm transition-colors",
                            duplicateNameAlert && "border-rose-400 focus-visible:ring-rose-300",
                          )}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (duplicateNameAlert) {
                              setDuplicateNameAlert(false);
                              form.clearErrors("name");
                            }
                          }}
                          onBlur={(e) => {
                            field.onBlur();
                            const value = e.target.value;
                            if (isSupplierNameTaken(value, editingClient?.id)) {
                              showDuplicateNameError();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <FormField control={form.control} name="contact" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm font-bold flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-teal-600" />
                        {t('Contact')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-supplier-contact"
                          placeholder="0770-000-0000"
                          className="h-11 rounded-xl border-border/70 text-base font-semibold shadow-sm"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm font-bold flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-teal-600" />
                        {t('Address')}
                      </FormLabel>
                      <AddressSearchSelect
                        addresses={addresses}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder={t('Select address...')}
                        data-testid="select-supplier-address"
                        inputClassName="h-11 rounded-xl border-border/70 text-base font-semibold shadow-sm"
                      />
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="rounded-2xl border border-teal-200/70 dark:border-teal-800/50 bg-teal-50/40 dark:bg-teal-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">
                    <Wallet className="h-3.5 w-3.5" />
                    {t("Opening Balance")}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3">
                    <div className="space-y-1.5">
                      <FormLabel className="text-sm font-bold">{t("Amount")}</FormLabel>
                      <AmountInput
                        currency={debtCurrency === "USD" ? "USD" : "IQD"}
                        value={openingAmountValue}
                        onChange={setOpeningAmount}
                        className="h-11 rounded-xl text-base font-semibold"
                        placeholder={formatAmountInput(0, debtCurrency)}
                        data-testid="input-supplier-opening-balance"
                      />
                    </div>
                    <FormField control={form.control} name="oldDebtCurrency" render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm font-bold">{t("Currency")}</FormLabel>
                        <Select
                          value={field.value || debtCurrency}
                          onValueChange={(code) => {
                            field.onChange(code);
                            setOpeningCurrency(code);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                "h-11 rounded-xl font-bold",
                                selectedDebtCurrency?.color.border,
                                selectedDebtCurrency?.color.bg,
                                selectedDebtCurrency?.color.text,
                              )}
                              data-testid="select-supplier-opening-currency"
                            >
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="z-[80]">
                            {CURRENCY_OPTIONS.map((c) => {
                              const lang = i18n.language || "en";
                              const localized = lang === "ar" ? c.nameAr : lang === "ckb" ? c.nameKu : lang === "tr" ? c.nameTr : c.nameEn;
                              return (
                                <SelectItem key={c.code} value={c.code}>
                                  <span className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-full ${c.color.badge} text-white text-[10px] font-black flex items-center justify-center`}>
                                      {c.symbol}
                                    </span>
                                    <span className="font-bold">{c.code}</span>
                                    <span className="text-xs text-muted-foreground">{localized}</span>
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                  <FormField control={form.control} name="hidden" render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-supplier-hidden"
                          className="h-5 w-5"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                        {t('Hide')}
                      </FormLabel>
                    </FormItem>
                  )} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-xl text-sm font-semibold"
                    onClick={() => { setAddrEditId(null); setAddrName(""); setAddrDialogOpen(true); }}
                    data-testid="button-manage-supplier-addresses"
                  >
                    <IconAddress className="h-4 w-4" />
                    {t('Address')}
                  </Button>
                </div>
              </div>

              <DialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={closeFormDialog}
                  data-testid="button-reset-form"
                >
                  {t('Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className={cn("rounded-xl min-w-[120px] font-bold")}
                  data-testid="button-save-supplier"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin me-2" /> : null}
                  {editingClient ? t('Update') : t('Save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Suppliers')}</CardTitle>
            <IconSupplierList className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        {openingTotalsByCurrency.length === 0 ? (
          <Card className="rounded-2xl border-border/60 shadow-sm md:col-span-1 xl:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("Total Opening Balances")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            </CardContent>
          </Card>
        ) : (
          openingTotalsByCurrency.map(({ currency, amount }) => {
            const meta = getCurrencyMeta(currency);
            const opt = CURRENCY_OPTIONS.find((c) => c.code === currency);
            return (
              <Card key={currency} className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("Total Opening Balances")} ({currency})
                  </CardTitle>
                  <span className={`w-7 h-7 rounded-full ${opt?.color.badge || "bg-slate-500"} text-white text-[11px] font-black flex items-center justify-center`}>
                    {opt?.symbol || meta.symbol}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-bold font-mono", opt?.color.text)}>
                    {formatAmount(amount, currency)} {currency}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm" ref={searchRef}>
              <SearchInput
                placeholder={t('Search suppliers...')}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setSearchOpen(true); }}
                onFocus={() => { if (searchTerm.trim()) setSearchOpen(true); }}
                onClear={() => { setSearchTerm(""); setSearchOpen(false); }}
                data-testid="input-search-suppliers"
              />
              {searchOpen && searchTerm.trim() && filtered.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filtered.slice(0, 10).map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className="w-full text-start px-3 py-2 hover:bg-muted/70 flex items-center justify-between gap-2 font-bold text-sm transition-colors"
                      data-testid={`search-result-supplier-${client.id}`}
                      onClick={() => {
                        setSearchTerm(client.name);
                        setSearchOpen(false);
                        setCurrentPage(1);
                      }}
                    >
                      <span>{client.name}</span>
                      {client.address && (
                        <Badge variant="outline" className="gap-1 text-xs font-semibold shrink-0">
                          <IconAddress className="h-3 w-3" />
                          {client.address}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground font-medium">
                {filtered.length} {t('Total Suppliers')}
              </div>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5" data-testid="button-print-suppliers">
                <Printer className="h-5 w-5" />
                {t('Print')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconSupplierList className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No suppliers found')}</h3>
              <p>{t('Add a new supplier to get started.')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-bold text-sm">{t("Supplier Code")}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Name')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Contact')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Address')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t("Opening Balance")}</TableHead>
                      <TableHead className="text-center font-bold text-sm">{t('Hide')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((client) => {
                      const opening = openingBalanceOf(client, defaultCurrency.code || "IQD");
                      const openingOpt = CURRENCY_OPTIONS.find((c) => c.code === opening.currency);
                      return (
                      <TableRow key={client.id} data-testid={`row-supplier-${client.id}`} className={editingClient?.id === client.id ? "bg-primary/5 ring-1 ring-primary/20" : ""}>
                        <TableCell className="font-black font-mono text-sm tracking-wide">
                          {String((client as any).code || client.id)}
                        </TableCell>
                        <TableCell className="font-bold text-sm">{client.name}</TableCell>
                        <TableCell className="font-bold text-sm">{client.contact || '-'}</TableCell>
                        <TableCell className="font-bold text-sm">
                          {client.address ? (
                            <Badge variant="outline" className="gap-1 font-bold">
                              <IconAddress className="h-3 w-3" />
                              {client.address}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">
                          {opening.amount ? (
                            <span className={cn("inline-flex items-center gap-1.5", openingOpt?.color.text)}>
                              <span className={`w-5 h-5 rounded-full ${openingOpt?.color.badge || "bg-slate-500"} text-white text-[9px] font-black flex items-center justify-center`}>
                                {openingOpt?.symbol || getCurrencyMeta(opening.currency).symbol}
                              </span>
                              {formatAmount(opening.amount, opening.currency)} {opening.currency}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {client.hidden ? (
                            <Badge variant="destructive" className="gap-1 text-xs font-bold">
                              <EyeOff className="h-3 w-3" />
                              {t('Hide')}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => startEdit(client)} data-testid={`button-edit-supplier-${client.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:text-destructive" data-testid={`button-delete-supplier-${client.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Delete Supplier')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('Are you sure you want to delete this supplier?')} ({client.name})
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(client.id)} data-testid={`button-confirm-delete-supplier-${client.id}`}>
                                    {t('Delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('Page')} {safePage} / {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage(safePage - 1)}
                      data-testid="button-prev-page"
                    >
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage(safePage + 1)}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addrDialogOpen} onOpenChange={(v) => { setAddrDialogOpen(v); if (!v) { setAddrEditId(null); setAddrName(""); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t('Supplier Addresses')}</DialogTitle>
            <DialogDescription>{t('Manage addresses for suppliers')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={addrName}
                onChange={(e) => setAddrName(e.target.value)}
                placeholder={t('Address Name')}
                className="h-10 text-base font-semibold flex-1"
                data-testid="input-inline-supplier-address"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!addrName.trim()) return;
                    if (addrEditId) {
                      updateSupplierAddr({ id: addrEditId, data: { name: addrName.trim() } }, {
                        onSuccess: () => { setAddrEditId(null); setAddrName(""); toast({ title: t("Supplier address updated successfully") }); },
                        onError: (err) => { toast({ title: t("Failed to update supplier address"), description: err.message, variant: "destructive" }); },
                      });
                    } else {
                      createSupplierAddr({ name: addrName.trim() }, {
                        onSuccess: () => { setAddrName(""); toast({ title: t("Supplier address added successfully") }); },
                        onError: (err) => { toast({ title: t("Failed to add supplier address"), description: err.message, variant: "destructive" }); },
                      });
                    }
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-10 px-4"
                disabled={!addrName.trim() || isCreatingAddr || isUpdatingAddr}
                data-testid="button-save-inline-supplier-address"
                onClick={() => {
                  if (!addrName.trim()) return;
                  if (addrEditId) {
                    updateSupplierAddr({ id: addrEditId, data: { name: addrName.trim() } }, {
                      onSuccess: () => { setAddrEditId(null); setAddrName(""); toast({ title: t("Supplier address updated successfully") }); },
                      onError: (err) => { toast({ title: t("Failed to update supplier address"), description: err.message, variant: "destructive" }); },
                    });
                  } else {
                    createSupplierAddr({ name: addrName.trim() }, {
                      onSuccess: () => { setAddrName(""); toast({ title: t("Supplier address added successfully") }); },
                      onError: (err) => { toast({ title: t("Failed to add supplier address"), description: err.message, variant: "destructive" }); },
                    });
                  }
                }}
              >
                {(isCreatingAddr || isUpdatingAddr) ? <Loader2 className="h-4 w-4 animate-spin" /> : addrEditId ? t('Update') : <Plus className="h-4 w-4" />}
              </Button>
              {addrEditId && (
                <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => { setAddrEditId(null); setAddrName(""); }}>
                  {t('Cancel')}
                </Button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto rounded-md border">
              {addresses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <IconAddress className="w-8 h-8 mb-2" />
                  <p className="text-sm">{t('No supplier addresses found')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-sm font-bold">#</TableHead>
                      <TableHead className="text-sm font-bold">{t('Address Name')}</TableHead>
                      <TableHead className="text-sm font-bold text-right">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addresses.map((addr: { id: number; name: string }, idx: number) => (
                      <TableRow key={addr.id} data-testid={`row-inline-supplier-address-${addr.id}`}>
                        <TableCell className="text-sm font-semibold">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-semibold">{addr.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAddrEditId(addr.id); setAddrName(addr.name); }} data-testid={`button-edit-inline-addr-${addr.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" data-testid={`button-delete-inline-addr-${addr.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Delete Address')}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('Are you sure you want to delete this address?')} ({addr.name})</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSupplierAddr(addr.id, {
                                    onSuccess: () => toast({ title: t("Supplier address deleted successfully") }),
                                    onError: (err) => toast({ title: t("Failed to delete supplier address"), description: err.message, variant: "destructive" }),
                                  })} data-testid={`button-confirm-delete-inline-addr-${addr.id}`}>
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
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
