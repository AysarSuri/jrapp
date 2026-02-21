import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CustomsClearanceTransaction, InsertCustomsClearanceTransaction } from "@shared/schema";

export function useClearanceTransactions() {
  return useQuery<CustomsClearanceTransaction[]>({
    queryKey: ["/api/clearance-transactions"],
  });
}

export function useCreateClearanceTransaction() {
  return useMutation({
    mutationFn: async (data: InsertCustomsClearanceTransaction) => {
      const res = await apiRequest("POST", "/api/clearance-transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customs-clearances"] });
    },
  });
}
