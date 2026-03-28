import { useTranslation } from "react-i18next";
import { formatDate, usd, fmtIqd } from "@/lib/format-utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { TrendingUp, TrendingDown, ArrowUpRight, FileText, ShoppingCart, Users, Package, Wallet, RotateCcw, CreditCard, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { SalesInvoice, SalesReturn } from "@shared/schema";

export default function Dashboard() {
  const { t, i18n } = useTranslation();

  const { data: salesInvoices } = useQuery<SalesInvoice[]>({ queryKey: ["/api/sales-invoices"] });
  const { data: salesReturns } = useQuery<SalesReturn[]>({ queryKey: ["/api/sales-returns"] });
  const { data: products } = useQuery<any[]>({ queryKey: ["/api/products"] });
  const { data: customers } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const { data: agentReceipts } = useQuery<any[]>({ queryKey: ["/api/agent-receipts"] });
  const { data: agentPayments } = useQuery<any[]>({ queryKey: ["/api/agent-payments"] });

  const today = new Date().toISOString().split("T")[0];
  const todaySales = salesInvoices?.filter(s => s.date === today) || [];
  const todayReturns = salesReturns?.filter(r => r.date === today) || [];

  const totalSalesUsd = (salesInvoices || []).filter(s => s.currency === 'USD').reduce((sum, s) => sum + parseFloat(s.subtotal || '0'), 0);
  const totalSalesIqd = (salesInvoices || []).filter(s => s.currency === 'IQD').reduce((sum, s) => sum + parseFloat(s.subtotal || '0'), 0);
  const totalReturnsUsd = (salesReturns || []).filter(r => r.currency === 'USD').reduce((sum, r) => sum + parseFloat(r.subtotal || '0'), 0);
  const totalReceiptsUsd = (agentReceipts || []).filter(r => r.currency === 'USD').reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
  const totalPaymentsUsd = (agentPayments || []).filter(p => p.currency === 'USD').reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

  const locale = i18n.language === 'ar' ? 'ar' : i18n.language === 'ckb' ? 'ar' : i18n.language === 'tr' ? 'tr' : 'en';

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const revenueData = last7Days.map(date => {
    const daySales = (salesInvoices || []).filter(s => s.date === date && s.currency === 'USD');
    const total = daySales.reduce((sum, s) => sum + parseFloat(s.subtotal || '0'), 0);
    const dayName = new Date(date).toLocaleDateString(locale, { weekday: 'short' });
    return { name: dayName, revenue: total, date };
  });

  const currentMonth = new Date().getMonth();
  const salesByMonth = Array.from({ length: 6 }, (_, i) => {
    const monthIdx = currentMonth - 5 + i;
    const adjustedMonth = monthIdx < 0 ? monthIdx + 12 : monthIdx;
    const monthSales = (salesInvoices || []).filter(s => {
      const sMonth = new Date(s.date).getMonth();
      return sMonth === adjustedMonth && s.currency === 'USD';
    });
    const monthDate = new Date(2024, adjustedMonth, 1);
    return {
      name: monthDate.toLocaleDateString(locale, { month: 'short' }),
      total: monthSales.reduce((sum, s) => sum + parseFloat(s.subtotal || '0'), 0)
    };
  });

  const currencyDistribution = [
    { name: 'USD', value: totalSalesUsd, color: '#3b82f6' },
    { name: 'IQD', value: totalSalesIqd, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const recentInvoices = (salesInvoices || []).slice(-5).reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Dashboard')}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="group hover:shadow-md transition-all duration-300 border-border/50" data-testid="card-total-sales">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> {todaySales.length}
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('Total Sales')}</p>
            <p className="text-xl font-bold" data-testid="text-total-sales">{usd(totalSalesUsd)}</p>
            <p className="text-xs text-muted-foreground mt-1">{fmtIqd(totalSalesIqd)} IQD</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all duration-300 border-border/50" data-testid="card-total-returns">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
                <RotateCcw className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" /> {todayReturns.length}
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('Returns')}</p>
            <p className="text-xl font-bold" data-testid="text-total-returns">{usd(totalReturnsUsd)}</p>
            <p className="text-xs text-muted-foreground mt-1">{(salesReturns || []).length} {t('total')}</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all duration-300 border-border/50" data-testid="card-customers">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-bold text-violet-600 bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded-full">
                {(customers || []).length}
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('Customers')}</p>
            <p className="text-xl font-bold" data-testid="text-customer-count">{(customers || []).length}</p>
            <p className="text-xs text-muted-foreground mt-1">{(products || []).length} {t('Products')}</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all duration-300 border-border/50" data-testid="card-receipts">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('Receipts')}</p>
            <p className="text-xl font-bold" data-testid="text-total-receipts">{usd(totalReceiptsUsd)}</p>
            <p className="text-xs text-muted-foreground mt-1">{usd(totalPaymentsUsd)} {t('Payments')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-border/50" data-testid="card-revenue-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t('Revenue Overview')} (USD)</CardTitle>
            <p className="text-xs text-muted-foreground">{t('Last 7 days')}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    fontWeight={500}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value}`} 
                    fontWeight={500}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px', fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/50" data-testid="card-monthly-sales">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t('Monthly Sales')} (USD)</CardTitle>
            <p className="text-xs text-muted-foreground">{t('Last 6 months')}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    fontWeight={500}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    fontWeight={500}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px', fontWeight: 600 }}
                    cursor={{fill: 'hsl(var(--muted) / 0.5)'}}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50" data-testid="card-recent-invoices">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {t('Recent Invoices')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInvoices.map((inv, i) => (
                <div key={inv.id || i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`invoice-item-${inv.id}`}>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">#{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{inv.customerName}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold">{inv.currency === 'USD' ? usd(parseFloat(inv.subtotal || '0')) : fmtIqd(parseFloat(inv.subtotal || '0'))}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(inv.date)}</p>
                  </div>
                </div>
              ))}
              {recentInvoices.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">{t('No recent invoices')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="card-currency-distribution">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              {t('Sales by Currency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currencyDistribution.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={currencyDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {currencyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => usd(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">{t('No data')}</div>
            )}
            <div className="flex justify-center gap-6 mt-2">
              {currencyDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs font-semibold">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="card-quick-stats">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              {t('Quick Stats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{t('Total Invoices')}</span>
                </div>
                <span className="text-sm font-bold" data-testid="text-invoice-count">{(salesInvoices || []).length}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-medium">{t('Total Returns')}</span>
                </div>
                <span className="text-sm font-bold" data-testid="text-return-count">{(salesReturns || []).length}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">{t('Products')}</span>
                </div>
                <span className="text-sm font-bold" data-testid="text-product-count">{(products || []).length}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-medium">{t('Customers')}</span>
                </div>
                <span className="text-sm font-bold">{(customers || []).length}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium">{t('Receipts')}</span>
                </div>
                <span className="text-sm font-bold">{(agentReceipts || []).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
