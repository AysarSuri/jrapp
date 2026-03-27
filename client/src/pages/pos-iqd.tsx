import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNextSalesInvoiceNumber, useCreateSalesInvoice, useSalesInvoices, useApproveSalesInvoice, useDeleteSalesInvoice } from "@/hooks/use-sales-invoices";
import { useQuery } from "@tanstack/react-query";
import type { Product, Client, SalesInvoice, Category, CategoryGroup } from "@shared/schema";
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
import { Trash2, Save, Loader2, FileText, RotateCcw, ListOrdered, CheckCircle, Clock, Pencil, Search, Eye, ScanBarcode, Star } from "lucide-react";
import { IconDollar, IconPosUsd, IconProduct } from "@/components/erp-icons";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fmtIqd, formatDate } from "@/lib/format-utils";
import { useUnits } from "@/hooks/use-units";
import SalesInvoiceReport from "@/components/sales-invoice-report";
import { AddressSearchSelect } from "@/components/address-search-select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

export default function PosIqdPage() {
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
  const [selectedCategory, setSelectedCategory] = useState<string>("__favorites__");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [productNameSearch, setProductNameSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  const { data: units } = useUnits();
  const unitsList = units || [];

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const { data: categoryGroups } = useQuery<CategoryGroup[]>({
    queryKey: ["/api/category-groups"],
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

  const selectedCategoryId = categories?.find(c => c.name === selectedCategory)?.id;
  const groupsForCategory = categoryGroups?.filter(g => g.categoryId === selectedCategoryId) || [];
  const isFavoritesMode = selectedCategory === "__favorites__";
  const categoryProducts = products?.filter(p => !p.hidden && (isFavoritesMode ? p.favorite : p.category === selectedCategory) && (selectedGroup ? p.groupName === selectedGroup : true)) || [];

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
  const [items, setItems] = useState<InvoiceItem[]>([]);
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

  useEffect(() => {
    if (categories?.length && !selectedCategory) {
      setSelectedCategory(categories[0].name);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      }));
      setItems(mappedItems);
      setFormKey(k => k + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast({ title: t("Failed to load invoice for editing"), variant: "destructive" });
    }
  };

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
  const totalQuantity = items.reduce((sum, i) => sum + parseFloat(i.quantity || "0"), 0);
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

  const addProductToItems = useCallback((product: Product) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(i => i.productId === product.id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        const curQty = parseFloat(updated[existingIndex].quantity || "0");
        const newQty = curQty + 1;
        const gift = parseFloat(updated[existingIndex].gift || "0");
        const unitWeight = parseFloat(product.weight || "0");
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: String(newQty),
          weight: ((newQty + gift) * unitWeight).toFixed(2),
          amount: (newQty * parseFloat(updated[existingIndex].price || "0")).toFixed(2),
        };
        return updated;
      }
      const qty = 1;
      const gift = 0;
      const unitWeight = parseFloat(product.weight || "0");
      const newItem: InvoiceItem = {
        productId: product.id,
        productCode: product.barcode,
        productName: getProductName(product),
        quantity: String(qty),
        gift: "0",
        unit: product.bigUnit,
        weight: ((qty + gift) * unitWeight).toFixed(2),
        price: product.bigUnitPriceIqd,
        amount: (qty * parseFloat(product.bigUnitPriceIqd)).toFixed(2),
      };
      return [...prev, newItem];
    });
  }, []);

  const handleBarcodeScan = useCallback((barcode: string) => {
    if (!barcode.trim()) return;
    const product = products?.find(p => p.barcode === barcode.trim() && !p.hidden);
    if (!product) {
      toast({ title: t("Product not found for barcode") + ": " + barcode, variant: "destructive" });
      setBarcodeInput("");
      barcodeRef.current?.focus();
      return;
    }
    addProductToItems(product);
    setBarcodeInput("");
    barcodeRef.current?.focus();
  }, [products, t, toast, addProductToItems]);

  const removeRow = (index: number) => {
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
    setItems([]);
    setBarcodeInput("");
    setFormKey(k => k + 1);
    setDate(new Date().toISOString().split("T")[0]);
    setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    setTimeout(() => barcodeRef.current?.focus(), 100);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-sales-category-title">
            <IconPosUsd className="h-8 w-8 text-purple-600" />
            {isEditMode ? t('Edit Sales Invoice') : t('POS IQD')}
          </h1>
          <p className="text-muted-foreground mt-1">{isEditMode ? t('Edit sales invoice') : t('Point of sale - IQD currency')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} data-testid="button-reset-sales-category-form">
            <RotateCcw className="w-5 h-5 mr-2" />
            {t('Reset')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUpdating} className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="button-save-sales-category-invoice">
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
              <Input value={invoiceNumber} readOnly className="font-mono bg-muted/50 cursor-not-allowed" data-testid="input-sales-category-invoice-number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Date')}</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} disabled={userRole === 'sales_rep'} data-testid="input-sales-category-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Time')}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={userRole === 'sales_rep'} data-testid="input-sales-category-time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Invoice Type')}</Label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger data-testid="select-sales-category-invoice-type">
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
                data-testid="select-sales-category-warehouse"
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
                data-testid="select-sales-category-customer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Address')}</Label>
              <AddressSearchSelect
                addresses={addressesList || []}
                value={address}
                onValueChange={setAddress}
                placeholder={t('Select Address')}
                data-testid="select-sales-category-address"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Mobile')}</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder={t('Mobile number...')} data-testid="input-sales-category-mobile" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Representative Name')}</Label>
              <SearchSelect
                items={representativesList || []}
                value={representativesList?.find(r => r.repId === representativeId)?.id || ""}
                onValueChange={selectRepresentative}
                placeholder={t('Select Representative')}
                data-testid="select-pos-rep-name"
                disabled={userRole === 'sales_rep'}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Representative Mobile')}</Label>
              <Input value={representativeMobile} onChange={(e) => setRepresentativeMobile(e.target.value)} placeholder={t('Rep mobile...')} readOnly className="bg-muted/50" disabled={userRole === 'sales_rep'} data-testid="input-sales-category-rep-mobile" />
            </div>
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Note')}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Notes...')} data-testid="input-sales-category-note" />
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <div className="flex items-end gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <ScanBarcode className="w-5 h-5 text-purple-600" />
                    {t('Scan Barcode')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <ScanBarcode className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        ref={barcodeRef}
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBarcodeScan(barcodeInput);
                          }
                        }}
                        placeholder={t('Scan a barcode to add products')}
                        className="h-11 text-base font-mono ps-11"
                        autoFocus
                        data-testid="input-sales-category-barcode"
                      />
                    </div>
                    <Button onClick={() => handleBarcodeScan(barcodeInput)} className="h-11 bg-purple-600 hover:bg-purple-700 text-white" data-testid="button-sales-category-barcode-add">
                      <Search className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <IconProduct className="w-5 h-5 text-green-600" />
                    {t('Product Name')}
                  </Label>
                  <div className="relative" ref={productSearchRef}>
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        value={productNameSearch}
                        onChange={(e) => {
                          setProductNameSearch(e.target.value);
                          setShowProductDropdown(e.target.value.trim().length > 0);
                        }}
                        onFocus={() => {
                          if (productNameSearch.trim().length > 0) setShowProductDropdown(true);
                        }}
                        placeholder={t('Search product name...')}
                        className="h-11 text-base ps-11"
                        data-testid="input-pos-iqd-product-name-search"
                      />
                    </div>
                    {showProductDropdown && productNameSearch.trim() && (() => {
                      const q = productNameSearch.toLowerCase();
                      const matches = (products || []).filter(p => !p.hidden && (
                        getProductName(p).toLowerCase().includes(q) ||
                        p.name.toLowerCase().includes(q) ||
                        (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
                        p.barcode.toLowerCase().includes(q)
                      )).slice(0, 10);
                      return matches.length > 0 ? (
                        <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                          {matches.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-start px-3 py-2 hover:bg-accent text-sm flex items-center justify-between gap-2"
                              onClick={() => {
                                addProductToItems(p);
                                setProductNameSearch("");
                                setShowProductDropdown(false);
                              }}
                              data-testid={`product-name-result-${p.id}`}
                            >
                              <span className="font-semibold truncate">{getProductName(p)}</span>
                              <span className="text-xs text-muted-foreground shrink-0">{p.barcode}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
                          {t('No products found')}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* POS Layout: Left = Categories + Product Grid | Right = Selected Items + Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT SIDE: Category Product Grid */}
        <div className="space-y-4">

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <IconPosUsd className="w-5 h-5 text-purple-600" />
                {t('Products by Category')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  <Button
                    variant={isFavoritesMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setSelectedCategory("__favorites__"); setSelectedGroup(""); }}
                    className={isFavoritesMode ? "bg-yellow-500 hover:bg-yellow-600 text-white shrink-0" : "shrink-0"}
                    data-testid="button-sales-category-favorites"
                  >
                    <Star className="w-5 h-5 me-1 fill-current" />
                    {t('Favorites')}
                  </Button>
                  {categories?.map(cat => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setSelectedCategory(cat.name); setSelectedGroup(""); }}
                      className={selectedCategory === cat.name ? "bg-purple-600 hover:bg-purple-700 text-white shrink-0" : "shrink-0"}
                      data-testid={`button-sales-category-tab-${cat.id}`}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {groupsForCategory.length > 0 && (
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-2">
                    <Button
                      variant={selectedGroup === "" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedGroup("")}
                      className={selectedGroup === "" ? "bg-orange-500 hover:bg-orange-600 text-white shrink-0" : "shrink-0"}
                      data-testid="button-sales-group-all"
                    >
                      {t('All')}
                    </Button>
                    {groupsForCategory.map(grp => (
                      <Button
                        key={grp.id}
                        variant={selectedGroup === grp.name ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedGroup(grp.name)}
                        className={selectedGroup === grp.name ? "bg-orange-500 hover:bg-orange-600 text-white shrink-0" : "shrink-0"}
                        data-testid={`button-sales-group-tab-${grp.id}`}
                      >
                        {grp.name}
                        <Badge variant="secondary" className="ms-1.5 text-xs">{products?.filter(p => !p.hidden && p.category === selectedCategory && p.groupName === grp.name).length || 0}</Badge>
                      </Button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}

              <div className="max-h-[500px] overflow-y-auto space-y-3">
                {categoryProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('No products found in this category')}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2">
                    {categoryProducts.map(product => {
                      const inCart = items.find(i => i.productId === product.id);
                      const cartQty = inCart ? parseFloat(inCart.quantity || "0") : 0;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addProductToItems(product)}
                          className={`relative rounded-md border p-2 text-start transition-colors hover:bg-muted/50 ${
                            cartQty > 0
                              ? "border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950/30"
                              : "border-border"
                          }`}
                          data-testid={`button-sales-category-product-${product.id}`}
                        >
                          {product.image ? (
                            <div className="w-full aspect-square mb-1.5 rounded overflow-hidden bg-muted/30">
                              <img src={product.image} alt={getProductName(product)} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-full aspect-square mb-1.5 rounded bg-muted/30 flex items-center justify-center">
                              <IconProduct className="w-6 h-6 text-muted-foreground/50" />
                            </div>
                          )}
                          <p className="text-xs font-semibold leading-tight truncate" data-testid={`text-sales-category-product-name-${product.id}`}>
                            {getProductName(product)}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{product.barcode}</p>
                          <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-0.5">{fmtIqd(product.bigUnitPriceIqd)} IQD</p>
                          {cartQty > 0 && (
                            <Badge className="absolute top-1 end-1 bg-purple-600 text-white text-xs" data-testid={`badge-sales-category-qty-${product.id}`}>
                              {cartQty}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE: Selected Items + Summary */}
        <div className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListOrdered className="w-5 h-5" />
                {t('Selected Products')}
                {items.length > 0 && <Badge variant="secondary" className="ml-1">{items.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <IconProduct className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">{t('Scan a barcode to add products')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-purple-600 text-white hover:bg-purple-600">
                        <TableHead className="text-white text-center w-8">#</TableHead>
                        <TableHead className="text-white">{t('Product')}</TableHead>
                        <TableHead className="text-white w-[120px]">{t('Quantity')}</TableHead>
                        <TableHead className="text-white w-[80px]">{t('Price')}</TableHead>
                        <TableHead className="text-white w-[90px]">{t('Amount')}</TableHead>
                        <TableHead className="text-white w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/30" data-testid={`row-sales-category-item-${index}`}>
                          <TableCell className="text-center font-mono text-xs text-muted-foreground p-1">{index + 1}</TableCell>
                          <TableCell className="p-1">
                            <div>
                              <p className="text-sm font-semibold truncate max-w-[150px]">{item.productName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{item.productCode}</p>
                            </div>
                          </TableCell>
                          <TableCell className="p-1">
                            <div className="flex items-center gap-0.5" dir="ltr">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => {
                                  const cur = parseFloat(item.quantity || "0");
                                  if (cur > 1) {
                                    updateItem(index, "quantity", String(cur - 1));
                                  } else {
                                    removeRow(index);
                                  }
                                }}
                                data-testid={`button-sales-category-decrease-qty-${index}`}
                              >
                                <span className="text-base font-bold">-</span>
                              </Button>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                className="h-7 text-sm text-center w-14"
                                data-testid={`input-sales-category-quantity-${index}`}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => {
                                  const cur = parseFloat(item.quantity || "0");
                                  updateItem(index, "quantity", String(cur + 1));
                                }}
                                data-testid={`button-sales-category-increase-qty-${index}`}
                              >
                                <span className="text-base font-bold">+</span>
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(e) => updateItem(index, "price", e.target.value)}
                              className="h-7 text-sm text-center font-mono w-20"
                              data-testid={`input-sales-category-price-${index}`}
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <div className="flex items-center justify-center h-7 px-1 rounded bg-purple-50 dark:bg-purple-950/30 font-mono text-xs font-bold text-purple-700 dark:text-purple-400">
                              {fmtIqd(item.amount || "0")} IQD
                            </div>
                          </TableCell>
                          <TableCell className="p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeRow(index)}
                              data-testid={`button-remove-sales-category-row-${index}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="rounded-lg border p-2 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{t('Products')}</p>
                  <p className="text-lg font-bold text-primary" data-testid="text-sales-category-total-items">{totalItems}</p>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{t('Total Quantity')}</p>
                  <p className="text-lg font-bold text-primary" data-testid="text-sales-category-total-quantity">{totalQuantity}</p>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{t('Total Weight')}</p>
                  <p className="text-lg font-bold text-primary" data-testid="text-sales-category-total-weight">{totalWeight}</p>
                </div>
                <div className={`rounded-lg border p-2 text-center ${openingBalance > 0 ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : openingBalance < 0 ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : ''}`}>
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{t('Opening Balance')}</p>
                  <p className={`text-lg font-bold ${openingBalance > 0 ? 'text-red-600' : openingBalance < 0 ? 'text-green-600' : 'text-primary'}`} data-testid="text-sales-category-opening-balance">{fmtIqd(openingBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-900 shadow-sm">
            <CardContent className="pt-4 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('Invoice Total')}</span>
                <span className="font-mono font-bold text-lg" data-testid="text-sales-category-subtotal">{fmtIqd(subtotal)} IQD</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('Amount Received')}</span>
                <Input
                  type="number"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-28 text-right font-mono h-8"
                  placeholder="0.00"
                  data-testid="input-sales-category-amount-paid"
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
                    setDiscount((subtotal * pctVal * 0.01).toFixed(2));
                  }}
                  className="w-28 text-right font-mono h-8"
                  placeholder="0"
                  data-testid="input-sales-category-discount-percent"
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
                  className="w-28 text-right font-mono h-8"
                  placeholder="0.00"
                  data-testid="input-sales-category-discount"
                />
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-red-600">{t('Remaining')}</span>
                <span className="font-mono font-bold text-xl text-red-600" data-testid="text-sales-category-remaining">
                  {fmtIqd(remaining)} IQD
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-purple-600" />
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
                <Input placeholder={t('Search by number...')} value={searchNumber} onChange={(e) => setSearchNumber(e.target.value)} className="w-36 h-9" data-testid="input-search-pos-iqd-invoice-number" />
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
                    data-testid="select-sales-category-history-customer-filter"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} disabled={userRole === 'sales_rep'} className="w-36 h-9" data-testid="input-sales-category-history-start-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} disabled={userRole === 'sales_rep'} className="w-36 h-9" data-testid="input-sales-category-history-end-date" />
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
                      <TableHead className="text-center">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv: SalesInvoice, idx) => (
                      <TableRow key={inv.id} data-testid={`row-pos-iqd-history-${inv.id}`}>
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
                        <TableCell className="text-right text-sm font-mono font-bold">{fmtIqd(inv.subtotal)} IQD</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold text-green-600">{fmtIqd(inv.amountPaid)} IQD</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold text-orange-600">{fmtIqd(inv.discount)} IQD</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold text-red-600">{fmtIqd(inv.remaining)} IQD</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => { setReportInvoiceId(inv.id); setReportOpen(true); }} data-testid={`btn-view-pos-iqd-invoice-${inv.id}`}>
                              <Eye className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => startEdit(inv.id)} data-testid={`btn-edit-pos-iqd-invoice-${inv.id}`}>
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteInvoiceData({ id: inv.id, number: inv.invoiceNumber })} data-testid={`btn-delete-pos-iqd-invoice-${inv.id}`}>
                              <Trash2 className="h-5 w-5" />
                            </Button>
                            {(userRole === 'admin' || userRole === 'user') && inv.status === 'pending' && (
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleApprove(inv.id)} disabled={isApproving} data-testid={`btn-approve-pos-iqd-invoice-${inv.id}`}>
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
                        <TableCell className="text-right font-mono font-bold text-base">{fmtIqd(totSubtotal)} IQD</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-green-600">{fmtIqd(totAmountPaid)} IQD</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-orange-600">{fmtIqd(totDiscount)} IQD</TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-red-600">{fmtIqd(totRemaining)} IQD</TableCell>
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
            <AlertDialogAction onClick={handleDeleteInvoice} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-sales-category-invoice">
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
              {t("Yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
