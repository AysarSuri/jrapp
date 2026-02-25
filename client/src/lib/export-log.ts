import { apiRequest } from "./queryClient";

export async function logExport(data: {
  reportName: string;
  supplierName?: string;
  invoiceNumber?: string;
  exportType: "pdf" | "whatsapp" | "print";
  currency?: string;
}) {
  try {
    await apiRequest("POST", "/api/export-logs", data);
  } catch {
  }
}
