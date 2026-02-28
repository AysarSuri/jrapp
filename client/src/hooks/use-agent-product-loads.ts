import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AgentProductLoad, AgentProductLoadItem } from "@shared/schema";

export function useAgentProductLoads() {
  return useQuery<AgentProductLoad[]>({
    queryKey: ["/api/agent-product-loads"],
  });
}

export function useAgentProductLoadItems(loadId: number | null) {
  return useQuery<AgentProductLoadItem[]>({
    queryKey: ["/api/agent-product-loads", loadId, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/agent-product-loads/${loadId}/items`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!loadId,
  });
}

export function useNextLoadNumber() {
  return useQuery<{ number: string }>({
    queryKey: ["/api/agent-product-loads/next-number"],
  });
}

export function useCreateAgentProductLoad() {
  return useMutation({
    mutationFn: async (data: { load: any; items: any[] }) => {
      const res = await apiRequest("POST", "/api/agent-product-loads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-product-loads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-product-loads/next-number"] });
    },
  });
}

export function useDeleteAgentProductLoad() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/agent-product-loads/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-product-loads"] });
    },
  });
}
