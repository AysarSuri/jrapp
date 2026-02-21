import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ProductDamage, ProductDamageItem } from "@shared/schema";

export function useProductDamages() {
  return useQuery<ProductDamage[]>({
    queryKey: ["/api/product-damages"],
  });
}

export function useProductDamageItems(damageId: number | null) {
  return useQuery<ProductDamageItem[]>({
    queryKey: [`/api/product-damages/${damageId}/items`],
    enabled: !!damageId,
  });
}

export function useNextDamageNumber() {
  return useQuery<{ number: string }>({
    queryKey: ["/api/product-damages/next-number"],
  });
}

export function useCreateProductDamage() {
  return useMutation({
    mutationFn: async (data: { damage: any; items: any[] }) => {
      const res = await apiRequest("POST", "/api/product-damages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-damages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/product-damages/next-number"] });
    },
  });
}
