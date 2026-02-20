import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertBank } from "@shared/routes";

export function useBanks() {
  return useQuery({
    queryKey: [api.banks.list.path],
    queryFn: async () => {
      const res = await fetch(api.banks.list.path);
      if (!res.ok) throw new Error("Failed to fetch banks");
      return res.json();
    },
  });
}

export function useCreateBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBank) => {
      const res = await fetch(api.banks.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create bank");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.banks.list.path] });
    },
  });
}

export function useUpdateBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertBank }) => {
      const res = await fetch(`/api/banks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update bank");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.banks.list.path] });
    },
  });
}

export function useDeleteBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/banks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete bank");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.banks.list.path] });
    },
  });
}
