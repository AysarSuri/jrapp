import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertExpenseType } from "@shared/routes";

export function useExpenseTypes() {
  return useQuery({
    queryKey: [api.expenseTypes.list.path],
    queryFn: async () => {
      const res = await fetch(api.expenseTypes.list.path);
      if (!res.ok) throw new Error("Failed to fetch expense types");
      return res.json();
    },
  });
}

export function useCreateExpenseType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertExpenseType) => {
      const res = await fetch(api.expenseTypes.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create expense type");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenseTypes.list.path] });
    },
  });
}

export function useUpdateExpenseType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertExpenseType }) => {
      const res = await fetch(`/api/expense-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update expense type");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenseTypes.list.path] });
    },
  });
}

export function useDeleteExpenseType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/expense-types/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete expense type");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenseTypes.list.path] });
    },
  });
}
