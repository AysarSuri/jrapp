import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BankTransaction, InsertBankTransaction } from "@shared/schema";

export function useBankTransactions() {
  return useQuery<BankTransaction[]>({
    queryKey: ["/api/bank-transactions"],
  });
}

export function useCreateBankTransaction() {
  return useMutation({
    mutationFn: async (data: InsertBankTransaction) => {
      const res = await apiRequest("POST", "/api/bank-transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banks"] });
    },
  });
}

export function useUpdateBankTransaction() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertBankTransaction> }) => {
      const res = await apiRequest("PATCH", `/api/bank-transactions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banks"] });
    },
  });
}

export function useDeleteBankTransaction() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bank-transactions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banks"] });
    },
  });
}
