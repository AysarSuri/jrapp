import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WarehouseTransfer, WarehouseTransferItem } from "@shared/schema";

export function useWarehouseTransfers() {
  return useQuery<WarehouseTransfer[]>({
    queryKey: ["/api/warehouse-transfers"],
  });
}

export function useWarehouseTransferItems(transferId: number | null) {
  return useQuery<WarehouseTransferItem[]>({
    queryKey: ["/api/warehouse-transfers", transferId, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/warehouse-transfers/${transferId}/items`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!transferId,
  });
}

export function useNextTransferNumber() {
  return useQuery<{ number: string }>({
    queryKey: ["/api/warehouse-transfers/next-number"],
  });
}

export function useCreateWarehouseTransfer() {
  return useMutation({
    mutationFn: async (data: { transfer: any; items: any[] }) => {
      const res = await apiRequest("POST", "/api/warehouse-transfers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-transfers/next-number"] });
    },
  });
}

export function useDeleteWarehouseTransfer() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/warehouse-transfers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-transfers"] });
    },
  });
}
