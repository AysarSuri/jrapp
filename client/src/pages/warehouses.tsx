import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from "@/hooks/use-warehouses";
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
import { IconWarehouse } from "@/components/erp-icons";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Warehouse } from "@shared/routes";

export default function WarehousesPage() {
  const { t } = useTranslation();
  const { data: warehousesList, isLoading } = useWarehouses();
  const { mutate: createWarehouse, isPending: isCreating } = useCreateWarehouse();
  const { mutate: updateWarehouse, isPending: isUpdating } = useUpdateWarehouse();
  const { mutate: deleteWarehouse } = useDeleteWarehouse();
  const { toast } = useToast();
  const [warehouseName, setWarehouseName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isSaving = isCreating || isUpdating;

  const resetForm = () => {
    setWarehouseName("");
    setEditingId(null);
  };

  const startEdit = (item: Warehouse) => {
    setEditingId(item.id);
    setWarehouseName(item.name);
  };

  const handleSave = () => {
    if (!warehouseName.trim()) {
      toast({ title: t("Please enter warehouse name"), variant: "destructive" });
      return;
    }
    if (editingId) {
      updateWarehouse({ id: editingId, data: { name: warehouseName.trim() } }, {
        onSuccess: () => {
          resetForm();
          toast({ title: t("Warehouse updated successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to update warehouse"), description: err.message, variant: "destructive" });
        },
      });
    } else {
      createWarehouse({ name: warehouseName.trim() }, {
        onSuccess: () => {
          resetForm();
          toast({ title: t("Warehouse added successfully") });
        },
        onError: (err) => {
          toast({ title: t("Failed to add warehouse"), description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteWarehouse(id, {
      onSuccess: () => {
        if (editingId === id) resetForm();
        toast({ title: t("Warehouse deleted successfully") });
      },
      onError: (err) => {
        toast({ title: t("Failed to delete warehouse"), description: err.message, variant: "destructive" });
      },
    });
  };

  const filtered = warehousesList?.filter((a: Warehouse) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <IconWarehouse className="h-7 w-7 text-primary" />
          {t('Warehouses')}
        </h1>
        <Button variant="outline" onClick={resetForm} data-testid="button-reset-warehouse">
          <RotateCcw className="w-5 h-5 mr-2" />
          {t('Reset')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{editingId ? t('Edit Warehouse') : t('Add New Warehouse')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-sm font-bold">{t('Warehouse Name')}</Label>
                <Input
                  data-testid="input-warehouse-name"
                  placeholder={t('e.g. Main Warehouse')}
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                />
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-[#ffffff]" data-testid="button-save-warehouse">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {editingId ? t('Update') : t('Save')}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm} data-testid="button-cancel-edit">
                  <X className="w-5 h-5 mr-2" />
                  {t('Cancel')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Warehouses')}</CardTitle>
            <IconWarehouse className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehousesList?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <SearchInput placeholder={t('Search warehouses...')} containerClassName="max-w-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClear={() => setSearchTerm("")} data-testid="input-search-warehouses" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><IconWarehouse className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No warehouses found')}</h3>
              <p>{t('Add a new warehouse to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>#</TableHead>
                    <TableHead>{t('Warehouse Name')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: Warehouse) => (
                    <TableRow key={item.id} className={editingId === item.id ? "bg-accent" : ""} data-testid={`row-warehouse-${item.id}`}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <IconWarehouse className="h-3 w-3" />
                          {item.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(item)} data-testid={`button-edit-warehouse-${item.id}`}>
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-warehouse-${item.id}`}>
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Warehouse')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this warehouse?')} ({item.name})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)} data-testid={`button-confirm-delete-warehouse-${item.id}`}>
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
