import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TransferOfficeTransaction, InsertTransferOfficeTransaction } from "@shared/schema";

export function useOfficeTransactions() {
  return useQuery<TransferOfficeTransaction[]>({
    queryKey: ["/api/office-transactions"],
  });
}

export function useCreateOfficeTransaction() {
  return useMutation({
    mutationFn: async (data: InsertTransferOfficeTransaction) => {
      const res = await apiRequest("POST", "/api/office-transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transfer-offices"] });
    },
  });
}
