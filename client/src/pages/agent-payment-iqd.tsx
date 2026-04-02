import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAgentPayments, useCreateAgentPayment, useUpdateAgentPayment, useDeleteAgentPayment } from "@/hooks/use-agent-payments";
import { useQuery } from "@tanstack/react-query";
import type { Client, Bank, TransferOffice } from "@shared/schema";
import { useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CustomerSearchSelect } from "@/components/customer-search-select";
import { SearchSelect } from "@/components/search-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, RotateCcw, ListOrdered, Trash2, ChevronLeft, ChevronRight, Eye, Pencil, Printer } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconDinar, IconOffice, IconBank, IconAgent, IconExternalDebt } from "@/components/erp-icons";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import AgentPaymentReport from "@/components/agent-payment-report";
import type { AgentPayment } from "@shared/schema";
import { formatDate } from "@/lib/format-utils";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";

type CompanyProfileData = {
  id: number;
  name: string;
  address: string;
  mobile1: string;
  mobile2: string;
  businessType: string;
  logo: string | null;
  cliche: string | null;
  stamp: string | null;
  qrAddress: string;
  primaryColor: string;
  secondaryColor: string;
};

export default function AgentPaymentIqdPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const { data: payments, isLoading: paymentsLoading } = useAgentPayments();
  const { mutate: createPayment, isPending: isSaving } = useCreateAgentPayment();
  const { mutate: deletePayment } = useDeleteAgentPayment();
  const { mutate: updatePayment, isPending: isUpdating } = useUpdateAgentPayment();

  const [reportPayment, setReportPayment] = useState<AgentPayment | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [editPayment, setEditPayment] = useState<AgentPayment | null>(null);

  const openReport = (p: AgentPayment) => {
    setReportPayment(p);
    setReportOpen(true);
  };

  const openEdit = (p: AgentPayment) => {
    setEditPayment(p);
    setPaymentNumber(p.paymentNumber || "");
    setAgentId(String(p.agentId));
    setAgentName(p.agentName);
    setPaymentSource(p.paymentSource === "hand" ? "hand:0" : `${p.paymentSource}:0`);
    setPaymentSourceName(p.paymentSourceName);
    setAmount(p.amount || "");
    setNote(p.note || "");
    setReference(p.reference || "");
    setRepresentativeName(p.representativeName || "");
    setDate(p.date);
    setTime(p.time);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { data: user } = useUser();
  const { data: allClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  const { data: agentClientsList } = useQuery<{ id: number; agentUserId: string; agentName: string; clientId: number }[]>({
    queryKey: ["/api/agent-clients"],
  });
  const customers = useMemo(() => {
    const all = allClients?.filter(c => c.type === "customer") || [];
    if (user?.role === 'sales_rep') return all.filter(c => agentClientsList?.some(ac => ac.agentUserId === user.id && ac.clientId === c.id));
    return all;
  }, [allClients, agentClientsList, user]);

  const { data: banksList } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const { data: transferOfficesList } = useQuery<TransferOffice[]>({
    queryKey: ["/api/transfer-offices"],
  });

  const { data: nextNumber } = useQuery<{ paymentNumber: string }>({
    queryKey: ["/api/agent-payments/next-number"],
  });

  const { data: companyProfile } = useQuery<CompanyProfileData>({
    queryKey: ["/api/company-profile"],
  });

  const { data: representativesList } = useQuery<{ id: string; name: string; mobile: string }[]>({
    queryKey: ["/api/agents"],
  });

  const [paymentNumber, setPaymentNumber] = useState("");
  const [agentId, setAgentId] = useState<string>("");
  const [agentName, setAgentName] = useState("");
  const [paymentSource, setPaymentSource] = useState<string>("");
  const [paymentSourceName, setPaymentSourceName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [searchNumber, setSearchNumber] = useState("");
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyFromDate, setHistoryFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historyToDate, setHistoryToDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (nextNumber?.paymentNumber && !paymentNumber) {
    setPaymentNumber(nextNumber.paymentNumber);
  }

  const banks = banksList || [];
  const transferOffices = transferOfficesList || [];

  const userRole = user?.role || 'user';
  const iqdPayments = payments?.filter(p => p.currency === "IQD") || [];
  const filteredPayments = iqdPayments.filter(p => {
    if (userRole === 'sales_rep' && !agentClientsList?.some(ac => ac.agentUserId === user?.id && ac.clientId === p.agentId)) return false;
    if (historyFilter && historyFilter !== "all" && String(p.agentId) !== historyFilter) return false;
    if (historyFromDate && p.date < historyFromDate) return false;
    if (historyToDate && p.date > historyToDate) return false;
    if (searchNumber && !(p.paymentNumber || "").toLowerCase().includes(searchNumber.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = filteredPayments.slice((safePage - 1) * pageSize, safePage * pageSize);

  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  const handleDelete = (id: number) => {
    deletePayment(id, {
      onSuccess: () => {
        toast({ title: t("Payment deleted successfully") });
      },
      onError: (err: any) => {
        toast({ title: t("Failed to delete payment"), description: err.message, variant: "destructive" });
      },
    });
  };

  const selectAgent = useCallback((id: string) => {
    if (!id) {
      setAgentId("");
      setAgentName("");
      setRepresentativeName("");
      return;
    }
    setAgentId(id);
    const customer = customers?.find(c => c.id === parseInt(id));
    if (customer) {
      setAgentName(customer.name);
    }
    const assignedAgent = agentClientsList?.find(ac => ac.clientId === parseInt(id));
    if (assignedAgent) {
      setRepresentativeName(assignedAgent.agentName);
    } else {
      setRepresentativeName("");
    }
  }, [customers, agentClientsList]);

  const selectPaymentSource = useCallback((val: string) => {
    setPaymentSource(val);
    if (val === "hand:0") {
      setPaymentSourceName(t("By Hand"));
    } else {
      const [type, id] = val.split(":");
      if (type === "bank") {
        const bank = banksList?.find(b => b.id === parseInt(id));
        if (bank) setPaymentSourceName(`${t("Bank")} - ${bank.name}`);
      } else {
        const office = transferOfficesList?.find(o => o.id === parseInt(id));
        if (office) setPaymentSourceName(`${t("Transfer Office")} - ${office.name}`);
      }
    }
  }, [banksList, transferOfficesList, t]);

  const selectedAgent = customers?.find(c => c.id === parseInt(agentId));

  const { data: currentBalance, isLoading: balanceLoading } = useQuery<{ openingBalance: number }>({
    queryKey: ["/api/customer-opening-balance", agentId, "current", "IQD"],
    queryFn: async () => {
      const params = new URLSearchParams({
        customerId: agentId,
        date: "2099-12-31",
        time: "23:59",
        currency: "IQD",
      });
      const res = await fetch(`/api/customer-opening-balance?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!agentId,
    staleTime: 0,
  });

  const resetForm = () => {
    setEditPayment(null);
    setPaymentNumber("");
    setAgentId("");
    setAgentName("");
    setPaymentSource("");
    setPaymentSourceName("");
    setRepresentativeName("");
    setAmount("");
    setNote("");
    setReference("");
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
  };

  const handleSave = () => {
    if (!agentId) {
      toast({ title: t("Please select a customer"), variant: "destructive" });
      return;
    }
    if (!paymentSource) {
      toast({ title: t("Please select a payment source"), variant: "destructive" });
      return;
    }
    const amtVal = parseFloat(amount || "0");
    if (amtVal <= 0) {
      toast({ title: t("Please enter an amount"), variant: "destructive" });
      return;
    }

    if (editPayment) {
      updatePayment({ id: editPayment.id, data: {
        paymentNumber,
        agentId: parseInt(agentId),
        agentName,
        paymentSource: paymentSource.split(":")[0],
        paymentSourceName,
        representativeName: representativeName || null,
        amount: amount || "0",
        note: note || null,
        reference: reference || null,
        date,
        time,
      } as any }, {
        onSuccess: () => {
          toast({ title: t("Payment updated successfully") });
          resetForm();
        },
        onError: () => {
          toast({ title: t("Failed to update payment"), variant: "destructive" });
        },
      });
    } else {
      createPayment({
        paymentNumber,
        agentId: parseInt(agentId),
        agentName,
        paymentSource: paymentSource.split(":")[0],
        paymentSourceName,
        representativeName: representativeName || null,
        amount: amount || "0",
        currency: "IQD",
        note: note || null,
        reference: reference || null,
        date,
        time,
      }, {
        onSuccess: () => {
          toast({ title: t("Payment saved successfully") });
          resetForm();
        },
        onError: () => {
          toast({ title: t("Failed to save payment"), variant: "destructive" });
        },
      });
    }
  };

  const amountVal = parseFloat(amount || "0");

  const handlePrintList = () => {
    const selectedCustomer = historyFilter && historyFilter !== "all"
      ? customers?.find(c => c.id === parseInt(historyFilter))
      : null;
    const totalAmount = filteredPayments.reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
    const dir = isRtl ? "rtl" : "ltr";
    const printStyles = getModernPrintStyles({ direction: dir, accentColor: companyProfile?.primaryColor || "#1e293b", accentTextColor: "#ffffff" });
    const primaryColor = companyProfile?.primaryColor || "#1e293b";

    const rows = filteredPayments.map((p, i) => {
      const amt = parseFloat(p.amount || "0");
      return `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${i + 1}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-weight:700;font-size:9pt;">${p.paymentNumber || "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:9pt;">${formatDate(p.date)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:9pt;">${p.time || "-"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:9pt;">${p.agentName}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;">${p.paymentSourceName}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:${isRtl ? "left" : "right"};font-family:monospace;font-weight:700;color:#c2410c;font-size:9pt;">${amt.toLocaleString()} IQD</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:8pt;color:#64748b;max-width:180px;">${p.note || "-"}</td>
      </tr>`;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html dir="${dir}" lang="${i18n.language}">
      <head>
        ${PRINT_FONT_LINKS}
        <meta charset="UTF-8" />
        <title>${t("Customer Payment IQD")} - ${t("Payment History")}</title>
        <style>
          ${printStyles}
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px 40px; }
          @media print { body { padding: 0; } }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div style="text-align:center;margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px;">
            ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:44px;height:44px;object-fit:contain;border-radius:8px;" />` : ""}
            <div style="background:${primaryColor};color:#fff;padding:8px 20px;border-radius:8px;display:inline-block;">
              <h1 style="font-size:15pt;margin:0;font-weight:800;">${t("Customer Payment IQD")} - ${t("Payment History")}</h1>
            </div>
          </div>
          <div style="display:flex;justify-content:center;gap:20px;font-size:10pt;color:#555;font-weight:600;flex-wrap:wrap;">
            ${selectedCustomer ? `<span>${t("Customer Name")}: <strong style="color:${primaryColor}">${selectedCustomer.name}</strong></span>` : `<span>${t("All Customers")}</span>`}
            <span>${t("From Date")}: <strong>${formatDate(historyFromDate)}</strong></span>
            <span>${t("To Date")}: <strong>${formatDate(historyToDate)}</strong></span>
            <span>${t("Count")}: <strong>${filteredPayments.length}</strong></span>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:${primaryColor};color:#fff;">
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">#</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Payment Number")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Date")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:center;">${t("Time")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;">${t("Customer Name")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;">${t("Source")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;text-align:${isRtl ? "left" : "right"};">${t("Amount")}</th>
              <th style="padding:6px 8px;font-size:9pt;font-weight:700;">${t("Notes")}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#f1f5f9;font-weight:800;">
              <td colspan="6" style="padding:8px;font-size:10pt;text-align:${isRtl ? "right" : "left"};">${t("Total")}</td>
              <td style="padding:8px;font-size:10pt;font-family:monospace;color:#c2410c;text-align:${isRtl ? "left" : "right"};">${totalAmount.toLocaleString()} IQD</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        <div style="text-align:center;margin-top:12px;font-size:9pt;color:#94a3b8;">
          ${companyProfile?.name || ""} ${companyProfile?.mobile1 ? " | " + companyProfile.mobile1 : ""}
        </div>
      </body>
      </html>
    `;
    const w = window.open("", "_blank", "width=1200,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    if (w.document.fonts?.ready) {
      w.document.fonts.ready.then(() => setTimeout(() => w.print(), 200));
    } else {
      setTimeout(() => w.print(), 800);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <IconDinar className="h-7 w-7 text-orange-600 dark:text-orange-400" />
            </div>
            {t('Customer Payment IQD')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('Pay customers in IQD')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-agent-payment">
            <RotateCcw className="h-5 w-5" />
            {t('Reset')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {editPayment ? (
                <span className="flex items-center gap-2 text-orange-600">
                  <Pencil className="h-5 w-5" />
                  {t('Edit Payment')} #{editPayment.paymentNumber}
                </span>
              ) : t('Payment Details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Payment Number')}</Label>
                <Input
                  value={paymentNumber}
                  readOnly
                  className="bg-muted/50 font-mono font-bold text-center"
                  data-testid="input-payment-number"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Customer Name')}</Label>
                <CustomerSearchSelect
                  customers={customers || []}
                  value={agentId}
                  onValueChange={selectAgent}
                  placeholder={t('Select customer...')}
                  data-testid="select-customer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('Date')}</Label>
                <DateInput
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={userRole === 'sales_rep'}
                  data-testid="input-agent-payment-date"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Time')}</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={userRole === 'sales_rep'}
                  data-testid="input-agent-payment-time"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Payment Source')}</Label>
                <SearchSelect
                  items={[
                    { id: "hand:0", name: t('By Hand') },
                    ...banks.map(b => ({ id: `bank:${b.id}`, name: b.name })),
                    ...transferOffices.map(o => ({ id: `transfer_office:${o.id}`, name: o.name })),
                  ]}
                  value={paymentSource}
                  onValueChange={(v) => selectPaymentSource(v || "")}
                  placeholder={t('Select bank or transfer office...')}
                  data-testid="select-agent-payment-source"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>{t('Via Representative')}</Label>
                <SearchSelect
                  items={(representativesList || []).map(r => ({ id: r.name, name: r.name }))}
                  value={representativeName}
                  onValueChange={(v) => setRepresentativeName(v || "")}
                  placeholder={t('Select representative...')}
                  data-testid="select-payment-representative"
                />
              </div>
            </div>

            <Separator />

            <Card className="border-orange-200 dark:border-orange-900">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <IconDinar className="h-5 w-5 text-orange-600" />
                  {t('Amount')} (IQD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  step="250"
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg font-mono text-center h-12"
                  data-testid="input-agent-payment-amount"
                />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Reference')}</Label>
                <Input
                  placeholder={t('Reference number...')}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  data-testid="input-agent-payment-reference"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Notes')}</Label>
                <Textarea
                  placeholder={t('Notes...')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none h-10"
                  data-testid="input-agent-payment-note"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card className="border-orange-200 dark:border-orange-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Payment Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAgent && (
                <>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Customer Name')}</p>
                    <p className="font-bold text-lg">{selectedAgent.name}</p>
                  </div>
                  <Separator />
                </>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">{t('Amount')}</span>
                  <span className="font-mono font-bold text-lg text-orange-600" data-testid="text-agent-payment-amount">
                    {formatIQD(amountVal)}
                  </span>
                </div>
              </div>

              {paymentSource && (
                <>
                  <Separator />
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t('Source')}</p>
                    <p className="font-medium text-sm">{paymentSourceName}</p>
                  </div>
                </>
              )}

              <Button
                onClick={handleSave}
                disabled={(editPayment ? isUpdating : isSaving) || !agentId || !paymentSource}
                className={`w-full h-12 text-base gap-2 ${editPayment ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                data-testid="button-save-agent-payment"
              >
                {(editPayment ? isUpdating : isSaving) ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {editPayment ? t('Update Payment') : t('Save Payment')}
              </Button>
              {editPayment && (
                <Button variant="outline" onClick={resetForm} className="w-full h-10 text-base gap-2 border-orange-300 text-orange-600" data-testid="button-cancel-edit">
                  <RotateCcw className="h-5 w-5" />
                  {t('Cancel Edit')}
                </Button>
              )}
            </CardContent>
          </Card>

          {selectedAgent && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">{t('Current Debt IQD')}</p>
                  <p className="font-mono text-2xl font-bold text-red-600">
                    {balanceLoading ? "..." : formatIQD(currentBalance?.openingBalance ?? 0)}
                  </p>
                  {amountVal > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground">{t('After Payment')}</p>
                      <p className="font-mono text-xl font-bold text-emerald-600">
                        {balanceLoading ? "..." : formatIQD((currentBalance?.openingBalance ?? 0) + amountVal)}
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-orange-600" />
              {t('Payment History')}
              <Badge variant="secondary" className="ml-2">{filteredPayments.length}</Badge>
              <Button variant="outline" size="sm" onClick={handlePrintList} disabled={filteredPayments.length === 0} className="ml-2 gap-1" data-testid="button-print-payment-list">
                <Printer className="h-4 w-4" />
                {t('Print List')}
              </Button>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch id="show-stamp-filter" checked={showStamp} onCheckedChange={(checked) => setShowStamp(!!checked)} data-testid="switch-show-stamp" />
                <Label htmlFor="show-stamp-filter" className="text-sm font-bold cursor-pointer whitespace-nowrap">{t("Show Stamp")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <SearchInput placeholder={t('Search by number...')} value={searchNumber} onChange={(e) => { setSearchNumber(e.target.value); setCurrentPage(1); }} onClear={() => { setSearchNumber(""); setCurrentPage(1); }} containerClassName="w-48" className="h-9" data-testid="input-search-payment-number" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('From Date')}</Label>
                <DateInput value={historyFromDate} onChange={(e) => { setHistoryFromDate(e.target.value); setCurrentPage(1); }} disabled={userRole === 'sales_rep'} className="w-36 h-9" data-testid="input-payment-history-from-date" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">{t('To Date')}</Label>
                <DateInput value={historyToDate} onChange={(e) => { setHistoryToDate(e.target.value); setCurrentPage(1); }} disabled={userRole === 'sales_rep'} className="w-36 h-9" data-testid="input-payment-history-to-date" />
              </div>
              <div className="w-64">
                <CustomerSearchSelect
                  customers={customers || []}
                  value={historyFilter}
                  onValueChange={(v) => { setHistoryFilter(v || "all"); setCurrentPage(1); }}
                  showAllOption
                  allOptionLabel={t('All Customers')}
                  placeholder={t('All Customers')}
                  inputClassName="h-9 text-sm"
                  data-testid="select-filter-payment-history"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('Payment Number')}</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Time')}</TableHead>
                      <TableHead>{t('Customer Name')}</TableHead>
                      <TableHead>{t('Source')}</TableHead>
                      <TableHead>{t('Amount')}</TableHead>
                      <TableHead>{t('Notes')}</TableHead>
                      <TableHead>{t('Created By')}</TableHead>
                      <TableHead className="text-center">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((p, i) => (
                      <TableRow key={p.id} data-testid={`row-agent-payment-${p.id}`}>
                        <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                        <TableCell className="font-mono text-sm font-bold">{p.paymentNumber || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{formatDate(p.date)}</TableCell>
                        <TableCell className="font-mono text-sm">{p.time || "-"}</TableCell>
                        <TableCell className="font-medium">{p.agentName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{p.paymentSourceName}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-orange-600">
                          {parseFloat(p.amount) > 0 ? formatIQD(parseFloat(p.amount)) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.note || "-"}</TableCell>
                        <TableCell className="text-sm font-semibold">{p.createdBy || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="text-blue-600" onClick={() => openReport(p)} data-testid={`button-report-payment-${p.id}`}>
                              <Eye className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-orange-600" onClick={() => openEdit(p)} data-testid={`button-edit-payment-${p.id}`}>
                              <Pencil className="h-5 w-5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-600" data-testid={`button-delete-payment-${p.id}`}>
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('This will permanently delete this payment.')}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(p.id)}>{t('Yes')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedPayments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          {t('No payments yet')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredPayments.length)} {t('of')} {filteredPayments.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                      <Button key={pg} variant={pg === safePage ? "default" : "outline"} size="icon" onClick={() => setCurrentPage(pg)}>
                        {pg}
                      </Button>
                    ))}
                    <Button variant="outline" size="icon" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AgentPaymentReport payment={reportPayment} open={reportOpen} onOpenChange={setReportOpen} />

    </div>
  );
}
