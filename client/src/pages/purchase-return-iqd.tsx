import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import { useNextPurchaseReturnNumber, useCreatePurchaseReturn, usePurchaseReturns, useApprovePurchaseReturn } from "@/hooks/use-purchase-returns";
import { useQuery } from "@tanstack/react-query";
import type { Product, Client, PurchaseReturn } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import {
  Plus, Trash2, Save, Loader2, FileText, RotateCcw, ArrowLeft,
  ListOrdered, CheckCircle, Clock, Undo2, Eye, Pencil, ChevronLeft, ChevronRight,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { playDeleteSound } from "@/lib/sounds";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import { formatDate } from "@/lib/format-utils";
import { SupplierSearchSelect } from "@/components/supplier-search-select";
import { AddressSearchSelect } from "@/components/address-search-select";
import { useUnits } from "@/hooks/use-units";
import PurchaseReturnReport from "@/components/purchase-return-report";

interface ReturnItem {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
  price: string;
  amount: string;
}

const emptyItem = (): ReturnItem => ({
  productId: null,
  productCode: "",
  productName: "",
  quantity: "",
  unit: "",
  price: "",
  amount: "0",
});

export default function PurchaseReturnIqdPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: user } = useUser();
  const { data: nextNumber } = useNextPurchaseReturnNumber();
  const { mutate: createReturn, isPending: isSaving } = useCreatePurchaseReturn();
  const { mutate: approveReturn, isPending: isApproving } = useApprovePurchaseReturn();
  const { data: returnsList } = usePurchaseReturns();

  const { data: units } = useUnits();
  const unitsList = units || [];

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  const { data: addressesList } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/addresses"],
  });
  const { data: warehousesList } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/warehouses"],
  });

  const suppliersList = clients?.filter(c => c.type === "supplier") || [];

  const [returnNumber, setReturnNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  const [supplierName, setSupplierName] = useState("");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [returnType, setReturnType] = useState("cash");
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState("");
  const [discount, setDiscount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([emptyItem()]);
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [reportReturnId, setReportReturnId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteReturn, setDeleteReturn] = useState<{ id: number; number: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);

  const editId = new URLSearchParams(window.location.search).get("edit");

  useEffect(() => {
    if (!editId && nextNumber?.number) {
      setReturnNumber(nextNumber.number);
    }
  }, [nextNumber, editId]);

  useEffect(() => {
    if (!editId && warehousesList && warehousesList.length > 0 && !warehouseId) {
      setWarehouseId(warehousesList[0].id);
      setWarehouseName(warehousesList[0].name);
    }
  }, [warehousesList, editId, warehouseId]);

  useEffect(() => {
    if (!editId) return;
    const fetchEditData = async () => {
      try {
        const returnRes = await fetch(`/api/purchase-returns/${editId}`, { credentials: "include" });
        const returnData = await returnRes.json();
        const itemsRes = await fetch(`/api/purchase-returns/${editId}/items`, { credentials: "include" });
        const itemsData = await itemsRes.json();

        setReturnNumber(returnData.returnNumber || "");
        setDate(returnData.date || new Date().toISOString().split("T")[0]);
        setTime(returnData.time || "");
        setSupplierId(returnData.supplierId || null);
        setSupplierName(returnData.supplierName || "");
        setAddress(returnData.address || "");
        setNote(returnData.note || "");
        setDiscount(returnData.discount || "");
        setWarehouseId(returnData.warehouseId || null);
        setWarehouseName(returnData.warehouseName || "");

        const mappedItems: ReturnItem[] = (itemsData || []).map((item: any) => ({
          productId: item.productId,
          productCode: item.productCode || "",
          productName: item.productName || "",
          quantity: String(item.quantity || ""),
          unit: item.unit || "",
          price: String(item.price || ""),
          amount: String(item.amount || "0"),
        }));
        if (mappedItems.length > 0) {
          setItems([...mappedItems, emptyItem()]);
        }
        setIsEditMode(true);
      } catch (err) {
        console.error("Failed to load edit data", err);
      }
    };
    fetchEditData();
  }, [editId]);

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalItems = items.filter(i => i.productCode && parseFloat(i.quantity || "0") > 0).length;
  const totalQuantity = items.reduce((sum, i) => sum + parseFloat(i.quantity || "0"), 0);
  const amountPaidVal = parseFloat(amountPaid || "0");
  const remaining = subtotal - amountPaidVal;

  const updateItem = useCallback((index: number, field: keyof ReturnItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "price") {
        const qty = parseFloat(field === "quantity" ? value : updated[index].quantity || "0");
        const prc = parseFloat(field === "price" ? value : updated[index].price || "0");
        updated[index].amount = (qty * prc).toFixed(2);
      }
      return updated;
    });
  }, []);

  const selectProduct = useCallback((index: number, productId: string) => {
    const product = products?.find(p => p.id === parseInt(productId));
    if (!product) return;
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: product.id,
        productCode: product.barcode,
        productName: getProductName(product),
        unit: product.bigUnit,
        price: product.bigUnitPriceIqd,
      };
      const qty = parseFloat(updated[index].quantity || "0");
      updated[index].amount = (qty * parseFloat(product.bigUnitPriceIqd)).toFixed(2);
      const lastRow = updated[updated.length - 1];
      if (lastRow.productId !== null) {
        updated.push(emptyItem());
      }
      return updated;
    });
    setTimeout(() => {
      const qtyInput = document.querySelector(`[data-testid="input-purchase-return-iqd-quantity-${index}"]`) as HTMLInputElement;
      if (qtyInput) { qtyInput.focus(); qtyInput.select(); }
    }, 100);
  }, [products]);

  const addRow = () => {
    setItems(prev => [...prev, emptyItem()]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSupplierName("");
    setSupplierId(null);
    setAddress("");
    setNote("");
    setReturnType("cash");
    setWarehouseId(null);
    setWarehouseName("");
    setAmountPaid("");
    setItems([emptyItem()]);
    setDate(new Date().toISOString().split("T")[0]);
    setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    setFormKey(k => k + 1);
  };

  const handleDeleteReturn = async () => {
    if (!deleteReturn) return;
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/purchase-returns/${deleteReturn.id}`);
      playDeleteSound();
      toast({ title: t("Return deleted successfully") });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-returns"] });
      setDeleteReturn(null);
    } catch (err: any) {
      toast({ title: t("Failed to delete return"), description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = () => {
    if (!supplierName.trim()) {
      toast({ title: t("Supplier name is required"), variant: "destructive" });
      return;
    }
    const validItems = items.filter(i => i.productCode && parseFloat(i.quantity || "0") > 0);
    if (validItems.length === 0) {
      toast({ title: t("Add at least one product"), variant: "destructive" });
      return;
    }

    const returnData = {
      returnNumber,
      date,
      time,
      supplierId,
      supplierName,
      address: address || null,
      note: note || null,
      returnType,
      warehouseId,
      warehouseName: warehouseName || null,
      subtotal: subtotal.toFixed(2),
      discount: "0",
      amountPaid: amountPaid || "0",
      remaining: remaining.toFixed(2),
      totalItems,
      totalQuantity: totalQuantity.toFixed(2),
      currency: "IQD",
      status: "approved",
    };

    const itemsData = validItems.map(item => ({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      amount: item.amount,
    }));

    if (isEditMode && editId) {
      apiRequest("PATCH", `/api/purchase-returns/${editId}`, { returnData, items: itemsData })
        .then(() => {
          toast({ title: t("Purchase return updated successfully") });
          queryClient.invalidateQueries({ queryKey: ["/api/purchase-returns"] });
          resetForm();
          setIsEditMode(false);
          navigate("/purchase-return-iqd");
        })
        .catch((err: any) => {
          toast({ title: t("Failed to update return"), description: err.message, variant: "destructive" });
        });
    } else {
      createReturn({ returnData, items: itemsData }, {
        onSuccess: () => {
          toast({ title: t("Purchase return saved successfully") });
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to save return"), description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const selectSupplier = (clientId: string) => {
    const client = suppliersList.find(c => c.id === parseInt(clientId));
    if (client) {
      setSupplierId(client.id);
      setSupplierName(client.name);
      setAddress(client.address || "");
    }
  };

  const handleApprove = (returnId: number) => {
    approveReturn(returnId, {
      onSuccess: () => {
        toast({ title: t("Return approved successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to approve return"), description: err.message, variant: "destructive" });
      },
    });
  };

  const userRole = user?.role || 'user';

  const iqdReturns = (returnsList as PurchaseReturn[] || []).filter(i => i.currency === 'IQD');
  const filteredReturns = iqdReturns.filter(ret => {
    if (historyFilter && historyFilter !== "all" && String(ret.supplierId) !== historyFilter) return false;
    const retDate = typeof ret.date === 'string' ? ret.date.split('T')[0] : new Date(ret.date).toISOString().split('T')[0];
    if (historyFromDate && retDate < historyFromDate) return false;
    if (historyToDate && retDate > historyToDate) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredReturns.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReturns = filteredReturns.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <Link href="/supplier-management">
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
          <ArrowLeft className="h-4 w-4" />
          {t("Supplier Management")}
        </Button>
      </Link>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-purchase-return-iqd-title">
            <Undo2 className="h-8 w-8 text-red-600" />
            {isEditMode ? t('Edit Purchase Return - IQD') : t('Purchase Return - IQD')}
          </h1>
          <p className="text-muted-foreground mt-1">{isEditMode ? t('Edit purchase return in Iraqi Dinar') : t('Create purchase return in Iraqi Dinar')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} data-testid="button-reset-purchase-return-iqd-form">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('Reset')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-[#ffffff]" data-testid="button-save-purchase-return-iqd">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t('Save Return')}
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('Return Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Return #')}</Label>
              <Input value={returnNumber} readOnly className="font-mono bg-muted/30" data-testid="input-purchase-return-iqd-number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Date')}</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-purchase-return-iqd-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Time')}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-purchase-return-iqd-time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Return Type')}</Label>
              <Select value={returnType} onValueChange={setReturnType}>
                <SelectTrigger data-testid="select-purchase-return-iqd-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('Cash')}</SelectItem>
                  <SelectItem value="credit">{t('Credit')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Created By')}</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted/30 text-sm font-medium" data-testid="text-return-iqd-created-by">
                {user?.username || "-"}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Supplier Name')}</Label>
              <SupplierSearchSelect
                suppliers={suppliersList}
                value={supplierId ? String(supplierId) : ""}
                onValueChange={selectSupplier}
                placeholder={t('Select Supplier')}
                data-testid="select-purchase-return-iqd-supplier"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Warehouse')}</Label>
              <Select value={warehouseId ? String(warehouseId) : ""} onValueChange={(v) => {
                const wh = warehousesList?.find(w => w.id === parseInt(v));
                if (wh) { setWarehouseId(wh.id); setWarehouseName(wh.name); }
              }}>
                <SelectTrigger data-testid="select-purchase-return-iqd-warehouse">
                  <SelectValue placeholder={t('Select Warehouse')} />
                </SelectTrigger>
                <SelectContent>
                  {warehousesList?.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Address')}</Label>
              <AddressSearchSelect
                addresses={addressesList || []}
                value={address}
                onValueChange={setAddress}
                placeholder={t('Select Address')}
                data-testid="select-purchase-return-iqd-address"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Note')}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Notes...')} data-testid="input-purchase-return-iqd-note" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('Products')}</CardTitle>
          <Button variant="outline" size="sm" onClick={addRow} data-testid="button-purchase-return-iqd-add-row">
            <Plus className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
                  <TableHead className="text-primary-foreground text-center w-12">#</TableHead>
                  <TableHead className="text-primary-foreground min-w-[200px]">{t('Product')}</TableHead>
                  <TableHead className="text-primary-foreground w-[120px]">{t('Product Code')}</TableHead>
                  <TableHead className="text-primary-foreground w-[90px]">{t('Quantity')}</TableHead>
                  <TableHead className="text-primary-foreground w-[100px]">{t('Unit')}</TableHead>
                  <TableHead className="text-primary-foreground w-[110px]">{t('Price')}</TableHead>
                  <TableHead className="text-primary-foreground w-[120px]">{t('Amount')}</TableHead>
                  <TableHead className="text-primary-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/30" data-testid={`row-purchase-return-iqd-item-${index}`}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={item.productId ? String(item.productId) : ""}
                        onValueChange={(val) => selectProduct(index, val)}
                      >
                        <SelectTrigger className="h-9 text-sm" data-testid={`select-purchase-return-iqd-product-${index}`}>
                          <SelectValue placeholder={t('Select product...')} />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {getProductName(p)} ({p.barcode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        value={item.productCode}
                        onChange={(e) => updateItem(index, "productCode", e.target.value)}
                        className="h-9 text-sm font-mono"
                        data-testid={`input-purchase-return-iqd-product-code-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            const current = parseFloat(item.quantity || "0");
                            if (current > 0) updateItem(index, "quantity", String(current - 1));
                          }}
                          data-testid={`button-purchase-return-iqd-qty-minus-${index}`}
                        >-</Button>
                        <Input
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          className="h-9 text-sm text-center w-16"
                          data-testid={`input-purchase-return-iqd-quantity-${index}`}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            const current = parseFloat(item.quantity || "0");
                            updateItem(index, "quantity", String(current + 1));
                          }}
                          data-testid={`button-purchase-return-iqd-qty-plus-${index}`}
                        >+</Button>
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={item.unit}
                        onValueChange={(val) => {
                          const product = products?.find(p => p.id === item.productId);
                          if (product) {
                            const newPrice = val === product.bigUnit ? product.bigUnitPriceIqd : product.smallUnitPriceIqd;
                            setItems(prev => {
                              const updated = [...prev];
                              updated[index] = { ...updated[index], unit: val, price: newPrice };
                              const qty = parseFloat(updated[index].quantity || "0");
                              updated[index].amount = (qty * parseFloat(newPrice)).toFixed(2);
                              return updated;
                            });
                          } else {
                            updateItem(index, "unit", val);
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm" data-testid={`select-purchase-return-iqd-unit-${index}`}>
                          <SelectValue placeholder={t('Unit')} />
                        </SelectTrigger>
                        <SelectContent>
                          {item.productId && products?.find(p => p.id === item.productId) ? (
                            <>
                              <SelectItem value={products.find(p => p.id === item.productId)!.bigUnit}>
                                {resolveUnitName(products.find(p => p.id === item.productId)!.bigUnit, unitsList)}
                              </SelectItem>
                              <SelectItem value={products.find(p => p.id === item.productId)!.smallUnit}>
                                {resolveUnitName(products.find(p => p.id === item.productId)!.smallUnit, unitsList)}
                              </SelectItem>
                            </>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        value={item.price}
                        onChange={(e) => updateItem(index, "price", e.target.value)}
                        className="h-9 text-sm"
                        data-testid={`input-purchase-return-iqd-price-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        value={item.amount}
                        readOnly
                        className="h-9 text-sm font-mono bg-muted/30"
                        data-testid={`input-purchase-return-iqd-amount-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeRow(index)}
                        data-testid={`button-purchase-return-iqd-remove-row-${index}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Total Items')}</Label>
              <div className="text-lg font-bold" data-testid="text-purchase-return-iqd-total-items">{totalItems}</div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Total Quantity')}</Label>
              <div className="text-lg font-bold" data-testid="text-purchase-return-iqd-total-quantity">{totalQuantity.toFixed(2)}</div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Subtotal')}</Label>
              <div className="text-lg font-bold" data-testid="text-purchase-return-iqd-subtotal">
                {subtotal.toLocaleString()} IQD
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Amount Received from Supplier')}</Label>
              <Input
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
                className="h-9"
                data-testid="input-purchase-return-iqd-amount-paid"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Remaining')}</Label>
              <div className={`text-xl font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="text-purchase-return-iqd-remaining">
                {remaining.toLocaleString()} IQD
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-red-600" />
              {t('Return History')}
              <Badge variant="secondary" className="ml-2">{filteredReturns.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-return-iqd-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} className="w-36 h-9" data-testid="input-return-iqd-history-to-date" />
              </div>
              <div className="w-48">
                <Select value={historyFilter} onValueChange={(v) => { setHistoryFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger data-testid="select-filter-return-iqd-history" className="h-9">
                    <SelectValue placeholder={t('All Suppliers')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Suppliers')}</SelectItem>
                    {suppliersList.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('Return #')}</TableHead>
                  <TableHead>{t('Date')}</TableHead>
                  <TableHead>{t('Supplier')}</TableHead>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead>{t('Total')}</TableHead>
                  <TableHead>{t('Remaining')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead className="text-center">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReturns.map((ret, i) => (
                  <TableRow key={ret.id} data-testid={`row-purchase-return-iqd-history-${ret.id}`}>
                    <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                    <TableCell className="font-mono">{ret.returnNumber}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-sm">{formatDate(ret.date)}</TableCell>
                    <TableCell className="font-medium">{ret.supplierName}</TableCell>
                    <TableCell>
                      <Badge variant={ret.returnType === 'cash' ? 'default' : 'secondary'}>
                        {ret.returnType === 'cash' ? t('Cash') : t('Credit')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{Number(ret.subtotal).toLocaleString()} IQD</TableCell>
                    <TableCell className="font-mono text-sm text-red-600">{Number(ret.remaining).toLocaleString()} IQD</TableCell>
                    <TableCell>
                      {ret.status === 'approved' ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('Approved')}
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                          <Clock className="w-3 h-3 mr-1" />
                          {t('Pending')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => { setReportReturnId(ret.id); setReportOpen(true); }} data-testid={`btn-view-return-iqd-${ret.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => { window.location.href = `/purchase-return-iqd?edit=${ret.id}`; }} data-testid={`btn-edit-return-iqd-${ret.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteReturn({ id: ret.id, number: ret.returnNumber })} data-testid={`btn-delete-return-iqd-${ret.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {(userRole === 'admin' || userRole === 'user') && ret.status === 'pending' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(ret.id)}
                            disabled={isApproving}
                            data-testid={`button-approve-purchase-return-iqd-${ret.id}`}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('Approve')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedReturns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {t('No returns yet')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredReturns.length)} {t('of')} {filteredReturns.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(safePage - 1)}
                  data-testid="button-return-iqd-prev-page"
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
                    data-testid={`button-return-iqd-page-${pg}`}
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
                  data-testid="button-return-iqd-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          </>
        </CardContent>
      </Card>

      <PurchaseReturnReport
        returnId={reportReturnId}
        open={reportOpen}
        onOpenChange={(open) => { setReportOpen(open); if (!open) setReportReturnId(null); }}
        currency="IQD"
      />

      <AlertDialog open={!!deleteReturn} onOpenChange={(open) => { if (!open) setDeleteReturn(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will permanently delete return")} #{deleteReturn?.number}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("No")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReturn} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-return-iqd">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {t("Yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
