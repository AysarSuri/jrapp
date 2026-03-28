import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AgentReceipt, InsertAgentReceipt } from "@shared/schema";

export function useAgentReceipts() {
  return useQuery<AgentReceipt[]>({
    queryKey: ["/api/agent-receipts"],
  });
}

export function useDeleteAgentReceipt() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/agent-receipts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-receipts/next-number"] });
    },
  });
}

export function useUpdateAgentReceipt() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertAgentReceipt> }) => {
      const res = await apiRequest("PATCH", `/api/agent-receipts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-receipts"] });
    },
  });
}

export function useCreateAgentReceipt() {
  return useMutation({
    mutationFn: async (data: InsertAgentReceipt) => {
      const res = await apiRequest("POST", "/api/agent-receipts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-receipts/next-number"] });
    },
  });
}
