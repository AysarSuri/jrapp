import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNextSalesReturnNumber, useCreateSalesReturn, useSalesReturns, useApproveSalesReturn, useDeleteSalesReturn } from "@/hooks/use-sales-returns";
import { useQuery } from "@tanstack/react-query";
import type { Product, Client, SalesReturn } from "@shared/schema";
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
import {
  Plus, Trash2, Save, Loader2, FileText, RotateCcw,
  ListOrdered, CheckCircle, Clock, Undo2, ChevronLeft, ChevronRight, Pencil, Eye, ArrowLeft,
} from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { useLocation } from "wouter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import { formatDate } from "@/lib/format-utils";
import SalesReturnReport from "@/components/sales-return-report";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ProductCodeSearchSelect from "@/components/product-code-search-select";
import ProductSearchSelect from "@/components/product-search-select";
import { useUnits } from "@/hooks/use-units";
import { AddressSearchSelect } from "@/components/address-search-select";

interface ReturnItem {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  gift: string;
  unit: string;
  price: string;
  amount: string;
  weight: string;
}

const emptyItem = (): ReturnItem => ({
  productId: null,
  productCode: "",
  productName: "",
  quantity: "",
  gift: "",
  unit: "",
  price: "",
  amount: "0",
  weight: "0",
});

