import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertTransferOffice } from "@shared/routes";

export function useTransferOffices() {
  return useQuery({
    queryKey: [api.transferOffices.list.path],
    queryFn: async () => {
      const res = await fetch(api.transferOffices.list.path);
      if (!res.ok) throw new Error("Failed to fetch transfer offices");
      return res.json();
    },
  });
}

export function useCreateTransferOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTransferOffice) => {
      const res = await fetch(api.transferOffices.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create transfer office");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transferOffices.list.path] });
    },
  });
}

export function useUpdateTransferOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertTransferOffice }) => {
      const res = await fetch(`/api/transfer-offices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update transfer office");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transferOffices.list.path] });
    },
  });
}

export function useDeleteTransferOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/transfer-offices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete transfer office");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transferOffices.list.path] });
    },
  });
}
