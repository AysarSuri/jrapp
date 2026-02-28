import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SalesInvoice, SalesInvoiceItem } from "@shared/schema";

export function useSalesInvoices() {
  return useQuery<SalesInvoice[]>({
    queryKey: ["/api/sales-invoices"],
  });
}

export function useSalesInvoice(id: number) {
  return useQuery<SalesInvoice>({
    queryKey: ["/api/sales-invoices", id],
    enabled: !!id,
  });
}

export function useSalesInvoiceItems(invoiceId: number) {
  return useQuery<SalesInvoiceItem[]>({
    queryKey: ["/api/sales-invoices", invoiceId, "items"],
    enabled: !!invoiceId,
  });
}

export function useNextSalesInvoiceNumber() {
  return useQuery<{ number: string }>({
    queryKey: ["/api/sales-invoices/next-number"],
  });
}

export function useCreateSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { invoice: any; items: any[] }) => {
      const res = await apiRequest("POST", "/api/sales-invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices/next-number"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}

export function useApproveSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/sales-invoices/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}

export function useDeleteSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/sales-invoices/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices/next-number"] });
    },
  });
}
