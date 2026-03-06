import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useExternalDebts, useCreateExternalDebt, useUpdateExternalDebt, useDeleteExternalDebt } from "@/hooks/use-external-debts";
import { externalDebts } from "@shared/schema";

type ExternalDebt = typeof externalDebts.$inferSelect;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, HandCoins, Loader2, Trash2, Pencil, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usd } from "@/lib/format-utils";
import { playDeleteSound } from "@/lib/sounds";

export default function ExternalDebtsPage() {
  const { t } = useTranslation();
  const { data: debtsList, isLoading } = useExternalDebts();
  const { mutate: createDebt, isPending: isCreating } = useCreateExternalDebt();
  const { mutate: updateDebt, isPending: isUpdating } = useUpdateExternalDebt();
  const { mutate: deleteDebt } = useDeleteExternalDebt();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [oldDebtUsd, setOldDebtUsd] = useState("0");
  const [oldDebtIqd, setOldDebtIqd] = useState("0");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteItem, setDeleteItem] = useState<ExternalDebt | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const isSaving = isCreating || isUpdating;

  const nameSuggestions = useMemo(() => {
    if (!name.trim() || !debtsList?.length) return [];
    const q = name.toLowerCase();
    return debtsList.filter((d: ExternalDebt) =>
      d.name.toLowerCase().includes(q) && d.id !== editingId
    ).slice(0, 8);
  }, [name, debtsList, editingId]);

  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim() || !debtsList?.length) return [];
    const q = searchTerm.toLowerCase();
    return debtsList.filter((d: ExternalDebt) =>
      d.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchTerm, debtsList]);

  const selectSuggestion = (item: ExternalDebt) => {
    startEdit(item);
    setShowSuggestions(false);
  };

  const resetForm = () => {
    setName("");
    setOldDebtUsd("0");
    setOldDebtIqd("0");
    setEditingId(null);
    setShowSuggestions(false);
  };

  const startEdit = (item: ExternalDebt) => {
    setEditingId(item.id);
    setName(item.name);
    setOldDebtUsd(item.oldDebtUsd || "0");
    setOldDebtIqd(item.oldDebtIqd || "0");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: t("Please enter the external debt name"), variant: "destructive" });
      return;
    }

    const data = { name: name.trim(), oldDebtUsd, oldDebtIqd };

    if (editingId) {
      updateDebt({ id: editingId, data }, {
        onSuccess: () => {
          toast({ title: t("External debt updated successfully") });
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to update external debt"), description: err.message, variant: "destructive" });
        },
      });
    } else {
      createDebt(data, {
        onSuccess: () => {
          toast({ title: t("External debt added successfully") });
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to add external debt"), description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteDebt(deleteItem.id, {
      onSuccess: () => {
        toast({ title: t("External debt deleted successfully") });
        playDeleteSound();
        setDeleteItem(null);
        if (editingId === deleteItem.id) resetForm();
      },
      onError: (err) => {
        toast({ title: t("Failed to delete external debt"), description: err.message, variant: "destructive" });
        setDeleteItem(null);
      },
    });
  };

  const filtered = debtsList?.filter((a: ExternalDebt) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatIQD = (val: number) => val.toLocaleString() + " IQD";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <HandCoins className="h-6 w-6 text-purple-600" />
            </div>
            {t('External Debts')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Manage external debts')}</p>
        </div>
      </div>

      <Card className={`border-border/50 shadow-sm ${editingId ? "ring-2 ring-orange-400 dark:ring-orange-600" : ""}`} ref={formRef}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            {editingId ? <Pencil className="h-5 w-5 text-orange-500" /> : <Plus className="h-5 w-5 text-primary" />}
            {editingId ? t('Edit External Debt') : t('Add External Debt')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 min-w-0 relative">
              <label className="text-sm font-medium mb-1 block">{t('External Debt Name')}</label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={t('e.g. Company ABC')}
                data-testid="input-external-debt-name"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoComplete="off"
              />
              {showSuggestions && nameSuggestions.length > 0 && !editingId && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {nameSuggestions.map((item: ExternalDebt) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-start px-3 py-2 hover:bg-muted/80 flex items-center justify-between gap-2 text-sm transition-colors"
                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(item); }}
                      data-testid={`suggestion-external-debt-${item.id}`}
                    >
                      <span className="flex items-center gap-2">
                        <HandCoins className="h-3.5 w-3.5 text-purple-500" />
                        <span className="font-medium">{item.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {parseFloat(item.oldDebtUsd) > 0 ? usd(item.oldDebtUsd) : ""}
                        {parseFloat(item.oldDebtUsd) > 0 && parseFloat(item.oldDebtIqd) > 0 ? " | " : ""}
                        {parseFloat(item.oldDebtIqd) > 0 ? formatIQD(parseFloat(item.oldDebtIqd)) : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-full md:w-44">
              <label className="text-sm font-medium mb-1 block">{t('Opening Balance USD')}</label>
              <Input
                type="number"
                step="0.01"
                value={oldDebtUsd}
                onChange={(e) => setOldDebtUsd(e.target.value)}
                placeholder="0.00"
                data-testid="input-external-debt-old-debt-usd"
              />
            </div>
            <div className="w-full md:w-44">
              <label className="text-sm font-medium mb-1 block">{t('Opening Balance IQD')}</label>
              <Input
                type="number"
                step="250"
                value={oldDebtIqd}
                onChange={(e) => setOldDebtIqd(e.target.value)}
                placeholder="0"
                data-testid="input-external-debt-old-debt-iqd"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-external-debt" className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? t('Update') : t('Save')}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm} data-testid="button-cancel-edit-external-debt" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {t('Cancel')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total External Debts')}</CardTitle>
            <HandCoins className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{debtsList?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('Search external debts...')}
              className="pl-9"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setShowSearchSuggestions(true); }}
              onFocus={() => setShowSearchSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
              data-testid="input-search-external-debts"
              autoComplete="off"
            />
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchSuggestions.map((item: ExternalDebt) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-start px-3 py-2 hover:bg-muted/80 flex items-center justify-between gap-2 text-sm transition-colors"
                    onMouseDown={(e) => { e.preventDefault(); setSearchTerm(item.name); setShowSearchSuggestions(false); }}
                    data-testid={`search-suggestion-external-debt-${item.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <HandCoins className="h-3.5 w-3.5 text-purple-500" />
                      <span className="font-medium">{item.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {parseFloat(item.oldDebtUsd) > 0 ? usd(item.oldDebtUsd) : ""}
                      {parseFloat(item.oldDebtUsd) > 0 && parseFloat(item.oldDebtIqd) > 0 ? " | " : ""}
                      {parseFloat(item.oldDebtIqd) > 0 ? formatIQD(parseFloat(item.oldDebtIqd)) : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><HandCoins className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No external debts found')}</h3>
              <p>{t('Add a new external debt to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('External Debt Name')}</TableHead>
                    <TableHead>{t('Opening Balance USD')}</TableHead>
                    <TableHead>{t('Opening Balance IQD')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: ExternalDebt, idx: number) => (
                    <TableRow
                      key={item.id}
                      data-testid={`row-external-debt-${item.id}`}
                      className={editingId === item.id ? "bg-orange-50 dark:bg-orange-900/10" : ""}
                    >
                      <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <HandCoins className="h-3 w-3" />
                          {item.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-bold text-red-600">
                        {parseFloat(item.oldDebtUsd) > 0 ? usd(item.oldDebtUsd) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-bold text-red-600">
                        {parseFloat(item.oldDebtIqd) > 0 ? formatIQD(parseFloat(item.oldDebtIqd)) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => startEdit(item)}
                            data-testid={`button-edit-external-debt-${item.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setDeleteItem(item)}
                            data-testid={`button-delete-external-debt-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => !v && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete External Debt')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Are you sure you want to delete this external debt?')} ({deleteItem?.name})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete-external-debt">
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
