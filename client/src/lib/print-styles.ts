export interface PrintStyleOptions {
  direction: "rtl" | "ltr";
  accentColor?: string;
  accentTextColor?: string;
  pageSize?: "A4" | "A4 landscape";
}

export function getModernPrintStyles(opts: PrintStyleOptions): string {
  const accent = opts.accentColor || "#1e293b";
  const accentText = opts.accentTextColor || "#ffffff";
  const page = opts.pageSize || "A4";

  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Noto Kufi Arabic', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      padding: 24px;
      font-size: 11pt;
      direction: ${opts.direction};
      color: #1a1a2e;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .cliche { text-align: center; margin-bottom: 12px; }
    .cliche img { width: 100%; max-height: 140px; object-fit: cover; border-radius: 6px; }

    .company-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 16px;
      padding: 14px 20px;
      background: linear-gradient(135deg, ${accent}08, ${accent}15);
      border: 1px solid ${accent}20;
      border-radius: 12px;
    }
    .company-header img {
      width: 70px;
      height: 70px;
      object-fit: contain;
      border-radius: 10px;
    }
    .company-header .company-name {
      font-size: 20pt;
      font-weight: 800;
      color: ${accent};
      letter-spacing: -0.5px;
    }

    .report-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 16px 20px;
      border: 2px solid ${accent}30;
      border-radius: 12px;
      background: linear-gradient(135deg, ${accent}05, ${accent}10);
    }
    .report-banner .banner-right {
      text-align: right;
    }
    .report-banner .banner-right h1 {
      font-size: 16pt;
      font-weight: 800;
      color: ${accent};
      margin-bottom: 4px;
    }
    .report-banner .banner-right .supplier-name {
      font-size: 13pt;
      font-weight: 700;
      color: #333;
      margin-bottom: 3px;
    }
    .report-banner .banner-right .date-range {
      font-size: 9pt;
      color: #666;
    }
    .report-banner .banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }
    .report-banner .banner-left img {
      width: 65px;
      height: 65px;
      object-fit: contain;
      border-radius: 10px;
    }
    .report-banner .banner-left .company-name {
      font-size: 16pt;
      font-weight: 800;
      color: ${accent};
    }

    .header {
      text-align: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 15%;
      right: 15%;
      height: 3px;
      background: linear-gradient(90deg, transparent, ${accent}, transparent);
      border-radius: 2px;
    }
    .header h1 {
      font-size: 16pt;
      font-weight: 800;
      color: ${accent};
      letter-spacing: -0.3px;
      margin-bottom: 4px;
    }
    .header p {
      font-size: 9pt;
      color: #64748b;
      font-weight: 400;
    }
    .header .date-range {
      font-size: 8.5pt;
      color: #94a3b8;
      margin-top: 2px;
    }

    .entity-bar {
      background: linear-gradient(135deg, ${accent}, ${accent}dd);
      color: ${accentText};
      text-align: center;
      padding: 9px 16px;
      border-radius: 8px;
      margin-bottom: 14px;
      font-weight: 700;
      font-size: 13pt;
      letter-spacing: 0.3px;
      box-shadow: 0 2px 8px ${accent}33;
    }

    .summary-cards {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }
    .summary-card {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      text-align: center;
      background: linear-gradient(145deg, #fafbfc, #f1f5f9);
      position: relative;
      overflow: hidden;
    }
    .summary-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }
    .summary-card.accent-red::before { background: linear-gradient(90deg, #ef4444, #f87171); }
    .summary-card.accent-green::before { background: linear-gradient(90deg, #22c55e, #4ade80); }
    .summary-card.accent-blue::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .summary-card.accent-orange::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .summary-card .label {
      font-size: 8.5pt;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .summary-card .value {
      font-size: 14pt;
      font-weight: 800;
    }
    .red { color: #dc2626; }
    .green { color: #16a34a; }
    .blue { color: #2563eb; }
    .orange { color: #d97706; }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 10pt;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    thead { }
    th {
      background: #e2e8f0;
      color: #000;
      padding: 8px 7px;
      text-align: center;
      font-weight: 700;
      font-size: 10pt;
      white-space: nowrap;
      letter-spacing: 0.2px;
    }
    th:first-child { border-radius: ${opts.direction === "rtl" ? "0 8px 0 0" : "8px 0 0 0"}; }
    th:last-child { border-radius: ${opts.direction === "rtl" ? "8px 0 0 0" : "0 8px 0 0"}; }
    td {
      border-bottom: 1px solid #f1f5f9;
      padding: 6px 7px;
      text-align: center;
      font-size: 10pt;
      color: #334155;
    }
    td small { color: #94a3b8; font-size: 8pt; }
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #f1f5f9; }
    .debit { color: #dc2626; font-weight: 600; }
    .credit { color: #16a34a; font-weight: 600; }
    .balance { font-weight: 700; color: #1e293b; }
    .return-col { color: #dc2626; font-weight: 500; }
    .amount { font-weight: 700; color: #2563eb; }

    .total-row {
      background: linear-gradient(145deg, #f0f4ff, #e8ecf4) !important;
      font-weight: 700;
      border-top: 2px solid ${accent};
    }
    .total-row td {
      padding: 8px 7px;
      font-size: 10.5pt;
      color: #1e293b;
      border-bottom: none;
    }
    .opening-row {
      background: #fffbeb !important;
    }
    .opening-row td { font-weight: 500; }

    .summary-footer {
      margin-top: 14px;
      display: flex;
      gap: 24px;
      font-size: 11pt;
      padding: 10px 16px;
      background: linear-gradient(145deg, #f8fafc, #f1f5f9);
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .summary-footer span { font-weight: 800; color: ${accent}; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 24px;
      margin-bottom: 14px;
      font-size: 11pt;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .info-label { font-weight: 600; color: #64748b; font-size: 10pt; }
    .info-value { font-weight: 500; color: #1e293b; }

    .summary-section { margin-top: 14px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .summary-box {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      background: linear-gradient(145deg, #fafbfc, #f1f5f9);
    }
    .summary-box h3 {
      font-size: 10pt;
      font-weight: 700;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 2px solid #e2e8f0;
      color: ${accent};
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 10.5pt;
      color: #334155;
    }
    .summary-row.total {
      font-weight: 800;
      font-size: 12pt;
      border-top: 2px solid ${accent};
      padding-top: 6px;
      margin-top: 6px;
      color: #1e293b;
    }

    .debt-section {
      margin-top: 14px;
      border: 2px solid #ef4444;
      border-radius: 10px;
      padding: 10px 14px;
      background: linear-gradient(145deg, #fef2f2, #fff5f5);
    }
    .debt-section h3 {
      color: #dc2626;
      font-size: 10pt;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .debt-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 10.5pt;
    }
    .debt-row.final {
      font-weight: 800;
      font-size: 13pt;
      color: #dc2626;
      border-top: 2px solid #dc2626;
      padding-top: 6px;
      margin-top: 6px;
    }

    .footer {
      margin-top: 28px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
    }
    .signature-box {
      text-align: center;
      width: 180px;
    }
    .signature-line {
      border-top: 1.5px solid #94a3b8;
      margin-top: 44px;
      padding-top: 4px;
      font-weight: 500;
      color: #64748b;
    }

    .watermark {
      position: fixed;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 7pt;
      color: #cbd5e1;
      text-align: center;
    }

    @media print {
      body { padding: 8mm; }
      @page { margin: 6mm; size: ${page}; }
      .summary-card, .summary-box, .debt-section, .summary-footer {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
}

export function getDebtReportStyles(direction: "rtl" | "ltr"): string {
  return getModernPrintStyles({ direction, accentColor: "#1e293b", accentTextColor: "#ffffff" });
}

export const PRINT_FONT_LINKS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700;800&family=Cairo:wght@300;400;500;600;700;800&family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
`;

export const PRINT_FONT_FAMILY = "'Cairo', 'Noto Naskh Arabic', 'Tajawal', 'Noto Sans Arabic', 'Noto Kufi Arabic', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

export function openPrintWindow(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  if (w.document.fonts?.ready) {
    w.document.fonts.ready.then(() => setTimeout(() => w.print(), 300));
  } else {
    setTimeout(() => w.print(), 1200);
  }
}
