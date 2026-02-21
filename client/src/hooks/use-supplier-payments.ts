import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SupplierPayment, InsertSupplierPayment } from "@shared/schema";

export function useSupplierPayments() {
  return useQuery<SupplierPayment[]>({
    queryKey: ["/api/supplier-payments"],
  });
}

export function useCreateSupplierPayment() {
  return useMutation({
    mutationFn: async (data: InsertSupplierPayment) => {
      const res = await apiRequest("POST", "/api/supplier-payments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });
}
