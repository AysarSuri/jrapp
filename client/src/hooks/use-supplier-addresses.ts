import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { insertSupplierAddressSchema } from "@shared/schema";
import { z } from "zod";
type InsertSupplierAddress = z.infer<typeof insertSupplierAddressSchema>;

export function useSupplierAddresses() {
  return useQuery({
    queryKey: [api.supplierAddresses.list.path],
    queryFn: async () => {
      const res = await fetch(api.supplierAddresses.list.path);
      if (!res.ok) throw new Error("Failed to fetch supplier addresses");
      return api.supplierAddresses.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSupplierAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (address: InsertSupplierAddress) => {
      const res = await fetch(api.supplierAddresses.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(address),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create supplier address");
      }
      return api.supplierAddresses.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.supplierAddresses.list.path] });
    },
  });
}

export function useUpdateSupplierAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertSupplierAddress }) => {
      const res = await fetch(`/api/supplier-addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update supplier address");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.supplierAddresses.list.path] });
    },
  });
}

export function useDeleteSupplierAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/supplier-addresses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete supplier address");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.supplierAddresses.list.path] });
    },
  });
}
