import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProductDamages, useNextDamageNumber, useCreateProductDamage, useUpdateProductDamage, useDeleteProductDamage, useProductDamageItems } from "@/hooks/use-product-damages";
import { useQuery } from "@tanstack/react-query";
import type { ProductDamage } from "@shared/schema";
import { products, warehouses } from "@shared/schema";
type Product = typeof products.$inferSelect;
type Warehouse = typeof warehouses.$inferSelect;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Save, Loader2, RotateCcw, ListOrdered, AlertTriangle,
  ChevronLeft, ChevronRight, Eye, Printer, Pencil,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { useUnits } from "@/hooks/use-units";
import { getProductName, getProductNameByLang, resolveUnitName } from "@/lib/language-utils";
import { formatDate } from "@/lib/format-utils";
import { getModernPrintStyles } from "@/lib/print-styles";

interface DamageItem {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
}

const emptyItem = (): DamageItem => ({
  productId: null,
  productCode: "",
  productName: "",
  quantity: "",
  unit: "",
});

const DAMAGE_REASONS = [
  "expired",
  "broken",
  "manufacturing_defect",
  "water_damage",
  "fire_damage",
  "theft",
  "other",
];

export default function ProductDamagePage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data: damages, isLoading: damagesLoading } = useProductDamages();
  const { data: nextNumber } = useNextDamageNumber();
  const { mutate: createDamage, isPending: isSaving } = useCreateProductDamage();
  const { mutate: updateDamage, isPending: isUpdating } = useUpdateProductDamage();
  const { mutate: deleteDamage } = useDeleteProductDamage();

  const { data: productsList } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  const { data: warehousesList } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  const [damageNumber, setDamageNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [warehouseName, setWarehouseName] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [note, setNote] = useState("");
  const [items, setItems] = useState<DamageItem[]>([emptyItem()]);
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyDamageNumber, setHistoryDamageNumber] = useState("");
  const [historyProductName, setHistoryProductName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [detailDamageId, setDetailDamageId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: detailItems } = useProductDamageItems(detailDamageId);
  const { data: editItems } = useProductDamageItems(editingId);

  useEffect(() => {
    if (nextNumber?.number) {
      setDamageNumber(nextNumber.number);
    }
  }, [nextNumber]);

  useEffect(() => {
    if (warehousesList?.length && !warehouseId) {
      const first = warehousesList[0];
      setWarehouseId(String(first.id));
      setWarehouseName(first.name);
    }
  }, [warehousesList, warehouseId]);

  const selectWarehouse = useCallback((id: string) => {
    setWarehouseId(id);
    const wh = warehousesList?.find(w => w.id === parseInt(id));
    if (wh) setWarehouseName(wh.name);
  }, [warehousesList]);

  const updateItem = useCallback((index: number, field: keyof DamageItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const selectProduct = useCallback((index: number, barcode: string) => {
    const product = productsList?.find(p => p.barcode === barcode);
    if (product) {
      setItems(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          productId: product.id,
          productCode: product.barcode,
          productName: product.name,
          unit: product.bigUnit,
        };
        return updated;
      });
    }
  }, [productsList]);

  const selectProductByName = useCallback((index: number, name: string) => {
    const product = productsList?.find(p => p.name === name);
    if (product) {
      setItems(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          productId: product.id,
          productCode: product.barcode,
          productName: product.name,
          unit: product.bigUnit,
        };
        return updated;
      });
    }
  }, [productsList]);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, emptyItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setWarehouseId("");
    setWarehouseName("");
    setReason("");
    setNote("");
    setItems([emptyItem()]);
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!reason) {
      toast({ title: t("Error"), description: t("Please select a damage reason"), variant: "destructive" });
      return;
    }

    const validItems = items.filter(item => item.productId && parseInt(item.quantity) > 0);
    if (validItems.length === 0) {
      toast({ title: t("Error"), description: t("At least one item with quantity is required"), variant: "destructive" });
      return;
    }

    const payload = {
      damage: {
        damageNumber,
        warehouseId: warehouseId ? parseInt(warehouseId) : null,
        warehouseName: warehouseName || null,
        reason,
        note: note || null,
        date,
        time,
      },
      items: validItems.map(item => ({
        productId: item.productId!,
        productName: item.productName,
        productCode: item.productCode,
        quantity: parseInt(item.quantity),
        unit: item.unit,
      })),
    };

    if (editingId) {
      updateDamage({ id: editingId, data: payload }, {
        onSuccess: () => {
          toast({ title: t("Success"), description: t("Damage report updated successfully") });
          resetForm();
        },
        onError: (err: any) => {
          console.error("UPDATE ERROR:", err?.message || err);
          toast({ title: t("Error"), description: err?.message || t("Failed to update damage report"), variant: "destructive" });
        },
      });
    } else {
      createDamage(payload, {
        onSuccess: () => {
          toast({ title: t("Success"), description: t("Damage report recorded successfully") });
          resetForm();
        },
        onError: () => {
          toast({ title: t("Error"), description: t("Failed to record damage report"), variant: "destructive" });
        },
      });
    }
  }, [reason, warehouseId, warehouseName, damageNumber, note, date, time, items, createDamage, updateDamage, editingId, toast, t, resetForm]);

  const handleEdit = useCallback((dmg: any) => {
    setEditingId(dmg.id);
    setDamageNumber(dmg.damageNumber);
    setWarehouseId(dmg.warehouseId ? String(dmg.warehouseId) : "");
    setWarehouseName(dmg.warehouseName || "");
    setReason(dmg.reason);
    setNote(dmg.note || "");
    setDate(dmg.date);
    setTime(dmg.time || "00:00");
  }, []);

  useEffect(() => {
    if (editingId && editItems && editItems.length > 0) {
      setItems(editItems.map(item => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: String(item.quantity),
        unit: item.unit,
      })));
    }
  }, [editingId, editItems]);

  const handleDelete = (id: number) => {
    deleteDamage(id, {
      onSuccess: () => {
        toast({ title: t("Damage report deleted successfully") });
        if (detailDamageId === id) setDetailDamageId(null);
      },
      onError: () => {
        toast({ title: t("Failed to delete damage report"), variant: "destructive" });
      },
    });
  };

  const { data: unitsData } = useUnits();
  const unitsList = unitsData || [];
  const whs = warehousesList || [];
  const prods = productsList || [];

  const reasonLabel = (r: string) => {
    const labels: Record<string, string> = {
      expired: t("Expired"),
      broken: t("Broken"),
      manufacturing_defect: t("Manufacturing Defect"),
      water_damage: t("Water Damage"),
      fire_damage: t("Fire Damage"),
      theft: t("Theft"),
      other: t("Other"),
    };
    return labels[r] || r;
  };

  const allDamages = damages || [];
  const filteredDamages = allDamages.filter((dmg: any) => {
    if (historyFilter && historyFilter !== "all" && dmg.reason !== historyFilter) return false;
    if (historyFromDate && dmg.date < historyFromDate) return false;
    if (historyToDate && dmg.date > historyToDate) return false;
    if (historyDamageNumber && !dmg.damageNumber?.toLowerCase().includes(historyDamageNumber.toLowerCase())) return false;
    if (historyProductName && !(dmg.itemProductNames || []).some((n: string) => n.toLowerCase().includes(historyProductName.toLowerCase()))) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredDamages.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDamages = filteredDamages.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handlePrintReport = () => {
    if (!filteredDamages.length) return;
    const dir = i18n.language === "en" ? "ltr" : "rtl";
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const rows = filteredDamages.map((dmg: any, i: number) => {
      const prNames = (dmg.itemProductNames || []).join("، ");
      return `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:600;font-family:monospace">${dmg.damageNumber}</td>
        <td>${dmg.date}</td>
        <td>${dmg.time || "-"}</td>
        <td>${dmg.warehouseName || "-"}</td>
        <td><span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;font-size:8pt">${reasonLabel(dmg.reason)}</span></td>
        <td style="max-width:150px">${prNames || "-"}</td>
        <td style="max-width:100px;color:#666">${dmg.note || "-"}</td>
      </tr>`;
    }).join("");

    const dateRange = historyFromDate && historyToDate
      ? `${formatDate(historyFromDate)} - ${formatDate(historyToDate)}`
      : formatDate(new Date());

    printWindow.document.write(`<!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head><meta charset="UTF-8" />
        <title>${t("Damage Report")}</title>
        <style>${getModernPrintStyles({ direction: dir as "rtl" | "ltr", accentColor: "#991b1b", accentTextColor: "#ffffff" })}</style>
      </head>
      <body>
        <div class="header">
          <h1>${t("Damage Report")}</h1>
          <p>${dateRange}</p>
        </div>
        <div class="summary-cards">
          <div class="summary-card accent-red"><div class="label">${t("Total Records")}</div><div class="value red">${filteredDamages.length}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>#</th>
            <th>${t("Damage No")}</th>
            <th>${t("Date")}</th>
            <th>${t("Time")}</th>
            <th>${t("Warehouse")}</th>
            <th>${t("Reason")}</th>
            <th>${t("Products")}</th>
            <th>${t("Note")}</th>
          </tr></thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-destructive" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('Product Damage')}</h1>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {editingId ? t('Edit Damage Report') : t('New Damage Report')}
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm} className="ms-2 text-muted-foreground" data-testid="button-cancel-edit">
                <RotateCcw className="w-4 h-4 me-1" />
                {t('Cancel')}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('Damage No')}</Label>
              <Input
                value={damageNumber}
                readOnly
                className="font-mono bg-muted cursor-not-allowed"
                data-testid="input-damage-number"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Date')}</Label>
              <DateInput
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="input-date"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Time')}</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                data-testid="input-time"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Warehouse')}</Label>
              <Select value={warehouseId} onValueChange={selectWarehouse}>
                <SelectTrigger data-testid="select-warehouse">
                  <SelectValue placeholder={t('Select Warehouse')} />
                </SelectTrigger>
                <SelectContent>
                  {whs.map(wh => (
                    <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('Damage Reason')}</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger data-testid="select-reason">
                  <SelectValue placeholder={t('Select Reason')} />
                </SelectTrigger>
                <SelectContent>
                  {DAMAGE_REASONS.map(r => (
                    <SelectItem key={r} value={r}>{reasonLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('Note')}</Label>
              <Textarea
                placeholder={t('Note') + "..."}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                data-testid="input-note"
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t('Damaged Items')}</Label>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1" data-testid="button-add-item">
                <Plus className="w-4 h-4" />
                {t('Add Item')}
              </Button>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Product Code')}</TableHead>
                    <TableHead>{t('Product Name')}</TableHead>
                    <TableHead className="w-28">{t('Quantity')}</TableHead>
                    <TableHead className="w-28">{t('Unit')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      <TableCell>
                        <Select
                          value={item.productCode || undefined}
                          onValueChange={(val) => selectProduct(index, val)}
                        >
                          <SelectTrigger data-testid={`select-product-code-${index}`} className="font-mono">
                            <SelectValue placeholder={t('Select')} />
                          </SelectTrigger>
                          <SelectContent>
                            {prods.map(p => (
                              <SelectItem key={p.id} value={p.barcode}>{p.barcode}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.productName || undefined}
                          onValueChange={(val) => selectProductByName(index, val)}
                        >
                          <SelectTrigger data-testid={`select-product-name-${index}`}>
                            <SelectValue placeholder={t('Select')} />
                          </SelectTrigger>
                          <SelectContent>
                            {prods.map(p => (
                              <SelectItem key={p.id} value={p.name}>{getProductName(p)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          placeholder="0"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          data-testid={`input-quantity-${index}`}
                          className="font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unit}
                          readOnly
                          className="bg-muted/50"
                          data-testid={`input-unit-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={isSaving || isUpdating} className="gap-2" data-testid="button-save">
              {(isSaving || isUpdating) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? t('Update') : t('Save')}
            </Button>
            <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset">
              <RotateCcw className="w-4 h-4" />
              {t('Reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-destructive" />
              {t('Damage History')}
              <Badge variant="secondary" className="ml-2">{filteredDamages.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('Damage No')}</Label>
                <Input
                  value={historyDamageNumber}
                  onChange={(e) => { setHistoryDamageNumber(e.target.value); setCurrentPage(1); }}
                  placeholder={t('Search by damage number')}
                  className="w-40 h-9 font-mono"
                  data-testid="input-search-damage-number"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('Product Name')}</Label>
                <Input
                  value={historyProductName}
                  onChange={(e) => { setHistoryProductName(e.target.value); setCurrentPage(1); }}
                  placeholder={t('Search by product name')}
                  className="w-40 h-9"
                  data-testid="input-search-product-name"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-damage-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-damage-history-to-date" />
              </div>
              <div className="w-48">
                <Select value={historyFilter} onValueChange={(v) => { setHistoryFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger data-testid="select-filter-damage-history" className="h-9">
                    <SelectValue placeholder={t('All Reasons')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Reasons')}</SelectItem>
                    {DAMAGE_REASONS.map(r => (
                      <SelectItem key={r} value={r}>{reasonLabel(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handlePrintReport} variant="outline" size="sm" className="h-9" data-testid="button-print-damage-report">
                <Printer className="w-4 h-4 me-2" />
                {t("Print")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {damagesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Damage No')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('Warehouse')}</TableHead>
                    <TableHead>{t('Reason')}</TableHead>
                    <TableHead>{t('Note')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDamages.map((dmg: ProductDamage, i: number) => (
                    <TableRow key={dmg.id} data-testid={`row-damage-${dmg.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-medium">{dmg.damageNumber}</TableCell>
                      <TableCell className="font-mono text-sm">{dmg.date}</TableCell>
                      <TableCell className="font-mono text-sm">{dmg.time || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{dmg.warehouseName || "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{reasonLabel(dmg.reason)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate text-muted-foreground">{dmg.note || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => setDetailDamageId(detailDamageId === dmg.id ? null : dmg.id)}
                            data-testid={`button-detail-${dmg.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={() => { handleEdit(dmg); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            data-testid={`button-edit-damage-${dmg.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-damage-${dmg.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('This will permanently delete this damage report and all its items.')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(dmg.id)}>{t('Yes')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedDamages.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {t('No records found')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {detailDamageId && detailItems && detailItems.length > 0 && (
              <div className="mt-4 border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold mb-2">{t('Damaged Items')}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('Product Code')}</TableHead>
                      <TableHead>{t('Product Name')}</TableHead>
                      <TableHead>{t('Quantity')}</TableHead>
                      <TableHead>{t('Unit')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailItems.map((item, i) => (
                      <TableRow key={item.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{item.productCode}</TableCell>
                        <TableCell>{getProductNameByLang(item.productName)}</TableCell>
                        <TableCell className="font-mono">{item.quantity}</TableCell>
                        <TableCell>{resolveUnitName(item.unit, unitsList)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredDamages.length)} {t('of')} {filteredDamages.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    data-testid="button-damage-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                    <Button
                      key={pg}
                      variant={pg === safePage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(pg)}
                      data-testid={`button-damage-page-${pg}`}
                    >
                      {pg}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(safePage + 1)}
                    data-testid="button-damage-next-page"
                  >
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
  );
}
