import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useNextSupplierOrderNumber, useCreateSupplierOrder, useSupplierOrders } from "@/hooks/use-supplier-orders";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { Product, Client, SupplierOrder } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Loader2, FileText, RotateCcw, ListOrdered, ArrowLeft, Pencil, ScanBarcode, Printer } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconDollar } from "@/components/erp-icons";
import { playDeleteSound } from "@/lib/sounds";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import ProductSearchSelect from "@/components/product-search-select";
import ProductCodeSearchSelect from "@/components/product-code-search-select";
import { usd, fmtIqd, formatDate } from "@/lib/format-utils";
import { useUnits } from "@/hooks/use-units";
import { SupplierSearchSelect } from "@/components/supplier-search-select";
import { AddressSearchSelect } from "@/components/address-search-select";
import i18n from "@/lib/i18n";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";

interface OrderItem {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
  price: string;
  amount: string;
}

const emptyItem = (): OrderItem => ({
  productId: null,
  productCode: "",
  productName: "",
  quantity: "",
  unit: "",
  price: "",
  amount: "0",
});

interface SupplierOrderPageProps {
  currency: "USD" | "IQD";
}

export default function SupplierOrderPage({ currency }: SupplierOrderPageProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: user } = useUser();
  const { data: nextNumber } = useNextSupplierOrderNumber();
  const { mutate: createOrder, isPending: isSaving } = useCreateSupplierOrder();
  const { data: ordersList } = useSupplierOrders();
  const [, navigate] = useLocation();
  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; primaryColor: string }>({ queryKey: ["/api/company-profile"] });

  const urlEditId = new URLSearchParams(window.location.search).get("edit");
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const editId = inlineEditId || urlEditId;
  const [isEditMode, setIsEditMode] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const suppliersList = clients?.filter(c => c.type === "supplier" && !c.hidden) || [];
  const visibleProducts = products?.filter(p => !p.hidden) || [];

  const isUsd = currency === "USD";
  const fmt = isUsd ? usd : fmtIqd;
  const currencySymbol = isUsd ? "$" : "IQD";

  const [orderNumber, setOrderNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  const [supplierName, setSupplierName] = useState("");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [invoiceType, setInvoiceType] = useState("cash");
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);
  const [formKey, setFormKey] = useState(0);
  const [historySupplierFilter, setHistorySupplierFilter] = useState<string>("all");
  const [historyStartDate, setHistoryStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [historyEndDate, setHistoryEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchNumber, setSearchNumber] = useState("");
  const [deleteOrder, setDeleteOrder] = useState<{ id: number; number: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (nextNumber?.number && !editId) {
      setOrderNumber(nextNumber.number);
    }
  }, [nextNumber, editId]);

  useEffect(() => {
    if (!editId) return;
    setIsEditMode(true);
    const fetchEditData = async () => {
      try {
        const [ordRes, itemsRes] = await Promise.all([
          fetch(`/api/supplier-orders/${editId}`, { credentials: "include" }),
          fetch(`/api/supplier-orders/${editId}/items`, { credentials: "include" }),
        ]);
        if (!ordRes.ok || !itemsRes.ok) return;
        const ord = await ordRes.json();
        const fetchedItems = await itemsRes.json();
        setOrderNumber(ord.orderNumber || "");
        setDate(typeof ord.date === "string" ? ord.date.split("T")[0] : new Date(ord.date).toISOString().split("T")[0]);
        setTime(ord.time || "");
        setSupplierId(ord.supplierId || null);
        setSupplierName(ord.supplierName || "");
        setAddress(ord.address || "");
        setNote(ord.note || "");
        setInvoiceType(ord.invoiceType || "cash");
        if (fetchedItems && fetchedItems.length > 0) {
          const mappedItems: OrderItem[] = fetchedItems.map((item: any) => ({
            productId: item.productId || null,
            productCode: item.productCode || "",
            productName: item.productName || "",
            quantity: item.quantity || "",
            unit: item.unit || "",
            price: item.price || "",
            amount: item.amount || "0",
          }));
          mappedItems.push(emptyItem());
          setItems(mappedItems);
        }
      } catch (err) {}
    };
    fetchEditData();
  }, [editId]);

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalItems = items.filter(i => i.productCode && parseFloat(i.quantity || "0") > 0).length;
  const totalQuantity = items.reduce((sum, i) => sum + parseFloat(i.quantity || "0"), 0);

  const updateItem = useCallback((index: number, field: keyof OrderItem, value: string) => {
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
    if (!productId) { setItems(prev => { const u = [...prev]; u[index] = { ...u[index], productId: null, productCode: "", productName: "", unit: "", price: "0", amount: "0" }; return u; }); return; }
    const product = products?.find(p => p.id === parseInt(productId));
    if (!product) return;
    const priceField = isUsd ? product.bigUnitPriceUsd : product.bigUnitPriceIqd;
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: product.id,
        productCode: product.barcode,
        productName: getProductName(product),
        unit: product.bigUnit,
        price: priceField,
      };
      const qty = parseFloat(updated[index].quantity || "0");
      updated[index].amount = (qty * parseFloat(priceField)).toFixed(2);
      const lastRow = updated[updated.length - 1];
      if (lastRow.productId !== null) {
        updated.push(emptyItem());
      }
      return updated;
    });
    setTimeout(() => {
      const el = document.querySelector(`[data-testid="input-order-quantity-${index}"]`) as HTMLInputElement;
      if (el) { el.focus(); el.select(); }
    }, 50);
  }, [products, isUsd]);

  const [barcodeInput, setBarcodeInput] = useState("");

  const handleBarcodeScan = useCallback((barcode: string) => {
    if (!barcode.trim()) return;
    const product = products?.find(p => p.barcode === barcode.trim() && !p.hidden);
    if (!product) {
      toast({ title: t("Product not found for barcode") + ": " + barcode, variant: "destructive" });
      setBarcodeInput("");
      return;
    }
    const priceField = isUsd ? product.bigUnitPriceUsd : product.bigUnitPriceIqd;
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
        price: priceField,
        amount: (qty * parseFloat(priceField)).toFixed(2),
      };
      const lastRow = updated[updated.length - 1];
      if (lastRow.productId !== null) {
        updated.push(emptyItem());
      }
      return updated;
    });
    setBarcodeInput("");
  }, [products, t, toast, isUsd]);

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
    setInvoiceType("cash");
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

  const startEdit = (orderId: number) => {
    setInlineEditId(String(orderId));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrder) return;
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/supplier-orders/${deleteOrder.id}`);
      playDeleteSound();
      toast({ title: t("Order deleted successfully") });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-orders"] });
      setDeleteOrder(null);
    } catch (err: any) {
      toast({ title: t("Failed to delete order"), description: err.message, variant: "destructive" });
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

    const orderData = {
      orderNumber,
      date,
      time: currentTime,
      supplierId,
      supplierName,
      address: address || null,
      note: note || null,
      invoiceType,
      subtotal: subtotal.toFixed(2),
      totalItems,
      totalQuantity: totalQuantity.toFixed(2),
      currency,
      status: "approved",
      createdBy: user?.username || null,
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

    if (editId) {
      setIsUpdating(true);
      apiRequest("PATCH", `/api/supplier-orders/${editId}`, { order: orderData, items: itemsData })
        .then(() => {
          toast({ title: t("Order updated successfully") });
          queryClient.invalidateQueries({ queryKey: ["/api/supplier-orders"] });
          resetForm();
        })
        .catch((err: any) => {
          toast({ title: t("Failed to update order"), description: err.message, variant: "destructive" });
        })
        .finally(() => {
          setIsUpdating(false);
        });
    } else {
      createOrder({ order: orderData, items: itemsData }, {
        onSuccess: () => {
          toast({ title: t("Order saved successfully") });
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to save order"), description: err.message, variant: "destructive" });
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

  const isRtl = ["ar", "ckb"].includes(i18n.language);

  const handlePrintOrder = (orderId: number) => {
    const ord = (ordersList as SupplierOrder[] || []).find(o => o.id === orderId);
    if (!ord) return;
    const fetchItems = async () => {
      const res = await fetch(`/api/supplier-orders/${orderId}/items`, { credentials: "include" });
      if (!res.ok) return;
      const orderItems = await res.json();
      const printW = window.open("", "_blank");
      if (!printW) return;
      const dir = isRtl ? "rtl" : "ltr";
      const tableRows = orderItems.map((item: any, i: number) => `<tr>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${i + 1}</td>
        <td style="padding:4px 8px;font-size:10pt;">${item.productName}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${item.productCode}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${item.quantity}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;">${resolveUnitName(item.unit, unitsList)}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;font-weight:600;">${fmt(item.price)}</td>
        <td style="padding:4px 8px;font-size:10pt;text-align:center;font-weight:600;">${fmt(item.amount)}</td>
      </tr>`).join("");

      printW.document.write(`<!DOCTYPE html><html dir="${dir}"><head>
        ${PRINT_FONT_LINKS}
        <title>${t("Supplier Order")} - ${ord.orderNumber}</title>
        <style>${getModernPrintStyles(dir)}
          @page { size: A4 portrait; margin: 10mm; }
        </style>
      </head><body>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;justify-content:center;flex-direction:column;">
          ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:70px;height:70px;object-fit:contain;border-radius:6px;" />` : ""}
          <h2 style="font-size:9pt;margin:0;font-weight:800;color:#64748b;">${companyProfile?.name || ""}</h2>
          <h1 style="font-size:14pt;font-weight:800;margin:0;">${t("Supplier Order")}</h1>
        </div>
        <div style="display:flex;justify-content:space-between;margin:12px 0;font-size:10pt;">
          <div><strong>${t("Order #")}:</strong> ${ord.orderNumber}</div>
          <div><strong>${t("Date")}:</strong> ${formatDate(ord.date)}</div>
          <div><strong>${t("Currency")}:</strong> ${ord.currency}</div>
        </div>
        <div style="margin-bottom:12px;font-size:10pt;">
          <strong>${t("Supplier")}:</strong> ${ord.supplierName}
          ${ord.address ? ` | <strong>${t("Address")}:</strong> ${ord.address}` : ""}
          ${ord.note ? ` | <strong>${t("Note")}:</strong> ${ord.note}` : ""}
        </div>
        <table style="width:100%;border-collapse:collapse;" border="1">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">#</th>
            <th style="padding:6px 8px;font-size:11pt;font-weight:700;">${t("Product")}</th>
            <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Product Code")}</th>
            <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Quantity")}</th>
            <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Unit")}</th>
            <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Price")}</th>
            <th style="padding:6px 8px;font-size:11pt;font-weight:700;text-align:center;">${t("Amount")}</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
          <tfoot><tr style="background:#f1f5f9;font-weight:700;">
            <td colspan="6" style="padding:6px 8px;font-size:11pt;text-align:${isRtl ? 'left' : 'right'};">${t("Total")}</td>
            <td style="padding:6px 8px;font-size:11pt;text-align:center;">${fmt(ord.subtotal)}</td>
          </tr></tfoot>
        </table>
      </body></html>`);
      printW.document.close();
      printW.onafterprint = () => printW.close();
      setTimeout(() => { document.fonts.ready.then(() => printW.print()); }, 600);
    };
    fetchItems();
  };

  return (
    <div className="space-y-3">
      <Link href="/supplier-management">
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-supplier-management">
          <ArrowLeft className="h-5 w-5" />
          {t("Supplier Management")}
        </Button>
      </Link>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <IconDollar className="h-8 w-8 text-blue-600" />
            {isEditMode ? t("Edit Supplier Order") + ` - ${currency}` : t("Supplier Order") + ` - ${currency}`}
          </h1>
          <p className="text-muted-foreground text-sm">{isEditMode ? t("Edit supplier order") : t("Create supplier order")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} data-testid="button-reset-order-form">
            <RotateCcw className="w-5 h-5 mr-2" />
            {t("Reset")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUpdating} className="bg-green-600 hover:bg-green-700 text-[#ffffff]" data-testid="button-save-order">
            {(isSaving || isUpdating) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {isEditMode ? t("Update Order") : t("Save Order")}
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("Order Details")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t("Order #")}</Label>
              <Input value={orderNumber} readOnly className="font-mono font-bold text-base h-11 bg-muted/30 cursor-not-allowed" data-testid="input-order-number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t("Date")}</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} className="font-bold text-base h-11" data-testid="input-order-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t("Time")}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="font-bold text-base h-11" data-testid="input-order-time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t("Invoice Type")}</Label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger className="font-bold text-base h-11" data-testid="select-order-invoice-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("Cash")}</SelectItem>
                  <SelectItem value="credit">{t("Credit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t("Created By")}</Label>
              <div className="flex items-center h-11 px-3 rounded-md border bg-muted/30 text-base font-bold" data-testid="text-created-by">
                {user?.username || "-"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t("Supplier Name")}</Label>
              <SupplierSearchSelect
                suppliers={suppliersList}
                value={supplierId ? String(supplierId) : ""}
                onValueChange={selectSupplier}
                placeholder={t("Select Supplier")}
                data-testid="select-supplier"
                inputClassName="font-bold text-base h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t("Address")}</Label>
              <AddressSearchSelect
                addresses={addressesList || []}
                value={address}
                onValueChange={setAddress}
                placeholder={t("Select Address")}
                data-testid="select-order-address"
                inputClassName="font-bold text-base h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">{t("Note")}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Notes...")} className="font-bold text-base h-11" data-testid="input-order-note" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t("Products")}</CardTitle>
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
                placeholder={t("Scan barcode...")}
                className="h-9 w-48 ps-9 text-sm font-mono"
                data-testid="input-order-barcode"
              />
            </div>
            <Button variant="outline" size="sm" onClick={addRow} data-testid="button-order-add-row">
              <Plus className="w-5 h-5 mr-1" />
              {t("Add Row")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
                  <TableHead className="text-primary-foreground text-center w-12 font-bold">#</TableHead>
                  <TableHead className="text-primary-foreground min-w-[280px] font-bold">{t("Product")}</TableHead>
                  <TableHead className="text-primary-foreground w-[130px] font-bold">{t("Product Code")}</TableHead>
                  <TableHead className="text-primary-foreground w-[120px] font-bold">{t("Quantity")}</TableHead>
                  <TableHead className="text-primary-foreground w-[110px] font-bold">{t("Unit")}</TableHead>
                  <TableHead className="text-primary-foreground w-[130px] font-bold">{t("Price")}</TableHead>
                  <TableHead className="text-primary-foreground w-[140px] font-bold">{t("Amount")}</TableHead>
                  <TableHead className="text-primary-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/30" data-testid={`row-order-item-${index}`}>
                    <TableCell className="text-center font-mono text-sm font-bold text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="p-1">
                      <ProductSearchSelect
                        products={visibleProducts}
                        value={item.productId}
                        onSelect={(val) => selectProduct(index, val)}
                        placeholder={t("Select product...")}
                        data-testid={`select-order-product-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <ProductCodeSearchSelect
                        products={visibleProducts}
                        value={item.productCode}
                        onSelect={(val) => selectProduct(index, val)}
                        data-testid={`input-order-product-code-${index}`}
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
                        data-testid={`input-order-quantity-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={item.unit}
                        onValueChange={(val) => {
                          const product = products?.find(p => p.id === item.productId);
                          if (product) {
                            const newPrice = isUsd
                              ? (val === product.bigUnit ? product.bigUnitPriceUsd : product.smallUnitPriceUsd)
                              : (val === product.bigUnit ? product.bigUnitPriceIqd : product.smallUnitPriceIqd);
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
                        <SelectTrigger className="h-11 text-base font-bold" data-testid={`select-order-unit-${index}`}>
                          <SelectValue placeholder={t("Unit")} />
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
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItem(index, "price", e.target.value)}
                        className="h-11 text-base font-bold text-center font-mono"
                        data-testid={`input-order-price-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center justify-center h-11 px-2 rounded bg-green-50 dark:bg-green-950/30 font-mono text-base font-bold text-green-700 dark:text-green-400">
                        {isUsd ? "$" : ""}{item.amount || "0.00"}
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeRow(index)}
                        disabled={items.length <= 1}
                        data-testid={`button-remove-order-row-${index}`}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t("Products")}</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-order-total-items">{totalItems}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t("Total Quantity")}</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-order-total-quantity">{totalQuantity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm border-blue-200 dark:border-blue-900">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold">{t("Order Total")}</span>
              <span className="font-mono font-bold text-2xl text-primary" data-testid="text-order-subtotal">{fmt(subtotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-blue-600" />
              {t("Order History")}
              <Badge variant="secondary" className="ml-2">
                {(() => {
                  const filtered = (ordersList as SupplierOrder[] || []).filter(i => {
                    if (i.currency !== currency) return false;
                    if (historySupplierFilter !== "all" && i.supplierId !== parseInt(historySupplierFilter)) return false;
                    const ordDate = typeof i.date === "string" ? i.date.split("T")[0] : new Date(i.date).toISOString().split("T")[0];
                    if (historyStartDate && ordDate < historyStartDate) return false;
                    if (historyEndDate && ordDate > historyEndDate) return false;
                    if (searchNumber && !i.orderNumber.toLowerCase().includes(searchNumber.toLowerCase())) return false;
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
              <div className="flex items-center gap-2">
                <SearchInput placeholder={t("Search by number...")} value={searchNumber} onChange={(e) => setSearchNumber(e.target.value)} onClear={() => setSearchNumber("")} containerClassName="w-48" className="h-9" data-testid="input-search-order-number" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t("Supplier")}</Label>
                <div className="w-48">
                  <SupplierSearchSelect
                    suppliers={suppliersList}
                    value={historySupplierFilter}
                    onValueChange={setHistorySupplierFilter}
                    placeholder={t("All Suppliers")}
                    data-testid="select-history-supplier-filter"
                    showAllOption
                    allOptionLabel={t("All Suppliers")}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t("From Date")}</Label>
                <DateInput value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} className="w-36 h-9" data-testid="input-history-start-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t("To Date")}</Label>
                <DateInput value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} className="w-36 h-9" data-testid="input-history-end-date" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const filteredOrders = (ordersList as SupplierOrder[] || []).filter(i => {
              if (i.currency !== currency) return false;
              if (historySupplierFilter !== "all" && i.supplierId !== parseInt(historySupplierFilter)) return false;
              const ordDate = typeof i.date === "string" ? i.date.split("T")[0] : new Date(i.date).toISOString().split("T")[0];
              if (historyStartDate && ordDate < historyStartDate) return false;
              if (historyEndDate && ordDate > historyEndDate) return false;
              if (searchNumber && !i.orderNumber.toLowerCase().includes(searchNumber.toLowerCase())) return false;
              return true;
            }).sort((a, b) => b.orderNumber.localeCompare(a.orderNumber));
            const totSubtotal = filteredOrders.reduce((s, i) => s + Number(i.subtotal || 0), 0);
            return (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t("Order #")}</TableHead>
                      <TableHead>{t("Date")}</TableHead>
                      <TableHead>{t("Supplier")}</TableHead>
                      <TableHead>{t("Type")}</TableHead>
                      <TableHead className="text-right">{t("Total")}</TableHead>
                      <TableHead>{t("Created By")}</TableHead>
                      <TableHead className="text-center">{t("Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((ord: SupplierOrder, idx) => (
                      <TableRow key={ord.id} data-testid={`row-order-${ord.id}`}>
                        <TableCell className="text-sm font-bold">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-bold font-mono">{ord.orderNumber}</TableCell>
                        <TableCell className="text-sm font-bold">{formatDate(ord.date)}</TableCell>
                        <TableCell className="text-sm font-bold">{ord.supplierName}</TableCell>
                        <TableCell>
                          <Badge variant={ord.invoiceType === "cash" ? "default" : "secondary"} className="text-sm">
                            {ord.invoiceType === "cash" ? t("Cash") : t("Credit")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold">{fmt(ord.subtotal)}</TableCell>
                        <TableCell className="text-sm font-semibold">{(ord as any).createdBy || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => handlePrintOrder(ord.id)} data-testid={`btn-print-order-${ord.id}`}>
                              <Printer className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => startEdit(ord.id)} data-testid={`btn-edit-order-${ord.id}`}>
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteOrder({ id: ord.id, number: ord.orderNumber })} data-testid={`btn-delete-order-${ord.id}`}>
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredOrders.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell colSpan={5} className="text-right font-bold text-base">{t("Total")}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base">{fmt(totSubtotal)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                    {filteredOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {t("No orders found")}
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

      <AlertDialog open={!!deleteOrder} onOpenChange={(open) => { if (!open) setDeleteOrder(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will permanently delete order")} #{deleteOrder?.number}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("No")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-order">
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
              {t("Yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
