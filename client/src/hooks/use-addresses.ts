import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertAddress } from "@shared/routes";

export function useAddresses() {
  return useQuery({
    queryKey: [api.addresses.list.path],
    queryFn: async () => {
      const res = await fetch(api.addresses.list.path);
      if (!res.ok) throw new Error("Failed to fetch addresses");
      return api.addresses.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (address: InsertAddress) => {
      const res = await fetch(api.addresses.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(address),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create address");
      }
      return api.addresses.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.addresses.list.path] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete address");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.addresses.list.path] });
    },
  });
}
