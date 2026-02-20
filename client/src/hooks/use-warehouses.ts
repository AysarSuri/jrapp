import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertWarehouse } from "@shared/routes";

export function useWarehouses() {
  return useQuery({
    queryKey: [api.warehouses.list.path],
    queryFn: async () => {
      const res = await fetch(api.warehouses.list.path);
      if (!res.ok) throw new Error("Failed to fetch warehouses");
      return res.json();
    },
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertWarehouse) => {
      const res = await fetch(api.warehouses.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create warehouse");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.warehouses.list.path] });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertWarehouse }) => {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update warehouse");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.warehouses.list.path] });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/warehouses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete warehouse");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.warehouses.list.path] });
    },
  });
}
