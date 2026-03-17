import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { DateInput } from "@/components/ui/date-input";
import { SearchSelect } from "@/components/search-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/format-utils";

interface EditEntry {
  id: number;
  type: string;
  currency: string;
  reference: string | null;
}

interface StatementEditDialogProps {
  entry: EditEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CustomerData {
  id: number;
  name: string;
  type: string;
}

interface BankData {
  id: number;
  name: string;
}

interface TransferOfficeData {
  id: number;
  name: string;
}

export default function StatementEditDialog({ entry, open, onOpenChange }: StatementEditDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentSource, setPaymentSource] = useState("");
  const [paymentSourceName, setPaymentSourceName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [representativeMobile, setRepresentativeMobile] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [invoiceType, setInvoiceType] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [remaining, setRemaining] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [oldDebt, setOldDebt] = useState("");
  const [remainingDebt, setRemainingDebt] = useState("");

  const { data: customers } = useQuery<CustomerData[]>({ queryKey: ["/api/clients"] });
  const { data: banks } = useQuery<BankData[]>({ queryKey: ["/api/banks"] });
  const { data: transferOffices } = useQuery<TransferOfficeData[]>({ queryKey: ["/api/transfer-offices"] });

  const customerList = (customers || []).filter(c => c.type === "customer");

  const paymentSources = [
    ...(banks || []).map(b => ({ id: `bank:${b.id}`, name: b.name })),
    ...(transferOffices || []).map(o => ({ id: `transfer_office:${o.id}`, name: o.name })),
  ];

  useEffect(() => {
    if (!entry || !open) return;
    setFetching(true);
    setItems([]);

    const fetchData = async () => {
      try {
        if (entry.type === "customer_receipt" || entry.type === "customer_receipt_discount") {
          const res = await fetch("/api/customer-receipts", { credentials: "include" });
          const all = await res.json();
          const rec = all.find((r: any) => r.id === entry.id);
          if (rec) {
            setDate(rec.date || "");
            setTime(rec.time || "");
            setNote(rec.note || "");
            setReference(rec.reference || "");
            setAmount(rec.amount || "0");
            setDiscount(rec.discount || "0");
            setCustomerId(String(rec.customerId || ""));
            setCustomerName(rec.customerName || "");
            setPaymentSource(rec.paymentSource || "");
            setPaymentSourceName(rec.paymentSourceName || "");
            setReceiptNumber(rec.receiptNumber || "");
            setOldDebt(rec.oldDebt || "0");
            setRemainingDebt(rec.remaining || "0");
          }
        } else if (entry.type === "agent_payment") {
          const res = await fetch("/api/agent-payments", { credentials: "include" });
          const all = await res.json();
          const pay = all.find((p: any) => p.id === entry.id);
          if (pay) {
            setDate(pay.date || "");
            setTime(pay.time || "");
            setNote(pay.note || "");
            setReference(pay.reference || "");
            setAmount(pay.amount || "0");
            setCustomerId(String(pay.agentId || ""));
            setCustomerName(pay.agentName || "");
            setPaymentSource(pay.paymentSource || "");
            setPaymentSourceName(pay.paymentSourceName || "");
            setPaymentNumber(pay.paymentNumber || "");
            setOldDebt(pay.oldDebt || "0");
            setRemainingDebt(pay.remaining || "0");
          }
        } else if (entry.type === "sales_invoice") {
          const [invRes, itemsRes] = await Promise.all([
            fetch(`/api/sales-invoices/${entry.id}`, { credentials: "include" }),
            fetch(`/api/sales-invoices/${entry.id}/items`, { credentials: "include" }),
          ]);
          const inv = await invRes.json();
          const invItems = await itemsRes.json();
          if (inv) {
            setDate(inv.date || "");
            setTime(inv.time || "");
            setNote(inv.note || "");
            setReference(inv.invoiceNumber || "");
            setCustomerId(String(inv.customerId || ""));
            setCustomerName(inv.customerName || "");
            setAddress(inv.address || "");
            setMobile(inv.mobile || "");
            setRepresentativeName(inv.representativeName || "");
            setRepresentativeMobile(inv.representativeMobile || "");
            setDriverName(inv.driverName || "");
            setDriverMobile(inv.driverMobile || "");
            setVehicleNumber(inv.vehicleNumber || "");
            setInvoiceType(inv.invoiceType || "cash");
            setSubtotal(inv.subtotal || "0");
            setDiscount(inv.discount || "0");
            setAmountPaid(inv.amountPaid || "0");
            setRemaining(inv.remaining || "0");
            setTotalItems(inv.totalItems || 0);
            setTotalQuantity(inv.totalQuantity || "0");
            setItems(invItems || []);
          }
        } else if (entry.type === "sales_return") {
          const [retRes, itemsRes] = await Promise.all([
            fetch(`/api/sales-returns/${entry.id}`, { credentials: "include" }),
            fetch(`/api/sales-returns/${entry.id}/items`, { credentials: "include" }),
          ]);
          const ret = await retRes.json();
          const retItems = await itemsRes.json();
          if (ret) {
            setDate(ret.date || "");
            setTime(ret.time || "");
            setNote(ret.note || "");
            setReference(ret.returnNumber || "");
            setCustomerId(String(ret.customerId || ""));
            setCustomerName(ret.customerName || "");
            setAddress(ret.address || "");
            setMobile(ret.mobile || "");
            setRepresentativeName(ret.representativeName || "");
            setRepresentativeMobile(ret.representativeMobile || "");
            setDriverName(ret.driverName || "");
            setDriverMobile(ret.driverMobile || "");
            setVehicleNumber(ret.vehicleNumber || "");
            setInvoiceType(ret.returnType || "cash");
            setSubtotal(ret.subtotal || "0");
            setDiscount(ret.discount || "0");
            setAmountPaid(ret.amountPaid || "0");
            setRemaining(ret.remaining || "0");
            setTotalItems(ret.totalItems || 0);
            setTotalQuantity(ret.totalQuantity || "0");
            setItems(retItems || []);
          }
        }
      } catch {
        toast({ title: t("Failed to load data"), variant: "destructive" });
      }
      setFetching(false);
    };

    fetchData();
  }, [entry?.id, entry?.type, open]);

  const selectCustomer = (val: string) => {
    setCustomerId(val);
    const c = customerList.find(c => String(c.id) === val);
    setCustomerName(c?.name || "");
  };

  const selectPaymentSource = (val: string) => {
    setPaymentSource(val);
    const src = paymentSources.find(s => s.id === val);
    setPaymentSourceName(src?.name || "");
  };

  const handleSave = async () => {
    if (!entry) return;
    setLoading(true);
    try {
      if (entry.type === "customer_receipt" || entry.type === "customer_receipt_discount") {
        await apiRequest("PATCH", `/api/customer-receipts/${entry.id}`, {
          customerId: parseInt(customerId),
          customerName,
          paymentSource,
          paymentSourceName,
          amount,
          discount,
          currency: entry.currency,
          note,
          reference,
          date,
          time,
        });
      } else if (entry.type === "agent_payment") {
        await apiRequest("PATCH", `/api/agent-payments/${entry.id}`, {
          note,
          reference,
          date,
          time,
        });
      } else if (entry.type === "sales_invoice") {
        const [invRes, itemsRes] = await Promise.all([
          fetch(`/api/sales-invoices/${entry.id}`, { credentials: "include" }),
          fetch(`/api/sales-invoices/${entry.id}/items`, { credentials: "include" }),
        ]);
        const existing = await invRes.json();
        const existingItems = await itemsRes.json();
        await apiRequest("PATCH", `/api/sales-invoices/${entry.id}`, {
          invoice: {
            ...existing,
            date,
            time,
            note,
            customerId: parseInt(customerId),
            customerName,
            address,
            mobile,
            representativeName,
            representativeMobile,
            driverName,
            driverMobile,
            vehicleNumber,
          },
          items: existingItems || [],
        });
      } else if (entry.type === "sales_return") {
        const [retRes, itemsRes] = await Promise.all([
          fetch(`/api/sales-returns/${entry.id}`, { credentials: "include" }),
          fetch(`/api/sales-returns/${entry.id}/items`, { credentials: "include" }),
        ]);
        const existing = await retRes.json();
        const existingItems = await itemsRes.json();
        await apiRequest("PATCH", `/api/sales-returns/${entry.id}`, {
          returnData: {
            ...existing,
            date,
            time,
            note,
            customerId: parseInt(customerId),
            customerName,
            address,
            mobile,
            representativeName,
            representativeMobile,
            driverName,
            driverMobile,
            vehicleNumber,
          },
          items: existingItems || [],
        });
      }

      toast({ title: t("Updated successfully") });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-statement"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("Failed to update"), description: err?.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const getTitle = () => {
    if (!entry) return "";
    if (entry.type === "sales_invoice") return t("Edit Invoice");
    if (entry.type === "sales_return") return t("Edit Return");
    if (entry.type === "customer_receipt" || entry.type === "customer_receipt_discount") return t("Edit Receipt");
    if (entry.type === "agent_payment") return t("Edit Payment");
    return t("Edit");
  };

  const isInvoiceOrReturn = entry?.type === "sales_invoice" || entry?.type === "sales_return";
  const isReceiptOrPayment = entry?.type === "customer_receipt" || entry?.type === "customer_receipt_discount" || entry?.type === "agent_payment";

  const fmtNum = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return "0";
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isInvoiceOrReturn ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] flex flex-col overflow-hidden`}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{getTitle()} {entry?.reference ? `#${entry.reference}` : ""}</DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto flex-1 pb-2 px-1">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-bold">{t("Date")}</Label>
                <DateInput
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 text-base font-semibold"
                  data-testid="input-edit-date"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-bold">{t("Time")}</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-11 text-base font-semibold"
                  data-testid="input-edit-time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-bold">{t("Customer Name")}</Label>
              <SearchSelect
                items={customerList.map(c => ({ id: String(c.id), name: c.name }))}
                value={customerId}
                onValueChange={selectCustomer}
                placeholder={t("Select customer...")}
                data-testid="select-edit-customer"
              />
            </div>

            {isInvoiceOrReturn && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Address")}</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-11 text-base font-semibold"
                      data-testid="input-edit-address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Mobile")}</Label>
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="h-11 text-base font-semibold"
                      data-testid="input-edit-mobile"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Representative")}</Label>
                    <Input
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      className="h-11 text-base font-semibold"
                      data-testid="input-edit-rep-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Representative Mobile")}</Label>
                    <Input
                      value={representativeMobile}
                      onChange={(e) => setRepresentativeMobile(e.target.value)}
                      className="h-11 text-base font-semibold"
                      data-testid="input-edit-rep-mobile"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Driver Name")}</Label>
                    <Input
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="h-11 text-base font-semibold"
                      data-testid="input-edit-driver-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Driver Mobile")}</Label>
                    <Input
                      value={driverMobile}
                      onChange={(e) => setDriverMobile(e.target.value)}
                      className="h-11 text-base font-semibold"
                      data-testid="input-edit-driver-mobile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Vehicle Number")}</Label>
                    <Input
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="h-11 text-base font-semibold"
                      data-testid="input-edit-vehicle"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Subtotal")}</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border bg-muted text-base font-semibold font-mono" data-testid="text-subtotal">
                      {fmtNum(subtotal)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Discount")}</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border bg-muted text-base font-semibold font-mono" data-testid="text-discount">
                      {fmtNum(discount)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Amount Paid")}</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border bg-muted text-base font-semibold font-mono" data-testid="text-amount-paid">
                      {fmtNum(amountPaid)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Remaining")}</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border bg-muted text-base font-semibold font-mono" data-testid="text-remaining">
                      {fmtNum(remaining)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Total Quantity")}</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border bg-muted text-base font-semibold font-mono" data-testid="text-total-qty">
                      {fmtNum(totalQuantity)}
                    </div>
                  </div>
                </div>

                {items.length > 0 && (
                  <>
                    <Separator />
                    <Label className="text-base font-bold">{t("Products")} ({items.length})</Label>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-sm font-bold">#</TableHead>
                            <TableHead className="text-sm font-bold">{t("Product Code")}</TableHead>
                            <TableHead className="text-sm font-bold">{t("Product Name")}</TableHead>
                            <TableHead className="text-sm font-bold text-center">{t("Quantity")}</TableHead>
                            <TableHead className="text-sm font-bold text-center">{t("Gift")}</TableHead>
                            <TableHead className="text-sm font-bold">{t("Unit")}</TableHead>
                            <TableHead className="text-sm font-bold text-end">{t("Price")}</TableHead>
                            <TableHead className="text-sm font-bold text-end">{t("Amount")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item: any, idx: number) => (
                            <TableRow key={item.id || idx}>
                              <TableCell className="text-sm font-semibold">{idx + 1}</TableCell>
                              <TableCell className="text-sm font-semibold font-mono">{item.productCode}</TableCell>
                              <TableCell className="text-sm font-semibold">{item.productName}</TableCell>
                              <TableCell className="text-sm font-semibold text-center font-mono">{item.quantity}</TableCell>
                              <TableCell className="text-sm font-semibold text-center font-mono">{item.gift || "0"}</TableCell>
                              <TableCell className="text-sm font-semibold">{item.unit}</TableCell>
                              <TableCell className="text-sm font-semibold text-end font-mono">{fmtNum(item.price)}</TableCell>
                              <TableCell className="text-sm font-semibold text-end font-mono">{fmtNum(item.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </>
            )}

            {isReceiptOrPayment && (
              <>
                <div className="space-y-2">
                  <Label className="text-base font-bold">{t("Amount Received At")}</Label>
                  <SearchSelect
                    items={paymentSources}
                    value={paymentSource}
                    onValueChange={selectPaymentSource}
                    placeholder={t("Select account where amount was received...")}
                    data-testid="select-edit-source"
                  />
                </div>

                {(entry?.type === "customer_receipt" || entry?.type === "customer_receipt_discount") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-base font-bold">{t("Amount")} ({entry?.currency})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-11 text-base font-semibold font-mono"
                        data-testid="input-edit-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base font-bold">{t("Discount")} ({entry?.currency})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="h-11 text-base font-semibold font-mono"
                        data-testid="input-edit-discount"
                      />
                    </div>
                  </div>
                )}

                {entry?.type === "agent_payment" && (
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Amount")} ({entry?.currency})</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border bg-muted text-base font-semibold font-mono" data-testid="text-payment-amount">
                      {fmtNum(amount)}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Old Debt")}</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border bg-muted text-base font-semibold font-mono" data-testid="text-old-debt">
                      {fmtNum(oldDebt)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t("Remaining")}</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border bg-muted text-base font-semibold font-mono" data-testid="text-remaining-debt">
                      {fmtNum(remainingDebt)}
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {!isInvoiceOrReturn && (
              <div className="space-y-2">
                <Label className="text-base font-bold">{t("Reference")}</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={t("Reference number...")}
                  className="h-11 text-base font-semibold"
                  data-testid="input-edit-reference"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-base font-bold">{t("Notes")}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("Notes...")}
                className="resize-none text-base font-semibold"
                rows={2}
                data-testid="input-edit-note"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || fetching}
            className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
            data-testid="button-save-edit"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}