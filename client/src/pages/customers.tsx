import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { useAddresses } from "@/hooks/use-addresses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SearchSelect } from "@/components/search-select";
import { Plus, Search, Loader2, Pencil, Trash2, X, Save, Printer } from "lucide-react";
import { IconCustomers, IconAddress, IconAgent } from "@/components/erp-icons";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usd, formatDate } from "@/lib/format-utils";
import { AddressSearchSelect } from "@/components/address-search-select";
import { loadFieldVisibility } from "@/pages/settings";

type Client = {
  id: number;
  name: string;
  type: string;
  contact: string | null;
  address: string | null;
  balance: string;
  oldDebtUsd: string;
  oldDebtIqd: string;
  hidden: boolean;
};

export default function CustomersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: allClients, isLoading } = useClients();
  const { data: dbAddresses } = useAddresses();
  const { mutate: createClient, isPending: isCreating } = useCreateClient();
  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient();
  const { mutate: deleteClient } = useDeleteClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [addressFilter, setAddressFilter] = useState<string>("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [oldDebtUsd, setOldDebtUsd] = useState("0");
  const [oldDebtIqd, setOldDebtIqd] = useState("0");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const fv = loadFieldVisibility();

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
    setOldDebtUsd("0");
    setOldDebtIqd("0");
    setSelectedAgentId("");
  };

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setName(client.name);
    setContact(client.contact || "");
    setAddress(client.address || "");
    setOldDebtUsd(client.oldDebtUsd || "0");
    setOldDebtIqd(client.oldDebtIqd || "0");
    const assignment = agentClientsList?.find(ac => ac.clientId === client.id);
    setSelectedAgentId(assignment?.agentUserId || "");
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
      oldDebtUsd: fv.customer_oldDebtUsd ? oldDebtUsd : "0",
      oldDebtIqd: fv.customer_oldDebtIqd ? oldDebtIqd : "0",
    };

    if (editingId) {
      updateClient({ id: editingId, data }, {
        onSuccess: async () => {
          setIsAssigning(true);
          await handleAgentAssignment(editingId, name.trim());
          setIsAssigning(false);
          resetForm();
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
          resetForm();
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
        if (editingId === id) resetForm();
        toast({ title: t("Customer deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete customer"), description: err.message, variant: "destructive" });
      },
    });
  };

  const customers = allClients?.filter((c: Client) => c.type === "customer") || [];
  const filtered = customers.filter((c: Client) => {
    if (addressFilter && addressFilter !== "all" && c.address !== addressFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return c.name.toLowerCase().includes(s) ||
        c.contact?.toLowerCase().includes(s) ||
        c.address?.toLowerCase().includes(s);
    }
    return true;
  });

  const totalOldDebtUsd = customers.reduce((sum: number, c: Client) => sum + Number(c.oldDebtUsd || 0), 0);
  const totalOldDebtIqd = customers.reduce((sum: number, c: Client) => sum + Number(c.oldDebtIqd || 0), 0);

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

    const tableRows = filtered.map((c, i) => {
      const agentName = esc(getAgentForClient(c.id) || "-");
      return `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name-cell">${esc(c.name)}</td>
        ${fv.customer_address ? `<td>${esc(c.address || '-')}</td>` : ""}
        <td class="mono">${esc(c.contact || '-')}</td>
        ${fv.customer_agent ? `<td>${agentName}</td>` : ""}
        ${fv.customer_oldDebtUsd ? `<td class="mono price-usd">$${Number(c.oldDebtUsd || 0).toFixed(2)}</td>` : ""}
        ${fv.customer_oldDebtIqd ? `<td class="mono price-iqd">${Number(c.oldDebtIqd || 0).toLocaleString()} IQD</td>` : ""}
      </tr>`;
    }).join("");

    const totalUsd = filtered.reduce((sum, c) => sum + Number(c.oldDebtUsd || 0), 0);
    const totalIqd = filtered.reduce((sum, c) => sum + Number(c.oldDebtIqd || 0), 0);

    const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
  <meta charset="utf-8">
  <title>${title} — ${companyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Inter', -apple-system, sans-serif;
      padding: 18px 24px;
      font-size: 10pt;
      direction: ${dir};
      color: #1a1a2e;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      margin-bottom: 14px;
      border: 2px solid ${accent}30;
      border-radius: 14px;
      background: linear-gradient(135deg, #fafbfc, ${accent}08);
    }
    .header-center {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      justify-content: center;
    }
    .header-center img {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 10px;
    }
    .header-center .company-name {
      font-size: 18pt;
      font-weight: 800;
      color: ${accent};
      letter-spacing: -0.3px;
    }
    .header-right {
      text-align: ${dir === "rtl" ? "right" : "left"};
      min-width: 180px;
    }
    .header-right .report-title {
      font-size: 16pt;
      font-weight: 800;
      color: ${accent};
      margin-bottom: 2px;
    }
    .header-right .report-date {
      font-size: 9pt;
      color: #64748b;
      font-weight: 500;
    }
    .header-left {
      text-align: ${dir === "rtl" ? "left" : "right"};
      min-width: 200px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 8.5pt;
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
      font-size: 9pt;
      font-weight: 600;
      color: #475569;
    }
    .stat-card .stat-value {
      font-size: 16pt;
      font-weight: 800;
    }
    .stat-card.blue .stat-value { color: #2563eb; }
    .stat-card.green .stat-value { color: #16a34a; }
    .stat-card.orange .stat-value { color: #d97706; }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 9pt;
      border-radius: 10px;
      overflow: hidden;
      border: 1.5px solid #d4d4d8;
    }
    th {
      background: linear-gradient(145deg, ${accent}, ${accent}dd);
      color: #fff;
      padding: 8px 7px;
      text-align: center;
      font-weight: 700;
      font-size: 8.5pt;
      white-space: nowrap;
      letter-spacing: 0.2px;
    }
    td {
      border-bottom: 1px solid #e5e7eb;
      padding: 6px 7px;
      text-align: center;
      font-size: 9pt;
      color: #334155;
      font-weight: 500;
    }
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #f1f5f9; }
    .mono { font-family: 'Inter', monospace; letter-spacing: 0.3px; }
    .num { font-weight: 700; color: #64748b; width: 36px; }
    .name-cell { font-weight: 700; color: #1e293b; text-align: ${dir === "rtl" ? "right" : "left"}; }
    .price-usd { color: #16a34a; font-weight: 700; }
    .price-iqd { color: #2563eb; font-weight: 700; }
    .total-row { background: linear-gradient(145deg, #f0f4ff, #e8ecf4) !important; }
    .total-row td { font-weight: 800; font-size: 9.5pt; color: #1e293b; border-top: 2px solid ${accent}; }
    .report-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 14px;
      padding: 10px 20px;
      border-radius: 10px;
      border: 1.5px solid #e2e8f0;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      font-size: 9pt;
      color: #475569;
      font-weight: 600;
    }
    .report-footer .footer-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .report-footer .footer-value {
      font-weight: 800;
      color: ${accent};
      font-size: 10pt;
    }
    @media print {
      body { padding: 6mm 8mm; }
      @page { margin: 5mm; size: A4; }
      .stat-card, th, .report-footer, .total-row {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header-row">
    <div class="header-right">
      <div class="report-title">${title}</div>
      <div class="report-date">${today}</div>
    </div>
    <div class="header-center">
      ${companyLogo ? `<img src="${companyLogo}" alt="logo" />` : ""}
      <span class="company-name">${companyName}</span>
    </div>
    <div class="header-left">
      ${companyAddress ? `<div class="contact-item">\u{1F4CD} ${companyAddress}</div>` : ""}
      ${companyMobile ? `<div class="contact-item">\u{1F4DE} ${companyMobile}</div>` : ""}
    </div>
  </div>

  <div class="summary-row">
    <div class="stat-card blue">
      <span class="stat-label">${t('Total Customers')}</span>
      <span class="stat-value">${filtered.length}</span>
    </div>
    ${fv.customer_oldDebtUsd ? `<div class="stat-card green">
      <span class="stat-label">${t('Total Opening Balances (USD)')}</span>
      <span class="stat-value">$${totalUsd.toFixed(2)}</span>
    </div>` : ""}
    ${fv.customer_oldDebtIqd ? `<div class="stat-card orange">
      <span class="stat-label">${t('Total Opening Balances (IQD)')}</span>
      <span class="stat-value">${totalIqd.toLocaleString()} IQD</span>
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
        ${fv.customer_oldDebtUsd ? `<th>${t('Opening Balance (USD)')}</th>` : ""}
        ${fv.customer_oldDebtIqd ? `<th>${t('Opening Balance (IQD)')}</th>` : ""}
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="total-row">
        <td colspan="${2 + (fv.customer_address ? 1 : 0) + (fv.customer_agent ? 1 : 0)}" class="name-cell">${t('Total')}</td>
        ${fv.customer_oldDebtUsd ? `<td class="mono price-usd">$${totalUsd.toFixed(2)}</td>` : ""}
        ${fv.customer_oldDebtIqd ? `<td class="mono price-iqd">${totalIqd.toLocaleString()} IQD</td>` : ""}
      </tr>
    </tbody>
  </table>

  <div class="report-footer">
    <div class="footer-item">${t('Total Customers')}: <span class="footer-value">${filtered.length}</span></div>
    <div class="footer-item">${t('Date')}: <span class="footer-value">${today}</span></div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Customers")}</h1>
        <p className="text-muted-foreground mt-1">{t("Manage your customers")}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          <div className={`grid grid-cols-1 ${fv.customer_address ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4 items-end`}>
            <div>
              <label className="text-base font-bold mb-1 block">{t("Name")}</label>
              <Input
                data-testid="input-customer-name"
                className="h-11 text-base font-semibold"
                placeholder={t("Customer name...")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-base font-bold mb-1 block">{t("Contact")}</label>
              <Input
                data-testid="input-customer-contact"
                className="h-11 text-base font-semibold"
                placeholder="0770-000-0000"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            {fv.customer_address && (
              <div>
                <label className="text-base font-bold mb-1 block">{t("Address")}</label>
                <AddressSearchSelect
                  addresses={addresses}
                  value={address}
                  onValueChange={setAddress}
                  placeholder={t("Select address...")}
                  data-testid="select-customer-address"
                />
              </div>
            )}
          </div>
          {(() => {
            const secondRowFields: React.ReactNode[] = [];
            if (fv.customer_agent) {
              secondRowFields.push(
                <div key="agent">
                  <label className="text-base font-bold mb-1 block">{t("Agent")}</label>
                  <SearchSelect
                    items={agents}
                    value={selectedAgentId}
                    onValueChange={(v) => setSelectedAgentId(v || "")}
                    placeholder={t("Select agent (optional)...")}
                    data-testid="select-customer-agent"
                  />
                </div>
              );
            }
            if (fv.customer_oldDebtUsd) {
              secondRowFields.push(
                <div key="usd">
                  <label className="text-base font-bold mb-1 block">{t("Opening Balance (USD)")}</label>
                  <Input
                    data-testid="input-customer-old-debt-usd"
                    className="h-11 text-base font-semibold"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={oldDebtUsd}
                    onChange={(e) => setOldDebtUsd(e.target.value)}
                  />
                </div>
              );
            }
            if (fv.customer_oldDebtIqd) {
              secondRowFields.push(
                <div key="iqd">
                  <label className="text-base font-bold mb-1 block">{t("Opening Balance (IQD)")}</label>
                  <Input
                    data-testid="input-customer-old-debt-iqd"
                    className="h-11 text-base font-semibold"
                    type="number"
                    step="1"
                    placeholder="0"
                    value={oldDebtIqd}
                    onChange={(e) => setOldDebtIqd(e.target.value)}
                  />
                </div>
              );
            }
            secondRowFields.push(
              <div key="actions" className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-11 flex-1 bg-primary text-white"
                  data-testid="button-save-customer"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin ltr:mr-2 rtl:ml-2" /> : editingId ? <Save className="w-5 h-5 ltr:mr-2 rtl:ml-2" /> : <Plus className="w-5 h-5 ltr:mr-2 rtl:ml-2" />}
                  {editingId ? t("Update") : t("Add")}
                </Button>
                {editingId && (
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="h-11"
                    data-testid="button-cancel-edit"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            );
            const colsClass = secondRowFields.length === 1 ? "md:grid-cols-1" : secondRowFields.length === 2 ? "md:grid-cols-2" : secondRowFields.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
            return secondRowFields.length > 0 ? (
              <div className={`grid grid-cols-1 ${colsClass} gap-4 items-end mt-4`}>
                {secondRowFields}
              </div>
            ) : null;
          })()}
        </CardContent>
      </Card>

      <div className={`grid gap-4 ${fv.customer_oldDebtUsd && fv.customer_oldDebtIqd ? "md:grid-cols-3" : fv.customer_oldDebtUsd || fv.customer_oldDebtIqd ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Total Customers")}</CardTitle>
            <IconCustomers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        {fv.customer_oldDebtUsd && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Total Opening Balances (USD)")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usd(totalOldDebtUsd)}</div>
            </CardContent>
          </Card>
        )}
        {fv.customer_oldDebtIqd && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Total Opening Balances (IQD)")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOldDebtIqd.toLocaleString()} IQD</div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input placeholder={t("Search customers...")} className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-customers" />
            </div>
            {fv.customer_address && (
              <div className="w-48">
                <AddressSearchSelect
                  addresses={addresses}
                  value={addressFilter}
                  onValueChange={setAddressFilter}
                  placeholder={t("All Addresses")}
                  data-testid="select-address-filter"
                  showAllOption
                  allOptionLabel={t("All Addresses")}
                  inputClassName="h-10"
                />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5" data-testid="button-print-customers">
              <Printer className="h-5 w-5" />
              {t("Print")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconCustomers className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t("No customers found")}</h3>
              <p>{t("Add a new customer to get started.")}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t("Name")}</TableHead>
                    {fv.customer_address && <TableHead className="text-sm font-bold">{t("Address")}</TableHead>}
                    <TableHead className="text-sm font-bold">{t("Contact")}</TableHead>
                    {fv.customer_agent && <TableHead className="text-sm font-bold">{t("Agent")}</TableHead>}
                    {fv.customer_oldDebtUsd && <TableHead className="text-sm font-bold text-right">{t("Opening Balance (USD)")}</TableHead>}
                    {fv.customer_oldDebtIqd && <TableHead className="text-sm font-bold text-right">{t("Opening Balance (IQD)")}</TableHead>}
                    <TableHead className="text-sm font-bold text-center">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client: Client, index: number) => (
                    <TableRow
                      key={client.id}
                      data-testid={`row-customer-${client.id}`}
                      className={editingId === client.id ? "bg-primary/5" : ""}
                    >
                      <TableCell className="text-sm font-semibold">{index + 1}</TableCell>
                      <TableCell className="text-sm font-semibold">{client.name}</TableCell>
                      {fv.customer_address && (
                        <TableCell className="text-sm font-semibold">
                          {client.address ? (
                            <Badge variant="outline" className="gap-1">
                              <IconAddress className="h-3 w-3" />
                              {client.address}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-sm font-semibold">{client.contact || "-"}</TableCell>
                      {fv.customer_agent && (
                        <TableCell className="text-sm font-semibold">
                          {getAgentForClient(client.id) ? (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <IconAgent className="h-3 w-3" />
                              {getAgentForClient(client.id)}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                      )}
                      {fv.customer_oldDebtUsd && <TableCell className="text-sm font-semibold text-right font-mono">{usd(client.oldDebtUsd || 0)}</TableCell>}
                      {fv.customer_oldDebtIqd && <TableCell className="text-sm font-semibold text-right font-mono">{Number(client.oldDebtIqd || 0).toLocaleString()}</TableCell>}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(client)}
                            data-testid={`button-edit-customer-${client.id}`}
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-customer-${client.id}`}
                              >
                                <Trash2 className="h-5 w-5" />
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
