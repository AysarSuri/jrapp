import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgentLocation } from "@shared/schema";

export function useAgentLocations() {
  return useQuery<AgentLocation[]>({
    queryKey: ["/api/agent-locations"],
    refetchInterval: 30000,
  });
}

export function useUpdateAgentLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { agentUserId: string; agentName: string; latitude: number; longitude: number; accuracy?: number; deviceType: string }) => {
      const res = await fetch("/api/agent-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update location");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-locations"] });
    },
  });
}

export function useDeleteAgentLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/agent-locations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete location");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-locations"] });
    },
  });
}
