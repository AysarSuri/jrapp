import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertAccount, type InsertInvoice, type InsertTransaction } from "@shared/routes";

// --- ACCOUNTS ---
export function useAccounts() {
  return useQuery({
    queryKey: [api.accounts.list.path],
    queryFn: async () => {
      const res = await fetch(api.accounts.list.path);
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return api.accounts.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertAccount) => {
      const res = await fetch(api.accounts.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create account");
      return api.accounts.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
    },
  });
}

// --- INVOICES ---
export function useInvoices() {
  return useQuery({
    queryKey: [api.invoices.list.path],
    queryFn: async () => {
      const res = await fetch(api.invoices.list.path);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return api.invoices.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertInvoice) => {
      const res = await fetch(api.invoices.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      return api.invoices.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
    },
  });
}

// --- TRANSACTIONS ---
export function useTransactions() {
  return useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.list.path);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTransaction) => {
      const res = await fetch(api.transactions.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create transaction");
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] }); // Transactions update account balances
    },
  });
}
