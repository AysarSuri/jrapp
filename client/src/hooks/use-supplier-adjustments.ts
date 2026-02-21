import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertSupplierAdjustment } from "@shared/routes";

export function useSupplierAdjustments() {
  return useQuery({
    queryKey: [api.supplierAdjustments.list.path],
  });
}

export function useCreateSupplierAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSupplierAdjustment) => {
      const res = await fetch(api.supplierAdjustments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create supplier adjustment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.supplierAdjustments.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });
}
