import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CustomerReceipt, InsertCustomerReceipt } from "@shared/schema";

export function useCustomerReceipts() {
  return useQuery<CustomerReceipt[]>({
    queryKey: ["/api/customer-receipts"],
  });
}

export function useCreateCustomerReceipt() {
  return useMutation({
    mutationFn: async (data: InsertCustomerReceipt) => {
      const res = await apiRequest("POST", "/api/customer-receipts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });
}

export function useUpdateCustomerReceipt() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCustomerReceipt> }) => {
      const res = await apiRequest("PATCH", `/api/customer-receipts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });
}

export function useDeleteCustomerReceipt() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/customer-receipts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });
}
