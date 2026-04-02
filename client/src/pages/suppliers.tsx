import { useState, useRef, useEffect } from "react";
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
import { Plus, Loader2, Pencil, Trash2, ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, EyeOff, Printer } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconSupplierList, IconAddress } from "@/components/erp-icons";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usd, formatDate } from "@/lib/format-utils";
import { PRINT_FONT_LINKS } from "@/lib/print-styles";
import { AddressSearchSelect } from "@/components/address-search-select";

const supplierSchema = insertClientSchema.extend({
  type: z.literal("supplier").default("supplier"),
  name: z.string().min(1, "Supplier name is required"),
});

const ITEMS_PER_PAGE = 10;

export default function SuppliersPage() {
  const { t } = useTranslation();
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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addrDialogOpen, setAddrDialogOpen] = useState(false);
  const [addrEditId, setAddrEditId] = useState<number | null>(null);
  const [addrName, setAddrName] = useState("");
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

  const form = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "", type: "supplier", contact: "", address: "", oldDebtUsd: "0", oldDebtIqd: "0", hidden: false },
  });

  const startEdit = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      type: "supplier",
      contact: client.contact || "",
      address: client.address || "",
      oldDebtUsd: client.oldDebtUsd || "0",
      oldDebtIqd: client.oldDebtIqd || "0",
      hidden: client.hidden ?? false,
    });
  };

  const cancelEdit = () => {
    setEditingClient(null);
    form.reset({ name: "", type: "supplier", contact: "", address: "", oldDebtUsd: "0", oldDebtIqd: "0", hidden: false });
  };

  const onSubmit = (values: z.infer<typeof supplierSchema>) => {
    const existingSuppliers = allClients?.filter(c => c.type === "supplier") || [];
    const isDuplicate = existingSuppliers.some(
      s => s.name.trim().toLowerCase() === values.name.trim().toLowerCase() &&
        (!editingClient || s.id !== editingClient.id)
    );
    if (isDuplicate) {
      toast({ title: t("Supplier name already exists"), description: t("Please use a different name"), variant: "destructive" });
      return;
    }

    if (editingClient) {
      updateClient({ id: editingClient.id, data: { ...values, type: "supplier" } }, {
        onSuccess: () => {
          setEditingClient(null);
          form.reset({ name: "", type: "supplier", contact: "", address: "", oldDebtUsd: "0", oldDebtIqd: "0", hidden: false });
          toast({ title: t("Supplier updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update supplier"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createClient({ ...values, type: "supplier" }, {
        onSuccess: () => {
          form.reset({ name: "", type: "supplier", contact: "", address: "", oldDebtUsd: "0", oldDebtIqd: "0", hidden: false });
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
        if (editingClient?.id === id) cancelEdit();
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
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOldDebtUsd = suppliers.reduce((sum, c) => sum + Number(c.oldDebtUsd || 0), 0);
  const totalOldDebtIqd = suppliers.reduce((sum, c) => sum + Number(c.oldDebtIqd || 0), 0);

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

    const tableRows = visibleSuppliers.map((s, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name-cell">${s.name}</td>
        <td>${s.address || '-'}</td>
        <td class="mono">${s.contact || '-'}</td>
        <td class="mono price-usd">$${Number(s.oldDebtUsd || 0).toFixed(2)}</td>
        <td class="mono price-iqd">${Number(s.oldDebtIqd || 0).toLocaleString()} IQD</td>
      </tr>
    `).join("");

    const totalUsd = visibleSuppliers.reduce((sum, s) => sum + Number(s.oldDebtUsd || 0), 0);
    const totalIqd = visibleSuppliers.reduce((sum, s) => sum + Number(s.oldDebtIqd || 0), 0);

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
    <div class="stat-card blue">
      <span class="stat-label">${t('Total Suppliers')}</span>
      <span class="stat-value">${visibleSuppliers.length}</span>
    </div>
    <div class="stat-card green">
      <span class="stat-label">${t('Total Opening Balances (USD)')}</span>
      <span class="stat-value">$${totalUsd.toFixed(2)}</span>
    </div>
    <div class="stat-card orange">
      <span class="stat-label">${t('Total Opening Balances (IQD)')}</span>
      <span class="stat-value">${totalIqd.toLocaleString()} IQD</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${t('Name')}</th>
        <th>${t('Address')}</th>
        <th>${t('Contact')}</th>
        <th>${t('Opening Balance (USD)')}</th>
        <th>${t('Opening Balance (IQD)')}</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="total-row">
        <td colspan="4" class="name-cell">${t('Total')}</td>
        <td class="mono price-usd">$${totalUsd.toFixed(2)}</td>
        <td class="mono price-iqd">${totalIqd.toLocaleString()} IQD</td>
      </tr>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Suppliers')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage your suppliers')}</p>
        </div>
        <Link href="/supplier-management">
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
            <ArrowLeft className="h-5 w-5" />
            {t("Supplier Management")}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Suppliers')}</CardTitle>
            <IconSupplierList className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Opening Balances (USD)')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usd(totalOldDebtUsd)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Opening Balances (IQD)')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOldDebtIqd.toLocaleString()} IQD</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {editingClient ? (
              <><Pencil className="h-5 w-5 text-primary" /> {t('Edit Supplier')}</>
            ) : (
              <><Plus className="h-5 w-5 text-primary" /> {t('Add New Supplier')}</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Name')}</FormLabel>
                    <FormControl><Input data-testid="input-supplier-name" placeholder={t('Supplier Name')} className="h-11 text-base font-semibold" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Contact')}</FormLabel>
                    <FormControl><Input data-testid="input-supplier-contact" placeholder="0770-000-0000" className="h-11 text-base font-semibold" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Address')}</FormLabel>
                    <AddressSearchSelect
                      addresses={addresses}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder={t('Select address...')}
                      data-testid="select-supplier-address"
                      inputClassName="h-11 text-base font-semibold"
                    />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="oldDebtUsd" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Opening Balance (USD)')}</FormLabel>
                    <FormControl><Input data-testid="input-supplier-old-debt-usd" type="number" step="0.01" placeholder="0.00" className="h-11 text-base font-semibold" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="oldDebtIqd" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-bold">{t('Opening Balance (IQD)')}</FormLabel>
                    <FormControl><Input data-testid="input-supplier-old-debt-iqd" type="number" step="1" placeholder="0" className="h-11 text-base font-semibold" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex items-center gap-4 pt-4">
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
                      <FormLabel className="text-base font-bold flex items-center gap-1.5 cursor-pointer">
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                        {t('Hide')}
                      </FormLabel>
                    </FormItem>
                  )} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-sm font-semibold"
                    onClick={() => { setAddrEditId(null); setAddrName(""); setAddrDialogOpen(true); }}
                    data-testid="button-manage-supplier-addresses"
                  >
                    <IconAddress className="h-4 w-4" />
                    {t('Address')}
                  </Button>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={isSaving} size="lg" className="text-base font-bold h-11 flex-1" data-testid="button-save-supplier">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {editingClient ? t('Update') : t('Save')}
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="h-11" onClick={cancelEdit} data-testid="button-reset-form">
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
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
        <CardContent>
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
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold text-sm">#</TableHead>
                      <TableHead className="font-bold text-sm">{t('Name')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Address')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Contact')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Opening Balance (USD)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Opening Balance (IQD)')}</TableHead>
                      <TableHead className="text-center font-bold text-sm">{t('Hide')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Created By')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((client) => (
                      <TableRow key={client.id} data-testid={`row-supplier-${client.id}`} className={editingClient?.id === client.id ? "bg-primary/5 ring-1 ring-primary/20" : ""}>
                        <TableCell className="font-bold font-mono text-sm">{client.id}</TableCell>
                        <TableCell className="font-bold text-sm">{client.name}</TableCell>
                        <TableCell className="font-bold text-sm">
                          {client.address ? (
                            <Badge variant="outline" className="gap-1 font-bold">
                              <IconAddress className="h-3 w-3" />
                              {client.address}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="font-bold text-sm">{client.contact || '-'}</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">{usd(client.oldDebtUsd || 0)}</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm">{Number(client.oldDebtIqd || 0).toLocaleString()}</TableCell>
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
                        <TableCell className="text-sm font-semibold">{client.createdBy || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(client)} data-testid={`button-edit-supplier-${client.id}`}>
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-supplier-${client.id}`}>
                                  <Trash2 className="h-5 w-5" />
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
                    ))}
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
