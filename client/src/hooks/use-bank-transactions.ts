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
