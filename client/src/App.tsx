import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import UnitsPage from "@/pages/units";
import CategoriesPage from "@/pages/categories";
import CustomersPage from "@/pages/customers";
import SuppliersPage from "@/pages/suppliers";
import AddressesPage from "@/pages/addresses";
import AccountsPage from "@/pages/accounts";
import InvoicesPage from "@/pages/invoices";
import TransactionsPage from "@/pages/transactions";
import WarehousesPage from "@/pages/warehouses";
import RepresentativesPage from "@/pages/representatives";
import TransferOfficesPage from "@/pages/transfer-offices";
import BanksPage from "@/pages/banks";
import CustomsClearancesPage from "@/pages/customs-clearances";
import PurchaseInvoiceUsdPage from "@/pages/purchase-invoice-usd";
import PurchaseInvoiceIqdPage from "@/pages/purchase-invoice-iqd";
import SupplierPaymentsPage from "@/pages/supplier-payments";
import SupplierAdjustmentsPage from "@/pages/supplier-adjustments";
import SupplierManagementPage from "@/pages/supplier-management";
import SupplierStatementPage from "@/pages/supplier-statement";
import BankReceiptsPage from "@/pages/bank-receipts";
import BankPaymentsPage from "@/pages/bank-payments";
import BankStatementPage from "@/pages/bank-statement";
import ClearanceReceiptsPage from "@/pages/clearance-receipts";
import ClearancePaymentsPage from "@/pages/clearance-payments";
import ClearanceStatementPage from "@/pages/clearance-statement";
import OfficeReceiptsPage from "@/pages/office-receipts";
import OfficePaymentsPage from "@/pages/office-payments";
import OfficeStatementPage from "@/pages/office-statement";
import ExpenseTypesPage from "@/pages/expense-types";
import ExpensesPage from "@/pages/expenses";
import ExternalDebtsPage from "@/pages/external-debts";
import ExternalDebtReceiptsPage from "@/pages/external-debt-receipts";
import ExternalDebtPaymentsPage from "@/pages/external-debt-payments";
import ExternalDebtStatementPage from "@/pages/external-debt-statement";
import OwnersPage from "@/pages/owners";
import OwnerWithdrawalsPage from "@/pages/owner-withdrawals";
import OwnerReturnsPage from "@/pages/owner-returns";
import OwnerStatementPage from "@/pages/owner-statement";
import SalesInvoiceUsdPage from "@/pages/sales-invoice-usd";
import SalesInvoiceIqdPage from "@/pages/sales-invoice-iqd";
import SalesReturnUsdPage from "@/pages/sales-return-usd";
import SalesReturnIqdPage from "@/pages/sales-return-iqd";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import { LayoutShell } from "@/components/layout-shell";
import "./lib/i18n";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();

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
      <Route path="/warehouses">
        <ProtectedRoute component={WarehousesPage} />
      </Route>
      <Route path="/representatives">
        <ProtectedRoute component={RepresentativesPage} />
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
      <Route path="/supplier-payments">
        <ProtectedRoute component={SupplierPaymentsPage} />
      </Route>
      <Route path="/supplier-adjustments">
        <ProtectedRoute component={SupplierAdjustmentsPage} />
      </Route>
      <Route path="/supplier-management">
        <ProtectedRoute component={SupplierManagementPage} />
      </Route>
      <Route path="/supplier-statement">
        <ProtectedRoute component={SupplierStatementPage} />
      </Route>
      <Route path="/bank-receipts">
        <ProtectedRoute component={BankReceiptsPage} />
      </Route>
      <Route path="/bank-payments">
        <ProtectedRoute component={BankPaymentsPage} />
      </Route>
      <Route path="/bank-statement">
        <ProtectedRoute component={BankStatementPage} />
      </Route>
      <Route path="/clearance-receipts">
        <ProtectedRoute component={ClearanceReceiptsPage} />
      </Route>
      <Route path="/clearance-payments">
        <ProtectedRoute component={ClearancePaymentsPage} />
      </Route>
      <Route path="/clearance-statement">
        <ProtectedRoute component={ClearanceStatementPage} />
      </Route>
      <Route path="/office-receipts">
        <ProtectedRoute component={OfficeReceiptsPage} />
      </Route>
      <Route path="/office-payments">
        <ProtectedRoute component={OfficePaymentsPage} />
      </Route>
      <Route path="/office-statement">
        <ProtectedRoute component={OfficeStatementPage} />
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
      <Route path="/external-debt-statement">
        <ProtectedRoute component={ExternalDebtStatementPage} />
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
      <Route path="/owner-statement">
        <ProtectedRoute component={OwnerStatementPage} />
      </Route>
      <Route path="/sales-invoice-usd">
        <ProtectedRoute component={SalesInvoiceUsdPage} />
      </Route>
      <Route path="/sales-invoice-iqd">
        <ProtectedRoute component={SalesInvoiceIqdPage} />
      </Route>
      <Route path="/sales-return-usd">
        <ProtectedRoute component={SalesReturnUsdPage} />
      </Route>
      <Route path="/sales-return-iqd">
        <ProtectedRoute component={SalesReturnIqdPage} />
      </Route>
      <Route path="/invoices">
        <ProtectedRoute component={InvoicesPage} />
      </Route>
      <Route path="/transactions">
        <ProtectedRoute component={TransactionsPage} />
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
