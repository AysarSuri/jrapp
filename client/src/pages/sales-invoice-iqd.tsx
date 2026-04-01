import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNextSalesInvoiceNumber, useCreateSalesInvoice, useSalesInvoices, useApproveSalesInvoice, useDeleteSalesInvoice } from "@/hooks/use-sales-invoices";
import { useQuery } from "@tanstack/react-query";
import type { Product, Client, SalesInvoice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchSelect } from "@/components/search-select";
import { CustomerSearchSelect } from "@/components/customer-search-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { Plus, Trash2, Save, Loader2, FileText, RotateCcw, ListOrdered, CheckCircle, Clock, Pencil, ScanBarcode, Search, Eye, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { IconDinar } from "@/components/erp-icons";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import ProductSearchSelect from "@/components/product-search-select";
import ProductCodeSearchSelect from "@/components/product-code-search-select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, fmtIqd } from "@/lib/format-utils";
import { useUnits } from "@/hooks/use-units";
import SalesInvoiceReport from "@/components/sales-invoice-report";
import { AddressSearchSelect } from "@/components/address-search-select";

interface InvoiceItem {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  gift: string;
  unit: string;
  weight: string;
  price: string;
  amount: string;
}

const emptyItem = (): InvoiceItem => ({
  productId: null,
  productCode: "",
  productName: "",
  quantity: "",
  gift: "",
  unit: "",
  weight: "",
  price: "",
  amount: "0",
});

