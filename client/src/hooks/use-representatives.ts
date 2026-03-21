import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { insertRepresentativeSchema } from "@shared/schema";
import { z } from "zod";

type InsertRepresentative = z.infer<typeof insertRepresentativeSchema>;

export function useRepresentatives() {
  return useQuery({
    queryKey: [api.representatives.list.path],
    queryFn: async () => {
      const res = await fetch(api.representatives.list.path);
      if (!res.ok) throw new Error("Failed to fetch representatives");
      return res.json();
    },
  });
}

export function useCreateRepresentative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertRepresentative) => {
      const res = await fetch(api.representatives.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create representative");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.representatives.list.path] });
    },
  });
}

export function useUpdateRepresentative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertRepresentative }) => {
      const res = await fetch(`/api/representatives/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update representative");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.representatives.list.path] });
    },
  });
}

export function useDeleteRepresentative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/representatives/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete representative");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.representatives.list.path] });
    },
  });
}
