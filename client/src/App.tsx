import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { hasRoutePermission } from "@/lib/permissions";
import { useTranslation } from "react-i18next";

import Dashboard from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import UnitsPage from "@/pages/units";
import CategoriesPage from "@/pages/categories";
import CustomersPage from "@/pages/customers";
import SuppliersPage from "@/pages/suppliers";
import AddressesPage from "@/pages/addresses";
import SupplierAddressesPage from "@/pages/supplier-addresses";
import AccountsPage from "@/pages/accounts";
import WarehousesPage from "@/pages/warehouses";
import TransferOfficesPage from "@/pages/transfer-offices";
import BanksPage from "@/pages/banks";
import CustomsClearancesPage from "@/pages/customs-clearances";
import PurchaseInvoiceUsdPage from "@/pages/purchase-invoice-usd";
import PurchaseInvoiceIqdPage from "@/pages/purchase-invoice-iqd";
import SupplierPaymentsPage from "@/pages/supplier-payments";
import SupplierAdjustmentsPage from "@/pages/supplier-adjustments";
import SupplierManagementPage from "@/pages/supplier-management";
import SupplierDebtsPage from "@/pages/supplier-debts";
import CustomerDebtsPage from "@/pages/customer-debts";

import SalesManagementPage from "@/pages/sales-management";
import BankManagementPage from "@/pages/bank-management";
import ClearanceManagementPage from "@/pages/clearance-management";
import OfficeManagementPage from "@/pages/office-management";
import ExpenseManagementPage from "@/pages/expense-management";
import ExternalDebtManagementPage from "@/pages/external-debt-management";
import OwnerManagementPage from "@/pages/owner-management";
import SupplierStatementPage from "@/pages/supplier-statement";
import SupplierStatementUsdPage from "@/pages/supplier-statement-usd";
import SupplierStatementIqdPage from "@/pages/supplier-statement-iqd";
import BankReceiptsPage from "@/pages/bank-receipts";
import BankPaymentsPage from "@/pages/bank-payments";
import BankStatementUsdPage from "@/pages/bank-statement-usd";
import BankStatementIqdPage from "@/pages/bank-statement-iqd";
import ClearanceReceiptsPage from "@/pages/clearance-receipts";
import ClearancePaymentsPage from "@/pages/clearance-payments";
import ClearancePurchaseInvoicesPage from "@/pages/clearance-purchase-invoices";
import ClearanceStatementUsdPage from "@/pages/clearance-statement-usd";
import ClearanceStatementIqdPage from "@/pages/clearance-statement-iqd";
import OfficeReceiptsPage from "@/pages/office-receipts";
import OfficePaymentsPage from "@/pages/office-payments";
import OfficeStatementUsdPage from "@/pages/office-statement-usd";
import OfficeStatementIqdPage from "@/pages/office-statement-iqd";
import ExpenseTypesPage from "@/pages/expense-types";
import ExpensesPage from "@/pages/expenses";
import ExternalDebtsPage from "@/pages/external-debts";
import ExternalDebtReceiptsPage from "@/pages/external-debt-receipts";
import ExternalDebtPaymentsPage from "@/pages/external-debt-payments";
import ExternalDebtStatementUsdPage from "@/pages/external-debt-statement-usd";
import ExternalDebtStatementIqdPage from "@/pages/external-debt-statement-iqd";
import ExternalDebtStatementPage from "@/pages/external-debt-statement";
import ExternalDebtDebtsPage from "@/pages/external-debt-debts";
import OwnersPage from "@/pages/owners";
import OwnerWithdrawalsPage from "@/pages/owner-withdrawals";
import OwnerReturnsPage from "@/pages/owner-returns";
import OwnerStatementUsdPage from "@/pages/owner-statement-usd";
import OwnerStatementIqdPage from "@/pages/owner-statement-iqd";
import SalesInvoiceUsdPage from "@/pages/sales-invoice-usd";
import SalesInvoiceIqdPage from "@/pages/sales-invoice-iqd";
import SalesByCategoryPage from "@/pages/sales-by-category";
import PosIqdPage from "@/pages/pos-iqd";

