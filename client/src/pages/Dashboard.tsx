import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type VendorPayableResponse } from "@/lib/api";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

export default function Dashboard() {
  const { pos, vendors, sites, isLoading } = useStore();
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");

  const { data: vendorPayables = [] } = useQuery<VendorPayableResponse[]>({
    queryKey: ["vendorPayables"],
    queryFn: api.getVendorPayables,
  });

  const filteredPOs = useMemo(() => {
    if (selectedSiteId === "all") return pos;
    return pos.filter(p => p.siteId === selectedSiteId);
  }, [pos, selectedSiteId]);

  const totalPurchase = filteredPOs.reduce((acc, po) => acc + po.totalAmount, 0);
  const pendingPOs = filteredPOs.filter(po => po.status === 'Pending').length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlySpend = filteredPOs.reduce((acc, po) => {
    const poDate = new Date(po.date);
    if (poDate.getFullYear() === currentYear && poDate.getMonth() === currentMonth) {
      return acc + po.totalAmount;
    }
    return acc;
  }, 0);

  const vendorSpendRaw = filteredPOs.reduce((acc: any, po) => {
    const vName = vendors.find(v => v.id.toString() === po.vendorId)?.name || 'Unknown';
    acc[vName] = (acc[vName] || 0) + po.totalAmount;
    return acc;
  }, {});

  const COLORS = ['var(--color-primary)', 'color-mix(in oklab, var(--color-primary) 85%, white)', 'color-mix(in oklab, var(--color-primary) 70%, white)', 'color-mix(in oklab, var(--color-primary) 55%, white)', 'color-mix(in oklab, var(--color-primary) 40%, white)'];
  const vendorSpendData = Object.keys(vendorSpendRaw).map((key, index) => ({
    name: key,
    value: vendorSpendRaw[key],
    fill: COLORS[index % COLORS.length]
  })).sort((a, b) => b.value - a.value);

  const monthlyPurchasesData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthName = new Date(0, i).toLocaleString('en', { month: 'short' });
      const monthTotal = filteredPOs.reduce((acc, po) => {
        const poDate = new Date(po.date);
        if (poDate.getFullYear() === currentYear && poDate.getMonth() === i) {
          return acc + po.totalAmount;
        }
        return acc;
      }, 0);
      return { name: monthName, purchase: monthTotal };
    }).filter((data, i) => i <= currentMonth || data.purchase > 0);
  }, [filteredPOs, currentMonth, currentYear]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div className="mb-2">
  <h1 className="text-2xl font-semibold text-slate-800">
    Dashboard
  </h1>
  <p className="text-sm text-slate-500">
    Overview of procurement and financial activity
  </p>
</div>
          	
          <div className="flex items-center gap-3">
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="w-[180px] bg-background" data-testid="select-site-filter">
                <SelectValue placeholder="Project/Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.siteName || s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="p-2 border rounded-md bg-background text-muted-foreground hover:bg-muted cursor-pointer transition-colors">
              <Filter className="w-4 h-4" />
            </div>
          </div>
        </div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

  <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white p-5 rounded-2xl shadow-sm">
    <p className="text-sm opacity-90">Total Purchase</p>
    <h2 className="text-2xl font-bold">
      ₹{totalPurchase.toLocaleString()}
    </h2>
  </div>

  <div className="bg-gradient-to-r from-green-500 to-emerald-400 text-white p-5 rounded-2xl shadow-sm">
    <p className="text-sm opacity-90">Monthly Spend</p>
    <h2 className="text-2xl font-bold">
      ₹{monthlySpend.toLocaleString()}
    </h2>
  </div>

  <div className="bg-gradient-to-r from-yellow-500 to-orange-400 text-white p-5 rounded-2xl shadow-sm">
    <p className="text-sm opacity-90">Pending POs</p>
    <h2 className="text-2xl font-bold">
      {pendingPOs}
    </h2>
  </div>

  <div className="bg-gradient-to-r from-purple-500 to-pink-400 text-white p-5 rounded-2xl shadow-sm">
    <p className="text-sm opacity-90">Vendors</p>
    <h2 className="text-2xl font-bold">
      {vendors.length}
    </h2>
  </div>

</div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Monthly Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {monthlyPurchasesData.length > 0 && monthlyPurchasesData.some(d => d.purchase > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyPurchasesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} dy={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                        tickFormatter={(value) => `₹${value/1000}k`}
                      />
                      <Tooltip 
                        cursor={{ fill: 'var(--color-muted)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [formatCurrency(value), 'Purchase']}
                      />
                      <Bar dataKey="purchase" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No purchase data available for the current year.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Vendor-wise Spend</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              {vendorSpendData.length > 0 ? (
                <>
                  <div className="h-[220px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={vendorSpendData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {vendorSpendData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="text-sm text-muted-foreground">Top</span>
                      <span className="text-lg font-bold text-foreground">Vendors</span>
                    </div>
                  </div>
                  <div className="w-full mt-4 flex flex-col gap-2">
                    {vendorSpendData.slice(0, 3).map((vendor, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: vendor.fill }} />
                          <span className="text-muted-foreground truncate max-w-[120px]">{vendor.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(vendor.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground text-sm flex h-full items-center">No spend data yet.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Vendor Outstanding Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vendorPayables.slice(0, 5).map((item) => (
                <div key={item.vendorId} className="flex items-center justify-between text-sm border-b pb-2">
                  <span className="text-muted-foreground">{item.vendorName}</span>
                  <span className="font-semibold">{formatCurrency(item.outstanding)}</span>
                </div>
              ))}
              {!vendorPayables.length && (
                <div className="text-sm text-muted-foreground">No outstanding vendor balances.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg font-medium">PO Number</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 rounded-tr-lg font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.slice(-5).reverse().map((po) => {
                    const vendor = vendors.find(v => v.id.toString() === po.vendorId);
                    return (
                      <tr key={po.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-primary cursor-pointer hover:underline">{po.displayId}</td>
                        <td className="px-4 py-3">{vendor?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{po.date}</td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(po.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant="outline" 
                            className={
                              po.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              po.status === 'Partial' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }
                          >
                            {po.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPOs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No purchase orders found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
