import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2, Database, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TableInfo {
  key: string;
  labelAr: string;
  labelEn: string;
}

const TABLES: TableInfo[] = [
  { key: "addresses", labelAr: "العناوين", labelEn: "Addresses" },
  { key: "units", labelAr: "الوحدات", labelEn: "Units" },
  { key: "categories", labelAr: "الفئات", labelEn: "Categories" },
  { key: "category_groups", labelAr: "مجموعات الفئات", labelEn: "Category Groups" },
  { key: "products", labelAr: "المنتجات", labelEn: "Products" },
  { key: "inventory", labelAr: "المخزون", labelEn: "Inventory" },
  { key: "clients", labelAr: "العملاء / الموردين", labelEn: "Clients / Suppliers" },
  { key: "accounts", labelAr: "الحسابات", labelEn: "Accounts" },
  { key: "transactions", labelAr: "المعاملات", labelEn: "Transactions" },
  { key: "representatives", labelAr: "المناديب", labelEn: "Representatives" },
  { key: "purchase_invoices", labelAr: "فواتير الشراء", labelEn: "Purchase Invoices" },
  { key: "purchase_invoice_items", labelAr: "عناصر فواتير الشراء", labelEn: "Purchase Invoice Items" },
  { key: "purchase_returns", labelAr: "مرتجعات الشراء", labelEn: "Purchase Returns" },
  { key: "purchase_return_items", labelAr: "عناصر مرتجعات الشراء", labelEn: "Purchase Return Items" },
  { key: "supplier_payments", labelAr: "دفعات الموردين", labelEn: "Supplier Payments" },
  { key: "supplier_adjustments", labelAr: "تسويات الموردين", labelEn: "Supplier Adjustments" },
  { key: "sales_invoices", labelAr: "فواتير المبيعات", labelEn: "Sales Invoices" },
  { key: "sales_invoice_items", labelAr: "عناصر فواتير المبيعات", labelEn: "Sales Invoice Items" },
  { key: "sales_returns", labelAr: "مرتجعات المبيعات", labelEn: "Sales Returns" },
  { key: "sales_return_items", labelAr: "عناصر مرتجعات المبيعات", labelEn: "Sales Return Items" },
  { key: "customer_receipts", labelAr: "وصولات العملاء", labelEn: "Customer Receipts" },
  { key: "agent_payments", labelAr: "دفعات الوكلاء", labelEn: "Agent Payments" },
  { key: "banks", labelAr: "البنوك", labelEn: "Banks" },
  { key: "bank_transactions", labelAr: "معاملات البنوك", labelEn: "Bank Transactions" },
  { key: "customs_clearances", labelAr: "التخليصات الجمركية", labelEn: "Customs Clearances" },
  { key: "customs_clearance_transactions", labelAr: "معاملات التخليص الجمركي", labelEn: "Clearance Transactions" },
  { key: "clearance_purchase_invoices", labelAr: "فواتير شراء التخليص", labelEn: "Clearance Purchase Invoices" },
  { key: "transfer_offices", labelAr: "مكاتب الحوالات", labelEn: "Transfer Offices" },
  { key: "transfer_office_transactions", labelAr: "معاملات مكاتب الحوالات", labelEn: "Office Transactions" },
  { key: "external_debts", labelAr: "الديون الخارجية", labelEn: "External Debts" },
  { key: "external_debt_transactions", labelAr: "معاملات الديون الخارجية", labelEn: "External Debt Transactions" },
  { key: "owners", labelAr: "المالكين", labelEn: "Owners" },
  { key: "owner_transactions", labelAr: "معاملات المالكين", labelEn: "Owner Transactions" },
  { key: "expense_types", labelAr: "أنواع المصروفات", labelEn: "Expense Types" },
  { key: "expenses", labelAr: "المصروفات", labelEn: "Expenses" },
  { key: "currency_exchanges", labelAr: "تبديل العملات", labelEn: "Currency Exchanges" },
  { key: "warehouse_transfers", labelAr: "نقل المخازن", labelEn: "Warehouse Transfers" },
  { key: "warehouse_transfer_items", labelAr: "عناصر نقل المخازن", labelEn: "Warehouse Transfer Items" },
  { key: "product_damages", labelAr: "تالفات المنتجات", labelEn: "Product Damages" },
  { key: "product_damage_items", labelAr: "عناصر تالفات المنتجات", labelEn: "Product Damage Items" },
  { key: "warehouses", labelAr: "المخازن", labelEn: "Warehouses" },
  { key: "notifications", labelAr: "الإشعارات", labelEn: "Notifications" },
  { key: "export_logs", labelAr: "سجلات التصدير", labelEn: "Export Logs" },
  { key: "agent_product_loads", labelAr: "تحميل منتجات الوكيل", labelEn: "Agent Product Loads" },
  { key: "agent_product_load_items", labelAr: "عناصر تحميل المنتجات", labelEn: "Agent Product Load Items" },
  { key: "agent_clients", labelAr: "عملاء الوكيل", labelEn: "Agent Clients" },
  { key: "agent_locations", labelAr: "مواقع الوكيل", labelEn: "Agent Locations" },
];

