import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ExternalDebtTransaction, InsertExternalDebtTransaction } from "@shared/schema";

export function useExternalDebtTransactions() {
  return useQuery<ExternalDebtTransaction[]>({
    queryKey: ["/api/external-debt-transactions"],
  });
}

export function useCreateExternalDebtTransaction() {
  return useMutation({
    mutationFn: async (data: InsertExternalDebtTransaction) => {
      const res = await apiRequest("POST", "/api/external-debt-transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-debt-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/external-debts"] });
    },
  });
}

export function useUpdateExternalDebtTransaction() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertExternalDebtTransaction> }) => {
      const res = await apiRequest("PATCH", `/api/external-debt-transactions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-debt-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/external-debts"] });
    },
  });
}

export function useDeleteExternalDebtTransaction() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/external-debt-transactions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-debt-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/external-debts"] });
    },
  });
}