export default function SalesInvoiceIqdPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: user } = useUser();
  const { data: nextNumber } = useNextSalesInvoiceNumber();
  const { mutate: createInvoice, isPending: isSaving } = useCreateSalesInvoice();
  const { mutate: approveInvoice, isPending: isApproving } = useApproveSalesInvoice();
  const { mutate: deleteInvoice } = useDeleteSalesInvoice();
  const { data: invoicesList } = useSalesInvoices();

  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
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
  const { data: representativesList } = useQuery<{ id: string; name: string; mobile: string; repId: number | null }[]>({
    queryKey: ["/api/agents"],
  });
  const { data: addressesList } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/addresses"],
  });
  const { data: agentClientsList } = useQuery<{ id: number; agentUserId: string; agentName: string; clientId: number }[]>({
    queryKey: ["/api/agent-clients"],
  });
  const { data: warehousesList } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/warehouses"],
  });

  const allCustomers = clients?.filter(c => c.type === "customer") || [];
  const customersList = user?.role === 'sales_rep'
    ? allCustomers.filter(c => agentClientsList?.some(ac => ac.agentUserId === user.id && ac.clientId === c.id))
    : allCustomers;

  const [formKey, setFormKey] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [representativeId, setRepresentativeId] = useState<number | null>(null);
  const [representativeName, setRepresentativeName] = useState("");
  const [representativeMobile, setRepresentativeMobile] = useState("");
  const [note, setNote] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [invoiceType, setInvoiceType] = useState("cash");
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [reportInvoiceId, setReportInvoiceId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [historyCustomerFilter, setHistoryCustomerFilter] = useState<string>("all");
  const [historyStartDate, setHistoryStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [historyEndDate, setHistoryEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchNumber, setSearchNumber] = useState("");
  const [deleteInvoiceData, setDeleteInvoiceData] = useState<{ id: number; number: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (nextNumber?.number && !isEditMode) {
      setInvoiceNumber(nextNumber.number);
    }
  }, [nextNumber, isEditMode]);

  useEffect(() => {
    if (warehousesList?.length && !warehouseId && !isEditMode) {
      setWarehouseId(warehousesList[0].id);
      setWarehouseName(warehousesList[0].name);
    }
  }, [warehousesList, isEditMode]);

  const startEdit = async (invoiceId: number) => {
    try {
      const [invRes, itemsRes] = await Promise.all([
        fetch(`/api/sales-invoices/${invoiceId}`, { credentials: "include" }),
        fetch(`/api/sales-invoices/${invoiceId}/items`, { credentials: "include" }),
      ]);
      if (!invRes.ok || !itemsRes.ok) return;
      const inv = await invRes.json();
      const fetchedItems = await itemsRes.json();
      setInlineEditId(invoiceId);
      setIsEditMode(true);
      setInvoiceNumber(inv.invoiceNumber || "");
      setDate(typeof inv.date === "string" ? inv.date.split("T")[0] : new Date(inv.date).toISOString().split("T")[0]);
      setTime(inv.time || "");
      setCustomerId(inv.customerId || null);
      setCustomerName(inv.customerName || "");
      setAddress(inv.address || "");
      setMobile(inv.mobile || "");
      setRepresentativeId(inv.representativeId || null);
      setRepresentativeName(inv.representativeName || "");
      setRepresentativeMobile(inv.representativeMobile || "");
      setNote(inv.note || "");
      setDriverName(inv.driverName || "");
      setDriverMobile(inv.driverMobile || "");
      setVehicleNumber(inv.vehicleNumber || "");
      setInvoiceType(inv.invoiceType || "cash");
      setWarehouseId(inv.warehouseId || null);
      setWarehouseName(inv.warehouseName || "");
      setDiscount(inv.discount || "");
      setDiscountPercent("");
      setAmountPaid(inv.amountPaid || "");
      const mappedItems = fetchedItems.map((item: any) => ({
        productId: item.productId,
        productCode: item.productCode || "",
        productName: item.productName || "",
        quantity: item.quantity || "",
        gift: item.gift || "0",
        unit: item.unit || "",
        price: item.price || "",
        amount: item.amount || "0",
        weight: item.weight || "0",
        productionDate: "",
        expiryDate: "",
      }));
      setItems([...mappedItems, emptyItem()]);
      setFormKey(k => k + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast({ title: t("Failed to load invoice for editing"), variant: "destructive" });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("editId");
    if (editId) {
      startEdit(Number(editId));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: openingBalanceData } = useQuery<{ openingBalance: number }>({
    queryKey: ["/api/customer-opening-balance", customerId, date, time, "IQD", inlineEditId],
    queryFn: async () => {
      const params = new URLSearchParams({ customerId: String(customerId), date, time: time || "00:00", currency: "IQD" });
      if (inlineEditId) params.set("excludeInvoiceId", String(inlineEditId));
      const res = await fetch(`/api/customer-opening-balance?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!customerId && !!date,
  });
  const openingBalance = openingBalanceData?.openingBalance ?? 0;

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalItems = items.filter(i => i.productCode && parseFloat(i.quantity || "0") > 0).length;
  const totalQuantity = items.reduce((sum, i) => sum + parseFloat(i.quantity || "0") + parseFloat(i.gift || "0"), 0);
  const totalWeight = items.reduce((sum, i) => sum + parseFloat(i.weight || "0"), 0);
  const discountVal = parseFloat(discount || "0");
  const amountPaidVal = parseFloat(amountPaid || "0");
  const remaining = subtotal - discountVal - amountPaidVal;

  const updateItem = useCallback((index: number, field: keyof InvoiceItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "price") {
        const qty = parseFloat(field === "quantity" ? value : updated[index].quantity || "0");
        const prc = parseFloat(field === "price" ? value : updated[index].price || "0");
        updated[index].amount = (qty * prc).toFixed(2);
      }
      if ((field === "quantity" || field === "gift") && updated[index].productId) {
        const prod = products?.find(p => p.id === updated[index].productId);
        if (prod) {
          const qty = parseFloat(field === "quantity" ? value : updated[index].quantity || "0");
          const gift = parseFloat(field === "gift" ? value : updated[index].gift || "0");
          const unitWeight = parseFloat(prod.weight || "0");
          updated[index].weight = ((qty + gift) * unitWeight).toFixed(2);
        }
      }
      return updated;
    });
  }, [products]);

  const selectProduct = useCallback((index: number, productId: string) => {
    if (!productId) { setItems(prev => { const u = [...prev]; u[index] = { ...u[index], productId: null, productCode: "", productName: "", unit: "", price: "0", weight: "0", amount: "0" }; return u; }); return; }
    const product = products?.find(p => p.id === parseInt(productId));
    if (!product) return;
    setItems(prev => {
      const updated = [...prev];
      const qty = parseFloat(updated[index].quantity || "0");
      const gift = parseFloat(updated[index].gift || "0");
      const unitWeight = parseFloat(product.weight || "0");
      updated[index] = {
        ...updated[index],
        productId: product.id,
        productCode: product.barcode,
        productName: getProductName(product),
        unit: product.bigUnit,
        price: product.bigUnitPriceIqd,
        weight: ((qty + gift) * unitWeight).toFixed(2),
      };
      updated[index].amount = (qty * parseFloat(product.bigUnitPriceIqd)).toFixed(2);
      const lastRow = updated[updated.length - 1];
      if (lastRow.productId !== null) {
        updated.push(emptyItem());
      }
      return updated;
    });
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
      const gift = parseFloat(updated[emptyIndex].gift || "0");
      const unitWeight = parseFloat(product.weight || "0");
      updated[emptyIndex] = {
        ...updated[emptyIndex],
        productId: product.id,
        productCode: product.barcode,
        productName: getProductName(product),
        quantity: String(qty),
        unit: product.bigUnit,
        price: product.bigUnitPriceIqd,
        weight: ((qty + gift) * unitWeight).toFixed(2),
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
    setInlineEditId(null);
    setIsEditMode(false);
    setInvoiceNumber("");
    setCustomerName("");
    setCustomerId(null);
    setAddress("");
    setMobile("");
    setRepresentativeId(null);
    setRepresentativeName("");
    setRepresentativeMobile("");
    setNote("");
    setDriverName("");
    setDriverMobile("");
    setVehicleNumber("");
    setInvoiceType("cash");
    if (warehousesList?.length) {
      setWarehouseId(warehousesList[0].id);
      setWarehouseName(warehousesList[0].name);
    } else {
      setWarehouseId(null);
      setWarehouseName("");
    }
    setDiscount("");
    setDiscountPercent("");
    setAmountPaid("");
    setItems([emptyItem()]);
    setBarcodeInput("");
    setFormKey(k => k + 1);
    setDate(new Date().toISOString().split("T")[0]);
    setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  };

  const handleSave = () => {
    if (!customerName.trim()) {
      toast({ title: t("Customer name is required"), variant: "destructive" });
      return;
    }
    const validItems = items.filter(i => i.productCode && parseFloat(i.quantity || "0") > 0);
    if (validItems.length === 0) {
      toast({ title: t("Add at least one product"), variant: "destructive" });
      return;
    }

    const userRole = user?.role || 'user';
    const isRep = userRole === 'sales_rep';

    const invoiceData = {
      invoiceNumber,
      date,
      time,
      customerId,
      customerName,
      address: address || null,
      mobile: mobile || null,
      representativeId,
      representativeName: representativeName || null,
      representativeMobile: representativeMobile || null,
      note: note || null,
      driverName: driverName || null,
      driverMobile: driverMobile || null,
      vehicleNumber: vehicleNumber || null,
      invoiceType,
      warehouseId,
      warehouseName: warehouseName || null,
      subtotal: subtotal.toFixed(2),
      discount: discount || "0",
      amountPaid: amountPaid || "0",
      remaining: remaining.toFixed(2),
      totalItems,
      totalQuantity: totalQuantity.toFixed(2),
      currency: "IQD",
      status: isRep ? "pending" : "approved",
      createdBy: user?.username || null,
      createdByRole: userRole,
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
      weight: item.weight || "0",
    }));

    if (isEditMode && inlineEditId) {
      setIsUpdating(true);
      apiRequest("PATCH", `/api/sales-invoices/${inlineEditId}`, { invoice: invoiceData, items: itemsData })
        .then(() => {
          toast({ title: t("Sales invoice updated successfully") });
          queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
          queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices", inlineEditId] });
          queryClient.invalidateQueries({ queryKey: ["/api/customer-opening-balance"] });
          resetForm();
        })
        .catch((err: any) => {
          toast({ title: t("Failed to save invoice"), description: err.message, variant: "destructive" });
        })
        .finally(() => setIsUpdating(false));
    } else {
      createInvoice({ invoice: invoiceData, items: itemsData }, {
        onSuccess: () => {
          if (isRep) {
            toast({ title: t("Sales invoice sent for approval") });
          } else {
            toast({ title: t("Sales invoice saved successfully") });
          }
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to save invoice"), description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const selectCustomer = (clientId: string) => {
    if (!clientId) {
      setCustomerId(null);
      setCustomerName("");
      setAddress("");
      setMobile("");
      setRepresentativeName("");
      setRepresentativeMobile("");
      return;
    }
    const client = customersList.find(c => c.id === parseInt(clientId));
    if (client) {
      setCustomerId(client.id);
      setCustomerName(client.name);
      setAddress(client.address || "");
      setMobile(client.contact || "");
      const assignment = agentClientsList?.find(ac => ac.clientId === client.id);
      if (assignment) {
        const matchedAgent = representativesList?.find(r => r.name === assignment.agentName);
        if (matchedAgent) {
          setRepresentativeId(matchedAgent.repId);
          setRepresentativeName(matchedAgent.name);
          setRepresentativeMobile(matchedAgent.mobile || "");
        } else {
          setRepresentativeId(null);
          setRepresentativeName("");
          setRepresentativeMobile("");
        }
      } else {
        setRepresentativeId(null);
        setRepresentativeName("");
        setRepresentativeMobile("");
      }
    }
  };

  const selectRepresentative = (repId: string) => {
    if (!repId) { setRepresentativeId(null); setRepresentativeName(""); setRepresentativeMobile(""); return; }
    const rep = representativesList?.find(r => r.id === repId);
    if (rep) {
      setRepresentativeId(rep.repId);
      setRepresentativeName(rep.name);
      setRepresentativeMobile(rep.mobile || "");
    }
  };

  const handleApprove = (invoiceId: number) => {
    approveInvoice(invoiceId, {
      onSuccess: () => {
        toast({ title: t("Invoice approved successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to approve invoice"), description: err.message, variant: "destructive" });
      },
    });
  };

  const handleDeleteInvoice = async () => {
    if (!deleteInvoiceData) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(deleteInvoiceData.id, {
        onSuccess: () => {
          toast({ title: t("Invoice deleted successfully") });
          setDeleteInvoiceData(null);
        },
        onError: (err: any) => {
          toast({ title: t("Failed to delete invoice"), description: err.message, variant: "destructive" });
        },
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const userRole = user?.role || 'user';

  const formatIQD = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return num.toLocaleString('en-US') + ' IQD';
  };

  const [, navigate] = useLocation();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-sales-invoice-iqd-title">
            <IconDinar className="h-8 w-8 text-blue-600" />
            {isEditMode ? t('Edit Sales Invoice - IQD') : t('Sales Invoice - IQD')}
          </h1>
          <p className="text-muted-foreground mt-1">{isEditMode ? t('Edit sales invoice in Iraqi Dinar') : t('Create sales invoice in Iraqi Dinar')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/sales-management")} data-testid="button-back-sales-management">
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('Sales Management')}
          </Button>
          <Button variant="outline" onClick={resetForm} data-testid="button-reset-sales-iqd-form">
            <RotateCcw className="w-5 h-5 mr-2" />
            {t('Reset')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-save-sales-invoice-iqd">
            {(isSaving || isUpdating) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {isEditMode ? t('Update Invoice') : (userRole === 'sales_rep' ? t('Send for Approval') : t('Save Invoice'))}
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
              <Label className="text-xs font-semibold text-muted-foreground">{t('Invoice #')}</Label>
              <Input value={invoiceNumber} readOnly className="font-mono bg-muted/50 cursor-not-allowed" data-testid="input-sales-iqd-invoice-number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Date')}</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} disabled={userRole === 'sales_rep'} data-testid="input-sales-iqd-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Time')}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={userRole === 'sales_rep'} data-testid="input-sales-iqd-time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Invoice Type')}</Label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger data-testid="select-sales-iqd-invoice-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('Cash')}</SelectItem>
                  <SelectItem value="credit">{t('Credit')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Warehouse')}</Label>
              <SearchSelect
                items={warehousesList || []}
                value={warehouseId ? String(warehouseId) : ""}
                onValueChange={(v) => {
                  if (!v) { setWarehouseId(null); setWarehouseName(""); return; }
                  const wh = warehousesList?.find(w => w.id === parseInt(v));
                  if (wh) { setWarehouseId(wh.id); setWarehouseName(wh.name); }
                }}
                placeholder={t('Select Warehouse')}
                data-testid="select-sales-iqd-warehouse"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Customer Name')}</Label>
              <CustomerSearchSelect
                key={`cust-${formKey}`}
                customers={customersList}
                value={customerId ? String(customerId) : ""}
                onValueChange={selectCustomer}
                placeholder={t('Select Customer')}
                data-testid="select-iqd-customer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Address')}</Label>
              <AddressSearchSelect
                addresses={addressesList || []}
                value={address}
                onValueChange={setAddress}
                placeholder={t('Select Address')}
                data-testid="select-sales-iqd-address"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Mobile')}</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder={t('Mobile number...')} data-testid="input-sales-iqd-mobile" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Representative Name')}</Label>
              <SearchSelect
                items={representativesList || []}
                value={representativesList?.find(r => r.repId === representativeId)?.id || ""}
                onValueChange={selectRepresentative}
                placeholder={t('Select Representative')}
                data-testid="select-sales-iqd-rep-name"
                disabled={userRole === 'sales_rep'}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Representative Mobile')}</Label>
              <Input value={representativeMobile} onChange={(e) => setRepresentativeMobile(e.target.value)} placeholder={t('Rep mobile...')} readOnly className="bg-muted/50" disabled={userRole === 'sales_rep'} data-testid="input-sales-iqd-rep-mobile" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Driver Name')}</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder={t('Driver name...')} data-testid="input-sales-iqd-driver-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Driver Mobile')}</Label>
              <Input value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} placeholder={t('Driver mobile...')} data-testid="input-sales-iqd-driver-mobile" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Vehicle Number')}</Label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder={t('Vehicle number...')} data-testid="input-sales-iqd-vehicle-number" />
            </div>
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Note')}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Notes...')} data-testid="input-sales-iqd-note" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">{t('Products')}</CardTitle>
            <div className="flex items-center gap-2">
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
                  data-testid="input-sales-iqd-barcode"
                />
              </div>
              <Button variant="outline" size="sm" onClick={addRow} data-testid="button-sales-iqd-add-row">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
                  <TableHead className="text-primary-foreground text-center w-12">#</TableHead>
                  <TableHead className="text-primary-foreground min-w-[120px]">{t('Product')}</TableHead>
                  <TableHead className="text-primary-foreground w-[90px]">{t('Product Code')}</TableHead>
                  <TableHead className="text-primary-foreground w-[130px]">{t('Quantity')}</TableHead>
                  <TableHead className="text-primary-foreground w-[70px]">{t('Gift')}</TableHead>
                  <TableHead className="text-primary-foreground w-[80px]">{t('Unit')}</TableHead>
                  <TableHead className="text-primary-foreground w-[130px]">{t('Weight')}</TableHead>
                  <TableHead className="text-primary-foreground w-[110px]">{t('Selling Price')}</TableHead>
                  <TableHead className="text-primary-foreground w-[120px]">{t('Amount')}</TableHead>
                  <TableHead className="text-primary-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/30" data-testid={`row-sales-iqd-item-${index}`}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="p-1">
                      <ProductSearchSelect
                        products={products || []}
                        value={item.productId}
                        onSelect={(val) => selectProduct(index, val)}
                        onAfterSelect={() => {
                          const el = document.querySelector(`[data-testid="input-sales-iqd-quantity-${index}"]`) as HTMLInputElement;
                          if (el) el.focus();
                        }}
                        data-testid={`select-sales-iqd-product-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <ProductCodeSearchSelect
                        products={products || []}
                        value={item.productCode}
                        onSelect={(val) => selectProduct(index, val)}
                        data-testid={`input-sales-iqd-product-code-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center gap-0.5" dir="ltr">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-8 shrink-0"
                          onClick={() => {
                            const cur = parseFloat(item.quantity || "0");
                            if (cur > 0) updateItem(index, "quantity", String(cur - 1));
                          }}
                          data-testid={`button-decrease-iqd-quantity-${index}`}
                        >
                          <span className="text-lg font-bold">−</span>
                        </Button>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          className="h-9 text-sm text-center w-20"
                          data-testid={`input-sales-iqd-quantity-${index}`}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-8 shrink-0"
                          onClick={() => {
                            const cur = parseFloat(item.quantity || "0");
                            updateItem(index, "quantity", String(cur + 1));
                          }}
                          data-testid={`button-increase-iqd-quantity-${index}`}
                        >
                          <span className="text-lg font-bold">+</span>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={item.gift}
                        onChange={(e) => updateItem(index, "gift", e.target.value)}
                        className="h-9 text-sm text-center font-mono w-16 text-purple-600"
                        placeholder="0"
                        data-testid={`input-sales-iqd-gift-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      {(() => {
                        const prod = item.productId ? products?.find(p => p.id === item.productId) : null;
                        const sameUnit = prod && prod.bigUnit === prod.smallUnit;
                        if (sameUnit) {
                          return (
                            <div className="flex items-center justify-center h-9 px-2 rounded bg-muted/50 text-sm font-semibold" data-testid={`select-sales-iqd-unit-${index}`}>
                              {resolveUnitName(prod.bigUnit, unitsList)}
                            </div>
                          );
                        }
                        return (
                          <Select
                            value={item.unit}
                            onValueChange={(val) => updateItem(index, "unit", val)}
                          >
                            <SelectTrigger className="h-9 text-sm" data-testid={`select-sales-iqd-unit-${index}`}>
                              <SelectValue placeholder={t('Unit')} />
                            </SelectTrigger>
                            <SelectContent>
                              {prod ? (
                                <>
                                  <SelectItem value={prod.bigUnit}>
                                    {resolveUnitName(prod.bigUnit, unitsList)}
                                  </SelectItem>
                                  <SelectItem value={prod.smallUnit}>
                                    {resolveUnitName(prod.smallUnit, unitsList)}
                                  </SelectItem>
                                </>
                              ) : null}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.weight}
                        readOnly
                        className="h-9 text-sm text-center font-mono bg-muted/50"
                        placeholder="0"
                        data-testid={`input-sales-iqd-weight-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItem(index, "price", e.target.value)}
                        className="h-9 text-sm text-center font-mono"
                        data-testid={`input-sales-iqd-price-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center justify-center h-9 px-2 rounded bg-blue-50 dark:bg-blue-950/30 font-mono text-sm font-bold text-blue-700 dark:text-blue-400">
                        {parseFloat(item.amount || "0").toLocaleString('en-US')} IQD
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeRow(index)}
                        disabled={items.length <= 1}
                        data-testid={`button-remove-sales-iqd-row-${index}`}
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
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border p-2 text-center">
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{t('Products')}</p>
                <p className="text-xl font-bold text-primary" data-testid="text-sales-iqd-total-items">{totalItems}</p>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{t('Total Quantity')}</p>
                <p className="text-xl font-bold text-primary" data-testid="text-sales-iqd-total-quantity">{totalQuantity}</p>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{t('Total Weight')}</p>
                <p className="text-xl font-bold text-primary" data-testid="text-sales-iqd-total-weight">{totalWeight}</p>
              </div>
              <div className={`rounded-lg border p-2 text-center ${openingBalance > 0 ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : openingBalance < 0 ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : ''}`}>
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{t('Opening Balance')}</p>
                <p className={`text-xl font-bold ${openingBalance > 0 ? 'text-red-600' : openingBalance < 0 ? 'text-green-600' : 'text-primary'}`} data-testid="text-sales-iqd-opening-balance">{fmtIqd(openingBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm border-blue-200 dark:border-blue-900">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('Invoice Total')}</span>
              <span className="font-mono font-bold text-lg" data-testid="text-sales-iqd-subtotal">{subtotal.toLocaleString('en-US')} IQD</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('Amount Received')}</span>
              <Input
                type="number"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-32 text-right font-mono"
                placeholder="0"
                data-testid="input-sales-iqd-amount-paid"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('Discount %')}</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => {
                  const pct = e.target.value;
                  setDiscountPercent(pct);
                  const pctVal = parseFloat(pct) || 0;
                  setDiscount(Math.round(subtotal * pctVal * 0.01).toString());
                }}
                className="w-32 text-right font-mono"
                placeholder="0"
                data-testid="input-sales-iqd-discount-percent"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('Invoice Discount')}</span>
              <Input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => {
                  setDiscount(e.target.value);
                  const discVal = parseFloat(e.target.value) || 0;
                  if (subtotal > 0) {
                    setDiscountPercent(((discVal / subtotal) * 100).toFixed(2));
                  }
                }}
                className="w-32 text-right font-mono"
                placeholder="0"
                data-testid="input-sales-iqd-discount"
              />
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-red-600">{t('Remaining')}</span>
              <span className="font-mono font-bold text-xl text-red-600" data-testid="text-sales-iqd-remaining">
                {remaining.toLocaleString('en-US')} IQD
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-blue-600" />
              {t('Invoice History')}
              <Badge variant="secondary" className="ml-2">
                {(() => {
                  const filtered = (invoicesList as SalesInvoice[] || []).filter(i => {
                    if (i.currency !== 'IQD') return false;
                    if (userRole === 'sales_rep' && i.createdBy !== user?.username) return false;
                    if (historyCustomerFilter !== 'all' && i.customerId !== parseInt(historyCustomerFilter)) return false;
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
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input placeholder={t('Search by number...')} value={searchNumber} onChange={(e) => setSearchNumber(e.target.value)} className="w-36 h-9" data-testid="input-search-sales-iqd-invoice-number" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('Customer')}</Label>
                <div className="w-48">
                  <CustomerSearchSelect
                    customers={customersList}
                    value={historyCustomerFilter}
                    onValueChange={(v) => setHistoryCustomerFilter(v || "all")}
                    showAllOption
                    allOptionLabel={t('All Customers')}
                    placeholder={t('All Customers')}
                    inputClassName="h-9 text-sm"
                    data-testid="select-history-iqd-customer-filter"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} disabled={userRole === 'sales_rep'} className="w-36 h-9" data-testid="input-sales-iqd-history-start-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} disabled={userRole === 'sales_rep'} className="w-36 h-9" data-testid="input-sales-iqd-history-end-date" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const filteredInvoices = (invoicesList as SalesInvoice[] || []).filter(i => {
              if (i.currency !== 'IQD') return false;
              if (userRole === 'sales_rep' && i.createdBy !== user?.username) return false;
              if (historyCustomerFilter !== 'all' && i.customerId !== parseInt(historyCustomerFilter)) return false;
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
            return (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t('Invoice #')}</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Customer')}</TableHead>
                      <TableHead>{t('Type')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead className="text-right">{t('Total')}</TableHead>
                      <TableHead className="text-right">{t('Amount Paid')}</TableHead>
                      <TableHead className="text-right">{t('Discount')}</TableHead>
                      <TableHead className="text-right">{t('Remaining')}</TableHead>
                      <TableHead>{t('Created By')}</TableHead>
                      <TableHead className="text-center">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv: SalesInvoice, idx) => (
                      <TableRow key={inv.id} data-testid={`row-sales-iqd-history-${inv.id}`}>
                        <TableCell className="text-sm font-bold">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-bold font-mono">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-sm font-bold">{formatDate(inv.date)}</TableCell>
                        <TableCell className="text-sm font-bold">{inv.customerName}</TableCell>
                        <TableCell>
                          <Badge variant={inv.invoiceType === 'cash' ? 'default' : 'secondary'} className="text-sm">
                            {inv.invoiceType === 'cash' ? t('Cash') : t('Credit')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inv.status === 'approved' ? (
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
                        <TableCell className="text-right text-sm font-mono font-bold">{formatIQD(inv.subtotal)}</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold text-green-600">{formatIQD(inv.amountPaid)}</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold text-orange-600">{formatIQD(inv.discount)}</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold text-red-600">{formatIQD(inv.remaining)}</TableCell>
                        <TableCell className="text-sm font-semibold">{inv.createdBy || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => { setReportInvoiceId(inv.id); setReportOpen(true); }} data-testid={`btn-view-sales-iqd-invoice-${inv.id}`}>
                              <Eye className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => startEdit(inv.id)} data-testid={`btn-edit-sales-iqd-invoice-${inv.id}`}>
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteInvoiceData({ id: inv.id, number: inv.invoiceNumber })} data-testid={`btn-delete-sales-iqd-invoice-${inv.id}`}>
                              <Trash2 className="h-5 w-5" />
                            </Button>
                            {(userRole === 'admin' || userRole === 'user') && inv.status === 'pending' && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(inv.id)} disabled={isApproving} data-testid={`btn-approve-sales-iqd-invoice-${inv.id}`}>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {t('Approve')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInvoices.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell colSpan={6} className="text-right font-bold text-base">{t('Total')}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base">{formatIQD(totSubtotal)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-green-600">{formatIQD(totAmountPaid)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-orange-600">{formatIQD(totDiscount)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-red-600">{formatIQD(totRemaining)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                    {filteredInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
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

      <SalesInvoiceReport
        invoiceId={reportInvoiceId}
        open={reportOpen}
        onOpenChange={setReportOpen}
        currency="IQD"
      />

      <AlertDialog open={!!deleteInvoiceData} onOpenChange={(open) => { if (!open) setDeleteInvoiceData(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will permanently delete invoice")} #{deleteInvoiceData?.number}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("No")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvoice} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-sales-iqd-invoice">
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
              {t("Yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
