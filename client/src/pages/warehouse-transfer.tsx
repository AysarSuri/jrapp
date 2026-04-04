import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useWarehouseTransfers, useNextTransferNumber, useCreateWarehouseTransfer, useDeleteWarehouseTransfer, useWarehouseTransferItems } from "@/hooks/use-warehouse-transfers";
import { useQuery } from "@tanstack/react-query";
import type { WarehouseTransfer } from "@shared/schema";
import type { products, warehouses } from "@shared/schema";
type Product = typeof products.$inferSelect;
type Warehouse = typeof warehouses.$inferSelect;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SearchSelect } from "@/components/search-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Loader2, RotateCcw, ListOrdered, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { IconCurrencyExchange, IconWarehouse } from "@/components/erp-icons";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import { useUnits } from "@/hooks/use-units";
import { getProductName, getProductNameByLang, resolveUnitName } from "@/lib/language-utils";
import ProductCodeSearchSelect from "@/components/product-code-search-select";
import { formatDate } from "@/lib/format-utils";

interface TransferItem {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
}

const emptyItem = (): TransferItem => ({
  productId: null,
  productCode: "",
  productName: "",
  quantity: "",
  unit: "",
});

export default function WarehouseTransferPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: transfers, isLoading: transfersLoading } = useWarehouseTransfers();
  const { data: nextNumber } = useNextTransferNumber();
  const { mutate: createTransfer, isPending: isSaving } = useCreateWarehouseTransfer();
  const { mutate: deleteTransfer } = useDeleteWarehouseTransfer();

  const { data: productsList } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  const { data: warehousesList } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  const [transferNumber, setTransferNumber] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState<string>("");
  const [fromWarehouseName, setFromWarehouseName] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState<string>("");
  const [toWarehouseName, setToWarehouseName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [note, setNote] = useState("");
  const [items, setItems] = useState<TransferItem[]>([emptyItem()]);
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [detailTransferId, setDetailTransferId] = useState<number | null>(null);

  const { data: detailItems } = useWarehouseTransferItems(detailTransferId);

  useEffect(() => {
    if (nextNumber?.number) {
      setTransferNumber(nextNumber.number);
    }
  }, [nextNumber]);

  const selectFromWarehouse = useCallback((id: string) => {
    if (!id) { setFromWarehouseId(""); setFromWarehouseName(""); return; }
    setFromWarehouseId(id);
    const wh = warehousesList?.find(w => w.id === parseInt(id));
    if (wh) setFromWarehouseName(wh.name);
  }, [warehousesList]);

  const selectToWarehouse = useCallback((id: string) => {
    if (!id) { setToWarehouseId(""); setToWarehouseName(""); return; }
    setToWarehouseId(id);
    const wh = warehousesList?.find(w => w.id === parseInt(id));
    if (wh) setToWarehouseName(wh.name);
  }, [warehousesList]);

  const updateItem = useCallback((index: number, field: keyof TransferItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const selectProduct = useCallback((index: number, productId: string) => {
    if (!productId) { setItems(prev => { const u = [...prev]; u[index] = { ...u[index], productId: null, productCode: "", productName: "", unit: "" }; return u; }); return; }
    const product = productsList?.find(p => p.id === parseInt(productId));
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
    setFromWarehouseId("");
    setFromWarehouseName("");
    setToWarehouseId("");
    setToWarehouseName("");
    setNote("");
    setItems([emptyItem()]);
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!fromWarehouseId || !toWarehouseId) {
      toast({ title: t("Error"), description: t("Please select both warehouses"), variant: "destructive" });
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast({ title: t("Error"), description: t("Source and destination warehouses must be different"), variant: "destructive" });
      return;
    }

    const validItems = items.filter(item => item.productId && parseInt(item.quantity) > 0);
    if (validItems.length === 0) {
      toast({ title: t("Error"), description: t("At least one item with quantity is required"), variant: "destructive" });
      return;
    }

    createTransfer({
      transfer: {
        transferNumber,
        fromWarehouseId: parseInt(fromWarehouseId),
        fromWarehouseName,
        toWarehouseId: parseInt(toWarehouseId),
        toWarehouseName,
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
        toast({ title: t("Success"), description: t("Transfer recorded successfully") });
        resetForm();
      },
      onError: () => {
        toast({ title: t("Error"), description: t("Failed to record transfer"), variant: "destructive" });
      },
    });
  }, [fromWarehouseId, toWarehouseId, fromWarehouseName, toWarehouseName, transferNumber, note, date, time, items, createTransfer, toast, t, resetForm]);

  const handleDelete = (id: number) => {
    deleteTransfer(id, {
      onSuccess: () => {
        toast({ title: t("Transfer deleted successfully") });
        if (detailTransferId === id) setDetailTransferId(null);
      },
      onError: () => {
        toast({ title: t("Failed to delete transfer"), variant: "destructive" });
      },
    });
  };

  const { data: unitsData } = useUnits();
  const unitsList = unitsData || [];
  const whList = warehousesList || [];
  const prodList = productsList || [];

  const allTransfers = transfers || [];
  const filteredTransfers = allTransfers.filter((tr: WarehouseTransfer) => {
    if (historyFilter && historyFilter !== "all" && String(tr.fromWarehouseId) !== historyFilter && String(tr.toWarehouseId) !== historyFilter) return false;
    if (historyFromDate && tr.date < historyFromDate) return false;
    if (historyToDate && tr.date > historyToDate) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransfers = filteredTransfers.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconCurrencyExchange className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('Warehouse Transfer')}</h1>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <IconWarehouse className="w-5 h-5" />
            {t('New Transfer')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('Transfer No')}</Label>
              <Input
                value={transferNumber}
                readOnly
                className="font-mono bg-muted/50"
                data-testid="input-transfer-number"
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
            <div className="space-y-2">
              <Label>{t('From Warehouse')}</Label>
              <SearchSelect
                items={whList.map(wh => ({ id: wh.id, name: wh.name }))}
                value={fromWarehouseId}
                onValueChange={selectFromWarehouse}
                placeholder={t('Select Warehouse')}
                data-testid="select-from-warehouse"
              />
            </div>

            <div className="flex justify-center pb-2">
              <IconCurrencyExchange className="w-6 h-6 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label>{t('To Warehouse')}</Label>
              <SearchSelect
                items={whList.map(wh => ({ id: wh.id, name: wh.name }))}
                value={toWarehouseId}
                onValueChange={selectToWarehouse}
                placeholder={t('Select Warehouse')}
                data-testid="select-to-warehouse"
              />
            </div>
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t('Transfer Items')}</Label>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1" data-testid="button-add-item">
                <Plus className="w-5 h-5" />
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
                        <ProductCodeSearchSelect
                          products={productsList || []}
                          value={item.productCode}
                          onSelect={(val) => selectProduct(index, val)}
                          data-testid={`select-product-code-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <SearchSelect
                          items={prodList.map(p => ({ id: p.id, name: getProductName(p) }))}
                          value={item.productId ? String(item.productId) : ""}
                          onValueChange={(val) => selectProduct(index, val)}
                          placeholder={t('Select')}
                          data-testid={`select-product-name-${index}`}
                        />
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
                          <Trash2 className="w-5 h-5" />
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
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {t('Save')}
            </Button>
            <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset">
              <RotateCcw className="w-5 h-5" />
              {t('Reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-primary" />
              {t('Transfer History')}
              <Badge variant="secondary" className="ml-2">{filteredTransfers.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-44 h-9" data-testid="input-transfer-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-44 h-9" data-testid="input-transfer-history-to-date" />
              </div>
              <div className="w-48">
                <SearchSelect
                  items={whList.map(wh => ({ id: wh.id, name: wh.name }))}
                  value={historyFilter}
                  onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }}
                  placeholder={t('All Warehouses')}
                  data-testid="select-filter-transfer-history"
                  showAllOption
                  allOptionLabel={t('All Warehouses')}
                  inputClassName="h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transfersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Transfer No')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('From Warehouse')}</TableHead>
                    <TableHead>{t('To Warehouse')}</TableHead>
                    <TableHead>{t('Note')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransfers.map((tr: WarehouseTransfer, i: number) => (
                    <TableRow key={tr.id} data-testid={`row-transfer-${tr.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-medium">{tr.transferNumber}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(tr.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{tr.time || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tr.fromWarehouseName}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tr.toWarehouseName}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate text-muted-foreground">{tr.note || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => setDetailTransferId(detailTransferId === tr.id ? null : tr.id)}
                            data-testid={`button-detail-${tr.id}`}
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-transfer-${tr.id}`}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('This will permanently delete this transfer and all its items.')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(tr.id)}>{t('Yes')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedTransfers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {t('No records found')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {detailTransferId && detailItems && detailItems.length > 0 && (
              <div className="mt-4 border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold mb-2">{t('Transfer Items')}</h4>
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
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredTransfers.length)} {t('of')} {filteredTransfers.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    data-testid="button-transfer-prev-page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                    <Button
                      key={pg}
                      variant={pg === safePage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(pg)}
                      data-testid={`button-transfer-page-${pg}`}
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
                    data-testid="button-transfer-next-page"
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
    </div>
  );
}
