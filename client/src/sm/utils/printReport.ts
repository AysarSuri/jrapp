import { requireReportPrinter } from "@/sm/lib/printers";
import { printHtmlDirect } from "@/sm/lib/print-html-direct";

export interface PrintCard {
  label: string;
  value: string;
  accent?: string;
}

export interface PrintCol {
  label: string;
  align?: "right" | "left" | "center";
  width?: string;
}

export interface PrintDataRow {
  cells: string[];
  highlight?: "expired" | "critical" | "warning" | "positive" | "negative" | "";
}

export interface PrintConfig {
  title: string;
  subtitle?: string;
  storeName?: string;
  accentColor: string;
  dateRange?: string;
  cards?: PrintCard[];
  columns: PrintCol[];
  rows: PrintDataRow[];
  footRow?: string[];
  qrImage?: string | null;
  /** اتجاه ورقة A4 (افتراضي: landscape للحفاظ على بقية التقارير). */
  orientation?: "portrait" | "landscape";
  /** هامش علوي/سفلي للصفحة (افتراضي: 0). */
  pageMarginY?: string;
  /** حجم خط النص الأساسي والجدول (افتراضي: 12 للنص / 13 للجدول). */
  fontSize?: number;
  /** لون النص الأساسي وخلايا الجدول (افتراضي: #1a1a2e / #111). */
  textColor?: string;
}

/* صورة باركود QR للفرع تُحقن في HTML الطباعة (document.write) — يجب أن تكون data-URL لصورة فقط (allowlist ضد XSS) */
const QR_DATA_URL_RE = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

