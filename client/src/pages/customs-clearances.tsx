import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { type CustomsClearance } from "@shared/routes";
import { useCustomsClearances, useCreateCustomsClearance, useUpdateCustomsClearance, useDeleteCustomsClearance } from "@/hooks/use-customs";
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
import { ShieldCheck, Loader2, Trash2, Pencil, Save, RotateCcw, Search, Undo2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usd, fmtIqd } from "@/lib/format-utils";

export default function CustomsClearancesPage() {
  const { t } = useTranslation();
  const { data: clearances, isLoading } = useCustomsClearances();
  const { mutate: createClearance, isPending: isCreating } = useCreateCustomsClearance();
  const { mutate: updateClearance, isPending: isUpdating } = useUpdateCustomsClearance();
  const { mutate: deleteClearance } = useDeleteCustomsClearance();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [oldDebtUsd, setOldDebtUsd] = useState("0");
  const [oldDebtIqd, setOldDebtIqd] = useState("0");
  const [searchTerm, setSearchTerm] = useState("");

  const resetForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setOldDebtUsd("0");
    setOldDebtIqd("0");
  }, []);

  const handleEdit = useCallback((item: CustomsClearance) => {
    setEditingId(item.id);
    setName(item.name);
    setOldDebtUsd(item.oldDebtUsd || "0");
    setOldDebtIqd(item.oldDebtIqd || "0");
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      toast({ title: t("Error"), description: t("Please enter the customs clearance name"), variant: "destructive" });
      return;
    }

    const payload = {
      name: name.trim(),
      oldDebtUsd: oldDebtUsd || "0",
      oldDebtIqd: oldDebtIqd || "0",
    };

    if (editingId) {
      updateClearance({ id: editingId, data: payload }, {
        onSuccess: () => {
          toast({ title: t("Customs clearance updated successfully") });
          resetForm();
        },
        onError: (err: any) => {
          toast({ title: t("Failed to update customs clearance"), description: err?.message, variant: "destructive" });
        },
      });
    } else {
      createClearance(payload, {
        onSuccess: () => {
          toast({ title: t("Customs clearance added successfully") });
          resetForm();
        },
        onError: (err: any) => {
          toast({ title: t("Failed to add customs clearance"), description: err?.message, variant: "destructive" });
        },
      });
    }
  }, [name, oldDebtUsd, oldDebtIqd, editingId, createClearance, updateClearance, toast, t, resetForm]);

  const handleDelete = (id: number) => {
    deleteClearance(id, {
      onSuccess: () => {
        toast({ title: t("Customs clearance deleted successfully") });
        if (editingId === id) resetForm();
      },
      onError: (err: any) => {
        toast({ title: t("Failed to delete customs clearance"), description: err?.message, variant: "destructive" });
      },
    });
  };

  const filtered = clearances?.filter((a: CustomsClearance) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isSaving = isCreating || isUpdating;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clearance-management">
            <Button variant="outline" size="icon" className="h-9 w-9" data-testid="button-back">
              <Undo2 className="h-5 w-5" />
            </Button>
          </Link>
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('Customs Clearances')}</h1>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          {clearances?.length || 0} {t('Total')}
        </Badge>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {editingId ? t('Edit Customs Clearance') : t('Add New Customs Clearance')}
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm} className="ms-2 text-muted-foreground" data-testid="button-cancel-edit">
                <RotateCcw className="w-4 h-4 me-1" />
                {t('Cancel')}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('Customs Clearance Name')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('e.g. Al-Basra Customs')}
                data-testid="input-customs-clearance-name"
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
                data-testid="input-customs-clearance-old-debt-usd"
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
                data-testid="input-customs-clearance-old-debt-iqd"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={isSaving} className="gap-2" data-testid="button-save-customs-clearance">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? t('Update') : t('Save')}
            </Button>
            <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset">
              <RotateCcw className="w-4 h-4" />
              {t('Reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">{t('Customs Clearances')}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search customs clearances...')}
                className="ps-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-customs-clearances"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h3 className="font-semibold text-lg">{t('No customs clearances found')}</h3>
              <p>{t('Add a new customs clearance to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Customs Clearance Name')}</TableHead>
                    <TableHead>{t('Opening Balance USD')}</TableHead>
                    <TableHead>{t('Opening Balance IQD')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: CustomsClearance, i: number) => (
                    <TableRow key={item.id} data-testid={`row-customs-clearance-${item.id}`}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          {item.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {parseFloat(item.oldDebtUsd) > 0 ? usd(item.oldDebtUsd) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-red-600">
                        {parseFloat(item.oldDebtIqd) > 0 ? fmtIqd(parseFloat(item.oldDebtIqd)) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={() => { handleEdit(item); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            data-testid={`button-edit-customs-clearance-${item.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                data-testid={`button-delete-customs-clearance-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Customs Clearance')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this customs clearance?')} ({item.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)} data-testid={`button-confirm-delete-customs-clearance-${item.id}`}>
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
