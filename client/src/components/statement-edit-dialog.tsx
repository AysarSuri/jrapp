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
import { Loader2, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
          }
        } else if (entry.type === "sales_invoice") {
          const res = await fetch(`/api/sales-invoices/${entry.id}`, { credentials: "include" });
          const inv = await res.json();
          if (inv) {
            setDate(inv.date || "");
            setTime(inv.time || "");
            setNote(inv.note || "");
            setReference(inv.invoiceNumber || "");
            setCustomerId(String(inv.customerId || ""));
            setCustomerName(inv.customerName || "");
          }
        } else if (entry.type === "sales_return") {
          const res = await fetch(`/api/sales-returns/${entry.id}`, { credentials: "include" });
          const ret = await res.json();
          if (ret) {
            setDate(ret.date || "");
            setTime(ret.time || "");
            setNote(ret.note || "");
            setReference(ret.returnNumber || "");
            setCustomerId(String(ret.customerId || ""));
            setCustomerName(ret.customerName || "");
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
        const res = await fetch(`/api/sales-invoices/${entry.id}`, { credentials: "include" });
        const existing = await res.json();
        await apiRequest("PATCH", `/api/sales-invoices/${entry.id}`, {
          invoice: {
            ...existing,
            date,
            time,
            note,
            customerId: parseInt(customerId),
            customerName,
          },
          items: existing.items || [],
        });
      } else if (entry.type === "sales_return") {
        const res = await fetch(`/api/sales-returns/${entry.id}`, { credentials: "include" });
        const existing = await res.json();
        await apiRequest("PATCH", `/api/sales-returns/${entry.id}`, {
          returnData: {
            ...existing,
            date,
            time,
            note,
            customerId: parseInt(customerId),
            customerName,
          },
          items: existing.items || [],
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

  const isReceiptOrPayment = entry?.type === "customer_receipt" || entry?.type === "customer_receipt_discount" || entry?.type === "agent_payment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{getTitle()} {entry?.reference ? `#${entry.reference}` : ""}</DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
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

            {isReceiptOrPayment && (
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
            )}

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

            <Separator />

            <div className="space-y-2">
              <Label className="text-base font-bold">{t("Reference")}</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={t("Reference number...")}
                className="h-11 text-base font-semibold"
                data-testid="input-edit-reference"
                readOnly={entry?.type === "sales_invoice" || entry?.type === "sales_return"}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-bold">{t("Notes")}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("Notes...")}
                className="resize-none text-base font-semibold"
                data-testid="input-edit-note"
              />
            </div>
          </div>
        )}

        <DialogFooter>
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