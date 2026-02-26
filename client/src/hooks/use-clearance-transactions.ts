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

export function useUpdateClearanceTransaction() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCustomsClearanceTransaction> }) => {
      const res = await apiRequest("PATCH", `/api/clearance-transactions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customs-clearances"] });
    },
  });
}

export function useDeleteClearanceTransaction() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/clearance-transactions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customs-clearances"] });
    },
  });
}
