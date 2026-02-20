import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertClient } from "@shared/routes";

export function useClients() {
  return useQuery({
    queryKey: [api.clients.list.path],
    queryFn: async () => {
      const res = await fetch(api.clients.list.path);
      if (!res.ok) throw new Error("Failed to fetch clients");
      return api.clients.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertClient) => {
      const res = await fetch(api.clients.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create client");
      return api.clients.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.clients.list.path] });
    },
  });
}
