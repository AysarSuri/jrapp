import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertUnit } from "@shared/routes";

export function useUnits() {
  return useQuery({
    queryKey: [api.units.list.path],
    queryFn: async () => {
      const res = await fetch(api.units.list.path);
      if (!res.ok) throw new Error("Failed to fetch units");
      return api.units.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (unit: InsertUnit) => {
      const res = await fetch(api.units.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unit),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create unit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.units.list.path] });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertUnit }) => {
      const res = await fetch(`/api/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update unit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.units.list.path] });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete unit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.units.list.path] });
    },
  });
}
