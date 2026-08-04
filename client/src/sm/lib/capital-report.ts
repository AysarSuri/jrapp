import { fmtN } from "@/sm/lib/utils";

/* ── تقرير رأس المال ──
   يبني مستند A4 احترافي يعرض قيمة جرد المواد وديون الزبائن لكل فرع،
   ثم ديون الموردين الإجمالية، وأخيراً رأس المال الصافي. */

export type CapitalBranchRow = {
  branchId: number;
  branchName: string;
  inventoryValue: number;
  customerDebt: number;
  subtotal: number;
};

export type CapitalTotals = {
  inventoryValue: number;
  customerDebt: number;
  supplierDebt: number;
  capital: number;
  cashBalance: number;
  cardsBalance: number;
};

export type CapitalReportStore = {
  name: string;
  logo?: string;
  phone?: string;
  address?: string;
};

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeImg = (src?: string): string => {
  const v = (src || "").trim();
  if (/^(data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,|https?:\/\/)/i.test(v)) return esc(v);
  return "";
};

export function buildCapitalReportHtml(
  branches: CapitalBranchRow[],
  totals: CapitalTotals,
  store: CapitalReportStore,
  currency = "",
  printedBy?: string,
): string {
  const cur = esc(currency);

  const body = branches
    .map((b, i) => {
      return `<tr>
<td class="c idx">${i + 1}</td>
<td class="br">${esc(b.branchName)}</td>
<td class="c num inv">${fmtN(b.inventoryValue)}</td>
<td class="c num debt">${fmtN(b.customerDebt)}</td>
<td class="c num sub">${fmtN(b.subtotal)}</td>
</tr>`;
    })
    .join("");

  const logo = safeImg(store.logo);
  const printedAt = new Date();
  const printedStr = `${printedAt.toLocaleDateString("ar-EG")} · ${printedAt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير رأس المال</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4 portrait;margin:0.2cm}
html,body{background:#eef2f7}
body{font-family:'Segoe UI','Tahoma',Arial,sans-serif;color:#0f172a;padding:14px;font-size:12.5px}
.sheet{max-width:190mm;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,.10);border:1px solid #e2e8f0}
/* Header */
.hd{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px 24px;background:linear-gradient(135deg,#064e3b 0%,#065f46 55%,#047857 100%);color:#fff}
.brand{display:flex;align-items:center;gap:14px;min-width:0}
.logo{width:60px;height:60px;border-radius:14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto}
.logo img{width:100%;height:100%;object-fit:contain}
.logo .ph{font-size:25px;font-weight:900;color:#fff}
.binfo{min-width:0}
.binfo .nm{font-size:22px;font-weight:900;letter-spacing:.2px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.binfo .sub{font-size:12px;opacity:.85;font-weight:600;margin-top:3px;display:flex;gap:12px;flex-wrap:wrap}
.rt{text-align:left;flex:0 0 auto}
.rt .title{display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);padding:7px 16px;border-radius:999px;font-size:16px;font-weight:900}
.rt .pat{font-size:11px;opacity:.85;font-weight:600;margin-top:7px}
/* Section title */
.sec{padding:16px 24px 6px;font-size:14px;font-weight:900;color:#0f172a;display:flex;align-items:center;gap:8px}
.sec::before{content:"";width:5px;height:18px;border-radius:3px;background:#059669}
/* Table */
.tbl-wrap{padding:4px 20px 6px}
table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
thead th{background:#064e3b;color:#fff;padding:10px 8px;font-weight:800;font-size:12.5px;text-align:center;white-space:nowrap}
thead th:first-child{border-radius:0 9px 9px 0}
thead th:last-child{border-radius:9px 0 0 9px}
tbody td{padding:10px 8px;border-bottom:1px solid #eef2f7;vertical-align:middle}
tbody tr:nth-child(even) td{background:#f8fafc}
.c{text-align:center}
.num{font-family:'Segoe UI',Tahoma,sans-serif;font-weight:800;direction:ltr;font-variant-numeric:tabular-nums;white-space:nowrap}
td.idx{color:#94a3b8;font-weight:700;width:38px}
td.br{text-align:right;font-weight:900;color:#0f172a}
td.inv{color:#047857;font-weight:900}
td.debt{color:#b45309}
td.sub{color:#0f172a;font-weight:900}
tfoot td{background:#ecfdf5;font-weight:900;padding:12px 8px;border-top:2px solid #a7f3d0;font-size:13px}
tfoot .lbl{text-align:right;color:#065f46}
tfoot .num{direction:ltr}
tfoot .ft-inv{color:#047857}
tfoot .ft-debt{color:#b45309}
/* Summary cards */
.sum{display:flex;gap:12px;padding:14px 24px 6px;flex-wrap:wrap}
.card{flex:1;min-width:150px;border-radius:14px;padding:15px 16px;border:1px solid #e2e8f0;background:#fff;box-shadow:0 2px 6px rgba(15,23,42,.04)}
.card .k{font-size:11.5px;font-weight:700;color:#64748b;margin-bottom:6px}
.card .v{font-size:19px;font-weight:900;direction:ltr;font-variant-numeric:tabular-nums}
.card.inv .v{color:#047857}
.card.debt .v{color:#b45309}
.card.sup .v{color:#dc2626}
.card.cash .v{color:#0369a1}
.card.cards .v{color:#7c3aed}
/* Capital banner */
.cap{margin:10px 24px 22px;border-radius:16px;padding:20px 24px;background:linear-gradient(135deg,#064e3b 0%,#047857 100%);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:18px;box-shadow:0 8px 28px rgba(4,120,87,.30)}
.cap .lab{font-size:15px;font-weight:800;opacity:.92}
.cap .frm{font-size:11px;opacity:.78;font-weight:600;margin-top:4px}
.cap .amt{font-size:30px;font-weight:900;direction:ltr;font-variant-numeric:tabular-nums;white-space:nowrap}
.foot{text-align:center;padding:10px;font-size:11px;color:#94a3b8;font-weight:600;border-top:1px dashed #e2e8f0}
@media print{
  html,body{background:#fff;padding:0}
  .sheet{box-shadow:none;border:none;border-radius:0;max-width:100%}
  tr{break-inside:avoid}
}
</style></head><body>
<div class="sheet">
  <div class="hd">
    <div class="brand">
      <div class="logo">${logo ? `<img src="${logo}" alt="">` : `<span class="ph">${esc((store.name || "S").trim().charAt(0) || "S")}</span>`}</div>
      <div class="binfo">
        <div class="nm">${esc(store.name || "تقرير رأس المال")}</div>
        <div class="sub">
          ${store.phone ? `<span dir="ltr">${esc(store.phone)}</span>` : ""}
          ${store.address ? `<span>${esc(store.address)}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="rt">
      <div class="title">تقرير رأس المال</div>
      <div class="pat">طُبع: ${esc(printedStr)}${printedBy ? ` · ${esc(printedBy)}` : ""}</div>
    </div>
  </div>

  <div class="sec">الجرد وديون الزبائن لكل فرع</div>
  <div class="tbl-wrap">
    <table>
      <thead><tr>
        <th>#</th><th>الفرع</th><th>قيمة الجرد (تكلفة)</th><th>ديون الزبائن</th><th>المجموع</th>
      </tr></thead>
      <tbody>${body || `<tr><td class="c" colspan="5" style="padding:30px;color:#94a3b8;font-weight:700">لا توجد فروع</td></tr>`}</tbody>
      ${branches.length ? `<tfoot><tr>
        <td class="lbl" colspan="2">إجمالي جميع الفروع</td>
        <td class="num ft-inv">${fmtN(totals.inventoryValue)}</td>
        <td class="num ft-debt">${fmtN(totals.customerDebt)}</td>
        <td class="num">${fmtN(totals.inventoryValue + totals.customerDebt)}</td>
      </tr></tfoot>` : ""}
    </table>
  </div>

  <div class="sum">
    <div class="card inv"><div class="k">إجمالي جرد المواد</div><div class="v">${fmtN(totals.inventoryValue)} ${cur}</div></div>
    <div class="card debt"><div class="k">إجمالي ديون الزبائن</div><div class="v">${fmtN(totals.customerDebt)} ${cur}</div></div>
    <div class="card sup"><div class="k">إجمالي ديون الموردين</div><div class="v">${fmtN(totals.supplierDebt)} ${cur}</div></div>
    <div class="card cash"><div class="k">باقي داخل القاصة</div><div class="v">${fmtN(totals.cashBalance ?? 0)} ${cur}</div></div>
    <div class="card cards"><div class="k">باقي داخل جميع البطاقات</div><div class="v">${fmtN(totals.cardsBalance ?? 0)} ${cur}</div></div>
  </div>

  <div class="cap">
    <div>
      <div class="lab">رأس المال الصافي</div>
      <div class="frm">جرد المواد + ديون الزبائن + القاصة + البطاقات − ديون الموردين</div>
    </div>
    <div class="amt">${fmtN(totals.capital)} ${cur}</div>
  </div>
</div>
</body></html>`;
}
