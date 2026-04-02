import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Owner } from "@shared/routes";
import { useOwners, useCreateOwner, useUpdateOwner, useDeleteOwner } from "@/hooks/use-owners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Save, Loader2, Trash2, Pencil, RotateCcw, X } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconOwner } from "@/components/erp-icons";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usd } from "@/lib/format-utils";

export default function OwnersPage() {
  const { t } = useTranslation();
  const { data: ownersList, isLoading } = useOwners();
  const { mutate: createOwner, isPending: isCreating } = useCreateOwner();
  const { mutate: updateOwner, isPending: isUpdating } = useUpdateOwner();
  const { mutate: deleteOwner } = useDeleteOwner();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [oldDebtUsd, setOldDebtUsd] = useState("0");
  const [oldDebtIqd, setOldDebtIqd] = useState("0");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const resetForm = () => {
    setName("");
    setOldDebtUsd("0");
    setOldDebtIqd("0");
    setEditingId(null);
  };

  const startEdit = (item: Owner) => {
    setEditingId(item.id);
    setName(item.name);
    setOldDebtUsd(item.oldDebtUsd || "0");
    setOldDebtIqd(item.oldDebtIqd || "0");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: t("Please enter the owner name"), variant: "destructive" });
      return;
    }

    const payload = { name: name.trim(), oldDebtUsd, oldDebtIqd };

    if (editingId) {
      updateOwner({ id: editingId, data: payload }, {
        onSuccess: () => {
          resetForm();
          toast({ title: t("Owner updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update owner"), description: t(err.message), variant: "destructive" });
        },
      });
    } else {
      createOwner(payload, {
        onSuccess: () => {
          resetForm();
          toast({ title: t("Owner added successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to add owner"), description: t(err.message), variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteOwner(id, {
      onSuccess: () => {
        toast({ title: t("Owner deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete owner"), description: t(err.message), variant: "destructive" });
      },
    });
  };

  const filtered = ownersList?.filter((a: Owner) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isSaving = isCreating || isUpdating;
  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <IconOwner className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          {t('Owner Names')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('Manage owner names and balances')}</p>
      </div>

      <Card className={`border-border/50 shadow-sm ${editingId ? "ring-2 ring-orange-400 border-orange-400" : ""}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            {editingId ? (
              <>
                <Pencil className="h-5 w-5 text-orange-500" />
                {t('Edit Owner')}
              </>
            ) : (
              <>
                <IconOwner className="h-5 w-5" />
                {t('Add New Owner')}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('Owner Name')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('e.g. Ahmed')}
                data-testid="input-owner-name"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Opening Balance USD')}</Label>
              <Input
                type="number"
                step="0.01"
                value={oldDebtUsd}
                onChange={(e) => setOldDebtUsd(e.target.value)}
                placeholder="0.00"
                data-testid="input-owner-old-debt-usd"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Opening Balance IQD')}</Label>
              <Input
                type="number"
                step="250"
                value={oldDebtIqd}
                onChange={(e) => setOldDebtIqd(e.target.value)}
                placeholder="0"
                data-testid="input-owner-old-debt-iqd"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-owner" className="gap-2">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {editingId ? t('Update') : t('Save')}
            </Button>
            {editingId ? (
              <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-cancel-edit-owner">
                <X className="w-5 h-5" />
                {t('Cancel')}
              </Button>
            ) : (
              <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-owner">
                <RotateCcw className="w-5 h-5" />
                {t('Reset')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Owners')}</CardTitle>
            <IconOwner className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ownersList?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <SearchInput placeholder={t('Search owners...')} containerClassName="max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClear={() => setSearchTerm("")} data-testid="input-search-owners" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconOwner className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No owners found')}</h3>
              <p>{t('Add a new owner to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Owner Name')}</TableHead>
                    <TableHead>{t('Opening Balance USD')}</TableHead>
                    <TableHead>{t('Opening Balance IQD')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: Owner, idx: number) => (
                    <TableRow
                      key={item.id}
                      data-testid={`row-owner-${item.id}`}
                      className={editingId === item.id ? "bg-orange-50 dark:bg-orange-950/20" : ""}
                    >
                      <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <IconOwner className="h-3 w-3" />
                          {item.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-blue-600">
                        {parseFloat(item.oldDebtUsd) !== 0 ? usd(item.oldDebtUsd) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-blue-600">
                        {parseFloat(item.oldDebtIqd) !== 0 ? formatIQD(parseFloat(item.oldDebtIqd)) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(item)} data-testid={`button-edit-owner-${item.id}`}>
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-owner-${item.id}`}>
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Owner')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this owner?')} ({item.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)} data-testid={`button-confirm-delete-owner-${item.id}`}>
                                  {t('Delete')}
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
