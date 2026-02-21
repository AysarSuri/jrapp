import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OwnerTransaction, InsertOwnerTransaction } from "@shared/schema";

export function useOwnerTransactions() {
  return useQuery<OwnerTransaction[]>({
    queryKey: ["/api/owner-transactions"],
  });
}

export function useCreateOwnerTransaction() {
  return useMutation({
    mutationFn: async (data: InsertOwnerTransaction) => {
      const res = await apiRequest("POST", "/api/owner-transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-transactions"] });
    },
  });
}
