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

export function useUpdateOwnerTransaction() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertOwnerTransaction> }) => {
      const res = await apiRequest("PATCH", `/api/owner-transactions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-transactions"] });
    },
  });
}

export function useDeleteOwnerTransaction() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/owner-transactions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-transactions"] });
    },
  });
}
