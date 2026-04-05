import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useNextPurchaseInvoiceNumber, useCreatePurchaseInvoice, usePurchaseInvoices } from "@/hooks/use-purchase-invoices";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Client, PurchaseInvoice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Trash2, Save, Loader2, FileText, RotateCcw, ListOrdered, FileBarChart, ArrowLeft, Eye, Pencil, ScanBarcode } from "lucide-react";
import { IconDinar } from "@/components/erp-icons";
import { playDeleteSound } from "@/lib/sounds";
import PurchaseInvoiceReport from "@/components/purchase-invoice-report";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import ProductSearchSelect from "@/components/product-search-select";
import ProductCodeSearchSelect from "@/components/product-code-search-select";
import { formatDate } from "@/lib/format-utils";
import { broadcastDataUpdate } from "@/lib/broadcast";
import { SupplierSearchSelect } from "@/components/supplier-search-select";
import { AddressSearchSelect } from "@/components/address-search-select";
import { SearchInput } from "@/components/ui/search-input";
import { SearchSelect } from "@/components/search-select";
import { useUnits } from "@/hooks/use-units";

interface InvoiceItem {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  gift: string;
  unit: string;
  price: string;
  amount: string;
  weight: string;
  productionDate: string;
  expiryDate: string;
}

const emptyItem = (): InvoiceItem => ({
  productId: null,
  productCode: "",
  productName: "",
  quantity: "",
  gift: "",
  unit: "",
  price: "",
  amount: "0",
  weight: "0",
  productionDate: "",
  expiryDate: "",
});

export default function PurchaseInvoiceIqdPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: user } = useUser();
  const { data: nextNumber } = useNextPurchaseInvoiceNumber();
  const { mutate: createInvoice, isPending: isSaving } = useCreatePurchaseInvoice();
  const { data: invoicesList } = usePurchaseInvoices();

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
  const { data: customsClearancesList } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/customs-clearances"],
  });
  const { data: warehousesList } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/warehouses"],
  });

  const suppliersList = clients?.filter(c => c.type === "supplier" && !c.hidden) || [];
  const visibleProducts = products?.filter(p => !p.hidden) || [];

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [showStamp, setShowStamp] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  const [supplierName, setSupplierName] = useState("");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [customsClearance, setCustomsClearance] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [manifest, setManifest] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [invoiceType, setInvoiceType] = useState("cash");
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState("");
  const [carExpense, setCarExpense] = useState("");
  const [customsExpense, setCustomsExpense] = useState("");
  const [otherExpenses, setOtherExpenses] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [showDates, setShowDates] = useState(false);
  const [reportInvoiceId, setReportInvoiceId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [historySupplierFilter, setHistorySupplierFilter] = useState<string>("all");
  const [historyStartDate, setHistoryStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [historyEndDate, setHistoryEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchNumber, setSearchNumber] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteInvoice, setDeleteInvoice] = useState<{ id: number; number: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const urlEditId = new URLSearchParams(window.location.search).get("edit");
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const editId = inlineEditId || urlEditId;

  useEffect(() => {
    if (!editId && nextNumber?.number) {
      setInvoiceNumber(nextNumber.number);
    }
  }, [nextNumber, editId]);

  const whInitRef = useRef(false);
  useEffect(() => {
    if (warehousesList?.length && !whInitRef.current && !editId) {
      whInitRef.current = true;
      setWarehouseId(warehousesList[0].id);
      setWarehouseName(warehousesList[0].name);
    }
  }, [warehousesList, editId]);

  useEffect(() => {
    if (!editId) return;
    setIsEditMode(true);
    const fetchEditData = async () => {
      try {
        const [invRes, itemsRes] = await Promise.all([
          fetch(`/api/purchase-invoices/${editId}`, { credentials: "include" }),
          fetch(`/api/purchase-invoices/${editId}/items`, { credentials: "include" }),
        ]);
        if (!invRes.ok || !itemsRes.ok) return;
        const inv = await invRes.json();
        const fetchedItems = await itemsRes.json();
        setInvoiceNumber(inv.invoiceNumber || "");
        setDate(typeof inv.date === "string" ? inv.date.split("T")[0] : new Date(inv.date).toISOString().split("T")[0]);
        setTime(inv.time || "");
        setSupplierId(inv.supplierId ?? null);
        setSupplierName(inv.supplierName || "");
        setAddress(inv.address || "");
        setNote(inv.note || "");
        setCustomsClearance(inv.customsClearance || "");
        setCarNumber(inv.carNumber || "");
        setManifest(inv.manifest || "");
        setDriverName(inv.driverName || "");
        setDriverMobile(inv.driverMobile || "");
        setInvoiceType(inv.invoiceType || "cash");
        setWarehouseId(inv.warehouseId || null);
        setWarehouseName(inv.warehouseName || "");
        setCarExpense(inv.carExpense || "");
        setCustomsExpense(inv.customsExpense || "");
        setOtherExpenses(inv.otherExpenses || "");
        setDiscount(inv.discount || "");
        setAmountPaid(inv.amountPaid || "");
        const mappedItems: InvoiceItem[] = (fetchedItems || []).map((it: any) => ({
          productId: it.productId ?? null,
          productCode: it.productCode || "",
          productName: it.productName || "",
          quantity: it.quantity || "",
          gift: it.gift || "",
          unit: it.unit || "",
          price: it.price || "",
          amount: it.amount || "0",
          weight: it.weight || "0",
          productionDate: it.productionDate || "",
          expiryDate: it.expiryDate || "",
        }));
        if (mappedItems.length > 0) {
          mappedItems.push(emptyItem());
        }
        setItems(mappedItems.length > 0 ? mappedItems : [emptyItem()]);
      } catch (err) {
        console.error("Failed to load invoice for editing", err);
      }
    };
    fetchEditData();
  }, [editId]);

  const totalExpenses = (parseFloat(carExpense || "0") + parseFloat(customsExpense || "0") + parseFloat(otherExpenses || "0"));
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalItems = items.filter(i => i.productCode && parseFloat(i.quantity || "0") > 0).length;
  const totalQuantity = items.reduce((sum, i) => sum + parseFloat(i.quantity || "0") + parseFloat(i.gift || "0"), 0);
  const totalWeight = items.reduce((sum, i) => sum + (parseFloat(i.weight || "0") * parseFloat(i.quantity || "0")), 0);
  const discountVal = parseFloat(discount || "0");
  const amountPaidVal = parseFloat(amountPaid || "0");
  const remaining = subtotal - discountVal - amountPaidVal;

  useEffect(() => {
    if (remaining === 0) {
      setInvoiceType("cash");
    } else {
      setInvoiceType("credit");
    }
  }, [remaining]);

  const getItemUnitWeight = (item: InvoiceItem) => {
    const product = products?.find(p => p.id === item.productId);
    if (!product) return parseFloat(item.weight || "0");
    const bigUnitWeight = parseFloat(product.weight || "0");
    if (item.unit === product.smallUnit && product.bigUnit !== product.smallUnit) {
      return bigUnitWeight / (product.conversionFactor || 1);
    }
    return bigUnitWeight;
  };

  const totalWeightCalc = items.reduce((sum, i) => {
    const totalQty = parseFloat(i.quantity || "0") + parseFloat(i.gift || "0");
    return sum + (getItemUnitWeight(i) * totalQty);
  }, 0);

  const getExpenseCost = (item: InvoiceItem) => {
    if (totalWeightCalc === 0 || totalExpenses === 0) return 0;
    const unitWeight = getItemUnitWeight(item);
    return (unitWeight / totalWeightCalc) * totalExpenses;
  };

  const updateItem = useCallback((index: number, field: keyof InvoiceItem, value: string) => {
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
    if (!productId) { setItems(prev => { const u = [...prev]; u[index] = { ...u[index], productId: null, productCode: "", productName: "", unit: "", price: "0", weight: "0", amount: "0" }; return u; }); return; }
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
        weight: product.weight || "0",
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
      const el = document.querySelector(`[data-testid="input-purchase-iqd-quantity-${index}"]`) as HTMLInputElement;
      if (el) { el.focus(); el.select(); }
    }, 50);
  }, [products]);

  const [barcodeInput, setBarcodeInput] = useState("");

  const handleBarcodeScan = useCallback((barcode: string) => {
    if (!barcode.trim()) return;
    const product = products?.find(p => p.barcode === barcode.trim() && !p.hidden);
    if (!product) {
      toast({ title: t("Product not found for barcode") + ": " + barcode, variant: "destructive" });
      setBarcodeInput("");
      return;
    }
    setItems(prev => {
      const updated = [...prev];
      let emptyIndex = updated.findIndex(row => row.productId === null);
      if (emptyIndex === -1) {
        updated.push(emptyItem());
        emptyIndex = updated.length - 1;
      }
      const qty = 1;
      updated[emptyIndex] = {
        ...updated[emptyIndex],
        productId: product.id,
        productCode: product.barcode,
        productName: getProductName(product),
        quantity: String(qty),
        unit: product.bigUnit,
        price: product.bigUnitPriceIqd,
        weight: product.weight || "0",
        amount: (qty * parseFloat(product.bigUnitPriceIqd)).toFixed(2),
      };
      const lastRow = updated[updated.length - 1];
      if (lastRow.productId !== null) {
        updated.push(emptyItem());
      }
      return updated;
    });
    setBarcodeInput("");
  }, [products, t, toast]);

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
    setCustomsClearance("");
    setCarNumber("");
    setManifest("");
    setDriverName("");
    setDriverMobile("");
    setInvoiceType("cash");
    setWarehouseId(null);
    setWarehouseName("");
    setCarExpense("");
    setCustomsExpense("");
    setOtherExpenses("");
    setDiscount("");
    setDiscountPercent("");
    setAmountPaid("");
    setItems([emptyItem()]);
    setDate(new Date().toISOString().split("T")[0]);
    setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    setFormKey(k => k + 1);
    setIsEditMode(false);
    setInlineEditId(null);
    if (urlEditId) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const startEdit = (invoiceId: number) => {
    setInlineEditId(String(invoiceId));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteInvoice = async () => {
    if (!deleteInvoice) return;
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/purchase-invoices/${deleteInvoice.id}`);
      playDeleteSound();
      toast({ title: t("Invoice deleted successfully") });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      broadcastDataUpdate("supplier-statement");
      setDeleteInvoice(null);
    } catch (err: any) {
      toast({ title: t("Failed to delete invoice"), description: err.message, variant: "destructive" });
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

    const currentTime = editId ? time : new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (!editId) setTime(currentTime);

    const invoiceData = {
      invoiceNumber,
      date,
      time: currentTime,
      supplierId: supplierId,
      supplierName,
      address: address || null,
      note: note || null,
      customsClearance: customsClearance || null,
      carNumber: carNumber || null,
      manifest: manifest || null,
      driverName: driverName || null,
      driverMobile: driverMobile || null,
      invoiceType,
      warehouseId,
      warehouseName: warehouseName || null,
      carExpense: carExpense || "0",
      customsExpense: customsExpense || "0",
      otherExpenses: otherExpenses || "0",
      totalExpenses: totalExpenses.toFixed(2),
      subtotal: subtotal.toFixed(2),
      discount: discount || "0",
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
      gift: item.gift || "0",
      unit: item.unit,
      price: item.price,
      amount: item.amount,
      productionDate: item.productionDate || null,
      expiryDate: item.expiryDate || null,
    }));

    if (editId) {
      apiRequest("PATCH", `/api/purchase-invoices/${editId}`, { invoice: invoiceData, items: itemsData })
        .then(() => {
          toast({ title: t("Purchase invoice updated successfully") });
          queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
          queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices", editId] });
          broadcastDataUpdate("supplier-statement");
          resetForm();
        })
        .catch((err: any) => {
          toast({ title: t("Failed to update invoice"), description: err.message, variant: "destructive" });
        });
    } else {
      createInvoice({ invoice: invoiceData, items: itemsData }, {
        onSuccess: () => {
          toast({ title: t("Purchase invoice saved successfully") });
          broadcastDataUpdate("supplier-statement");
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to save invoice"), description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const selectSupplier = (clientId: string) => {
    if (!clientId) {
      setSupplierId(null);
      setSupplierName("");
      setAddress("");
      return;
    }
    const client = suppliersList.find(c => c.id === parseInt(clientId));
    if (client) {
      setSupplierId(client.id);
      setSupplierName(client.name);
      setAddress(client.address || "");
    }
  };

  const formatIQD = (val: number) => `${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} IQD`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/supplier-management">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
              <ArrowLeft className="h-5 w-5" />
              {t("Supplier Management")}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconDinar className="h-7 w-7 text-orange-600" />
            {isEditMode ? t('Edit Purchase Invoice - IQD') : t('Purchase Invoice - IQD')}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} data-testid="button-reset-purchase-iqd-form">
            <RotateCcw className="w-5 h-5 mr-2" />
            {t('Reset')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-[#ffffff]" data-testid="button-save-purchase-iqd-invoice">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {t('Save Invoice')}
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('Invoice Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Invoice #')}</Label>
              <Input value={invoiceNumber} readOnly className="font-mono font-bold text-base h-11 bg-muted/30 cursor-not-allowed" data-testid="input-purchase-iqd-invoice-number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Date')}</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} className="font-bold text-base h-11" data-testid="input-purchase-iqd-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Time')}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="font-bold text-base h-11" data-testid="input-purchase-iqd-time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Invoice Type')}</Label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger className="font-bold text-base h-11" data-testid="select-purchase-iqd-invoice-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('Cash')}</SelectItem>
                  <SelectItem value="credit">{t('Credit')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Created By')}</Label>
              <div className="flex items-center h-11 px-3 rounded-md border bg-muted/30 text-base font-bold" data-testid="text-created-by-iqd">
                {user?.username || "-"}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Supplier Name')}</Label>
              <SupplierSearchSelect
                suppliers={suppliersList}
                value={supplierId ? String(supplierId) : ""}
                onValueChange={selectSupplier}
                placeholder={t('Select Supplier')}
                data-testid="select-supplier-iqd"
                inputClassName="font-bold text-base h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Address')}</Label>
              <AddressSearchSelect
                addresses={addressesList || []}
                value={address}
                onValueChange={setAddress}
                placeholder={t('Select Address')}
                data-testid="select-purchase-iqd-address"
                inputClassName="font-bold text-base h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Warehouse')}</Label>
              <SearchSelect
                items={warehousesList || []}
                value={warehouseId ? String(warehouseId) : ""}
                onValueChange={(v) => {
                  if (!v) { setWarehouseId(null); setWarehouseName(""); return; }
                  const wh = warehousesList?.find(w => w.id === parseInt(v));
                  if (wh) { setWarehouseId(wh.id); setWarehouseName(wh.name); }
                }}
                placeholder={t('Select Warehouse')}
                data-testid="select-purchase-iqd-warehouse"
                inputClassName="font-bold text-base h-11"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-bold">{t('Note')}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Notes...')} className="font-bold text-base h-11" data-testid="input-purchase-iqd-note" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Customs Clearance')}</Label>
              <SearchSelect
                items={(customsClearancesList || []).map(cc => ({ id: cc.name, name: cc.name }))}
                value={customsClearance}
                onValueChange={setCustomsClearance}
                placeholder={t('Select Clearance')}
                data-testid="select-purchase-iqd-customs-clearance"
                inputClassName="font-bold text-base h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Car Number')}</Label>
              <Input dir="ltr" value={carNumber} onChange={(e) => setCarNumber(e.target.value)} placeholder={t('Vehicle #')} className="font-bold text-base h-11" data-testid="input-purchase-iqd-car-number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Manifest')}</Label>
              <Input value={manifest} onChange={(e) => setManifest(e.target.value)} placeholder={t('Manifest #')} className="font-bold text-base h-11" data-testid="input-purchase-iqd-manifest" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Driver Name')}</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder={t('Driver Name')} className="font-bold text-base h-11" data-testid="input-purchase-iqd-driver-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Driver Mobile')}</Label>
              <Input value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} placeholder={t('Driver Mobile')} className="font-bold text-base h-11" data-testid="input-purchase-iqd-driver-mobile" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('Expenses')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Car Expense')}</Label>
              <Input type="number" step="250" value={carExpense} onChange={(e) => setCarExpense(e.target.value)} placeholder="0" className="font-bold text-base h-11" data-testid="input-purchase-iqd-car-expense" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Customs Expense')}</Label>
              <Input type="number" step="250" value={customsExpense} onChange={(e) => setCustomsExpense(e.target.value)} placeholder="0" className="font-bold text-base h-11" data-testid="input-purchase-iqd-customs-expense" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Other Expenses')}</Label>
              <Input type="number" step="250" value={otherExpenses} onChange={(e) => setOtherExpenses(e.target.value)} placeholder="0" className="font-bold text-base h-11" data-testid="input-purchase-iqd-other-expenses" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t('Total Expenses')}</Label>
              <div className="flex items-center h-11 px-3 rounded-md border bg-amber-50 dark:bg-amber-950/30 font-mono font-bold text-base text-amber-700 dark:text-amber-400">
                {formatIQD(totalExpenses)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('Products')}</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <ScanBarcode className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBarcodeScan(barcodeInput);
                  }
                }}
                placeholder={t('Scan barcode...')}
                className="h-9 w-48 ps-9 text-sm font-mono"
                data-testid="input-purchase-iqd-barcode"
              />
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none" data-testid="label-toggle-iqd-dates">
              <input
                type="checkbox"
                checked={showDates}
                onChange={(e) => setShowDates(e.target.checked)}
                className="w-5 h-5 rounded border-border accent-primary cursor-pointer"
                data-testid="checkbox-toggle-iqd-dates"
              />
              <span className="text-xs text-muted-foreground">{t('Production Date')} / {t('Expiry Date')}</span>
            </label>
            <Button variant="outline" size="sm" onClick={addRow} data-testid="button-purchase-iqd-add-row">
              <Plus className="w-5 h-5 mr-1" />
              {t('Add Row')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className={`table-fixed ${showDates ? "min-w-[1760px]" : "min-w-[1400px]"}`}>
              <TableHeader>
                <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
                  <TableHead className="text-primary-foreground text-center w-[50px] font-bold">#</TableHead>
                  <TableHead className="text-primary-foreground w-[280px] font-bold">{t('Product')}</TableHead>
                  <TableHead className="text-primary-foreground w-[140px] font-bold">{t('Product Code')}</TableHead>
                  <TableHead className="text-primary-foreground w-[120px] font-bold">{t('Quantity')}</TableHead>
                  <TableHead className="text-primary-foreground w-[90px] font-bold">{t('Gift')}</TableHead>
                  <TableHead className="text-primary-foreground w-[120px] font-bold">{t('Unit')}</TableHead>
                  <TableHead className="text-primary-foreground w-[130px] font-bold">{t('Price')}</TableHead>
                  <TableHead className="text-primary-foreground w-[140px] font-bold">{t('Amount')}</TableHead>
                  <TableHead className="text-primary-foreground w-[110px] font-bold">{t('Weight')}</TableHead>
                  <TableHead className="text-primary-foreground w-[130px] font-bold">{t('Expense Cost')}</TableHead>
                  {showDates && <TableHead className="text-primary-foreground w-[180px] font-bold">{t('Production Date')}</TableHead>}
                  {showDates && <TableHead className="text-primary-foreground w-[180px] font-bold">{t('Expiry Date')}</TableHead>}
                  <TableHead className="text-primary-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/30" data-testid={`row-purchase-iqd-item-${index}`}>
                    <TableCell className="text-center font-mono text-sm font-bold text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="p-1">
                      <ProductSearchSelect
                        products={visibleProducts}
                        value={item.productId}
                        onSelect={(val) => selectProduct(index, val)}
                        placeholder={t('Select product...')}
                        data-testid={`select-purchase-iqd-product-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <ProductCodeSearchSelect
                        products={visibleProducts}
                        value={item.productCode}
                        onSelect={(val) => selectProduct(index, val)}
                        data-testid={`input-purchase-iqd-product-code-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="h-11 text-base font-bold text-center"
                        data-testid={`input-purchase-iqd-quantity-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={item.gift}
                        onChange={(e) => updateItem(index, "gift", e.target.value)}
                        className="h-11 text-base font-bold text-center text-green-600"
                        placeholder="0"
                        data-testid={`input-purchase-iqd-gift-${index}`}
                      />
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
                        <SelectTrigger className="h-11 text-base font-bold" data-testid={`select-purchase-iqd-unit-${index}`}>
                          <SelectValue placeholder={t('Unit')} />
                        </SelectTrigger>
                        <SelectContent>
                          {item.productId && products?.find(p => p.id === item.productId) ? (() => {
                            const prod = products.find(p => p.id === item.productId)!;
                            const sameUnit = prod.bigUnit === prod.smallUnit;
                            return sameUnit ? (
                              <SelectItem value={prod.bigUnit}>
                                {resolveUnitName(prod.bigUnit, unitsList)}
                              </SelectItem>
                            ) : (
                              <>
                                <SelectItem value={prod.bigUnit}>
                                  {resolveUnitName(prod.bigUnit, unitsList)}
                                </SelectItem>
                                <SelectItem value={prod.smallUnit}>
                                  {resolveUnitName(prod.smallUnit, unitsList)}
                                </SelectItem>
                              </>
                            );
                          })() : null}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="250"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItem(index, "price", e.target.value)}
                        className="h-11 text-base font-bold text-center font-mono"
                        data-testid={`input-purchase-iqd-price-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center justify-center h-11 px-2 rounded bg-orange-50 dark:bg-orange-950/30 font-mono text-base font-bold text-orange-700 dark:text-orange-400">
                        {Number(item.amount || "0").toLocaleString()} IQD
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center justify-center h-11 px-2 rounded bg-muted/50 font-mono text-xs font-bold text-muted-foreground">
                        {(getItemUnitWeight(item) * parseFloat(item.quantity || "0")).toFixed(2)} kg
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center justify-center h-11 px-2 rounded bg-amber-50 dark:bg-amber-950/30 font-mono text-base font-bold text-amber-700 dark:text-amber-400">
                        {Number((getExpenseCost(item) + parseFloat(item.price || "0")).toFixed(0)).toLocaleString()} IQD
                      </div>
                    </TableCell>
                    {showDates && (
                    <TableCell className="p-1">
                      <DateInput
                        value={item.productionDate}
                        onChange={(e) => updateItem(index, "productionDate", e.target.value)}
                        className="h-11 text-base font-bold"
                        data-testid={`input-purchase-iqd-production-date-${index}`}
                      />
                    </TableCell>
                    )}
                    {showDates && (
                    <TableCell className="p-1">
                      <DateInput
                        value={item.expiryDate}
                        onChange={(e) => updateItem(index, "expiryDate", e.target.value)}
                        className="h-11 text-base font-bold"
                        data-testid={`input-purchase-iqd-expiry-date-${index}`}
                      />
                    </TableCell>
                    )}
                    <TableCell className="p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeRow(index)}
                        disabled={items.length <= 1}
                        data-testid={`button-remove-purchase-iqd-row-${index}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('Products')}</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-purchase-iqd-total-items">{totalItems}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('Total Quantity')}</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-purchase-iqd-total-quantity">{totalQuantity}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('Total Weight')}</p>
                <p className="text-lg font-bold text-primary" data-testid="text-purchase-iqd-total-weight">{totalWeightCalc.toFixed(2)} kg</p>
                <p className="text-sm font-semibold text-muted-foreground">{(totalWeightCalc / 1000).toFixed(3)} {t('Ton')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm border-orange-200 dark:border-orange-900">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('Invoice Total')}</span>
              <span className="font-mono font-bold text-lg" data-testid="text-purchase-iqd-subtotal">{formatIQD(subtotal)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('Cash Amount Paid')}</span>
              <Input
                type="number"
                step="250"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-32 text-right font-mono"
                placeholder="0"
                data-testid="input-purchase-iqd-amount-paid"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('Discount')} %</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => {
                    const pct = e.target.value;
                    setDiscountPercent(pct);
                    if (pct && parseFloat(pct) > 0) {
                      setDiscount(Math.round((subtotal * parseFloat(pct)) / 100).toString());
                    } else {
                      setDiscount("");
                    }
                  }}
                  className="w-24 text-right font-mono"
                  placeholder="0 %"
                  data-testid="input-purchase-iqd-discount-percent"
                />
                <span className="text-sm font-bold text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('Discount')}</span>
              <Input
                type="number"
                step="250"
                min="0"
                value={discount}
                onChange={(e) => {
                  setDiscount(e.target.value);
                  setDiscountPercent("");
                }}
                className="w-32 text-right font-mono"
                placeholder="0"
                data-testid="input-purchase-iqd-discount"
              />
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-red-600">{t('Remaining')}</span>
              <span className="font-mono font-bold text-xl text-red-600" data-testid="text-purchase-iqd-remaining">
                {formatIQD(remaining)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-orange-600" />
              {t('Invoice History')}
              <Badge variant="secondary" className="ml-2">
                {(() => {
                  const filtered = (invoicesList as PurchaseInvoice[] || []).filter(i => {
                    if (i.currency !== 'IQD') return false;
                    if (historySupplierFilter !== 'all' && i.supplierId !== parseInt(historySupplierFilter)) return false;
                    const invDate = typeof i.date === 'string' ? i.date.split('T')[0] : new Date(i.date).toISOString().split('T')[0];
                    if (historyStartDate && invDate < historyStartDate) return false;
                    if (historyEndDate && invDate > historyEndDate) return false;
                    if (searchNumber && !i.invoiceNumber.toLowerCase().includes(searchNumber.toLowerCase())) return false;
                    return true;
                  });
                  return filtered.length;
                })()}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch id="show-stamp-filter" checked={showStamp} onCheckedChange={(checked) => setShowStamp(!!checked)} data-testid="switch-show-stamp" />
                <Label htmlFor="show-stamp-filter" className="text-sm font-bold cursor-pointer whitespace-nowrap">{t("Show Stamp")}</Label>
              </div>
              <SearchInput placeholder={t('Search by number...')} value={searchNumber} onChange={(e) => setSearchNumber(e.target.value)} onClear={() => setSearchNumber("")} containerClassName="w-48" className="h-9" data-testid="input-search-invoice-iqd-number" />
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('Supplier')}</Label>
                <div className="w-48">
                  <SupplierSearchSelect
                    suppliers={suppliersList}
                    value={historySupplierFilter}
                    onValueChange={setHistorySupplierFilter}
                    placeholder={t('All Suppliers')}
                    data-testid="select-history-iqd-supplier-filter"
                    showAllOption
                    allOptionLabel={t('All Suppliers')}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} className="w-44 h-9" data-testid="input-history-iqd-start-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} className="w-44 h-9" data-testid="input-history-iqd-end-date" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const filteredInvoices = (invoicesList as PurchaseInvoice[] || []).filter(i => {
              if (i.currency !== 'IQD') return false;
              if (historySupplierFilter !== 'all' && i.supplierId !== parseInt(historySupplierFilter)) return false;
              const invDate = typeof i.date === 'string' ? i.date.split('T')[0] : new Date(i.date).toISOString().split('T')[0];
              if (historyStartDate && invDate < historyStartDate) return false;
              if (historyEndDate && invDate > historyEndDate) return false;
              if (searchNumber && !i.invoiceNumber.toLowerCase().includes(searchNumber.toLowerCase())) return false;
              return true;
            }).sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));
            const totSubtotal = filteredInvoices.reduce((s, i) => s + Number(i.subtotal || 0), 0);
            const totDiscount = filteredInvoices.reduce((s, i) => s + Number(i.discount || 0), 0);
            const totAmountPaid = filteredInvoices.reduce((s, i) => s + Number(i.amountPaid || 0), 0);
            const totRemaining = filteredInvoices.reduce((s, i) => s + Number(i.remaining || 0), 0);
            const fmtIQD = (v: number) => Number(v.toFixed(0)).toLocaleString() + " IQD";
            return (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('Invoice #')}</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Supplier')}</TableHead>
                      <TableHead>{t('Type')}</TableHead>
                      <TableHead className="text-right">{t('Total')}</TableHead>
                      <TableHead className="text-right">{t('Amount Paid')}</TableHead>
                      <TableHead className="text-right">{t('Discount')}</TableHead>
                      <TableHead className="text-right">{t('Remaining')}</TableHead>
                      <TableHead>{t('Created By')}</TableHead>
                      <TableHead className="text-center">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv: PurchaseInvoice, idx) => (
                      <TableRow key={inv.id} data-testid={`row-iqd-invoice-${inv.id}`}>
                        <TableCell className="text-sm font-bold">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-bold font-mono">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-sm font-bold">{formatDate(inv.date)}</TableCell>
                        <TableCell className="text-sm font-bold">{inv.supplierName}</TableCell>
                        <TableCell>
                          <Badge variant={inv.invoiceType === 'cash' ? 'default' : 'secondary'} className="text-sm">
                            {inv.invoiceType === 'cash' ? t('Cash') : t('Credit')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold">{Number(inv.subtotal).toLocaleString()} IQD</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold text-green-600">{Number(inv.amountPaid).toLocaleString()} IQD</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold text-orange-600">{Number(inv.discount).toLocaleString()} IQD</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold text-red-600">{Number(inv.remaining).toLocaleString()} IQD</TableCell>
                        <TableCell className="text-sm font-semibold">{(inv as any).createdBy || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => { setReportInvoiceId(inv.id); setReportOpen(true); }} data-testid={`btn-view-iqd-invoice-${inv.id}`}>
                              <Eye className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => startEdit(inv.id)} data-testid={`btn-edit-iqd-invoice-${inv.id}`}>
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteInvoice({ id: inv.id, number: inv.invoiceNumber })} data-testid={`btn-delete-iqd-invoice-${inv.id}`}>
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInvoices.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell colSpan={5} className="text-right font-bold text-base">{t('Total')}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base">{fmtIQD(totSubtotal)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-green-600">{fmtIQD(totAmountPaid)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-orange-600">{fmtIQD(totDiscount)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-red-600">{fmtIQD(totRemaining)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                    {filteredInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          {t('No invoices found')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <PurchaseInvoiceReport
        invoiceId={reportInvoiceId}
        open={reportOpen}
        onOpenChange={setReportOpen}
        currency="IQD"
      />

      <AlertDialog open={!!deleteInvoice} onOpenChange={(open) => { if (!open) setDeleteInvoice(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will permanently delete invoice")} #{deleteInvoice?.number}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("No")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvoice} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-iqd-invoice">
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
              {t("Yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
