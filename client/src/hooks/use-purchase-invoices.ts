import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PurchaseInvoice, PurchaseInvoiceItem } from "@shared/schema";

export function usePurchaseInvoices() {
  return useQuery<PurchaseInvoice[]>({
    queryKey: ["/api/purchase-invoices"],
  });
}

export function usePurchaseInvoice(id: number) {
  return useQuery<PurchaseInvoice>({
    queryKey: ["/api/purchase-invoices", id],
    enabled: !!id,
  });
}

export function usePurchaseInvoiceItems(invoiceId: number) {
  return useQuery<PurchaseInvoiceItem[]>({
    queryKey: ["/api/purchase-invoices", invoiceId, "items"],
    enabled: !!invoiceId,
  });
}

export function useNextPurchaseInvoiceNumber() {
  return useQuery<{ number: string }>({
    queryKey: ["/api/purchase-invoices/next-number"],
  });
}

export function useCreatePurchaseInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { invoice: any; items: any[] }) => {
      const res = await apiRequest("POST", "/api/purchase-invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices/next-number"] });
    },
  });
}
