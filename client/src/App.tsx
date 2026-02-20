import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import { LayoutShell } from "@/components/layout-shell";
import { useEffect } from "react";
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
      {/* Placeholder routes for pages not yet fully implemented in this generation step but implied by nav */}
      <Route path="/clients">
        <ProtectedRoute component={() => <div>Clients Page (Coming Soon)</div>} />
      </Route>
      <Route path="/accounts">
        <ProtectedRoute component={() => <div>Accounts Page (Coming Soon)</div>} />
      </Route>
      <Route path="/invoices">
        <ProtectedRoute component={() => <div>Invoices Page (Coming Soon)</div>} />
      </Route>
      <Route path="/transactions">
        <ProtectedRoute component={() => <div>Transactions Page (Coming Soon)</div>} />
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
