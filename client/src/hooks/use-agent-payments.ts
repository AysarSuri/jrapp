import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AgentPayment, InsertAgentPayment } from "@shared/schema";

export function useAgentPayments() {
  return useQuery<AgentPayment[]>({
    queryKey: ["/api/agent-payments"],
  });
}

export function useDeleteAgentPayment() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/agent-payments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-payments/next-number"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });
}

export function useCreateAgentPayment() {
  return useMutation({
    mutationFn: async (data: InsertAgentPayment) => {
      const res = await apiRequest("POST", "/api/agent-payments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-payments/next-number"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });
}
