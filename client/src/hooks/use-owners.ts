import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertOwner } from "@shared/routes";

export function useOwners() {
  return useQuery({
    queryKey: [api.owners.list.path],
    queryFn: async () => {
      const res = await fetch(api.owners.list.path);
      if (!res.ok) throw new Error("Failed to fetch owners");
      return res.json();
    },
  });
}

export function useCreateOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertOwner) => {
      const res = await fetch(api.owners.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create owner");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.owners.list.path] });
    },
  });
}

export function useUpdateOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertOwner }) => {
      const res = await fetch(`/api/owners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update owner");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.owners.list.path] });
    },
  });
}

export function useDeleteOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/owners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete owner");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.owners.list.path] });
    },
  });
}
