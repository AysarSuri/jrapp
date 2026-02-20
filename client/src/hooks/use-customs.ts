import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertCustomsClearance } from "@shared/routes";

export function useCustomsClearances() {
  return useQuery({
    queryKey: [api.customsClearances.list.path],
    queryFn: async () => {
      const res = await fetch(api.customsClearances.list.path);
      if (!res.ok) throw new Error("Failed to fetch customs clearances");
      return res.json();
    },
  });
}

export function useCreateCustomsClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCustomsClearance) => {
      const res = await fetch(api.customsClearances.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create customs clearance");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customsClearances.list.path] });
    },
  });
}

export function useUpdateCustomsClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertCustomsClearance }) => {
      const res = await fetch(`/api/customs-clearances/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update customs clearance");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customsClearances.list.path] });
    },
  });
}

export function useDeleteCustomsClearance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/customs-clearances/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete customs clearance");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customsClearances.list.path] });
    },
  });
}
