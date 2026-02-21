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
