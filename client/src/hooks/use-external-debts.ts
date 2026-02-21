import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertExternalDebt } from "@shared/routes";

export function useExternalDebts() {
  return useQuery({
    queryKey: [api.externalDebts.list.path],
    queryFn: async () => {
      const res = await fetch(api.externalDebts.list.path);
      if (!res.ok) throw new Error("Failed to fetch external debts");
      return res.json();
    },
  });
}

export function useCreateExternalDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertExternalDebt) => {
      const res = await fetch(api.externalDebts.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create external debt");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.externalDebts.list.path] });
    },
  });
}

export function useUpdateExternalDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertExternalDebt }) => {
      const res = await fetch(`/api/external-debts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update external debt");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.externalDebts.list.path] });
    },
  });
}

export function useDeleteExternalDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/external-debts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete external debt");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.externalDebts.list.path] });
    },
  });
}
