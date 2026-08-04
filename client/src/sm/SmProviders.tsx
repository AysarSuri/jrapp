import type { ReactNode } from "react";
import { LanguageProvider } from "@/sm/contexts/LanguageContext";
import { AuthProvider } from "@/sm/contexts/AuthContext";
import { BranchProvider } from "@/sm/contexts/BranchContext";
import { AppSettingsProvider } from "@/sm/contexts/AppSettingsContext";
import { PermissionsProvider } from "@/sm/contexts/PermissionsContext";
import { ConfirmDialogProvider } from "@/sm/contexts/ConfirmDialogContext";

import ShiftsPage from "@/pages/shifts";
import ProductionsPage from "@/pages/productions";
import CashierPage from "@/pages/cashier";
import CardCashierPage from "@/pages/card-cashier";
import CapitalPage from "@/pages/capital";
import BranchesPage from "@/pages/branches";
import PaymentCardsPage from "@/pages/payment-cards";

/**
 * Nests all supermarket compatibility-layer providers needed by the ported
 * pages. Auth delegates to JR's own auth; permissions are fully open.
 * The provider order matters: Auth → Branch (Branch reads useAuth).
 */
export function SmProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BranchProvider>
          <AppSettingsProvider>
            <PermissionsProvider>
              <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
            </PermissionsProvider>
          </AppSettingsProvider>
        </BranchProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export const SmShiftsPage = () => (
  <SmProviders>
    <ShiftsPage />
  </SmProviders>
);

export const SmProductionsPage = () => (
  <SmProviders>
    <ProductionsPage />
  </SmProviders>
);

export const SmCashierPage = () => (
  <SmProviders>
    <CashierPage />
  </SmProviders>
);

export const SmCardCashierPage = () => (
  <SmProviders>
    <CardCashierPage />
  </SmProviders>
);

export const SmCapitalPage = () => (
  <SmProviders>
    <CapitalPage />
  </SmProviders>
);

export const SmBranchesPage = () => (
  <SmProviders>
    <BranchesPage />
  </SmProviders>
);

export const SmPaymentCardsPage = () => (
  <SmProviders>
    <PaymentCardsPage />
  </SmProviders>
);
