import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAgentProductLoads, useNextLoadNumber, useCreateAgentProductLoad, useDeleteAgentProductLoad, useAgentProductLoadItems } from "@/hooks/use-agent-product-loads";
import { useQuery } from "@tanstack/react-query";
import type { AgentProductLoad } from "@shared/schema";
import type { products } from "@shared/schema";
type Product = typeof products.$inferSelect;
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
import { IconSupplierList } from "@/components/erp-icons";
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

interface LoadItem {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
}

const emptyItem = (): LoadItem => ({
  productId: null,
  productCode: "",
  productName: "",
  quantity: "",
  unit: "",
});

export default function AgentProductLoadPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: loads, isLoading: loadsLoading } = useAgentProductLoads();
  const { data: nextNumber } = useNextLoadNumber();
  const { mutate: createLoad, isPending: isSaving } = useCreateAgentProductLoad();
  const { mutate: deleteLoad } = useDeleteAgentProductLoad();

  const { data: productsList } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  const { data: agentsList } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/agents"],
  });

  const [loadNumber, setLoadNumber] = useState("");
  const [agentId, setAgentId] = useState<string>("");
  const [agentName, setAgentName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [note, setNote] = useState("");
  const [items, setItems] = useState<LoadItem[]>([emptyItem()]);
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [detailLoadId, setDetailLoadId] = useState<number | null>(null);

  const { data: detailItems } = useAgentProductLoadItems(detailLoadId);

  useEffect(() => {
    if (nextNumber?.number) {
      setLoadNumber(nextNumber.number);
    }
  }, [nextNumber]);

  const selectAgent = useCallback((id: string) => {
    setAgentId(id);
    const agent = agentsList?.find(r => r.id === id);
    if (agent) setAgentName(agent.name);
  }, [agentsList]);

  const updateItem = useCallback((index: number, field: keyof LoadItem, value: string) => {
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
    setAgentId("");
    setAgentName("");
    setNote("");
    setItems([emptyItem()]);
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!agentId) {
      toast({ title: t("Error"), description: t("Please select an agent"), variant: "destructive" });
      return;
    }

    const validItems = items.filter(item => item.productId && parseInt(item.quantity) > 0);
    if (validItems.length === 0) {
      toast({ title: t("Error"), description: t("At least one item with quantity is required"), variant: "destructive" });
      return;
    }

    const totalQty = validItems.reduce((sum, item) => sum + parseInt(item.quantity), 0);

    createLoad({
      load: {
        loadNumber,
        agentId: 0,
        agentName,
        note: note || null,
        date,
        time,
        totalItems: validItems.length,
        totalQuantity: String(totalQty),
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
        toast({ title: t("Success"), description: t("Product load saved successfully") });
        resetForm();
      },
      onError: () => {
        toast({ title: t("Error"), description: t("Failed to save product load"), variant: "destructive" });
      },
    });
  }, [agentId, agentName, loadNumber, note, date, time, items, createLoad, toast, t, resetForm]);

  const handleDelete = (id: number) => {
    deleteLoad(id, {
      onSuccess: () => {
        toast({ title: t("Load deleted successfully") });
        if (detailLoadId === id) setDetailLoadId(null);
      },
      onError: () => {
        toast({ title: t("Failed to delete load"), variant: "destructive" });
      },
    });
  };

  const { data: unitsData } = useUnits();
  const unitsList = unitsData || [];
  const agents = agentsList || [];
  const prodList = productsList || [];

  const allLoads = loads || [];
  const filteredLoads = allLoads.filter((ld: AgentProductLoad) => {
    if (historyFilter && historyFilter !== "all" && ld.agentName !== historyFilter) return false;
    if (historyFromDate && ld.date < historyFromDate) return false;
    if (historyToDate && ld.date > historyToDate) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredLoads.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLoads = filteredLoads.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <IconSupplierList className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            {t('Agent Product Load')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Load products to deliver to agents')}</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <IconSupplierList className="w-5 h-5 text-indigo-600" />
            {t('New Product Load')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('Load No')}</Label>
              <Input
                value={loadNumber}
                readOnly
                className="font-mono bg-muted/50"
                data-testid="input-load-number"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Agent')}</Label>
              <SearchSelect
                items={agents}
                value={agentId}
                onValueChange={selectAgent}
                placeholder={t('Select agent...')}
                data-testid="select-agent"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Date')}</Label>
              <DateInput
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="input-load-date"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Time')}</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                data-testid="input-load-time"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('Note')}</Label>
            <Textarea
              placeholder={t('Note') + "..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="input-load-note"
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t('Load Items')}</Label>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1" data-testid="button-add-load-item">
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
                        <ProductCodeSearchSelect
                          products={productsList || []}
                          value={item.productCode}
                          onSelect={(val) => selectProduct(index, val)}
                          data-testid={`select-load-product-code-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <SearchSelect
                          items={prodList.map(p => ({ id: p.id, name: getProductName(p) }))}
                          value={item.productId ? String(item.productId) : ""}
                          onValueChange={(val) => selectProduct(index, val)}
                          placeholder={t('Select')}
                          data-testid={`select-load-product-name-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          placeholder="0"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          data-testid={`input-load-quantity-${index}`}
                          className="font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unit}
                          readOnly
                          className="bg-muted/50"
                          data-testid={`input-load-unit-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-load-item-${index}`}
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
            <Button onClick={handleSubmit} disabled={isSaving} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="button-save-load">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('Save')}
            </Button>
            <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-load">
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
              <ListOrdered className="h-5 w-5 text-indigo-600" />
              {t('Load History')}
              <Badge variant="secondary" className="ml-2">{filteredLoads.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-load-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-load-history-to-date" />
              </div>
              <div className="w-48">
                <SearchSelect
                  items={agents.map(a => ({ id: a.name, name: a.name }))}
                  value={historyFilter}
                  onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }}
                  placeholder={t('All Agents')}
                  data-testid="select-filter-load-history"
                  showAllOption
                  allOptionLabel={t('All Agents')}
                  inputClassName="h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Load No')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('Agent')}</TableHead>
                    <TableHead>{t('Items')}</TableHead>
                    <TableHead>{t('Total Qty')}</TableHead>
                    <TableHead>{t('Note')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLoads.map((ld: AgentProductLoad, i: number) => (
                    <TableRow key={ld.id} data-testid={`row-load-${ld.id}`}>
                      <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-medium">{ld.loadNumber}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(ld.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{ld.time || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-indigo-600 border-indigo-300">{ld.agentName}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{ld.totalItems}</TableCell>
                      <TableCell className="font-mono text-sm">{ld.totalQuantity}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate text-muted-foreground">{ld.note || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => setDetailLoadId(detailLoadId === ld.id ? null : ld.id)}
                            data-testid={`button-detail-load-${ld.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-load-${ld.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('This will permanently delete this load and all its items.')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(ld.id)}>{t('Yes')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedLoads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {t('No records found')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {detailLoadId && detailItems && detailItems.length > 0 && (
              <div className="mt-4 border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold mb-2">{t('Load Items')}</h4>
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
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredLoads.length)} {t('of')} {filteredLoads.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    data-testid="button-load-prev-page"
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
                      data-testid={`button-load-page-${pg}`}
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
                    data-testid="button-load-next-page"
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
