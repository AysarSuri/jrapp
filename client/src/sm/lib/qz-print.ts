/**
 * QZ Tray stub for the JR port.
 *
 * The original supermarket app used the `qz-tray` npm package for silent
 * direct-to-printer output. That native dependency is intentionally NOT
 * pulled into JR — instead this stub keeps the exact public API but always
 * reports QZ as unavailable, so `print-html-direct.ts` falls back to normal
 * browser (iframe) printing everywhere.
 */
import { loadLocalPrinters } from "./printers";

export type PrinterKey = "invoice" | "report" | "barcode";

export interface QzHtmlOpts {
  /** مقاس الورق بالمليمتر (للحرارية/الملصقات). */
  sizeMm?: { width: number; height: number | null };
  /** الهوامش بالمليمتر. */
  marginsMm?: number;
  orientation?: "portrait" | "landscape";
}

export function resetQzSecurity(): void {
  /* no-op — QZ Tray is not used in the JR port. */
}

export function isQzConnected(): boolean {
  return false;
}

export async function connectQz(_force = false): Promise<boolean> {
  return false;
}

export async function disconnectQz(): Promise<void> {
  /* no-op */
}

export async function listQzPrinters(): Promise<string[]> {
  return [];
}

export function printerNameFor(key: PrinterKey): string {
  const p = loadLocalPrinters();
  if (key === "invoice") return (p.printer_invoice || "").trim();
  if (key === "barcode") return (p.printer_barcode || "").trim();
  return (p.printer_report || "").trim();
}

export function defaultQzOpts(key: PrinterKey): QzHtmlOpts {
  if (key === "report") return { orientation: "portrait", marginsMm: 0 };
  return { sizeMm: { width: 80, height: null }, marginsMm: 0, orientation: "portrait" };
}

/** Always false in the JR port — forces browser (iframe) printing. */
export function shouldTryQz(): boolean {
  return false;
}

export async function printHtmlViaQz(
  _printerName: string,
  _html: string,
  _opts?: QzHtmlOpts,
): Promise<void> {
  /* QZ Tray unavailable — signal failure so callers fall back to browser print. */
  throw new Error("QZ Tray is not available in this build");
}
