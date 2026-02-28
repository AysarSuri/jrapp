import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNextSalesInvoiceNumber, useCreateSalesInvoice, useSalesInvoices, useApproveSalesInvoice, useDeleteSalesInvoice } from "@/hooks/use-sales-invoices";
import { useQuery } from "@tanstack/react-query";
import type { Product, Client, SalesInvoice } from "@shared/schema";
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
import { useUser } from "@/hooks/use-auth";
import {
  Plus, Trash2, Save, Loader2, FileText, RotateCcw,
  ListOrdered, CheckCircle, Clock, Banknote, Pencil,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import { formatDate } from "@/lib/format-utils";
import { useUnits } from "@/hooks/use-units";
import SalesInvoiceReport from "@/components/sales-invoice-report";
import { Eye } from "lucide-react";

interface InvoiceItem {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: string;
  unit: string;
  price: string;
  amount: string;
}

const emptyItem = (): InvoiceItem => ({
  productId: null,
  productCode: "",
  productName: "",
  quantity: "",
  unit: "",
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

  const { data: units } = useUnits();
  const unitsList = units || [];

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  const { data: representativesList } = useQuery<{ id: number; name: string; mobile: string | null }[]>({
    queryKey: ["/api/representatives"],
  });
  const { data: addressesList } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/addresses"],
  });

  const customersList = clients?.filter(c => c.type === "customer") || [];

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
  const [discount, setDiscount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reportInvoiceId, setReportInvoiceId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (nextNumber?.number) {
      setInvoiceNumber(nextNumber.number);
    }
  }, [nextNumber]);

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  const totalItems = items.filter(i => i.productCode && parseFloat(i.quantity || "0") > 0).length;
  const totalQuantity = items.reduce((sum, i) => sum + parseFloat(i.quantity || "0"), 0);
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
    setInvoiceType("cash");
    setDiscount("");
    setAmountPaid("");
    setItems([emptyItem()]);
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
      unit: item.unit,
      price: item.price,
      amount: item.amount,
    }));

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
  };

  const selectCustomer = (clientId: string) => {
    const client = customersList.find(c => c.id === parseInt(clientId));
    if (client) {
      setCustomerId(client.id);
      setCustomerName(client.name);
      setAddress(client.address || "");
      setMobile(client.contact || "");
    }
  };

  const selectRepresentative = (repId: string) => {
    const rep = representativesList?.find(r => r.id === parseInt(repId));
    if (rep) {
      setRepresentativeId(rep.id);
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

  const handleDeleteInvoice = (invoiceId: number) => {
    deleteInvoice(invoiceId, {
      onSuccess: () => {
        toast({ title: t("Invoice deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete invoice"), description: err.message, variant: "destructive" });
      },
    });
  };

  const handleEditInvoice = (inv: SalesInvoice) => {
    setReportInvoiceId(inv.id);
    setReportOpen(true);
  };

  const userRole = user?.role || 'user';

  const formatIQD = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return num.toLocaleString('en-US') + ' IQD';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-sales-invoice-iqd-title">
            <Banknote className="h-8 w-8 text-blue-600" />
            {t('Sales Invoice - IQD')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Create sales invoice in Iraqi Dinar')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-sales-invoice-iqd-history">
                <ListOrdered className="w-4 h-4 mr-2" />
                {t('Invoice History')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('Sales Invoice History')}</DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t('Invoice #')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('Customer')}</TableHead>
                    <TableHead>{t('Representative')}</TableHead>
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('Total')}</TableHead>
                    <TableHead>{t('Amount Paid')}</TableHead>
                    <TableHead>{t('Discount')}</TableHead>
                    <TableHead>{t('Remaining')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invoicesList as SalesInvoice[] || []).filter(i => i.currency === 'IQD').map((inv: SalesInvoice) => (
                    <TableRow key={inv.id} data-testid={`row-sales-iqd-history-${inv.id}`}>
                      <TableCell>{inv.id}</TableCell>
                      <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                      <TableCell>{formatDate(inv.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{inv.time || '-'}</TableCell>
                      <TableCell>{inv.customerName}</TableCell>
                      <TableCell>{inv.representativeName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={inv.invoiceType === 'cash' ? 'default' : 'secondary'}>
                          {inv.invoiceType === 'cash' ? t('Cash') : t('Credit')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{formatIQD(inv.subtotal)}</TableCell>
                      <TableCell className="font-mono text-green-600">{formatIQD(inv.amountPaid || '0')}</TableCell>
                      <TableCell className="font-mono text-orange-600">{formatIQD(inv.discount || '0')}</TableCell>
                      <TableCell className="font-mono text-red-600">{formatIQD(inv.remaining)}</TableCell>
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
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => { setReportInvoiceId(inv.id); setReportOpen(true); }}
                            data-testid={`button-view-sales-iqd-invoice-${inv.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => handleEditInvoice(inv)}
                            data-testid={`button-edit-sales-iqd-invoice-${inv.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                data-testid={`button-delete-sales-iqd-invoice-${inv.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('This will permanently delete this invoice and all its items.')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteInvoice(inv.id)}>{t('Yes')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          {(userRole === 'admin' || userRole === 'user') && inv.status === 'pending' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(inv.id)}
                              disabled={isApproving}
                              data-testid={`button-approve-iqd-invoice-${inv.id}`}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t('Approve')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={resetForm} data-testid="button-reset-sales-iqd-form">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('Reset')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700" data-testid="button-save-sales-invoice-iqd">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {userRole === 'sales_rep' ? t('Send for Approval') : t('Save Invoice')}
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
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="font-mono bg-muted/30" data-testid="input-sales-iqd-invoice-number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Date')}</Label>
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-sales-iqd-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Time')}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="input-sales-iqd-time" />
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
              <Label className="text-xs font-semibold text-muted-foreground">{t('Customer Name')}</Label>
              <Select key={`cust-${formKey}`} onValueChange={selectCustomer}>
                <SelectTrigger data-testid="select-iqd-customer">
                  <SelectValue placeholder={t('Select Customer')} />
                </SelectTrigger>
                <SelectContent>
                  {customersList.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Address')}</Label>
              <Select value={address} onValueChange={setAddress}>
                <SelectTrigger data-testid="select-sales-iqd-address">
                  <SelectValue placeholder={t('Select Address')} />
                </SelectTrigger>
                <SelectContent>
                  {addressesList?.map(a => (
                    <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Mobile')}</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder={t('Mobile number...')} data-testid="input-sales-iqd-mobile" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Representative Name')}</Label>
              <Select key={`rep-${formKey}`} onValueChange={selectRepresentative}>
                <SelectTrigger data-testid="select-iqd-representative">
                  <SelectValue placeholder={t('Select Representative')} />
                </SelectTrigger>
                <SelectContent>
                  {representativesList?.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('Representative Mobile')}</Label>
              <Input value={representativeMobile} onChange={(e) => setRepresentativeMobile(e.target.value)} placeholder={t('Rep mobile...')} data-testid="input-sales-iqd-rep-mobile" />
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
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('Products')}</CardTitle>
          <Button variant="outline" size="sm" onClick={addRow} data-testid="button-sales-iqd-add-row">
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
                      <Select
                        value={item.productId ? String(item.productId) : ""}
                        onValueChange={(val) => selectProduct(index, val)}
                      >
                        <SelectTrigger className="h-9 text-sm" data-testid={`select-sales-iqd-product-${index}`}>
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
                        data-testid={`input-sales-iqd-product-code-${index}`}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex items-center gap-0.5">
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
                          className="h-9 text-sm text-center w-14"
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
                      <Select
                        value={item.unit}
                        onValueChange={(val) => updateItem(index, "unit", val)}
                      >
                        <SelectTrigger className="h-9 text-sm" data-testid={`select-sales-iqd-unit-${index}`}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('Products')}</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-sales-iqd-total-items">{totalItems}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('Total Quantity')}</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-sales-iqd-total-quantity">{totalQuantity}</p>
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
              <span className="text-sm font-medium">{t('Amount Paid')}</span>
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
              <span className="text-sm font-medium">{t('Discount')}</span>
              <Input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
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

      <SalesInvoiceReport
        invoiceId={reportInvoiceId}
        open={reportOpen}
        onOpenChange={setReportOpen}
        currency="IQD"
      />
    </div>
  );
}
