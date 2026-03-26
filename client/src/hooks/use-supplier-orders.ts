import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SupplierOrder } from "@shared/schema";

export function useSupplierOrders() {
  return useQuery<SupplierOrder[]>({
    queryKey: ["/api/supplier-orders"],
  });
}

export function useNextSupplierOrderNumber() {
  return useQuery<{ number: string }>({
    queryKey: ["/api/supplier-orders/next-number"],
  });
}

export function useCreateSupplierOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { order: any; items: any[] }) => {
      const res = await apiRequest("POST", "/api/supplier-orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-orders/next-number"] });
    },
  });
}
