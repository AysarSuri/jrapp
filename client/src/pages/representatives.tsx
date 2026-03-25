import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRepresentativeSchema, type Representative } from "@shared/schema";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useRepresentatives, useCreateRepresentative, useUpdateRepresentative, useDeleteRepresentative } from "@/hooks/use-representatives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Loader2, Trash2, Pencil, Phone, EyeOff, Package, Printer } from "lucide-react";
import { IconAgent } from "@/components/erp-icons";
import { usd, formatDate } from "@/lib/format-utils";
import { PRINT_FONT_LINKS, openPrintWindow } from "@/lib/print-styles";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveUnitName } from "@/lib/language-utils";
import { useUnits } from "@/hooks/use-units";

export default function RepresentativesPage() {
  const { t } = useTranslation();
  const { data: reps, isLoading } = useRepresentatives();
  const { mutate: createRep, isPending: isCreating } = useCreateRepresentative();
  const { mutate: updateRep, isPending: isUpdating } = useUpdateRepresentative();
  const { mutate: deleteRep } = useDeleteRepresentative();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Representative | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [productsRepId, setProductsRepId] = useState<number | null>(null);
  const [productsRepName, setProductsRepName] = useState("");
  const { data: unitsData } = useUnits();
  const unitsList = unitsData || [];
  const { data: repProducts, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/representative-products', productsRepId],
    enabled: !!productsRepId,
  });

  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; primaryColor: string; address: string; mobile1: string }>({ queryKey: ["/api/company-profile"] });
  const { data: repBalances } = useQuery<Record<number, { balanceUsd: number; balanceIqd: number }>>({ queryKey: ["/api/rep-balances"] });

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const handlePrint = () => {
    const dir = (document.documentElement.dir || "ltr") as "rtl" | "ltr";
    const accent = "#64748b";
    const companyName = esc(companyProfile?.name || "");
    const companyLogo = companyProfile?.logo || "";
    const companyAddress = esc(companyProfile?.address || "");
    const companyMobile = esc(companyProfile?.mobile1 || "");
    const today = formatDate(new Date());
    const title = t('Representatives');

    const tableRows = filtered.map((item, i) => {
      const bal = repBalances?.[item.id];
      const bUsd = bal?.balanceUsd ?? 0;
      const bIqd = bal?.balanceIqd ?? 0;
      const hasPositive = bUsd > 0 || bIqd > 0;
      const hasNegative = bUsd < 0 || bIqd < 0;
      const statusParts: string[] = [];
      if (hasPositive) statusParts.push(`<span style="color:#16a34a;font-weight:700">${esc(t('Remaining at him'))}</span>`);
      if (hasNegative) statusParts.push(`<span style="color:#dc2626;font-weight:700">${esc(t('Remaining at us'))}</span>`);
      if (!hasPositive && !hasNegative) statusParts.push(`<span style="color:#64748b;font-weight:700">${esc(t('Zero Account'))}</span>`);
      return `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name-cell">${esc(item.name)}</td>
        <td class="mono">${esc(item.mobile || '-')}</td>
        <td>${item.agreementType === 'monthly_salary' ? esc(t('Monthly Salary')) : esc(t('Commission'))}</td>
        <td class="mono price-usd" style="color:${bUsd > 0 ? '#16a34a' : bUsd < 0 ? '#dc2626' : '#64748b'}">${bUsd !== 0 ? (bUsd < 0 ? '-' : '') + '$' + Math.abs(bUsd).toFixed(2) : '-'}</td>
        <td class="mono price-iqd" style="color:${bIqd > 0 ? '#16a34a' : bIqd < 0 ? '#dc2626' : '#64748b'}">${bIqd !== 0 ? (bIqd < 0 ? '-' : '') + Math.abs(bIqd).toLocaleString() + ' IQD' : '-'}</td>
        <td style="font-size:8.5pt">${statusParts.join(' / ')}</td>
      </tr>`;
    }).join("");

    const totalUsd = filtered.reduce((sum, r) => sum + (repBalances?.[r.id]?.balanceUsd ?? 0), 0);
    const totalIqd = filtered.reduce((sum, r) => sum + (repBalances?.[r.id]?.balanceIqd ?? 0), 0);

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
      padding: 18px 24px; font-size: 10pt; direction: ${dir}; color: #1a1a2e; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .header-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; margin-bottom: 14px;
      border: 2px solid #e2e8f0; border-radius: 14px; background: linear-gradient(135deg, #fafbfc, #f8fafc);
    }
    .header-center { display: flex; align-items: center; gap: 12px; flex: 1; justify-content: center; }
    .header-center img { width: 60px; height: 60px; object-fit: contain; border-radius: 10px; }
    .header-center .company-name { font-size: 18pt; font-weight: 800; color: ${accent}; }
    .header-right { text-align: ${dir === "rtl" ? "right" : "left"}; min-width: 180px; }
    .header-right .report-title { font-size: 16pt; font-weight: 800; color: ${accent}; margin-bottom: 2px; }
    .header-right .report-date { font-size: 9pt; color: #64748b; font-weight: 500; }
    .header-left { text-align: ${dir === "rtl" ? "left" : "right"}; min-width: 200px; display: flex; flex-direction: column; gap: 3px; font-size: 8.5pt; color: #64748b; }
    .header-left .contact-item { display: flex; align-items: center; gap: 5px; justify-content: ${dir === "rtl" ? "flex-start" : "flex-end"}; }
    .summary-row { display: flex; gap: 12px; margin-bottom: 14px; }
    .stat-card { flex: 1; border-radius: 10px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; }
    .stat-card.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
    .stat-card.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .stat-card.orange { background: #fffbeb; border: 1px solid #fde68a; }
    .stat-label { font-size: 8.5pt; color: #64748b; font-weight: 600; }
    .stat-value { font-size: 13pt; font-weight: 800; color: #1a1a2e; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    thead { background: #f1f5f9; }
    th { padding: 8px 10px; text-align: ${dir === "rtl" ? "right" : "left"}; font-weight: 700; color: #334155; border-bottom: 2px solid #e2e8f0; font-size: 9pt; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #fafbfc; }
    .num { text-align: center; color: #94a3b8; font-weight: 600; width: 35px; }
    .name-cell { font-weight: 700; }
    .mono { font-family: 'SF Mono', 'Cascadia Code', monospace; font-size: 9pt; }
    .price-usd { text-align: right; color: #166534; font-weight: 700; }
    .price-iqd { text-align: right; color: #9333ea; font-weight: 700; }
    .totals-row { background: #f1f5f9 !important; font-weight: 800; }
    .footer { margin-top: 16px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    @media print { body { padding: 10px 14px; } @page { margin: 8mm; } }
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
    <div class="stat-card blue"><span class="stat-label">${t('Total Representatives')}</span><span class="stat-value">${filtered.length}</span></div>
    <div class="stat-card green"><span class="stat-label">${t('Final Balance')} (USD)</span><span class="stat-value">${totalUsd < 0 ? '-' : ''}$${Math.abs(totalUsd).toFixed(2)}</span></div>
    <div class="stat-card orange"><span class="stat-label">${t('Final Balance')} (IQD)</span><span class="stat-value">${totalIqd < 0 ? '-' : ''}${Math.abs(totalIqd).toLocaleString()} IQD</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${t('Representative Name')}</th>
        <th>${t('Mobile')}</th>
        <th>${t('Agreement Type')}</th>
        <th style="text-align:right">${t('Final Balance')} (USD)</th>
        <th style="text-align:right">${t('Final Balance')} (IQD)</th>
        <th>${t('Status')}</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="totals-row">
        <td colspan="4" style="text-align:${dir === "rtl" ? "right" : "left"};font-weight:800">${t('Total')}</td>
        <td class="mono" style="text-align:right;color:${totalUsd > 0 ? '#16a34a' : totalUsd < 0 ? '#dc2626' : '#64748b'};font-weight:800">${totalUsd < 0 ? '-' : ''}$${Math.abs(totalUsd).toFixed(2)}</td>
        <td class="mono" style="text-align:right;color:${totalIqd > 0 ? '#16a34a' : totalIqd < 0 ? '#dc2626' : '#64748b'};font-weight:800">${totalIqd < 0 ? '-' : ''}${Math.abs(totalIqd).toLocaleString()} IQD</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <div class="footer">${companyName} — ${today}</div>
</body>
</html>`;
    openPrintWindow(html);
  };

  const form = useForm<z.infer<typeof insertRepresentativeSchema>>({
    resolver: zodResolver(insertRepresentativeSchema),
    defaultValues: { name: "", mobile: "", agreementType: "commission", hidden: 0, debtUsd: "0", debtIqd: "0" },
  });

  const openCreateDialog = () => {
    setEditing(null);
    form.reset({ name: "", mobile: "", agreementType: "commission", hidden: 0, debtUsd: "0", debtIqd: "0" });
    setOpen(true);
  };

  const openEditDialog = (item: Representative) => {
    setEditing(item);
    form.reset({ name: item.name, mobile: item.mobile || "", agreementType: item.agreementType || "commission", hidden: item.hidden || 0, debtUsd: item.debtUsd || "0", debtIqd: item.debtIqd || "0" });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof insertRepresentativeSchema>) => {
    if (editing) {
      updateRep({ id: editing.id, data: values }, {
        onSuccess: () => {
          setOpen(false);
          setEditing(null);
          form.reset();
          toast({ title: t("Representative updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update representative"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createRep(values, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          toast({ title: t("Representative added successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to add representative"), description: t(err.message), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteRep(id, {
      onSuccess: () => {
        toast({ title: t("Representative deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete representative"), description: t(err.message), variant: "destructive" });
      },
    });
  };

  const filtered = reps?.filter((a: Representative) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Representatives')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage sales representatives')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5" data-testid="button-print-representatives">
            <Printer className="w-5 h-5" />
            {t('Print')}
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-representative" onClick={openCreateDialog}>
                <Plus className="w-5 h-5 mr-2" />
                {t('Add Representative')}
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editing ? t('Edit Representative') : t('Add New Representative')}</DialogTitle>
              <DialogDescription>{t('Enter representative details')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Representative Name')}</FormLabel>
                    <FormControl><Input data-testid="input-representative-name" placeholder={t('e.g. Ahmed Ali')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mobile" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Mobile')}</FormLabel>
                    <FormControl><Input data-testid="input-representative-mobile" placeholder={t('Mobile number...')} {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="agreementType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Agreement Type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue="commission">
                      <FormControl>
                        <SelectTrigger data-testid="select-agreement-type">
                          <SelectValue placeholder={t('Select agreement type')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="commission">{t('Commission')}</SelectItem>
                        <SelectItem value="monthly_salary">{t('Monthly Salary')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="debtUsd" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold">{t('Opening Balance')} (USD)</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-representative-debt-usd"
                          type="number"
                          step="any"
                          placeholder="0"
                          className="h-11 text-base font-semibold"
                          {...field}
                          value={field.value ?? "0"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="debtIqd" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold">{t('Opening Balance')} (IQD)</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-representative-debt-iqd"
                          type="number"
                          step="any"
                          placeholder="0"
                          className="h-11 text-base font-semibold"
                          {...field}
                          value={field.value ?? "0"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="hidden" render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        data-testid="checkbox-representative-hidden"
                        checked={field.value === 1}
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                      />
                    </FormControl>
                    <FormLabel className="text-base font-bold cursor-pointer">{t('Hide')}</FormLabel>
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => { setOpen(false); setEditing(null); }}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={isSaving} data-testid="button-save-representative">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {t('Save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Representatives')}</CardTitle>
            <IconAgent className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reps?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('Search representatives...')} className="pl-9 max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-representatives" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconAgent className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No representatives found')}</h3>
              <p>{t('Add a new representative to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Representative Name')}</TableHead>
                    <TableHead>{t('Mobile')}</TableHead>
                    <TableHead>{t('Agreement Type')}</TableHead>
                    <TableHead className="text-right">{t('Final Balance')} (USD)</TableHead>
                    <TableHead className="text-right">{t('Final Balance')} (IQD)</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Hide')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: Representative) => (
                    <TableRow key={item.id} data-testid={`row-representative-${item.id}`}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <IconAgent className="h-3 w-3" />
                          {item.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.mobile ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {item.mobile}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.agreementType === 'monthly_salary' ? 'default' : 'secondary'}>
                          {item.agreementType === 'monthly_salary' ? t('Monthly Salary') : t('Commission')}
                        </Badge>
                      </TableCell>
                      {(() => {
                        const bal = repBalances?.[item.id];
                        const bUsd = bal?.balanceUsd ?? 0;
                        const bIqd = bal?.balanceIqd ?? 0;
                        const hasPositive = bUsd > 0 || bIqd > 0;
                        const hasNegative = bUsd < 0 || bIqd < 0;
                        return (
                          <>
                            <TableCell className={`text-right font-mono text-sm font-semibold ${bUsd > 0 ? 'text-green-600' : bUsd < 0 ? 'text-red-600' : ''}`}>
                              {bUsd !== 0 ? `${bUsd < 0 ? '-' : ''}$${Math.abs(bUsd).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </TableCell>
                            <TableCell className={`text-right font-mono text-sm font-semibold ${bIqd > 0 ? 'text-green-600' : bIqd < 0 ? 'text-red-600' : ''}`}>
                              {bIqd !== 0 ? `${bIqd < 0 ? '-' : ''}${Math.abs(bIqd).toLocaleString()} IQD` : '-'}
                            </TableCell>
                            <TableCell>
                              {hasPositive && (
                                <Badge className="gap-1 text-xs bg-green-600 text-white">
                                  {t('Remaining at him')}
                                </Badge>
                              )}
                              {hasNegative && (
                                <Badge variant="destructive" className="gap-1 text-xs">
                                  {t('Remaining at us')}
                                </Badge>
                              )}
                              {!hasPositive && !hasNegative && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  {t('Zero Account')}
                                </Badge>
                              )}
                            </TableCell>
                          </>
                        );
                      })()}
                      <TableCell>
                        {item.hidden === 1 ? (
                          <Badge variant="destructive" className="gap-1">
                            <EyeOff className="h-3 w-3" />
                            {t('Hidden')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setProductsRepId(item.id); setProductsRepName(item.name); }} data-testid={`button-products-representative-${item.id}`}>
                            <Package className="h-5 w-5 text-indigo-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} data-testid={`button-edit-representative-${item.id}`}>
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-representative-${item.id}`}>
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Representative')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this representative?')} ({item.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)} data-testid={`button-confirm-delete-representative-${item.id}`}>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={!!productsRepId} onOpenChange={(v) => { if (!v) setProductsRepId(null); }}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Representative Products')} - {productsRepName}</DialogTitle>
            <DialogDescription>{t('All products remaining with this representative')}</DialogDescription>
          </DialogHeader>
          {productsLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !repProducts || repProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Package className="w-10 h-10 mb-2" />
              <p className="font-semibold">{t('No products found')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t('Product Name')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Product Code')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Remaining (Big Unit)')}</TableHead>
                    <TableHead className="text-sm font-bold">{t('Remaining (Small Unit)')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repProducts.map((p: any, i: number) => (
                    <TableRow key={p.productId} data-testid={`row-rep-product-${p.productId}`}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="text-sm font-semibold">{p.productName}</TableCell>
                      <TableCell className="font-mono text-sm">{p.productCode}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {p.remainingBig} {resolveUnitName(p.bigUnit, unitsList)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {p.remainingSmall} {resolveUnitName(p.smallUnit, unitsList)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
