import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { useAddresses } from "@/hooks/use-addresses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SearchSelect } from "@/components/search-select";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Plus, Loader2, Pencil, Trash2, Save, Printer, Phone, MapPin, Wallet, X } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconCustomers, IconAddress, IconAgent } from "@/components/erp-icons";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format-utils";
import { PRINT_FONT_LINKS } from "@/lib/print-styles";
import { AddressSearchSelect } from "@/components/address-search-select";
import { CURRENCY_OPTIONS, loadFieldVisibility } from "@/pages/settings";
import { useDefaultCurrency, formatAmount, formatAmountInput, getCurrencyDecimalPlaces, currencyInputStep, getCurrencyMeta } from "@/hooks/use-default-currency";

type Client = {
  id: number;
  name: string;
  type: string;
  contact: string | null;
  address: string | null;
  balance: string;
  oldDebtUsd: string;
  oldDebtIqd: string;
  oldDebtCurrency?: string | null;
  hidden: boolean;
  createdBy?: string | null;
};

function openingBalanceOf(client: Pick<Client, "oldDebtUsd" | "oldDebtIqd" | "oldDebtCurrency">, fallbackCurrency: string) {
  const usdAmt = Number(client.oldDebtUsd || 0);
  const iqdAmt = Number(client.oldDebtIqd || 0);
  const stored = client.oldDebtCurrency || "";
  if (stored === "USD") return { amount: usdAmt, currency: "USD" };
  if (stored && stored !== "IQD") return { amount: iqdAmt, currency: stored };
  if (usdAmt !== 0 && iqdAmt === 0) return { amount: usdAmt, currency: "USD" };
  if (iqdAmt !== 0) return { amount: iqdAmt, currency: stored || "IQD" };
  if (usdAmt !== 0) return { amount: usdAmt, currency: "USD" };
  return { amount: 0, currency: stored || fallbackCurrency };
}

const panelClass =
  "rounded-2xl border border-black/[0.05] dark:border-white/10 bg-white dark:bg-zinc-900/60 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.28)]";

