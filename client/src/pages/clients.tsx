import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Trash2, Pencil, X, Save } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconCustomers } from "@/components/erp-icons";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function ClientsPage() {
  const { t } = useTranslation();
  const { data: clients, isLoading } = useClients();
  const { mutate: createClient, isPending: isCreating } = useCreateClient();
  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient();
  const { mutate: deleteClient } = useDeleteClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("customer");
  const [contact, setContact] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setType("customer");
    setContact("");
  };

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setName(client.name);
    setType(client.type);
    setContact(client.contact || "");
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: t("Please enter the client name"), variant: "destructive" });
      return;
    }

    if (editingId) {
      updateClient({ id: editingId, data: { name: name.trim(), type, contact: contact.trim() || null } }, {
        onSuccess: () => {
          resetForm();
          toast({ title: t("Client updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update client"), description: err.message, variant: "destructive" });
        },
      });
    } else {
      createClient({ name: name.trim(), type, contact: contact.trim() || null }, {
        onSuccess: () => {
          resetForm();
          toast({ title: t("Client created successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to create client"), description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteClient(id, {
      onSuccess: () => {
        if (editingId === id) resetForm();
        toast({ title: t("Client deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete client"), description: err.message, variant: "destructive" });
      },
    });
  };

  const filtered = clients?.filter((c: Client) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const customers = clients?.filter((c: Client) => c.type === "customer") || [];
  const suppliers = clients?.filter((c: Client) => c.type === "supplier") || [];
  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Clients")}</h1>
        <p className="text-muted-foreground mt-1">{t("Manage suppliers and customers")}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-base font-bold mb-1 block">{t("Name")}</label>
              <Input
                data-testid="input-client-name"
                className="h-11 text-base font-semibold"
                placeholder={t("Client name...")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-base font-bold mb-1 block">{t("Type")}</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11 text-base font-semibold" data-testid="select-client-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">{t("Customer")}</SelectItem>
                  <SelectItem value="supplier">{t("Supplier")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-base font-bold mb-1 block">{t("Contact")}</label>
              <Input
                data-testid="input-client-contact"
                className="h-11 text-base font-semibold"
                placeholder="0770-000-0000"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="h-11 flex-1 bg-primary text-white"
                data-testid="button-save-client"
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Customers")}</CardTitle>
            <IconCustomers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Suppliers")}</CardTitle>
            <IconCustomers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <SearchInput
            placeholder={t("Search clients...")}
            containerClassName="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm("")}
            data-testid="input-search-clients"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconCustomers className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t("No clients found")}</h3>
              <p>{t("Add a new client to get started.")}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-sm font-bold">#</TableHead>
                    <TableHead className="text-sm font-bold">{t("Name")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Type")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Contact")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client: Client, index: number) => (
                    <TableRow
                      key={client.id}
                      data-testid={`row-client-${client.id}`}
                      className={editingId === client.id ? "bg-primary/5" : ""}
                    >
                      <TableCell className="text-sm font-semibold">{index + 1}</TableCell>
                      <TableCell className="text-sm font-semibold">{client.name}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        <Badge variant={client.type === "customer" ? "default" : "secondary"}>
                          {t(client.type === "customer" ? "Customer" : "Supplier")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-semibold">{client.contact || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(client)}
                            data-testid={`button-edit-client-${client.id}`}
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-client-${client.id}`}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("Delete Client")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("Are you sure you want to delete this client?")} ({client.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(client.id)}
                                  data-testid={`button-confirm-delete-client-${client.id}`}
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
