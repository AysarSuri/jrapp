import { useQuery } from "@tanstack/react-query";
import { Wallet, Boxes, Users, Truck, Printer, Building2, AlertCircle, Landmark, CreditCard } from "lucide-react";
import { useAppSettings } from "@/sm/contexts/AppSettingsContext";
import { useBranch } from "@/sm/contexts/BranchContext";
import { useAuth, canSeeAllBranches } from "@/sm/contexts/AuthContext";
import { resolveStoreIdentity } from "@/sm/lib/print-store";
import { requireReportPrinter } from "@/sm/lib/printers";
import { printHtmlDirect } from "@/sm/lib/print-html-direct";
import { buildCapitalReportHtml, type CapitalBranchRow, type CapitalTotals } from "@/sm/lib/capital-report";
import { fmtN, fetchJson } from "@/sm/lib/utils";
import { useLang } from "@/sm/contexts/LanguageContext";

type CapitalResponse = {
  branches: CapitalBranchRow[];
  totals: CapitalTotals;
};

export default function CapitalPage() {
  const { t } = useLang();
  const { currency, storeName, storeLogo } = useAppSettings();
  const { selectedBranch } = useBranch();
  const { user } = useAuth();
  const allowed = !!user && canSeeAllBranches(user.role);

  const { data, isLoading, isError, refetch } = useQuery<CapitalResponse>({
    queryKey: ["/api/capital"],
    queryFn: () => fetchJson<CapitalResponse>("/api/capital"),
    enabled: allowed,
    refetchOnMount: "always",
  });

  function printReport() {
    if (!data) return;
    if (!requireReportPrinter()) return;
    const sid = resolveStoreIdentity(selectedBranch, { name: storeName, logo: storeLogo });
    const html = buildCapitalReportHtml(
      data.branches,
      data.totals,
      { name: sid.name, logo: sid.logo, phone: sid.phone, address: sid.address },
      currency,
      user?.username,
    );
    printHtmlDirect(html);
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <AlertCircle className="w-12 h-12" />
        <p className="font-bold text-lg">{t("capital.no_access")}</p>
      </div>
    );
  }

  const totals = data?.totals;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t("capital.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">{t("capital.subtitle")}</p>
          </div>
        </div>
        <button
          onClick={printReport}
          disabled={!data}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Printer className="w-5 h-5" />
          {t("capital.print")}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center min-h-[40vh] text-gray-400 font-bold">
          {t("capital.loading")}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-red-400">
          <AlertCircle className="w-10 h-10" />
          <p className="font-bold">{t("capital.error")}</p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-sm transition-colors"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Capital banner */}
          <div className="rounded-3xl p-6 sm:p-8 mb-6 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white shadow-2xl shadow-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-base font-bold opacity-90">{t("capital.net_capital")}</p>
              <p className="text-xs opacity-75 font-semibold mt-1">{t("capital.formula")}</p>
            </div>
            <p className="text-4xl sm:text-5xl font-black tabular-nums" dir="ltr">
              {fmtN(totals!.capital)} <span className="text-2xl opacity-80">{currency}</span>
            </p>
          </div>

          {/* Totals cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <SummaryCard
              icon={<Boxes className="w-6 h-6" />}
              label={t("capital.total_inventory")}
              value={totals!.inventoryValue}
              currency={currency}
              tone="emerald"
            />
            <SummaryCard
              icon={<Users className="w-6 h-6" />}
              label={t("capital.total_customer_debt")}
              value={totals!.customerDebt}
              currency={currency}
              tone="amber"
            />
            <SummaryCard
              icon={<Truck className="w-6 h-6" />}
              label={t("capital.total_supplier_debt")}
              value={totals!.supplierDebt}
              currency={currency}
              tone="rose"
            />
            <SummaryCard
              icon={<Landmark className="w-6 h-6" />}
              label={t("capital.cash_balance")}
              value={totals!.cashBalance ?? 0}
              currency={currency}
              tone="blue"
            />
            <SummaryCard
              icon={<CreditCard className="w-6 h-6" />}
              label={t("capital.cards_balance")}
              value={totals!.cardsBalance ?? 0}
              currency={currency}
              tone="purple"
            />
          </div>

          {/* Per-branch table */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <h2 className="font-black text-gray-900 dark:text-white">{t("capital.per_branch")}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 text-right font-bold">{t("capital.branch")}</th>
                    <th className="px-4 py-3 text-center font-bold">{t("capital.inventory_value")}</th>
                    <th className="px-4 py-3 text-center font-bold">{t("capital.customer_debt")}</th>
                    <th className="px-4 py-3 text-center font-bold">{t("capital.subtotal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.branches.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-gray-400 font-bold">
                        {t("capital.no_branches")}
                      </td>
                    </tr>
                  )}
                  {data.branches.map((b) => (
                    <tr key={b.branchId} className="border-t border-gray-100 dark:border-gray-700/60 even:bg-gray-50/60 dark:even:bg-gray-900/20">
                      <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">{b.branchName}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-emerald-600 tabular-nums" dir="ltr">{fmtN(b.inventoryValue)}</td>
                      <td className="px-4 py-3 text-center font-bold text-amber-600 tabular-nums" dir="ltr">{fmtN(b.customerDebt)}</td>
                      <td className="px-4 py-3 text-center font-black text-gray-900 dark:text-white tabular-nums" dir="ltr">{fmtN(b.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                {data.branches.length > 0 && (
                  <tfoot>
                    <tr className="bg-emerald-50 dark:bg-emerald-900/20 border-t-2 border-emerald-200 dark:border-emerald-800">
                      <td className="px-4 py-3.5 text-right font-black text-emerald-800 dark:text-emerald-300">{t("capital.all_branches")}</td>
                      <td className="px-4 py-3.5 text-center font-black text-emerald-700 dark:text-emerald-400 tabular-nums" dir="ltr">{fmtN(totals!.inventoryValue)}</td>
                      <td className="px-4 py-3.5 text-center font-black text-amber-700 dark:text-amber-400 tabular-nums" dir="ltr">{fmtN(totals!.customerDebt)}</td>
                      <td className="px-4 py-3.5 text-center font-black text-gray-900 dark:text-white tabular-nums" dir="ltr">{fmtN(totals!.inventoryValue + totals!.customerDebt)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  currency,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  currency: string;
  tone: "emerald" | "amber" | "rose" | "blue" | "purple";
}) {
  const tones: Record<string, { box: string; text: string }> = {
    emerald: { box: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400", text: "text-emerald-600 dark:text-emerald-400" },
    amber: { box: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400", text: "text-amber-600 dark:text-amber-400" },
    rose: { box: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400", text: "text-rose-600 dark:text-rose-400" },
    blue: { box: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400", text: "text-sky-600 dark:text-sky-400" },
    purple: { box: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400", text: "text-violet-600 dark:text-violet-400" },
  };
  const ts = tones[tone];
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ts.box}`}>{icon}</div>
        <p className="font-bold text-gray-500 dark:text-gray-400 text-sm">{label}</p>
      </div>
      <p className={`text-2xl font-black tabular-nums ${ts.text}`} dir="ltr">
        {fmtN(value)} <span className="text-base opacity-70">{currency}</span>
      </p>
    </div>
  );
}
