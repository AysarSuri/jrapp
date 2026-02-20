import { useProducts } from "@/hooks/use-products";
import { useInvoices } from "@/hooks/use-financials";
import { useAccounts } from "@/hooks/use-financials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: products } = useProducts();
  const { data: invoices } = useInvoices();
  const { data: accounts } = useAccounts();

  // Metrics calculation
  const totalSales = invoices
    ?.filter(i => i.type === 'sale')
    .reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

  const totalPurchases = invoices
    ?.filter(i => i.type === 'purchase')
    .reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

  const totalBalance = accounts
    ?.reduce((acc, curr) => acc + Number(curr.balance), 0) || 0;

  const productCount = products?.length || 0;

  // Chart data preparation
  const salesData = [
    { name: 'Jan', sales: 4000 },
    { name: 'Feb', sales: 3000 },
    { name: 'Mar', sales: 2000 },
    { name: 'Apr', sales: 2780 },
    { name: 'May', sales: 1890 },
    { name: 'Jun', sales: 2390 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('nav.dashboard')}</h2>
        <p className="text-muted-foreground mt-2">Overview of your business performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title={t('dashboard.totalSales')} 
          value={`$${totalSales.toLocaleString()}`} 
          icon={TrendingUp}
          trend="+12.5% from last month"
          color="text-green-500"
        />
        <MetricCard 
          title={t('dashboard.totalPurchases')} 
          value={`$${totalPurchases.toLocaleString()}`} 
          icon={ShoppingCart}
          trend="+4.3% from last month"
          color="text-blue-500"
        />
        <MetricCard 
          title={t('dashboard.cashBalance')} 
          value={`$${totalBalance.toLocaleString()}`} 
          icon={DollarSign}
          trend="Current available"
          color="text-emerald-500"
        />
        <MetricCard 
          title={t('dashboard.activeProducts')} 
          value={productCount.toString()} 
          icon={Users}
          trend="Total active items"
          color="text-purple-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm border-slate-100">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `$${value}`} 
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="sales" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 shadow-sm border-slate-100">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Dummy Recent Activity List */}
              {[1, 2, 3, 4, 5].map((_, i) => (
                <div key={i} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">New Invoice Generated</p>
                    <p className="text-sm text-muted-foreground">
                      Client: Olivia Martin
                    </p>
                  </div>
                  <div className="ml-auto font-medium">+$1,999.00</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}
