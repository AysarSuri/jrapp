import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { PurchaseReturn, PurchaseReturnItem } from "@shared/schema";

export function usePurchaseReturns() {
  return useQuery<PurchaseReturn[]>({
    queryKey: ["/api/purchase-returns"],
  });
}

export function usePurchaseReturn(id: number) {
  return useQuery<PurchaseReturn>({
    queryKey: ["/api/purchase-returns", id],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-returns/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch return");
      return res.json();
    },
    enabled: !!id,
  });
}

export function usePurchaseReturnItems(returnId: number) {
  return useQuery<PurchaseReturnItem[]>({
    queryKey: ["/api/purchase-returns", returnId, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-returns/${returnId}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch return items");
      return res.json();
    },
    enabled: !!returnId,
  });
}

export function useNextPurchaseReturnNumber() {
  return useQuery<{ number: string }>({
    queryKey: ["/api/purchase-returns/next-number"],
  });
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { returnData: any; items: any[] }) => {
      const res = await apiRequest("POST", "/api/purchase-returns", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-returns/next-number"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}

export function useApprovePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/purchase-returns/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}
