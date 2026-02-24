import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProductDamages, useNextDamageNumber, useCreateProductDamage, useProductDamageItems } from "@/hooks/use-product-damages";
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
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { useUnits } from "@/hooks/use-units";
import { getProductName, getProductNameByLang, resolveUnitName } from "@/lib/language-utils";

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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: damages, isLoading: damagesLoading } = useProductDamages();
  const { data: nextNumber } = useNextDamageNumber();
  const { mutate: createDamage, isPending: isSaving } = useCreateProductDamage();

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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailDamageId, setDetailDamageId] = useState<number | null>(null);

  const { data: detailItems } = useProductDamageItems(detailDamageId);

  useEffect(() => {
    if (nextNumber?.number) {
      setDamageNumber(nextNumber.number);
    }
  }, [nextNumber]);

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

    createDamage({
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
    }, {
      onSuccess: () => {
        toast({ title: t("Success"), description: t("Damage report recorded successfully") });
        resetForm();
      },
      onError: () => {
        toast({ title: t("Error"), description: t("Failed to record damage report"), variant: "destructive" });
      },
    });
  }, [reason, warehouseId, warehouseName, damageNumber, note, date, time, items, createDamage, toast, t, resetForm]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-destructive" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('Product Damage')}</h1>
        </div>
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="button-history">
              <ListOrdered className="w-4 h-4" />
              {t('Damage History')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('Damage History')}</DialogTitle>
            </DialogHeader>
            {damagesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : !damages?.length ? (
              <div className="text-center py-8 text-muted-foreground">{t('No records found')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t('Damage No')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Warehouse')}</TableHead>
                    <TableHead>{t('Reason')}</TableHead>
                    <TableHead>{t('Note')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {damages.map((dmg, i) => (
                    <TableRow key={dmg.id} data-testid={`row-damage-${dmg.id}`}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-medium">{dmg.damageNumber}</TableCell>
                      <TableCell className="font-mono text-sm">{dmg.date} {dmg.time}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{dmg.warehouseName || "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{reasonLabel(dmg.reason)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate text-muted-foreground">{dmg.note || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailDamageId(detailDamageId === dmg.id ? null : dmg.id)}
                          data-testid={`button-detail-${dmg.id}`}
                        >
                          {t('Details')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {t('New Damage Report')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('Damage No')}</Label>
              <Input
                value={damageNumber}
                readOnly
                className="font-mono bg-muted/50"
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
            <Button onClick={handleSubmit} disabled={isSaving} className="gap-2" data-testid="button-save">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('Save')}
            </Button>
            <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset">
              <RotateCcw className="w-4 h-4" />
              {t('Reset')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