/** يُنتج كتلة تذييل باركود الفرع HTML آمنة، أو "" إذا كانت الصورة مفقودة/غير صالحة. تُصدَّر لإعادة استخدامها في دوال الطباعة المخصّصة. */
export function buildQrFooter(qrImage?: string | null): string {
  if (!qrImage || !QR_DATA_URL_RE.test(qrImage)) return "";
  return `<div style="margin-top:18px;text-align:center;page-break-inside:avoid;break-inside:avoid;">
    <img src="${qrImage}" alt="باركود الفرع" style="width:120px;height:120px;object-fit:contain;display:inline-block;" />
    <div style="font-size:10px;color:#9ca3af;margin-top:4px;font-weight:700;">باركود الفرع</div>
  </div>`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function printReport(config: PrintConfig): void {
  /* لا تطبع أي تقرير A4 قبل تحديد اسم طابعة التقارير في الإعدادات (لكل جهاز) */
  if (!requireReportPrinter()) return;

  const { title, subtitle, storeName, accentColor, dateRange, cards, columns, rows, footRow, qrImage, orientation = "landscape", pageMarginY = "0", fontSize, textColor } = config;
  const bodyColor = textColor ?? "#1a1a2e";
  const cellColor = textColor ?? "#111";
  const bodyFontSize = fontSize ?? 12;
  const tableFontSize = fontSize ?? 13;

  const now = new Date().toLocaleString("ar-IQ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const accentBg = hexToRgba(accentColor, 0.08);
  const accentBorder = hexToRgba(accentColor, 0.25);

  const cardsHtml = cards?.length
    ? `<div class="cards">${cards
        .map(
          (c) => `
        <div class="card" style="border-right-color:${c.accent || accentColor}">
          <div class="card-label">${c.label}</div>
          <div class="card-value">${c.value}</div>
        </div>`
        )
        .join("")}</div>`
    : "";

  const theadHtml = `<thead><tr>${columns
    .map(
      (col) =>
        `<th style="text-align:${col.align || "right"};${col.width ? `width:${col.width};` : ""}">${col.label}</th>`
    )
    .join("")}</tr></thead>`;

  const tbodyHtml =
    rows.length === 0
      ? `<tbody><tr><td colspan="${columns.length}" style="text-align:center;padding:30px 10px;color:#9ca3af;">لا توجد بيانات</td></tr></tbody>`
      : `<tbody>${rows
          .map((row, idx) => {
            const hl = row.highlight || "";
            let rowStyle = "";
            if (hl === "expired")  rowStyle = "background:#fef2f2;";
            if (hl === "critical") rowStyle = "background:#fff7ed;";
            if (hl === "warning")  rowStyle = "background:#fefce8;";
            if (!hl && idx % 2 === 1) rowStyle = "background:#f8fafc;";
            return `<tr style="${rowStyle}">${row.cells
              .map(
                (cell, ci) =>
                  `<td style="text-align:${columns[ci]?.align || "right"};">${cell}</td>`
              )
              .join("")}</tr>`;
          })
          .join("")}</tbody>`;

  const tfootHtml = footRow
    ? `<tfoot><tr>${footRow
        .map(
          (cell, ci) =>
            `<td style="text-align:${columns[ci]?.align || "right"};">${cell}</td>`
        )
        .join("")}</tr></tfoot>`
    : "";

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @font-face{font-family:'AppFont';font-style:normal;font-weight:100 900;src:url('${window.location.origin}/fonts/noto-arabic.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}
  @font-face{font-family:'AppFont';font-style:normal;font-weight:100 900;src:url('${window.location.origin}/fonts/noto-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
  @font-face{font-family:'AppFont';font-style:normal;font-weight:400;src:url('${window.location.origin}/fonts/tajawal-400-latin.woff2') format('woff2')}
  @font-face{font-family:'AppFont';font-style:normal;font-weight:700;src:url('${window.location.origin}/fonts/tajawal-700-latin.woff2') format('woff2')}
  @font-face{font-family:'AppFont';font-style:normal;font-weight:800;src:url('${window.location.origin}/fonts/tajawal-800-latin.woff2') format('woff2')}
  @font-face{font-family:'AppFont';font-style:normal;font-weight:900;src:url('${window.location.origin}/fonts/tajawal-900-latin.woff2') format('woff2')}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:'AppFont',sans-serif;
    font-size:${bodyFontSize}px;
    color:${bodyColor};
    direction:rtl;
    background:#fff;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }
  @page{size:A4 ${orientation};margin:0.2cm}
  @page{@bottom-center{content:"صفحة " counter(page) " من " counter(pages);font-size:10px;color:#9ca3af;font-family:'AppFont',sans-serif}}

  /* ── Header ── */
  .page-header{
    border-top:6px solid ${accentColor};
    padding:18px 24px 14px;
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    border-bottom:1px solid #e5e7eb;
    margin-bottom:18px;
  }
  .header-left{text-align:left}
  .header-right{text-align:right}
  .store-name{
    font-size:20px;
    font-weight:900;
    color:${accentColor};
    letter-spacing:0.3px;
    margin-bottom:4px;
  }
  .print-date{font-size:10px;color:#9ca3af}
  .report-title{font-size:22px;font-weight:900;color:#111;letter-spacing:0.2px}
  .report-subtitle{font-size:11px;color:#6b7280;margin-top:3px}
  .date-range{
    display:inline-block;
    background:${accentBg};
    color:${accentColor};
    border:1px solid ${accentBorder};
    padding:4px 12px;
    border-radius:20px;
    font-size:11px;
    font-weight:700;
    margin-top:8px;
  }

  /* ── Summary Cards ── */
  .cards{
    display:flex;
    gap:12px;
    margin-bottom:18px;
    flex-wrap:wrap;
  }
  .card{
    flex:1;
    min-width:130px;
    border:1px solid #e5e7eb;
    border-radius:10px;
    padding:12px 16px;
    border-right:5px solid ${accentColor};
    background:#fafafa;
  }
  .card-label{font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
  .card-value{font-size:22px;font-weight:900;color:#111;line-height:1;direction:ltr;text-align:right}

  /* ── Table ── */
  table{width:100%;border-collapse:collapse;font-size:${tableFontSize}px}
  thead th{
    background:${accentColor};
    color:#fff;
    padding:9px 10px;
    font-weight:800;
    font-size:13px;
    letter-spacing:0.3px;
  }
  tbody td{
    padding:8px 10px;
    border-bottom:1px solid #f1f5f9;
    color:${cellColor};
    font-weight:600;
    vertical-align:middle;
  }
  tfoot td{
    background:#1e293b;
    color:#fff;
    padding:10px;
    font-weight:800;
    font-size:13px;
  }

  /* ── Status Badges ── */
  .badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:800}
  .badge-expired{background:#fee2e2;color:#dc2626}
  .badge-critical{background:#ffedd5;color:#ea580c}
  .badge-warning{background:#fef9c3;color:#ca8a04}
  .badge-ok{background:#dcfce7;color:#16a34a}

  /* ── Value Colors ── */
  .positive{color:#16a34a;font-weight:700}
  .negative{color:#dc2626;font-weight:700}
  .discount-val{color:#16a34a;font-weight:700}
  .tax-val{color:#d97706;font-weight:600}
  .mono{font-family:'Courier New',monospace;font-size:12px;font-weight:600;color:#111}
  .dim{color:#333;font-size:12px;font-weight:600}

  /* ── Footer ── */
  .page-footer{
    margin-top:20px;
    padding-top:12px;
    border-top:1px solid #e5e7eb;
    display:flex;
    justify-content:space-between;
    align-items:center;
    font-size:10px;
    color:#9ca3af;
  }
  .footer-brand{font-weight:700;color:${accentColor}}
</style>
</head>
<body>
  <div class="page-header">
    <div class="header-right">
      ${storeName ? `<div class="store-name">${storeName}</div>` : ""}
      <div class="print-date">طُبع في: ${now}</div>
    </div>
    <div class="header-left">
      <div class="report-title">${title}</div>
      ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ""}
      ${dateRange ? `<div class="date-range">${dateRange}</div>` : ""}
    </div>
  </div>

  ${cardsHtml}

  <table>
    ${theadHtml}
    ${tbodyHtml}
    ${tfootHtml}
  </table>

  ${buildQrFooter(qrImage)}

  <div class="page-footer">
    <span>${rows.length} سجل</span>
  </div>
</body>
</html>`;

  printHtmlDirect(html);
}
