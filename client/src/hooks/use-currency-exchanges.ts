import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CurrencyExchange, InsertCurrencyExchange } from "@shared/schema";

export function useCurrencyExchanges() {
  return useQuery<CurrencyExchange[]>({
    queryKey: ["/api/currency-exchanges"],
  });
}

export function useCreateCurrencyExchange() {
  return useMutation({
    mutationFn: async (data: InsertCurrencyExchange) => {
      const res = await apiRequest("POST", "/api/currency-exchanges", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currency-exchanges"] });
    },
  });
}

export function useDeleteCurrencyExchange() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/currency-exchanges/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currency-exchanges"] });
    },
  });
}