export default function DataResetPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isRtl = i18n.language === "ar" || i18n.language === "ku";
  const isAr = i18n.language === "ar" || i18n.language === "ku";

  const [loadingTable, setLoadingTable] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; tableName: string; label: string } | null>(null);
  const [confirmAllDialog, setConfirmAllDialog] = useState(false);

  const handleResetTable = async (tableName: string) => {
    setLoadingTable(tableName);
    try {
      await apiRequest("DELETE", `/api/data-reset/${tableName}`);
      queryClient.clear();
      toast({
        title: isAr ? "تم التصفير" : "Data Cleared",
        description: isAr ? `تم تصفير جدول ${tableName} بنجاح` : `Table ${tableName} cleared successfully`,
      });
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: err?.message || (isAr ? "فشل في تصفير الجدول" : "Failed to clear table"),
        variant: "destructive",
      });
    } finally {
      setLoadingTable(null);
    }
  };

  const handleResetAll = async () => {
    setLoadingAll(true);
    try {
      await apiRequest("DELETE", "/api/data-reset-all");
      queryClient.clear();
      toast({
        title: isAr ? "تم التصفير" : "Data Cleared",
        description: isAr ? "تم تصفير جميع الجداول بنجاح" : "All tables cleared successfully",
      });
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: err?.message || (isAr ? "فشل في تصفير جميع الجداول" : "Failed to clear all tables"),
        variant: "destructive",
      });
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <div className="p-6 space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 text-lg" data-testid="title-data-reset">
            <AlertTriangle className="w-6 h-6" />
            {isAr ? "تصفير البيانات" : "Data Reset"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" data-testid="text-warning-message">
            {isAr
              ? "تحذير: هذه العملية ستحذف جميع البيانات من الجدول المحدد نهائياً ولا يمكن التراجع عنها."
              : "Warning: This operation will permanently delete all data from the selected table and cannot be undone."}
          </p>
          <Button
            onClick={() => setConfirmAllDialog(true)}
            disabled={loadingAll || loadingTable !== null}
            className="bg-red-600 text-white hover:bg-red-700"
            data-testid="button-reset-all"
          >
            {loadingAll ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
            <span className={isRtl ? "mr-2" : "ml-2"}>
              {isAr ? "تصفير جميع الجداول" : "Reset All Tables"}
            </span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold" data-testid="title-individual-reset">
            <Database className="w-5 h-5" />
            {isAr ? "تصفير جداول منفردة" : "Reset Individual Tables"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TABLES.map((table) => (
              <div
                key={table.key}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                data-testid={`row-table-${table.key}`}
              >
                <span className="text-sm font-semibold" data-testid={`text-table-name-${table.key}`}>
                  {isAr ? table.labelAr : table.labelEn}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDialog({ open: true, tableName: table.key, label: isAr ? table.labelAr : table.labelEn })}
                  disabled={loadingTable === table.key || loadingAll}
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                  data-testid={`button-reset-${table.key}`}
                >
                  {loadingTable === table.key ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog?.open || false} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent dir={isRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {isAr ? "تأكيد التصفير" : "Confirm Reset"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? `هل أنت متأكد من تصفير جدول "${confirmDialog?.label}"؟ سيتم حذف جميع البيانات نهائياً.`
                : `Are you sure you want to reset the "${confirmDialog?.label}" table? All data will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRtl ? "flex-row-reverse gap-2" : ""}>
            <AlertDialogCancel data-testid="button-cancel-reset">
              {isAr ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (confirmDialog?.tableName) {
                  handleResetTable(confirmDialog.tableName);
                }
                setConfirmDialog(null);
              }}
              data-testid="button-confirm-reset"
            >
              {isAr ? "تصفير" : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAllDialog} onOpenChange={setConfirmAllDialog}>
        <AlertDialogContent dir={isRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {isAr ? "تأكيد تصفير الكل" : "Confirm Reset All"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? "هل أنت متأكد من تصفير جميع الجداول؟ سيتم حذف كل البيانات في النظام نهائياً ولا يمكن التراجع عن هذا الإجراء!"
                : "Are you sure you want to reset ALL tables? This will permanently delete ALL data in the system and cannot be undone!"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRtl ? "flex-row-reverse gap-2" : ""}>
            <AlertDialogCancel data-testid="button-cancel-reset-all">
              {isAr ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                handleResetAll();
                setConfirmAllDialog(false);
              }}
              data-testid="button-confirm-reset-all"
            >
              {isAr ? "تصفير الكل" : "Reset All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
