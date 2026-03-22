import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/format-utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { TrendingUp, TrendingDown, ArrowUpRight, FileText } from "lucide-react";
import { IconCustomers, IconProduct, IconDollar } from "@/components/erp-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions } from "@/hooks/use-transactions";
import { useInvoices } from "@/hooks/use-invoices";

const salesData = [
  { name: 'Jan', total: 1200 },
  { name: 'Feb', total: 2100 },
  { name: 'Mar', total: 1800 },
  { name: 'Apr', total: 2400 },
  { name: 'May', total: 3200 },
  { name: 'Jun', total: 2800 },
];

const revenueData = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 5000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 6890 },
  { name: 'Sat', revenue: 2390 },
  { name: 'Sun', revenue: 3490 },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: transactions } = useTransactions();
  const { data: invoices } = useInvoices();

  return (
    <div className="space-y-8 font-bold">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Dashboard')}</h1>
          <p className="text-muted-foreground mt-1 font-semibold">Overview of your business performance</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">{t('Total Sales')}</CardTitle>
            <IconDollar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1 font-bold">
              <span className="text-emerald-500 flex items-center font-bold">
                <TrendingUp className="w-3 h-3 mr-1" /> +20.1%
              </span>
              <span className="ml-2 font-semibold">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">{t('Active Clients')}</CardTitle>
            <IconCustomers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1 font-bold">
              <span className="text-emerald-500 flex items-center font-bold">
                <TrendingUp className="w-3 h-3 mr-1" /> +180.1%
              </span>
              <span className="ml-2 font-semibold">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">{t('Products')}</CardTitle>
            <IconProduct className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1 font-bold">
              <span className="text-rose-500 flex items-center font-bold">
                <TrendingDown className="w-3 h-3 mr-1" /> -4.5%
              </span>
              <span className="ml-2 font-semibold">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">{t('Net Profit')}</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,234.00</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1 font-bold">
              <span className="text-emerald-500 flex items-center font-bold">
                <TrendingUp className="w-3 h-3 mr-1" /> +12.3%
              </span>
              <span className="ml-2 font-semibold">from last month</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="font-bold">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    fontWeight={700}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value}`} 
                    fontWeight={700}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontWeight: 700 }}
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

        <Card className="col-span-3 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="font-bold">Monthly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    fontWeight={700}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    fontWeight={700}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontWeight: 700 }}
                    cursor={{fill: 'hsl(var(--muted))'}}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-bold">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions?.slice(0, 3).map((tx, i) => (
                <div key={i} className="flex items-center">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    $
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-bold leading-none">{tx.type} - {tx.reference}</p>
                    <p className="text-sm text-muted-foreground font-semibold">{formatDate(tx.date)}</p>
                  </div>
                  <div className="ml-auto font-bold">
                    {tx.type === 'deposit' ? '+' : '-'}${tx.amount}
                  </div>
                </div>
              ))}
              {!transactions?.length && (
                <p className="text-muted-foreground text-sm font-semibold">No recent transactions.</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="font-bold">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices?.slice(0, 3).map((inv, i) => (
                <div key={i} className="flex items-center">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-bold leading-none">{inv.type} #{inv.id}</p>
                    <p className="text-sm text-muted-foreground font-semibold">{inv.status} - {formatDate(inv.date)}</p>
                  </div>
                  <div className="ml-auto font-bold">
                    ${inv.total}
                  </div>
                </div>
              ))}
              {!invoices?.length && (
                <p className="text-muted-foreground text-sm font-semibold">No recent invoices.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