export default function CustomersPage() {
  const { t, i18n } = useTranslation();
  const defaultCurrency = useDefaultCurrency();
  const qc = useQueryClient();
  const { data: allClients, isLoading } = useClients();
  const { data: dbAddresses } = useAddresses();
  const { mutate: createClient, isPending: isCreating } = useCreateClient();
  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient();
  const { mutate: deleteClient } = useDeleteClient();
  const { toast } = useToast();
  const [customerFilter, setCustomerFilter] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  const [mobileFilter, setMobileFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");

  const [printPreviewHtml, setPrintPreviewHtml] = useState<string | null>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [oldDebt, setOldDebt] = useState("0");
  const [debtCurrency, setDebtCurrency] = useState(defaultCurrency.code);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const fv = loadFieldVisibility();
  const showOpeningBalance = fv.customer_oldDebt;
  const selectedDebtCurrency = CURRENCY_OPTIONS.find((c) => c.code === debtCurrency);

  const { data: agentsList } = useQuery<{ id: string; name: string; mobile: string }[]>({
    queryKey: ["/api/agents"],
  });

  const { data: agentClientsList } = useQuery<{ id: number; agentUserId: string; agentName: string; clientId: number }[]>({
    queryKey: ["/api/agent-clients"],
  });

  const addresses = dbAddresses || [];
  const agents = agentsList || [];

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setContact("");
    setAddress("");
    setOldDebt(formatAmountInput(0, defaultCurrency.code));
    setDebtCurrency(defaultCurrency.code);
    setSelectedAgentId("");
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setName(client.name);
    setContact(client.contact || "");
    setAddress(client.address || "");
    const opening = openingBalanceOf(client, defaultCurrency.code);
    setOldDebt(formatAmountInput(opening.amount, opening.currency));
    setDebtCurrency(opening.currency);
    const assignment = agentClientsList?.find(ac => ac.clientId === client.id);
    setSelectedAgentId(assignment?.agentUserId || "");
    setFormOpen(true);
  };

  const handleAgentAssignment = async (clientId: number, clientName: string) => {
    if (!selectedAgentId || selectedAgentId === "none") {
      try {
        await fetch(`/api/agent-clients/by-client/${clientId}`, { method: "DELETE" });
        qc.invalidateQueries({ queryKey: ["/api/agent-clients"] });
      } catch {}
      return;
    }
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) return;
    try {
      const res = await fetch("/api/agent-clients/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentUserId: agent.id,
          agentName: agent.name,
          clientId,
          clientName,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: t("Failed to assign to agent"), description: err.message, variant: "destructive" });
      } else {
        qc.invalidateQueries({ queryKey: ["/api/agent-clients"] });
      }
    } catch {
      toast({ title: t("Failed to assign to agent"), variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("Please enter the customer name"), variant: "destructive" });
      return;
    }
    if (!contact.trim()) {
      toast({ title: t("Please enter the contact"), variant: "destructive" });
      return;
    }
    if (fv.customer_address && !address.trim()) {
      toast({ title: t("Please enter the address"), variant: "destructive" });
      return;
    }

    const data = {
      name: name.trim(),
      type: "customer" as const,
      contact: contact.trim(),
      address: fv.customer_address ? address.trim() : "",
      oldDebtUsd: showOpeningBalance && debtCurrency === "USD" ? formatAmountInput(oldDebt, debtCurrency) : "0",
      oldDebtIqd: showOpeningBalance && debtCurrency !== "USD" ? formatAmountInput(oldDebt, debtCurrency) : "0",
      oldDebtCurrency: showOpeningBalance ? debtCurrency : defaultCurrency.code,
    };

    if (editingId) {
      updateClient({ id: editingId, data }, {
        onSuccess: async () => {
          setIsAssigning(true);
          await handleAgentAssignment(editingId, name.trim());
          setIsAssigning(false);
          closeForm();
          toast({ title: t("Customer updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update customer"), description: err.message, variant: "destructive" });
        },
      });
    } else {
      createClient(data, {
        onSuccess: async (createdClient: any) => {
          if (selectedAgentId && selectedAgentId !== "none") {
            setIsAssigning(true);
            await handleAgentAssignment(createdClient.id, name.trim());
            setIsAssigning(false);
          }
          closeForm();
          toast({ title: t("Customer created successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to create customer"), description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteClient(id, {
      onSuccess: () => {
        if (editingId === id) closeForm();
        toast({ title: t("Customer deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete customer"), description: err.message, variant: "destructive" });
      },
    });
  };

  const customers = allClients?.filter((c: Client) => c.type === "customer") || [];
  const filtered = customers.filter((c: Client) => {
    if (customerFilter && customerFilter !== "all" && String(c.id) !== customerFilter) return false;
    if (addressFilter && addressFilter !== "all" && c.address !== addressFilter) return false;
    if (mobileFilter.trim()) {
      const mobile = (c.contact || "").replace(/\s/g, "");
      const q = mobileFilter.trim().replace(/\s/g, "");
      if (!mobile.includes(q)) return false;
    }
    if (agentFilter && agentFilter !== "all") {
      const assignment = agentClientsList?.find((ac) => ac.clientId === c.id);
      if (assignment?.agentUserId !== agentFilter) return false;
    }
    return true;
  });

  const openingTotals = customers.reduce((acc: Record<string, number>, c: Client) => {
    const opening = openingBalanceOf(c, defaultCurrency.code);
    if (opening.amount !== 0) {
      acc[opening.currency] = (acc[opening.currency] || 0) + opening.amount;
    }
    return acc;
  }, {});
  const openingTotalEntries = Object.entries(openingTotals);

  const getAgentForClient = (clientId: number) => {
    const assignment = agentClientsList?.find(ac => ac.clientId === clientId);
    return assignment?.agentName || null;
  };

  const isSaving = isCreating || isUpdating || isAssigning;

  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; primaryColor: string; address: string; mobile1: string }>({ queryKey: ["/api/company-profile"] });

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const handlePrint = () => {
    const dir = (document.documentElement.dir || "ltr") as "rtl" | "ltr";
    const accent = companyProfile?.primaryColor || "#6b8e23";
    const companyName = esc(companyProfile?.name || "");
    const companyLogo = companyProfile?.logo || "";
    const companyAddress = esc(companyProfile?.address || "");
    const companyMobile = esc(companyProfile?.mobile1 || "");
    const today = formatDate(new Date());
    const title = t('Customers');

    const openingColor = (code: string) => {
      const map: Record<string, string> = {
        IQD: "#d97706", USD: "#059669", EUR: "#2563eb", IRR: "#e11d48",
        GBP: "#4f46e5", TRY: "#dc2626", CNY: "#ea580c",
      };
      return map[code] || "#334155";
    };
    const openingCell = (amount: number, currency: string) => {
      if (!amount) return `<span class="muted">—</span>`;
      const symbol = CURRENCY_OPTIONS.find((c) => c.code === currency)?.symbol || getCurrencyMeta(currency).symbol;
      const color = openingColor(currency);
      return `<span class="chip" style="color:${color};border-color:${color}33;background:${color}14"><span class="chip-dot" style="background:${color}">${esc(symbol)}</span><span dir="ltr">${esc(formatAmount(amount, currency))}</span></span>`;
    };

    const tableRows = filtered.map((c, i) => {
      const agentName = esc(getAgentForClient(c.id) || "—");
      const opening = openingBalanceOf(c, defaultCurrency.code);
      return `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name-cell">${esc(c.name)}</td>
        ${fv.customer_address ? `<td>${esc(c.address || "—")}</td>` : ""}
        <td class="mono" dir="ltr">${esc(c.contact || "—")}</td>
        ${fv.customer_agent ? `<td>${agentName}</td>` : ""}
        ${showOpeningBalance ? `<td>${openingCell(opening.amount, opening.currency)}</td>` : ""}
        <td>${esc(c.createdBy || "—")}</td>
      </tr>`;
    }).join("");

    const printOpeningTotals = filtered.reduce((acc: Record<string, number>, c) => {
      const opening = openingBalanceOf(c, defaultCurrency.code);
      if (opening.amount !== 0) acc[opening.currency] = (acc[opening.currency] || 0) + opening.amount;
      return acc;
    }, {});
    const printOpeningHtml = Object.entries(printOpeningTotals).length
      ? Object.entries(printOpeningTotals).map(([code, amt]) => openingCell(amt, code)).join(" ")
      : openingCell(0, defaultCurrency.code);
    const leadCols = 3 + (fv.customer_address ? 1 : 0) + (fv.customer_agent ? 1 : 0);

    const reportFont = "Tahoma, 'Segoe UI', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Cairo', 'Tajawal', sans-serif";
    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${i18n.language || "ar"}">
<head>
  ${PRINT_FONT_LINKS}
  <meta charset="utf-8">
  <title>${title} — ${companyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700;800&family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: ${reportFont};
      font-size: 14px;
      font-weight: 700;
      direction: ${dir};
      color: #0f172a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { padding: 18px 22px; }
    .top-bar {
      height: 6px;
      border-radius: 999px;
      background: linear-gradient(90deg, ${accent}, ${accent}88, #38bdf8);
      margin-bottom: 16px;
    }
    .header-row {
      padding: 14px 18px 12px;
      margin-bottom: 14px;
      border: 2px solid ${accent}30;
      border-radius: 14px;
      background: linear-gradient(135deg, #fafbfc, ${accent}08);
    }
    .company-block {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding-bottom: 10px;
      margin-bottom: 10px;
      border-bottom: 1px solid ${accent}22;
    }
    .company-block img {
      width: 56px;
      height: 56px;
      object-fit: contain;
      border-radius: 10px;
      flex-shrink: 0;
    }
    .company-name {
      font-family: ${reportFont};
      font-size: 20px;
      font-weight: 700;
      color: ${accent};
      letter-spacing: 0;
      line-height: 1.6;
      text-align: center;
    }
    .header-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .header-right {
      text-align: ${dir === "rtl" ? "right" : "left"};
    }
    .header-right .report-title {
      font-size: 18px;
      font-weight: 700;
      color: ${accent};
      margin-bottom: 4px;
    }
    .header-right .report-date {
      font-size: 14px;
      color: #64748b;
      font-weight: 700;
    }
    .header-left {
      text-align: ${dir === "rtl" ? "left" : "right"};
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 14px;
      font-weight: 700;
      color: #64748b;
    }
    .header-left .contact-item {
      display: flex;
      align-items: center;
      gap: 5px;
      justify-content: ${dir === "rtl" ? "flex-start" : "flex-end"};
    }
    .summary-row {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
    }
    .stat-card {
      flex: 1;
      border-radius: 10px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .stat-card.blue {
      border: 2px solid #3b82f6;
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
    }
    .stat-card.green {
      border: 2px solid #22c55e;
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    }
    .stat-card.orange {
      border: 2px solid #f59e0b;
      background: linear-gradient(135deg, #fffbeb, #fef3c7);
    }
    .stat-card .stat-label {
      font-size: 14px;
      font-weight: 700;
      color: #475569;
    }
    .stat-card .stat-value {
      font-size: 18px;
      font-weight: 800;
    }
    .stat-card.blue .stat-value { color: #2563eb; }
    .stat-card.green .stat-value { color: #16a34a; }
    .stat-card.orange .stat-value { color: #d97706; }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 14px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    th {
      font-family: ${reportFont};
      background: linear-gradient(145deg, ${accent}, ${accent}dd);
      color: #fff;
      padding: 10px 8px;
      text-align: center;
      font-weight: 700;
      font-size: 14px;
      white-space: nowrap;
    }
    td {
      font-family: ${reportFont};
      border-bottom: 1px solid #eef2f7;
      padding: 9px 8px;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #f1f5f9; }
    .mono { font-family: 'Tahoma', 'Segoe UI', sans-serif; letter-spacing: 0; }
    .num { font-weight: 700; color: #64748b; width: 36px; }
    .name-cell {
      font-family: ${reportFont};
      font-weight: 700;
      color: #1e293b;
      text-align: ${dir === "rtl" ? "right" : "left"};
      letter-spacing: 0;
      line-height: 1.5;
    }
    .price-usd { color: #16a34a; font-weight: 700; }
    .price-iqd { color: #2563eb; font-weight: 700; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 14px;
      font-weight: 700;
      border: 1px solid;
      white-space: nowrap;
    }
    .chip-dot {
      width: 18px; height: 18px; border-radius: 50%; color: #fff;
      font-size: 9px; display: inline-flex; align-items: center; justify-content: center;
    }
    .muted { color: #94a3b8; }
    .total-row { background: linear-gradient(145deg, #f0f4ff, #e8ecf4) !important; }
    .total-row td { font-weight: 800; font-size: 14px; color: #1e293b; border-top: 2px solid ${accent}; }
    .report-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 16px;
      padding: 12px 18px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      font-size: 14px;
      color: #475569;
      font-weight: 700;
    }
    .report-footer .footer-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .report-footer .footer-value {
      font-weight: 800;
      color: ${accent};
      font-size: 14px;
    }
    @media print {
      body { padding: 6mm 8mm; }
      @page { margin: 5mm; size: A4; }
      .stat-card, th, .report-footer, .total-row, .chip, .chip-dot, .top-bar {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="top-bar"></div>
  <div class="header-row">
    <div class="company-block">
      ${companyLogo ? `<img src="${companyLogo}" alt="logo" />` : ""}
      <span class="company-name">${companyName}</span>
    </div>
    <div class="header-meta">
      <div class="header-right">
        <div class="report-title">${title}</div>
        <div class="report-date">${today}</div>
      </div>
      <div class="header-left">
        ${companyAddress ? `<div class="contact-item">\u{1F4CD} ${companyAddress}</div>` : ""}
        ${companyMobile ? `<div class="contact-item">\u{1F4DE} ${companyMobile}</div>` : ""}
      </div>
    </div>
  </div>

  <div class="summary-row">
    <div class="stat-card blue">
      <span class="stat-label">${t('Total Customers')}</span>
      <span class="stat-value">${filtered.length}</span>
    </div>
    ${showOpeningBalance ? `<div class="stat-card orange">
      <span class="stat-label">${t('Opening Balance')}</span>
      <span class="stat-value">${printOpeningHtml}</span>
    </div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${t('Name')}</th>
        ${fv.customer_address ? `<th>${t('Address')}</th>` : ""}
        <th>${t('Contact')}</th>
        ${fv.customer_agent ? `<th>${t('Agent')}</th>` : ""}
        ${showOpeningBalance ? `<th>${t('Opening Balance')}</th>` : ""}
        <th>${t('Created By')}</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="total-row">
        <td colspan="${leadCols}" class="name-cell">${t('Total')}</td>
        ${showOpeningBalance ? `<td>${printOpeningHtml}</td>` : ""}
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="report-footer">
    <div class="footer-item">${t('Total Customers')}: <span class="footer-value">${filtered.length}</span></div>
    <div class="footer-item">${t('Date')}: <span class="footer-value">${today}</span></div>
  </div>

</body>
</html>`;

    setPrintPreviewHtml(html);
  };

  const printPreview = () => {
    const win = printFrameRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25">
            <IconCustomers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("Customers")}</h1>
            <p className="text-muted-foreground text-base">{t("Manage your customers")}</p>
          </div>
        </div>
        <Button
          onClick={openAdd}
          className="h-11 px-5 rounded-xl gap-2 bg-primary text-white shadow-md shadow-primary/20"
          data-testid="button-add-customer"
        >
          <Plus className="w-5 h-5" />
          {t("Add Customer")}
        </Button>
      </div>

      <div className={`grid gap-4 ${showOpeningBalance ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
        <div className={`${panelClass} p-5 flex items-center justify-between gap-3`}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("Total Customers")}</p>
            <p className="text-3xl font-black tracking-tight mt-1">{customers.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
            <IconCustomers className="h-6 w-6" />
          </div>
        </div>
        {showOpeningBalance && (
          <div className={`${panelClass} p-5 flex items-center justify-between gap-3`}>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("Opening Balance")}</p>
              {openingTotalEntries.length === 0 ? (
                <p className="text-3xl font-black tracking-tight mt-1">{formatAmount(0, defaultCurrency.code)}</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {openingTotalEntries.map(([code, amt]) => {
                    const opt = CURRENCY_OPTIONS.find((c) => c.code === code);
                    return (
                      <span
                        key={code}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black border ${opt?.color.bg || ""} ${opt?.color.text || ""} ${opt?.color.border || ""}`}
                      >
                        <span className={`w-5 h-5 rounded-full ${opt?.color.badge || "bg-muted"} text-white text-[9px] font-black flex items-center justify-center`}>
                          {opt?.symbol || getCurrencyMeta(code).symbol}
                        </span>
                        <span dir="ltr">{formatAmount(amt, code)}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        )}
      </div>

      <div className={panelClass}>
        <div className="p-4 md:p-5 border-b border-black/[0.05] dark:border-white/10 bg-gradient-to-br from-sky-500/[0.06] via-transparent to-transparent">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5 items-end">
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("Customer Name")}</p>
              <SearchSelect
                items={customers.map((c) => ({ id: c.id, name: c.name, subtitle: c.contact || undefined }))}
                value={customerFilter}
                onValueChange={setCustomerFilter}
                placeholder={t("Search customers...")}
                showAllOption
                allOptionLabel={t("All Customers")}
                data-testid="input-search-customers"
                inputClassName="h-10 rounded-xl"
              />
            </div>
            {fv.customer_address && (
              <div className="space-y-1 min-w-0">
                  <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("Address")}</p>
                <AddressSearchSelect
                  addresses={addresses}
                  value={addressFilter}
                  onValueChange={setAddressFilter}
                  placeholder={t("All Addresses")}
                  data-testid="select-address-filter"
                  showAllOption
                  allOptionLabel={t("All Addresses")}
                  inputClassName="h-10 rounded-xl"
                />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("Mobile")}</p>
              <SearchInput
                placeholder={t("Mobile number...")}
                className="h-10 rounded-xl"
                value={mobileFilter}
                onChange={(e) => setMobileFilter(e.target.value)}
                onClear={() => setMobileFilter("")}
                data-testid="input-search-customer-mobile"
              />
            </div>
            {fv.customer_agent && (
              <div className="space-y-1 min-w-0">
                  <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("Agent")}</p>
                <SearchSelect
                  items={agents.map((a) => ({ id: a.id, name: a.name, subtitle: a.mobile }))}
                  value={agentFilter}
                  onValueChange={setAgentFilter}
                  placeholder={t("All Agents")}
                  showAllOption
                  allOptionLabel={t("All Agents")}
                  data-testid="select-agent-filter"
                  inputClassName="h-10 rounded-xl"
                />
              </div>
            )}
            <div className="flex justify-end sm:col-span-2 xl:col-span-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-10 px-4 rounded-xl gap-1.5 border-black/[0.08] hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 w-full xl:w-auto"
                data-testid="button-print-customers"
              >
                <Printer className="h-4 w-4" />
                {t("Print")}
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center mb-4 shadow-sm">
              <IconCustomers className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-foreground">{t("No customers found")}</h3>
            <p className="text-sm mt-1 mb-5">{t("Add a new customer to get started.")}</p>
            <Button onClick={openAdd} className="gap-2 rounded-xl h-11 px-5" data-testid="button-add-customer-empty">
              <Plus className="w-4 h-4" />
              {t("Add Customer")}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-black/[0.05] dark:border-white/10">
                  <TableHead className="text-sm font-bold uppercase tracking-wider text-muted-foreground">#</TableHead>
                  <TableHead className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("Name")}</TableHead>
                  {fv.customer_address && <TableHead className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("Address")}</TableHead>}
                  <TableHead className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("Contact")}</TableHead>
                  {fv.customer_agent && <TableHead className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("Agent")}</TableHead>}
                  {showOpeningBalance && <TableHead className="text-sm font-bold uppercase tracking-wider text-muted-foreground text-right">{t("Opening Balance")}</TableHead>}
                  <TableHead className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("Created By")}</TableHead>
                  <TableHead className="text-sm font-bold uppercase tracking-wider text-muted-foreground text-center">{t("Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client: Client, index: number) => {
                  const opening = openingBalanceOf(client, defaultCurrency.code);
                  const openingOpt = CURRENCY_OPTIONS.find((c) => c.code === opening.currency);
                  return (
                    <TableRow
                      key={client.id}
                      data-testid={`row-customer-${client.id}`}
                      className={`border-black/[0.04] dark:border-white/10 hover:bg-sky-50/60 dark:hover:bg-sky-950/20 transition-colors ${editingId === client.id ? "bg-sky-50/80 dark:bg-sky-950/30" : ""}`}
                    >
                      <TableCell className="text-sm text-muted-foreground font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                            {client.name.trim().charAt(0)}
                          </div>
                          <span className="text-sm font-bold">{client.name}</span>
                        </div>
                      </TableCell>
                      {fv.customer_address && (
                        <TableCell>
                          {client.address ? (
                            <Badge variant="outline" className="gap-1 rounded-full border-sky-200 bg-sky-50/70 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                              <IconAddress className="h-3 w-3" />
                              {client.address}
                            </Badge>
                          ) : <span className="text-muted-foreground/50">—</span>}
                        </TableCell>
                      )}
                      <TableCell>
                        {client.contact ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span dir="ltr">{client.contact}</span>
                          </span>
                        ) : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      {fv.customer_agent && (
                        <TableCell>
                          {getAgentForClient(client.id) ? (
                            <Badge variant="secondary" className="gap-1 text-xs rounded-full">
                              <IconAgent className="h-3 w-3" />
                              {getAgentForClient(client.id)}
                            </Badge>
                          ) : <span className="text-muted-foreground/50">—</span>}
                        </TableCell>
                      )}
                      {showOpeningBalance && (
                        <TableCell className="text-right">
                          {opening.amount ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black border ${openingOpt?.color.bg || ""} ${openingOpt?.color.text || ""} ${openingOpt?.color.border || ""}`}>
                              <span className={`w-4 h-4 rounded-full ${openingOpt?.color.badge || "bg-muted"} text-white text-[8px] font-black flex items-center justify-center`}>
                                {openingOpt?.symbol || getCurrencyMeta(opening.currency).symbol}
                              </span>
                              <span dir="ltr">{formatAmount(opening.amount, opening.currency)}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 font-mono">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-sm font-medium text-muted-foreground">{client.createdBy || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(client)}
                            className="h-9 w-9 rounded-xl text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                            data-testid={`button-edit-customer-${client.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30"
                                data-testid={`button-delete-customer-${client.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("Delete Customer")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("Are you sure you want to delete this customer?")} ({client.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(client.id)}
                                  data-testid={`button-confirm-delete-customer-${client.id}`}
                                >
                                  {t("Delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {printPreviewHtml && (
        <div
          className="fixed inset-0 z-[80] bg-zinc-950/70 backdrop-blur-sm flex flex-col p-3 md:p-6"
          onClick={() => setPrintPreviewHtml(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mx-auto w-full max-w-[1100px] flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-slate-50">
              <p className="font-bold text-base">{t("Preview")} — {t("Customers")}</p>
              <div className="flex items-center gap-2">
                <Button onClick={printPreview} className="h-10 px-4 rounded-xl gap-1.5">
                  <Printer className="h-4 w-4" />
                  {t("Print")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPrintPreviewHtml(null)}
                  className="h-10 w-10 p-0 rounded-xl"
                  aria-label={t("Cancel")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <iframe
              ref={printFrameRef}
              title={t("Preview")}
              srcDoc={printPreviewHtml}
              className="flex-1 w-full min-h-0 bg-white"
            />
          </div>
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent
          className="sm:max-w-4xl w-[min(96vw,56rem)] p-0 gap-0 overflow-visible"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="relative px-6 pt-6 pb-5 border-b border-border/50 bg-gradient-to-br from-sky-500/12 via-background to-background">
            <DialogHeader className="text-start space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 shrink-0">
                  {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div className="min-w-0 pe-8">
                  <DialogTitle className="text-2xl font-bold tracking-tight">
                    {editingId ? t("Edit Customer") : t("Add New Customer")}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-base">
                    {t("Fill in the customer details below.")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customer-name" className="text-base font-semibold flex items-center gap-1.5">
                    <IconCustomers className="h-3.5 w-3.5 text-sky-600" />
                    {t("Customer Name")}
                  </Label>
                  <Input
                    id="customer-name"
                    data-testid="input-customer-name"
                    className="h-11 text-base font-semibold rounded-xl"
                    placeholder={t("Customer Name")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customer-contact" className="text-base font-semibold flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-sky-600" />
                    {t("Contact")}
                  </Label>
                  <Input
                    id="customer-contact"
                    data-testid="input-customer-contact"
                    className="h-11 text-base font-semibold rounded-xl"
                    placeholder="0770-000-0000"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>
              </div>

              {(fv.customer_address || fv.customer_agent) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fv.customer_address && (
                    <div className="space-y-1.5">
                      <Label className="text-base font-semibold flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-sky-600" />
                        {t("Address")}
                      </Label>
                      <AddressSearchSelect
                        addresses={addresses}
                        value={address}
                        onValueChange={setAddress}
                        placeholder={t("Select address...")}
                        data-testid="select-customer-address"
                        inputClassName="h-11 text-base font-semibold rounded-xl"
                      />
                    </div>
                  )}
                  {fv.customer_agent && (
                    <div className="space-y-1.5">
                      <Label className="text-base font-semibold flex items-center gap-1.5">
                        <IconAgent className="h-3.5 w-3.5 text-sky-600" />
                        {t("Agent")}
                      </Label>
                      <SearchSelect
                        items={agents}
                        value={selectedAgentId}
                        onValueChange={(v) => setSelectedAgentId(v || "")}
                        placeholder={t("Select agent (optional)...")}
                        data-testid="select-customer-agent"
                        inputClassName="h-11 text-base font-semibold rounded-xl"
                      />
                    </div>
                  )}
                </div>
              )}

              {showOpeningBalance && (
                <div className="space-y-1.5">
                  <Label htmlFor="customer-opening-balance" className="text-base font-semibold flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-sky-600" />
                    {t("Opening Balance")}
                  </Label>
                  <div className={`relative rounded-xl border-2 ${selectedDebtCurrency?.color.border || "border-border"} ${selectedDebtCurrency?.color.bg || "bg-background"}`}>
                    <Input
                      id="customer-opening-balance"
                      data-testid="input-customer-opening-balance"
                      dir="ltr"
                      className={`h-11 text-base font-semibold rounded-xl font-mono border-0 bg-transparent shadow-none focus-visible:ring-0 text-right pr-3 pl-[9.25rem] ${selectedDebtCurrency?.color.text || ""}`}
                      type="number"
                      step={currencyInputStep(debtCurrency)}
                      placeholder={formatAmountInput(0, debtCurrency)}
                      value={oldDebt}
                      onChange={(e) => setOldDebt(e.target.value)}
                      onBlur={() => setOldDebt(formatAmountInput(oldDebt, debtCurrency))}
                    />
                    <div className="absolute inset-y-0 left-1 flex items-center">
                      <Select
                        value={debtCurrency}
                        onValueChange={(code) => {
                          setDebtCurrency(code);
                          setOldDebt((prev) => formatAmountInput(prev, code));
                        }}
                      >
                        <SelectTrigger
                          className={`h-8 w-auto border-0 bg-transparent shadow-none px-1.5 gap-1 focus:ring-0 ${selectedDebtCurrency?.color.text || ""}`}
                          data-testid="select-customer-opening-currency"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-6 h-6 shrink-0 rounded-full ${selectedDebtCurrency?.color.badge || "bg-muted"} text-white text-[10px] font-black flex items-center justify-center shadow-sm`}>
                              {selectedDebtCurrency?.symbol || getCurrencyMeta(debtCurrency).symbol}
                            </span>
                            <span dir="ltr" className="font-mono text-sm font-black">{debtCurrency}</span>
                            <span className="text-[10px] font-bold opacity-70">{getCurrencyDecimalPlaces(debtCurrency)}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="z-[80]">
                          {CURRENCY_OPTIONS.map((c) => {
                            const lang = i18n.language || "en";
                            const localized = lang === "ar" ? c.nameAr : lang === "ckb" ? c.nameKu : lang === "tr" ? c.nameTr : c.nameEn;
                            const meta = getCurrencyMeta(c.code);
                            return (
                              <SelectItem key={c.code} value={c.code} className={`${c.color.bg} ${c.color.text}`}>
                                <span className="flex items-center gap-2">
                                  <span className={`w-7 h-7 rounded-full ${c.color.badge} text-white text-[11px] font-black flex items-center justify-center shadow-sm`}>{c.symbol}</span>
                                  <span>{meta.flag}</span>
                                  <span className="font-bold">{localized}</span>
                                  <span className="text-xs opacity-70">({c.code})</span>
                                  <span className="text-[10px] font-bold opacity-70">{t("Decimal Places")}: {getCurrencyDecimalPlaces(c.code)}</span>
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 gap-2 sm:space-x-0 sm:gap-2">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-5 rounded-xl"
                  data-testid="button-cancel-edit"
                >
                  {t("Cancel")}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-11 px-6 rounded-xl bg-primary text-white shadow-md shadow-primary/20"
                data-testid="button-save-customer"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin ltr:mr-2 rtl:ml-2" />
                ) : editingId ? (
                  <Save className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                ) : (
                  <Plus className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                )}
                {editingId ? t("Update") : t("Add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
