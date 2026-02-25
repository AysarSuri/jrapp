import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useNextPurchaseInvoiceNumber, useCreatePurchaseInvoice, usePurchaseInvoices } from "@/hooks/use-purchase-invoices";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Client, PurchaseInvoice } from "@shared/schema";
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
import {
  Plus, Trash2, Save, Loader2, Banknote, FileText, RotateCcw,
  ListOrdered, FileBarChart, ArrowLeft,
} from "lucide-react";
import PurchaseInvoiceReport from "@/components/purchase-invoice-report";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import { formatDate } from "@/lib/format-utils";
import { useUnits } from "@/hooks/use-units";

interface InvoiceItem {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
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

  const suppliersList = clients?.filter(c => c.type === "supplier") || [];

  const [invoiceNumber, setInvoiceNumber] = useState("");
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
  const [carExpense, setCarExpense] = useState("");
  const [customsExpense, setCustomsExpense] = useState("");
  const [otherExpenses, setOtherExpenses] = useState("");
  const [discount, setDiscount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reportInvoiceId, setReportInvoiceId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [historySupplierFilter, setHistorySupplierFilter] = useState<string>("all");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const editId = new URLSearchParams(window.location.search).get("edit");

  useEffect(() => {
    if (!editId && nextNumber?.number) {
      setInvoiceNumber(nextNumber.number);
    }
  }, [nextNumber, editId]);

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
  const totalQuantity = items.reduce((sum, i) => sum + parseFloat(i.quantity || "0"), 0);
  const totalWeight = items.reduce((sum, i) => sum + (parseFloat(i.weight || "0") * parseFloat(i.quantity || "0")), 0);
  const discountVal = parseFloat(discount || "0");
  const amountPaidVal = parseFloat(amountPaid || "0");
  const remaining = subtotal - discountVal - amountPaidVal;

  const getExpenseCost = (item: InvoiceItem) => {
    if (totalWeight === 0 || totalExpenses === 0) return 0;
    const itemWeight = parseFloat(item.weight || "0") * parseFloat(item.quantity || "0");
    return (itemWeight / totalWeight) * totalExpenses;
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
    setCarExpense("");
    setCustomsExpense("");
    setOtherExpenses("");
    setDiscount("");
    setAmountPaid("");
    setItems([emptyItem()]);
    setDate(new Date().toISOString().split("T")[0]);
    setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    setFormKey(k => k + 1);
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

    const invoiceData = {
      invoiceNumber,
      date,
      time,
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
          window.history.back();
        })
        .catch((err: any) => {
          toast({ title: t("Failed to update invoice"), description: err.message, variant: "destructive" });
        });
    } else {
      createInvoice({ invoice: invoiceData, items: itemsData }, {
        onSuccess: () => {
          toast({ title: t("Purchase invoice saved successfully") });
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to save invoice"), description: err.message, variant: "destructive" });
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

  const formatIQD = (val: number) => `${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} IQD`;

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
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Banknote className="h-8 w-8 text-orange-600" />
            {isEditMode ? t('Edit Purchase Invoice - IQD') : t('Purchase Invoice - IQD')}
          </h1>
          <p className="text-muted-foreground mt-1">{isEditMode ? t('Edit purchase invoice in Iraqi Dinar') : t('Create purchase invoice in Iraqi Dinar')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-purchase-iqd-invoice-history">
                <ListOrdered className="w-4 h-4 mr-2" />
                {t('Invoice History')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('Purchase Invoice History')}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">{t('Supplier')}</Label>
                  <Select value={historySupplierFilter} onValueChange={setHistorySupplierFilter}>
                    <SelectTrigger data-testid="select-history-iqd-supplier-filter">
                      <SelectValue placeholder={t('All Suppliers')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('All Suppliers')}</SelectItem>
                      {suppliersList.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">{t('From Date')}</Label>
                  <DateInput value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} data-testid="input-history-iqd-start-date" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">{t('To Date')}</Label>
                  <DateInput value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} data-testid="input-history-iqd-end-date" />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t('Invoice #')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Supplier')}</TableHead>
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('Total')}</TableHead>
                    <TableHead>{t('Remaining')}</TableHead>
                    <TableHead>{t('Report')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invoicesList as PurchaseInvoice[] || []).filter(i => {
                    if (i.currency !== 'IQD') return false;
                    if (historySupplierFilter !== 'all' && i.supplierId !== parseInt(historySupplierFilter)) return false;
                    const invDate = typeof i.date === 'string' ? i.date.split('T')[0] : new Date(i.date).toISOString().split('T')[0];
                    if (historyStartDate && invDate < historyStartDate) return false;
                    if (historyEndDate && invDate > historyEndDate) return false;
                    return true;
                  }).map((inv: PurchaseInvoice) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.id}</TableCell>
                      <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                      <TableCell>{formatDate(inv.date)}</TableCell>
                      <TableCell>{inv.supplierName}</TableCell>
                      <TableCell>
                        <Badge variant={inv.invoiceType === 'cash' ? 'default' : 'secondary'}>
                          {inv.invoiceType === 'cash' ? t('Cash') : t('Credit')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{Number(inv.subtotal).toLocaleString()} IQD</TableCell>
                      <TableCell className="font-mono text-red-600">{Number(inv.remaining).toLocaleString()} IQD</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReportInvoiceId(inv.id);
                            setReportOpen(true);
                            setHistoryOpen(false);
                          }}
                          data-testid={`button-report-iqd-invoice-${inv.id}`}
                        >
                          <FileBarChart className="w-4 h-4 mr-1" />
                          {t('Report')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={resetForm} data-testid="button-reset-purchase-iqd-form">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('Reset')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700" data-testid="button-save-purchase-iqd-invoice">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
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
              <Label className="text-xs font-semibold text-muted-foreground">{t('Invoice #')}</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="font-mono bg-muted/30" data-testid="input-purchase-iqd-invoice-number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Date')}</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-purchase-iqd-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Time')}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-purchase-iqd-time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Invoice Type')}</Label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger data-testid="select-purchase-iqd-invoice-type">
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
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted/30 text-sm font-medium" data-testid="text-created-by-iqd">
                {user?.username || "-"}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Supplier Name')}</Label>
              <Select key={`supplier-iqd-${formKey}`} onValueChange={selectSupplier}>
                <SelectTrigger data-testid="select-supplier-iqd">
                  <SelectValue placeholder={t('Select Supplier')} />
                </SelectTrigger>
                <SelectContent>
                  {suppliersList.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Address')}</Label>
              <Select value={address} onValueChange={setAddress}>
                <SelectTrigger data-testid="select-purchase-iqd-address">
                  <SelectValue placeholder={t('Select Address')} />
                </SelectTrigger>
                <SelectContent>
                  {addressesList?.map(a => (
                    <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Note')}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Notes...')} data-testid="input-purchase-iqd-note" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Customs Clearance')}</Label>
              <Select value={customsClearance} onValueChange={setCustomsClearance}>
                <SelectTrigger data-testid="select-purchase-iqd-customs-clearance">
                  <SelectValue placeholder={t('Select Clearance')} />
                </SelectTrigger>
                <SelectContent>
                  {customsClearancesList?.map(cc => (
                    <SelectItem key={cc.id} value={cc.name}>{cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Car Number')}</Label>
              <Input value={carNumber} onChange={(e) => setCarNumber(e.target.value)} placeholder={t('Vehicle #')} data-testid="input-purchase-iqd-car-number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Manifest')}</Label>
              <Input value={manifest} onChange={(e) => setManifest(e.target.value)} placeholder={t('Manifest #')} data-testid="input-purchase-iqd-manifest" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Driver Name')}</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder={t('Driver Name')} data-testid="input-purchase-iqd-driver-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Driver Mobile')}</Label>
              <Input value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} placeholder={t('Driver Mobile')} data-testid="input-purchase-iqd-driver-mobile" />
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
              <Label className="text-xs font-semibold text-muted-foreground">{t('Car Expense')}</Label>
              <Input type="number" step="250" value={carExpense} onChange={(e) => setCarExpense(e.target.value)} placeholder="0" data-testid="input-purchase-iqd-car-expense" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Customs Expense')}</Label>
              <Input type="number" step="250" value={customsExpense} onChange={(e) => setCustomsExpense(e.target.value)} placeholder="0" data-testid="input-purchase-iqd-customs-expense" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Other Expenses')}</Label>
              <Input type="number" step="250" value={otherExpenses} onChange={(e) => setOtherExpenses(e.target.value)} placeholder="0" data-testid="input-purchase-iqd-other-expenses" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Total Expenses')}</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-amber-50 dark:bg-amber-950/30 font-mono font-bold text-amber-700 dark:text-amber-400">
                {formatIQD(totalExpenses)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('Products')}</CardTitle>
          <Button variant="outline" size="sm" onClick={addRow} data-testid="button-purchase-iqd-add-row">
            <Plus className="w-4 h-4 mr-1" />
            {t('Add Row')}
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
                  <TableHead className="text-primary-foreground w-[80px]">{t('Weight')}</TableHead>
                  <TableHead className="text-primary-foreground w-[120px]">{t('Expense Cost')}</TableHead>
                  <TableHead className="text-primary-foreground w-[130px]">{t('Production Date')}</TableHead>
                  <TableHead className="text-primary-foreground w-[130px]">{t('Expiry Date')}</TableHead>
                  <TableHead className="text-primary-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/30" data-testid={`row-purchase-iqd-item-${index}`}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={item.productId ? String(item.productId) : ""}
                        onValueChange={(val) => selectProduct(index, val)}
                      >
                        <SelectTrigger className="h-9 text-sm" data-testid={`select-purchase-iqd-product-${index}`}>
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
                        className="h-9 text-sm text-center"
                        data-testid={`input-purchase-iqd-quantity-${index}`}
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
                        <SelectTrigger className="h-9 text-sm" data-testid={`select-purchase-iqd-unit-${index}`}>
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
                        step="250"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItem(index, "price", e.target.value)}
                        className="h-9 text-sm text-center font-mono"
                        data-testid={`input-purchase-iqd-price-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center justify-center h-9 px-2 rounded bg-orange-50 dark:bg-orange-950/30 font-mono text-sm font-bold text-orange-700 dark:text-orange-400">
                        {Number(item.amount || "0").toLocaleString()} IQD
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center justify-center h-9 px-2 rounded bg-muted/50 font-mono text-sm text-muted-foreground">
                        {(parseFloat(item.weight || "0") * parseFloat(item.quantity || "0")).toFixed(2)} kg
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center justify-center h-9 px-2 rounded bg-amber-50 dark:bg-amber-950/30 font-mono text-sm font-bold text-amber-700 dark:text-amber-400">
                        {Number(getExpenseCost(item).toFixed(0)).toLocaleString()} IQD
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <DateInput
                        value={item.productionDate}
                        onChange={(e) => updateItem(index, "productionDate", e.target.value)}
                        className="h-9 text-sm"
                        data-testid={`input-purchase-iqd-production-date-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <DateInput
                        value={item.expiryDate}
                        onChange={(e) => updateItem(index, "expiryDate", e.target.value)}
                        className="h-9 text-sm"
                        data-testid={`input-purchase-iqd-expiry-date-${index}`}
                      />
                    </TableCell>
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
                <p className="text-lg font-bold text-primary" data-testid="text-purchase-iqd-total-weight">{totalWeight.toFixed(2)} kg</p>
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
              <span className="text-sm font-medium">{t('Amount Paid')}</span>
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
              <span className="text-sm font-medium">{t('Discount')}</span>
              <Input
                type="number"
                step="250"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
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

      <PurchaseInvoiceReport
        invoiceId={reportInvoiceId}
        open={reportOpen}
        onOpenChange={setReportOpen}
        currency="IQD"
      />
    </div>
  );
}
