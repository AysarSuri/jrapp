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