import SalesReturnUsdPage from "@/pages/sales-return-usd";
import SalesReturnIqdPage from "@/pages/sales-return-iqd";
import PurchaseReturnUsdPage from "@/pages/purchase-return-usd";
import PurchaseReturnIqdPage from "@/pages/purchase-return-iqd";
import CustomerReceiptUsdPage from "@/pages/customer-receipt-usd";
import CustomerReceiptIqdPage from "@/pages/customer-receipt-iqd";
import AgentPaymentUsdPage from "@/pages/agent-payment-usd";
import AgentPaymentIqdPage from "@/pages/agent-payment-iqd";
import AgentReceiptPage from "@/pages/agent-receipt";
import AgentReceiptStatementPage from "@/pages/agent-receipt-statement";
import AgentExpenseStatementPage from "@/pages/agent-expense-statement";
import AgentStatementUsdPage from "@/pages/agent-statement-usd";
import AgentStatementIqdPage from "@/pages/agent-statement-iqd";
import CurrencyExchangePage from "@/pages/currency-exchange";
import WarehouseTransferPage from "@/pages/warehouse-transfer";
import AgentProductLoadPage from "@/pages/agent-product-load";
import AgentClientsPage from "@/pages/agent-clients";
import AgentGpsPage from "@/pages/agent-gps";
import RepStatementPage from "@/pages/rep-statement";
import AgentManagementPage from "@/pages/agent-management";
import MaterialManagementPage from "@/pages/material-management";
import ProductDamagePage from "@/pages/product-damage";
import InventoryReportPage from "@/pages/inventory-report";
import ExpiryReportPage from "@/pages/expiry-report";
import MaxStockReportPage from "@/pages/max-stock-report";
import ProfitsReportPage from "@/pages/profits-report";
import SalesDiscountsGiftsReportPage from "@/pages/sales-discounts-gifts-report";
import SupplierDiscountsGiftsReportPage from "@/pages/supplier-discounts-gifts-report";
import SupplierOrderUsdPage from "@/pages/supplier-order-usd";
import SupplierOrderIqdPage from "@/pages/supplier-order-iqd";
import SalesInvoicePage from "@/pages/sales-invoice";
import PurchaseInvoicePage from "@/pages/purchase-invoice";
import SalesReturnPage from "@/pages/sales-return";
import PurchaseReturnPage from "@/pages/purchase-return";
import CustomerReceiptPage from "@/pages/customer-receipt";
import AgentPaymentPage from "@/pages/agent-payment";
import AgentStatementPage from "@/pages/agent-statement";
import BankStatementPage from "@/pages/bank-statement";
import ClearanceStatementPage from "@/pages/clearance-statement";
import OfficeStatementPage from "@/pages/office-statement";
import OwnerStatementPage from "@/pages/owner-statement";
import BarcodePrintPage from "@/pages/barcode-print";
import AuditLogsPage from "@/pages/audit-logs";
import BackupRestorePage from "@/pages/backup-restore";
import CompanyBookPage from "@/pages/company-book";
import CompanyProfilePage from "@/pages/company-profile";
import SettingsPage from "@/pages/settings";
import UserManagementPage from "@/pages/user-management";
import DataResetPage from "@/pages/data-reset";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import { LayoutShell } from "@/components/layout-shell";
import {
  SmShiftsPage,
  SmProductionsPage,
  SmCashierPage,
  SmCardCashierPage,
  SmCapitalPage,
  SmBranchesPage,
  SmPaymentCardsPage,
} from "@/sm/SmProviders";
import "./lib/i18n";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();
  const [location] = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  const userRole = (user as any).role || "user";
  const userPermissions = (user as any).permissions || [];
  const userDetailedPerms = (user as any).detailedPermissions || null;

  if (!hasRoutePermission(userRole, userPermissions, location, userDetailedPerms)) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" data-testid="access-denied-page">
          <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
            <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold">{t('Access Denied')}</h2>
          <p className="text-muted-foreground">{t('You do not have permission to access this page')}</p>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <Component />
    </LayoutShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/products">
        <ProtectedRoute component={ProductsPage} />
      </Route>
      <Route path="/units">
        <ProtectedRoute component={UnitsPage} />
      </Route>
      <Route path="/categories">
        <ProtectedRoute component={CategoriesPage} />
      </Route>
      <Route path="/customers">
        <ProtectedRoute component={CustomersPage} />
      </Route>
      <Route path="/suppliers">
        <ProtectedRoute component={SuppliersPage} />
      </Route>
      <Route path="/addresses">
        <ProtectedRoute component={AddressesPage} />
      </Route>
      <Route path="/supplier-addresses">
        <ProtectedRoute component={SupplierAddressesPage} />
      </Route>
      <Route path="/warehouses">
        <ProtectedRoute component={WarehousesPage} />
      </Route>
      <Route path="/transfer-offices">
        <ProtectedRoute component={TransferOfficesPage} />
      </Route>
      <Route path="/banks">
        <ProtectedRoute component={BanksPage} />
      </Route>
      <Route path="/customs-clearances">
        <ProtectedRoute component={CustomsClearancesPage} />
      </Route>
      <Route path="/accounts">
        <ProtectedRoute component={AccountsPage} />
      </Route>
      <Route path="/purchase-invoice-usd">
        <ProtectedRoute component={PurchaseInvoiceUsdPage} />
      </Route>
      <Route path="/purchase-invoice-iqd">
        <ProtectedRoute component={PurchaseInvoiceIqdPage} />
      </Route>
      <Route path="/supplier-order-usd">
        <ProtectedRoute component={SupplierOrderUsdPage} />
      </Route>
      <Route path="/supplier-order-iqd">
        <ProtectedRoute component={SupplierOrderIqdPage} />
      </Route>
      <Route path="/supplier-payments">
        <ProtectedRoute component={SupplierPaymentsPage} />
      </Route>
      <Route path="/supplier-adjustments">
        <ProtectedRoute component={SupplierAdjustmentsPage} />
      </Route>
      <Route path="/supplier-management">
        <ProtectedRoute component={SupplierManagementPage} />
      </Route>
      <Route path="/supplier-debts">
        <ProtectedRoute component={SupplierDebtsPage} />
      </Route>
      <Route path="/customer-debts">
        <ProtectedRoute component={CustomerDebtsPage} />
      </Route>
      <Route path="/sales-management">
        <ProtectedRoute component={SalesManagementPage} />
      </Route>
      <Route path="/bank-management">
        <ProtectedRoute component={BankManagementPage} />
      </Route>
      <Route path="/clearance-management">
        <ProtectedRoute component={ClearanceManagementPage} />
      </Route>
      <Route path="/office-management">
        <ProtectedRoute component={OfficeManagementPage} />
      </Route>
      <Route path="/expense-management">
        <ProtectedRoute component={ExpenseManagementPage} />
      </Route>
      <Route path="/external-debt-management">
        <ProtectedRoute component={ExternalDebtManagementPage} />
      </Route>
      <Route path="/owner-management">
        <ProtectedRoute component={OwnerManagementPage} />
      </Route>
      <Route path="/supplier-statement">
        <ProtectedRoute component={SupplierStatementPage} />
      </Route>
      <Route path="/supplier-statement-usd">
        <ProtectedRoute component={SupplierStatementUsdPage} />
      </Route>
      <Route path="/supplier-statement-iqd">
        <ProtectedRoute component={SupplierStatementIqdPage} />
      </Route>
      <Route path="/bank-receipts">
        <ProtectedRoute component={BankReceiptsPage} />
      </Route>
      <Route path="/bank-payments">
        <ProtectedRoute component={BankPaymentsPage} />
      </Route>
      <Route path="/bank-statement-usd">
        <ProtectedRoute component={BankStatementUsdPage} />
      </Route>
      <Route path="/bank-statement-iqd">
        <ProtectedRoute component={BankStatementIqdPage} />
      </Route>
      <Route path="/clearance-receipts">
        <ProtectedRoute component={ClearanceReceiptsPage} />
      </Route>
      <Route path="/clearance-payments">
        <ProtectedRoute component={ClearancePaymentsPage} />
      </Route>
      <Route path="/clearance-purchase-invoices">
        <ProtectedRoute component={ClearancePurchaseInvoicesPage} />
      </Route>
      <Route path="/clearance-statement-usd">
        <ProtectedRoute component={ClearanceStatementUsdPage} />
      </Route>
      <Route path="/clearance-statement-iqd">
        <ProtectedRoute component={ClearanceStatementIqdPage} />
      </Route>
      <Route path="/office-receipts">
        <ProtectedRoute component={OfficeReceiptsPage} />
      </Route>
      <Route path="/office-payments">
        <ProtectedRoute component={OfficePaymentsPage} />
      </Route>
      <Route path="/office-statement-usd">
        <ProtectedRoute component={OfficeStatementUsdPage} />
      </Route>
      <Route path="/office-statement-iqd">
        <ProtectedRoute component={OfficeStatementIqdPage} />
      </Route>
      <Route path="/expense-types">
        <ProtectedRoute component={ExpenseTypesPage} />
      </Route>
      <Route path="/expenses">
        <ProtectedRoute component={ExpensesPage} />
      </Route>
      <Route path="/external-debts">
        <ProtectedRoute component={ExternalDebtsPage} />
      </Route>
      <Route path="/external-debt-receipts">
        <ProtectedRoute component={ExternalDebtReceiptsPage} />
      </Route>
      <Route path="/external-debt-payments">
        <ProtectedRoute component={ExternalDebtPaymentsPage} />
      </Route>
      <Route path="/external-debt-statement-usd">
        <ProtectedRoute component={ExternalDebtStatementUsdPage} />
      </Route>
      <Route path="/external-debt-statement-iqd">
        <ProtectedRoute component={ExternalDebtStatementIqdPage} />
      </Route>
      <Route path="/external-debt-debts">
        <ProtectedRoute component={ExternalDebtDebtsPage} />
      </Route>
      <Route path="/owners">
        <ProtectedRoute component={OwnersPage} />
      </Route>
      <Route path="/owner-withdrawals">
        <ProtectedRoute component={OwnerWithdrawalsPage} />
      </Route>
      <Route path="/owner-returns">
        <ProtectedRoute component={OwnerReturnsPage} />
      </Route>
      <Route path="/owner-statement-usd">
        <ProtectedRoute component={OwnerStatementUsdPage} />
      </Route>
      <Route path="/owner-statement-iqd">
        <ProtectedRoute component={OwnerStatementIqdPage} />
      </Route>
      <Route path="/sales-invoice-usd">
        <ProtectedRoute component={SalesInvoiceUsdPage} />
      </Route>
      <Route path="/sales-invoice-iqd">
        <ProtectedRoute component={SalesInvoiceIqdPage} />
      </Route>
      <Route path="/sales-by-category">
        <ProtectedRoute component={SalesByCategoryPage} />
      </Route>
      <Route path="/pos-iqd">
        <ProtectedRoute component={PosIqdPage} />
      </Route>

      <Route path="/sales-return-usd">
        <ProtectedRoute component={SalesReturnUsdPage} />
      </Route>
      <Route path="/sales-return-iqd">
        <ProtectedRoute component={SalesReturnIqdPage} />
      </Route>
      <Route path="/customer-receipt-usd">
        <ProtectedRoute component={CustomerReceiptUsdPage} />
      </Route>
      <Route path="/customer-receipt-iqd">
        <ProtectedRoute component={CustomerReceiptIqdPage} />
      </Route>
      <Route path="/agent-payment-usd">
        <ProtectedRoute component={AgentPaymentUsdPage} />
      </Route>
      <Route path="/agent-payment-iqd">
        <ProtectedRoute component={AgentPaymentIqdPage} />
      </Route>
      <Route path="/agent-receipt">
        <ProtectedRoute component={AgentReceiptPage} />
      </Route>
      <Route path="/agent-receipt-statement">
        <ProtectedRoute component={AgentReceiptStatementPage} />
      </Route>
      <Route path="/agent-expense-statement">
        <ProtectedRoute component={AgentExpenseStatementPage} />
      </Route>
      <Route path="/agent-statement-usd">
        <ProtectedRoute component={AgentStatementUsdPage} />
      </Route>
      <Route path="/agent-statement-iqd">
        <ProtectedRoute component={AgentStatementIqdPage} />
      </Route>
      <Route path="/currency-exchange">
        <ProtectedRoute component={CurrencyExchangePage} />
      </Route>
      <Route path="/warehouse-transfer">
        <ProtectedRoute component={WarehouseTransferPage} />
      </Route>
      <Route path="/agent-management">
        <ProtectedRoute component={AgentManagementPage} />
      </Route>
      <Route path="/material-management">
        <ProtectedRoute component={MaterialManagementPage} />
      </Route>
      <Route path="/agent-product-load">
        <ProtectedRoute component={AgentProductLoadPage} />
      </Route>
      <Route path="/agent-clients">
        <ProtectedRoute component={AgentClientsPage} />
      </Route>
      <Route path="/agent-gps">
        <ProtectedRoute component={AgentGpsPage} />
      </Route>
      <Route path="/rep-statement">
        <ProtectedRoute component={RepStatementPage} />
      </Route>
      <Route path="/product-damage">
        <ProtectedRoute component={ProductDamagePage} />
      </Route>
      <Route path="/inventory-report">
        <ProtectedRoute component={InventoryReportPage} />
      </Route>
      <Route path="/expiry-report">
        <ProtectedRoute component={ExpiryReportPage} />
      </Route>
      <Route path="/max-stock-report">
        <ProtectedRoute component={MaxStockReportPage} />
      </Route>
      <Route path="/profits-report">
        <ProtectedRoute component={ProfitsReportPage} />
      </Route>
      <Route path="/sales-discounts-gifts-report">
        <ProtectedRoute component={SalesDiscountsGiftsReportPage} />
      </Route>
      <Route path="/supplier-discounts-gifts-report">
        <ProtectedRoute component={SupplierDiscountsGiftsReportPage} />
      </Route>
      <Route path="/barcode-print">
        <ProtectedRoute component={BarcodePrintPage} />
      </Route>
      <Route path="/audit-logs">
        <ProtectedRoute component={AuditLogsPage} />
      </Route>
      <Route path="/backup-restore">
        <ProtectedRoute component={BackupRestorePage} />
      </Route>
      <Route path="/company-book">
        <ProtectedRoute component={CompanyBookPage} />
      </Route>
      <Route path="/company-profile">
        <ProtectedRoute component={CompanyProfilePage} />
      </Route>
      <Route path="/purchase-return-usd">
        <ProtectedRoute component={PurchaseReturnUsdPage} />
      </Route>
      <Route path="/purchase-return-iqd">
        <ProtectedRoute component={PurchaseReturnIqdPage} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>
      <Route path="/user-management">
        <ProtectedRoute component={UserManagementPage} />
      </Route>
      <Route path="/data-reset">
        <ProtectedRoute component={DataResetPage} />
      </Route>
      <Route path="/sales-invoice">
        <ProtectedRoute component={SalesInvoicePage} />
      </Route>
      <Route path="/purchase-invoice">
        <ProtectedRoute component={PurchaseInvoicePage} />
      </Route>
      <Route path="/sales-return">
        <ProtectedRoute component={SalesReturnPage} />
      </Route>
      <Route path="/purchase-return">
        <ProtectedRoute component={PurchaseReturnPage} />
      </Route>
      <Route path="/customer-receipt">
        <ProtectedRoute component={CustomerReceiptPage} />
      </Route>
      <Route path="/agent-payment">
        <ProtectedRoute component={AgentPaymentPage} />
      </Route>
      <Route path="/agent-statement">
        <ProtectedRoute component={AgentStatementPage} />
      </Route>
      <Route path="/bank-statement">
        <ProtectedRoute component={BankStatementPage} />
      </Route>
      <Route path="/clearance-statement">
        <ProtectedRoute component={ClearanceStatementPage} />
      </Route>
      <Route path="/office-statement">
        <ProtectedRoute component={OfficeStatementPage} />
      </Route>
      <Route path="/owner-statement">
        <ProtectedRoute component={OwnerStatementPage} />
      </Route>
      <Route path="/external-debt-statement">
        <ProtectedRoute component={ExternalDebtStatementPage} />
      </Route>
      <Route path="/sm/shifts">
        <ProtectedRoute component={SmShiftsPage} />
      </Route>
      <Route path="/sm/productions">
        <ProtectedRoute component={SmProductionsPage} />
      </Route>
      <Route path="/sm/cashier">
        <ProtectedRoute component={SmCashierPage} />
      </Route>
      <Route path="/sm/card-cashier">
        <ProtectedRoute component={SmCardCashierPage} />
      </Route>
      <Route path="/sm/capital">
        <ProtectedRoute component={SmCapitalPage} />
      </Route>
      <Route path="/sm/branches">
        <ProtectedRoute component={SmBranchesPage} />
      </Route>
      <Route path="/sm/payment-cards">
        <ProtectedRoute component={SmPaymentCardsPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
