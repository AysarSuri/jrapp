import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SalesReturn, SalesReturnItem } from "@shared/schema";

export function useSalesReturns() {
  return useQuery<SalesReturn[]>({
    queryKey: ["/api/sales-returns"],
  });
}

export function useSalesReturn(id: number) {
  return useQuery<SalesReturn>({
    queryKey: ["/api/sales-returns", id],
    queryFn: async () => {
      const res = await fetch(`/api/sales-returns/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch return");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useSalesReturnItems(returnId: number) {
  return useQuery<SalesReturnItem[]>({
    queryKey: ["/api/sales-returns", returnId, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/sales-returns/${returnId}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch return items");
      return res.json();
    },
    enabled: !!returnId,
  });
}

export function useNextSalesReturnNumber() {
  return useQuery<{ number: string }>({
    queryKey: ["/api/sales-returns/next-number"],
  });
}

export function useCreateSalesReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { returnData: any; items: any[] }) => {
      const res = await apiRequest("POST", "/api/sales-returns", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-returns/next-number"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}

export function useDeleteSalesReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/sales-returns/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-returns/next-number"] });
    },
  });
}

export function useApproveSalesReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/sales-returns/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}