export default function SalesReturnIqdPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: user } = useUser();
  const { data: nextNumber } = useNextSalesReturnNumber();
  const { mutate: createReturn, isPending: isSaving } = useCreateSalesReturn();
  const { mutate: approveReturn, isPending: isApproving } = useApproveSalesReturn();
  const { mutate: deleteReturn } = useDeleteSalesReturn();
  const { data: returnsList } = useSalesReturns();

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
  const { data: agentsList } = useQuery<{ id: string; name: string; mobile: string }[]>({
    queryKey: ["/api/agents"],
  });
  const { data: warehousesList } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/warehouses"],
  });

  const allCustomers = clients?.filter(c => c.type === "customer") || [];
  const customersList = user?.role === 'sales_rep'
    ? allCustomers.filter(c => agentClientsList?.some(ac => ac.agentUserId === user.id && ac.clientId === c.id))
    : allCustomers;

  const [returnNumber, setReturnNumber] = useState("");
  const [showStamp, setShowStamp] = useState(false);
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
  const [returnType, setReturnType] = useState("cash");
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([emptyItem()]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [filterReturnNumber, setFilterReturnNumber] = useState("");
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [filterCustomerName, setFilterCustomerName] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterDateTo, setFilterDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [reportReturnId, setReportReturnId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (nextNumber?.number && !isEditMode) {
      setReturnNumber(nextNumber.number);
    }
  }, [nextNumber, isEditMode]);

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalItems = items.filter(i => i.productCode && parseFloat(i.quantity || "0") > 0).length;
  const totalQuantity = items.reduce((sum, i) => sum + parseFloat(i.quantity || "0") + parseFloat(i.gift || "0"), 0);
  const totalWeight = items.reduce((sum, i) => sum + parseFloat(i.weight || "0"), 0);
  const amountPaidVal = parseFloat(amountPaid || "0");
  const remaining = subtotal - amountPaidVal;

  const formatIQD = (val: number) => val.toLocaleString("en-US");

  const updateItem = useCallback((index: number, field: keyof ReturnItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "price") {
        const qty = parseFloat(field === "quantity" ? value : updated[index].quantity || "0");
        const prc = parseFloat(field === "price" ? value : updated[index].price || "0");
        updated[index].amount = (qty * prc).toFixed(2);
      }
      if (field === "quantity" || field === "gift") {
        const prod = products?.find(p => p.id === updated[index].productId);
        const unitWeight = parseFloat(prod?.weight || "0");
        const qty = parseFloat(field === "quantity" ? value : updated[index].quantity || "0");
        const gift = parseFloat(field === "gift" ? value : updated[index].gift || "0");
        updated[index].weight = ((qty + gift) * unitWeight).toFixed(2);
      }
      return updated;
    });
  }, [products]);

  const selectProduct = useCallback((index: number, productId: string) => {
    if (!productId) { setItems(prev => { const u = [...prev]; u[index] = { ...u[index], productId: null, productCode: "", productName: "", unit: "", price: "0", gift: "", weight: "0", amount: "0" }; return u; }); return; }
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
    setTimeout(() => {
      const qtyInput = document.querySelector(`[data-testid="input-return-iqd-quantity-${index}"]`) as HTMLInputElement;
      if (qtyInput) { qtyInput.focus(); qtyInput.select(); }
    }, 50);
  }, [products]);

  const addRow = () => {
    setItems(prev => [...prev, emptyItem()]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
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
    setReturnType("cash");
    setWarehouseId(null);
    setWarehouseName("");
    setAmountPaid("");
    setItems([emptyItem()]);
    setDate(new Date().toISOString().split("T")[0]);
    setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    setInlineEditId(null);
    setIsEditMode(false);
  };

  const startEdit = async (returnId: number) => {
    try {
      const [retRes, itemsRes] = await Promise.all([
        fetch(`/api/sales-returns/${returnId}`, { credentials: "include" }),
        fetch(`/api/sales-returns/${returnId}/items`, { credentials: "include" }),
      ]);
      if (!retRes.ok || !itemsRes.ok) return;
      const ret = await retRes.json();
      const fetchedItems = await itemsRes.json();
      setInlineEditId(returnId);
      setIsEditMode(true);
      setReturnNumber(ret.returnNumber || "");
      setDate(typeof ret.date === "string" ? ret.date.split("T")[0] : new Date(ret.date).toISOString().split("T")[0]);
      setTime(ret.time || "");
      setCustomerId(ret.customerId || null);
      setCustomerName(ret.customerName || "");
      setAddress(ret.address || "");
      setMobile(ret.mobile || "");
      setRepresentativeId(ret.representativeId || null);
      setRepresentativeName(ret.representativeName || "");
      setRepresentativeMobile(ret.representativeMobile || "");
      setNote(ret.note || "");
      setDriverName(ret.driverName || "");
      setDriverMobile(ret.driverMobile || "");
      setVehicleNumber(ret.vehicleNumber || "");
      setReturnType(ret.returnType || "cash");
      setWarehouseId(ret.warehouseId || null);
      setWarehouseName(ret.warehouseName || "");
      setAmountPaid(ret.amountPaid || "");
      const mappedItems = fetchedItems.map((item: any) => ({
        productId: item.productId,
        productCode: item.productCode || "",
        productName: item.productName || "",
        quantity: item.quantity || "",
        gift: item.gift || "",
        unit: item.unit || "",
        price: item.price || "",
        amount: item.amount || "0",
      }));
      setItems([...mappedItems, emptyItem()]);
      setFormKey(k => k + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast({ title: t("Failed to load return for editing"), variant: "destructive" });
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

    const returnData = {
      returnNumber,
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
    }));

    if (isEditMode && inlineEditId) {
      apiRequest("PATCH", `/api/sales-returns/${inlineEditId}`, { returnData, items: itemsData })
        .then(() => {
          toast({ title: t("Sales return updated successfully") });
          queryClient.invalidateQueries({ queryKey: ["/api/sales-returns"] });
          queryClient.invalidateQueries({ queryKey: ["/api/sales-returns", inlineEditId] });
          resetForm();
        })
        .catch((err) => {
          toast({ title: t("Failed to save return"), description: err.message, variant: "destructive" });
        });
    } else {
      createReturn({ returnData, items: itemsData }, {
        onSuccess: () => {
          if (isRep) {
            toast({ title: t("Sales return sent for approval") });
          } else {
            toast({ title: t("Sales return saved successfully") });
          }
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to save return"), description: err.message, variant: "destructive" });
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
      setRepresentativeId(null);
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
        setRepresentativeName(assignment.agentName);
        const agent = agentsList?.find(a => a.id === assignment.agentUserId);
        setRepresentativeMobile(agent?.mobile || "");
        const matchedRep = representativesList?.find(r => r.name === assignment.agentName);
        setRepresentativeId(matchedRep?.repId || null);
      } else {
        setRepresentativeName("");
        setRepresentativeMobile("");
        setRepresentativeId(null);
      }
    }
  };

  const selectRepresentative = (repId: string) => {
    if (!repId) { setRepresentativeId(0); setRepresentativeName(""); setRepresentativeMobile(""); return; }
    const rep = representativesList?.find(r => r.id === repId);
    if (rep) {
      setRepresentativeId(rep.repId);
      setRepresentativeName(rep.name);
      setRepresentativeMobile(rep.mobile || "");
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

  const handleDelete = (returnId: number) => {
    deleteReturn(returnId, {
      onSuccess: () => {
        toast({ title: t("Return deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete return"), description: err.message, variant: "destructive" });
      },
    });
  };

  const userRole = user?.role || 'user';
  const iqdReturns = (returnsList as SalesReturn[] || []).filter(i => {
    if (i.currency !== 'IQD') return false;
    if (userRole === 'sales_rep' && i.createdBy !== user?.username) return false;
    if (filterReturnNumber && !i.returnNumber?.toLowerCase().includes(filterReturnNumber.toLowerCase())) return false;
    if (filterCustomerName && !i.customerName?.toLowerCase().includes(filterCustomerName.toLowerCase())) return false;
    if (filterDateFrom && i.date < filterDateFrom) return false;
    if (filterDateTo && i.date > filterDateTo) return false;
    return true;
  });
  const totalPages = Math.ceil(iqdReturns.length / pageSize);
  const safePage = Math.min(currentPage, totalPages || 1);
  const paginatedReturns = iqdReturns.slice((safePage - 1) * pageSize, safePage * pageSize);

  const [, navigate] = useLocation();

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-sales-return-iqd-title">
            <Undo2 className="h-8 w-8 text-orange-600" />
            {isEditMode ? t('Edit Sales Return - IQD') : t('Sales Return - IQD')}
          </h1>
          <p className="text-muted-foreground text-sm">{isEditMode ? t('Edit sales return in Iraqi Dinar') : t('Create sales return in Iraqi Dinar')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/sales-management")} data-testid="button-back-sales-management">
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('Sales Management')}
          </Button>
          <Button variant="outline" onClick={resetForm} data-testid="button-reset-return-iqd-form">
            <RotateCcw className="w-5 h-5 mr-2" />
            {t('Reset')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="button-save-sales-return-iqd">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {isEditMode ? t('Update Return') : (userRole === 'sales_rep' ? t('Send for Approval') : t('Save Return'))}
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
              <Input value={returnNumber} onChange={(e) => setReturnNumber(e.target.value)} className="font-mono bg-muted/30" data-testid="input-return-iqd-number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Date')}</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} disabled={userRole === 'sales_rep'} data-testid="input-return-iqd-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Time')}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={userRole === 'sales_rep'} data-testid="input-return-iqd-time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Return Type')}</Label>
              <Select value={returnType} onValueChange={setReturnType}>
                <SelectTrigger data-testid="select-return-iqd-type">
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
                data-testid="select-return-iqd-warehouse"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Customer Name')}</Label>
              <CustomerSearchSelect
                customers={customersList}
                value={customerId ? String(customerId) : ""}
                onValueChange={selectCustomer}
                placeholder={t('Select Customer')}
                data-testid="select-return-iqd-customer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Address')}</Label>
              <AddressSearchSelect
                addresses={addressesList || []}
                value={address}
                onValueChange={setAddress}
                placeholder={t('Select Address')}
                data-testid="select-return-iqd-address"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Mobile')}</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder={t('Mobile number...')} data-testid="input-return-iqd-mobile" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Representative Name')}</Label>
              <SearchSelect
                items={representativesList || []}
                value={representativesList?.find(r => r.repId === representativeId)?.id || ""}
                onValueChange={selectRepresentative}
                placeholder={t('Select Representative')}
                data-testid="select-return-iqd-representative"
                disabled={userRole === 'sales_rep'}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Representative Mobile')}</Label>
              <Input value={representativeMobile} onChange={(e) => setRepresentativeMobile(e.target.value)} placeholder={t('Rep mobile...')} readOnly={userRole === 'sales_rep'} className={userRole === 'sales_rep' ? "bg-muted/50" : ""} disabled={userRole === 'sales_rep'} data-testid="input-return-iqd-rep-mobile" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Driver Name')}</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder={t('Driver name...')} data-testid="input-return-iqd-driver-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Driver Mobile')}</Label>
              <Input value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} placeholder={t('Driver mobile...')} data-testid="input-return-iqd-driver-mobile" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Vehicle Number')}</Label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder={t('Vehicle number...')} data-testid="input-return-iqd-vehicle-number" />
            </div>
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Note')}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Notes...')} data-testid="input-return-iqd-note" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('Products')}</CardTitle>
          <Button variant="outline" size="sm" onClick={addRow} data-testid="button-return-iqd-add-row">
            <Plus className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
                  <TableHead className="text-primary-foreground text-center w-12">#</TableHead>
                  <TableHead className="text-primary-foreground min-w-[140px]">{t('Product')}</TableHead>
                  <TableHead className="text-primary-foreground w-[150px]">{t('Product Code')}</TableHead>
                  <TableHead className="text-primary-foreground w-[150px]">{t('Quantity')}</TableHead>
                  <TableHead className="text-primary-foreground w-[80px]">{t('Gift')}</TableHead>
                  <TableHead className="text-primary-foreground w-[100px]">{t('Unit')}</TableHead>
                  <TableHead className="text-primary-foreground w-[110px]">{t('Selling Price')}</TableHead>
                  <TableHead className="text-primary-foreground w-[120px]">{t('Amount')}</TableHead>
                  <TableHead className="text-primary-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/30" data-testid={`row-return-iqd-item-${index}`}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="p-1">
                      <ProductSearchSelect
                        products={products || []}
                        value={item.productId}
                        onSelect={(val) => selectProduct(index, val)}
                        data-testid={`select-return-iqd-product-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <ProductCodeSearchSelect
                        products={products || []}
                        value={item.productCode}
                        onSelect={(val) => selectProduct(index, val)}
                        data-testid={`input-return-iqd-product-code-${index}`}
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
                          data-testid={`button-decrease-return-iqd-qty-${index}`}
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
                          data-testid={`input-return-iqd-quantity-${index}`}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-8 shrink-0"
                          onClick={() => {
                            const cur = parseFloat(item.quantity || "0");
                            updateItem(index, "quantity", String(cur + 1));
                          }}
                          data-testid={`button-increase-return-iqd-qty-${index}`}
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
                        className="h-9 text-sm text-center w-16"
                        data-testid={`input-return-iqd-gift-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={item.unit}
                        onValueChange={(val) => updateItem(index, "unit", val)}
                      >
                        <SelectTrigger className="h-9 text-sm" data-testid={`select-return-iqd-unit-${index}`}>
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
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItem(index, "price", e.target.value)}
                        className="h-9 text-sm text-center font-mono"
                        data-testid={`input-return-iqd-price-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center justify-center h-9 px-2 rounded bg-orange-50 dark:bg-orange-950/30 font-mono text-sm font-bold text-orange-700 dark:text-orange-400">
                        {formatIQD(parseFloat(item.amount || "0"))} IQD
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeRow(index)}
                        disabled={items.length <= 1}
                        data-testid={`button-remove-return-iqd-row-${index}`}
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
                <p className="text-3xl font-bold text-primary" data-testid="text-return-iqd-total-items">{totalItems}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('Total Quantity')}</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-return-iqd-total-quantity">{totalQuantity}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('Total Weight')}</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-return-iqd-total-weight">{totalWeight}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm border-orange-200 dark:border-orange-900">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('Return Total')}</span>
              <span className="font-mono font-bold text-lg" data-testid="text-return-iqd-subtotal">{formatIQD(subtotal)} IQD</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('Paid Amount')}</span>
              <Input
                type="number"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-32 text-right font-mono"
                placeholder="0"
                data-testid="input-return-iqd-amount-paid"
              />
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-red-600">{t('Remaining')}</span>
              <span className="font-mono font-bold text-xl text-red-600" data-testid="text-return-iqd-remaining">
                {formatIQD(remaining)} IQD
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-orange-600" />
              {t('Return History')}
              <Badge variant="secondary" className="ml-2">{iqdReturns.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Switch id="show-stamp-filter" checked={showStamp} onCheckedChange={(checked) => setShowStamp(!!checked)} data-testid="switch-show-stamp" />
              <Label htmlFor="show-stamp-filter" className="text-sm font-bold cursor-pointer whitespace-nowrap">{t("Show Stamp")}</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Return #')}</Label>
              <SearchInput
                value={filterReturnNumber}
                onChange={(e) => { setFilterReturnNumber(e.target.value); setCurrentPage(1); }}
                onClear={() => { setFilterReturnNumber(""); setCurrentPage(1); }}
                placeholder={t('Search by return number')}
                className="h-9"
                data-testid="input-filter-return-number"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Customer Name')}</Label>
              <CustomerSearchSelect
                customers={customersList || []}
                value={filterCustomerId}
                onValueChange={(id) => {
                  if (!id) { setFilterCustomerId(""); setFilterCustomerName(""); setCurrentPage(1); return; }
                  setFilterCustomerId(id);
                  const c = customersList?.find(cu => cu.id === parseInt(id));
                  if (c) setFilterCustomerName(c.name);
                  setCurrentPage(1);
                }}
                placeholder={t('Search by customer name')}
                data-testid="input-filter-customer-name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">{t('From Date')}</Label>
              <DateInput
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                disabled={userRole === 'sales_rep'}
                className="h-9"
                data-testid="input-filter-date-from"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">{t('To Date')}</Label>
              <DateInput
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                disabled={userRole === 'sales_rep'}
                className="h-9"
                data-testid="input-filter-date-to"
              />
            </div>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('Return #')}</TableHead>
                  <TableHead>{t('Date')}</TableHead>
                  <TableHead>{t('Customer Name')}</TableHead>
                  <TableHead>{t('Representative')}</TableHead>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead>{t('Total')}</TableHead>
                  <TableHead>{t('Remaining')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Created By')}</TableHead>
                  <TableHead className="text-center">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReturns.map((ret, i) => (
                  <TableRow key={ret.id} data-testid={`row-return-iqd-history-${ret.id}`}>
                    <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                    <TableCell className="font-mono text-sm font-bold">{ret.returnNumber}</TableCell>
                    <TableCell className="font-mono text-sm">{formatDate(ret.date)}</TableCell>
                    <TableCell className="font-medium">{ret.customerName}</TableCell>
                    <TableCell>{ret.representativeName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={ret.returnType === 'cash' ? 'default' : 'secondary'}>
                        {ret.returnType === 'cash' ? t('Cash') : t('Credit')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatIQD(parseFloat(ret.subtotal))} IQD</TableCell>
                    <TableCell className="font-mono text-sm text-red-600">{formatIQD(parseFloat(ret.remaining))} IQD</TableCell>
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
                    <TableCell className="text-sm font-semibold">{ret.createdBy || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => { setReportReturnId(ret.id); setReportOpen(true); }} data-testid={`btn-view-sales-return-iqd-${ret.id}`}>
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => startEdit(ret.id)} data-testid={`btn-edit-sales-return-iqd-${ret.id}`}>
                          <Pencil className="h-5 w-5" />
                        </Button>
                        {ret.status === 'pending' && (userRole === 'admin' || userRole === 'user') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-green-600"
                            onClick={() => handleApprove(ret.id)}
                            disabled={isApproving}
                            data-testid={`button-approve-return-iqd-${ret.id}`}
                          >
                            <CheckCircle className="h-5 w-5" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              data-testid={`button-delete-return-iqd-${ret.id}`}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('This will permanently delete this return.')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(ret.id)}>{t('Yes')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedReturns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
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
                {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, iqdReturns.length)} {t('of')} {iqdReturns.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Button key={p} variant={p === safePage ? "default" : "outline"} size="icon" onClick={() => setCurrentPage(p)}>
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="icon" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SalesReturnReport
        returnId={reportReturnId}
        open={reportOpen}
        onOpenChange={setReportOpen}
        currency="IQD"
      />
    </div>
  );
}
