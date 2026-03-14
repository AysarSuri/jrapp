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
import { Plus, Search, Loader2, Pencil, Trash2, X, Save } from "lucide-react";
import { IconCustomers, IconAddress, IconAgent } from "@/components/erp-icons";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usd } from "@/lib/format-utils";
import { AddressSearchSelect } from "@/components/address-search-select";

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
    if (!address.trim()) {
      toast({ title: t("Please enter the address"), variant: "destructive" });
      return;
    }

    const data = {
      name: name.trim(),
      type: "customer" as const,
      contact: contact.trim(),
      address: address.trim(),
      oldDebtUsd,
      oldDebtIqd,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Customers")}</h1>
        <p className="text-muted-foreground mt-1">{t("Manage your customers")}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
            <div className="md:col-span-2">
              <label className="text-base font-bold mb-1 block">{t("Address")}</label>
              <AddressSearchSelect
                addresses={addresses}
                value={address}
                onValueChange={setAddress}
                placeholder={t("Select address...")}
                data-testid="select-customer-address"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-4">
            <div>
              <label className="text-base font-bold mb-1 block">{t("Agent")}</label>
              <SearchSelect
                items={agents}
                value={selectedAgentId}
                onValueChange={(v) => setSelectedAgentId(v || "")}
                placeholder={t("Select agent (optional)...")}
                data-testid="select-customer-agent"
              />
            </div>
            <div>
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
            <div>
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
            <div className="flex gap-2">
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
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Total Customers")}</CardTitle>
            <IconCustomers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Total Opening Balances (USD)")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usd(totalOldDebtUsd)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Total Opening Balances (IQD)")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOldDebtIqd.toLocaleString()} IQD</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input placeholder={t("Search customers...")} className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-customers" />
            </div>
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
                    <TableHead className="text-sm font-bold">{t("Address")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Contact")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Agent")}</TableHead>
                    <TableHead className="text-sm font-bold text-right">{t("Opening Balance (USD)")}</TableHead>
                    <TableHead className="text-sm font-bold text-right">{t("Opening Balance (IQD)")}</TableHead>
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
                      <TableCell className="text-sm font-semibold">
                        {client.address ? (
                          <Badge variant="outline" className="gap-1">
                            <IconAddress className="h-3 w-3" />
                            {client.address}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">{client.contact || "-"}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {getAgentForClient(client.id) ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <IconAgent className="h-3 w-3" />
                            {getAgentForClient(client.id)}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-right font-mono">{usd(client.oldDebtUsd || 0)}</TableCell>
                      <TableCell className="text-sm font-semibold text-right font-mono">{Number(client.oldDebtIqd || 0).toLocaleString()}</TableCell>
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
