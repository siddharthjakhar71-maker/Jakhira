import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function getMonthKey(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string) {
  const [year, month] = key.split('-');
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleString('en', { month: 'long', year: 'numeric' });
}

export default function VendorPayments() {
  const { vendors, bills, payments, sites, searchQuery } = useStore();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    bills.forEach(b => {
      const key = getMonthKey(b.date);
      if (key) months.add(key);
    });
    payments.forEach(p => {
      const key = getMonthKey(p.paymentDate || p.date || "");
      if (key) months.add(key);
    });
    return Array.from(months).sort().reverse();
  }, [bills, payments]);

  const summary = useMemo(() => {
    const vendorMap: Record<string, Record<string, { totalPurchase: number; paidAmount: number; bills: any[]; payments: any[]; siteIds: Set<string> }>> = {};

    bills.forEach(bill => {
      const vendorId = bill.vendorId;
      const month = getMonthKey(bill.date);
      if (!vendorMap[vendorId]) vendorMap[vendorId] = {};
      if (!month) return;
      if (!vendorMap[vendorId][month]) vendorMap[vendorId][month] = { totalPurchase: 0, paidAmount: 0, bills: [], payments: [], siteIds: new Set() };
      vendorMap[vendorId][month].totalPurchase += bill.amount;
      vendorMap[vendorId][month].bills.push(bill);
      if (bill.siteId) vendorMap[vendorId][month].siteIds.add(bill.siteId);
    });

    payments.forEach(payment => {
      const vendorId = String(payment.vendorId || "");
      if (!vendorId) return;
      const month = getMonthKey(payment.paymentDate || payment.date || "");
      if (!vendorMap[vendorId]) vendorMap[vendorId] = {};
      if (!vendorMap[vendorId][month]) vendorMap[vendorId][month] = { totalPurchase: 0, paidAmount: 0, bills: [], payments: [], siteIds: new Set() };
      vendorMap[vendorId][month].paidAmount += payment.amount;
      vendorMap[vendorId][month].payments.push(payment);
    });

    const rows: { vendorId: string; vendorName: string; month: string; monthLabel: string; totalPurchase: number; paidAmount: number; pendingAmount: number; status: string; siteIds: string[] }[] = [];

    for (const vendorId of Object.keys(vendorMap)) {
      const vendor = vendors.find(v => v.id.toString() === vendorId);
      for (const month of Object.keys(vendorMap[vendorId])) {
        const data = vendorMap[vendorId][month];
        const pending = data.totalPurchase - data.paidAmount;
        let status = 'Unpaid';
        if (data.paidAmount >= data.totalPurchase && data.totalPurchase > 0) status = 'Paid';
        else if (data.paidAmount > 0) status = 'Partially Paid';
        rows.push({
          vendorId,
          vendorName: vendor?.name || 'Unknown',
          month,
          monthLabel: getMonthLabel(month),
          totalPurchase: data.totalPurchase,
          paidAmount: data.paidAmount,
          pendingAmount: Math.max(0, pending),
          status,
          siteIds: Array.from(data.siteIds),
        });
      }
    }

    return rows.sort((a, b) => b.month.localeCompare(a.month));
  }, [vendors, bills, payments]);

  const filteredSummary = useMemo(() => {
    return summary.filter(row => {
      if (selectedMonth !== "all" && row.month !== selectedMonth) return false;
      if (selectedVendorId !== "all" && row.vendorId !== selectedVendorId) return false;
      if (selectedSiteId !== "all" && !row.siteIds.includes(selectedSiteId)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!row.vendorName.toLowerCase().includes(q) && !row.monthLabel.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [summary, selectedMonth, selectedVendorId, selectedSiteId, searchQuery]);

  const totals = useMemo(() => {
    return filteredSummary.reduce((acc, row) => ({
      totalPurchase: acc.totalPurchase + row.totalPurchase,
      paidAmount: acc.paidAmount + row.paidAmount,
      pendingAmount: acc.pendingAmount + row.pendingAmount,
    }), { totalPurchase: 0, paidAmount: 0, pendingAmount: 0 });
  }, [filteredSummary]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendor Payment Summary</h1>
            <p className="text-sm text-muted-foreground">Track monthly vendor-wise payments and outstanding amounts.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-[200px]">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger data-testid="select-filter-month">
                  <SelectValue placeholder="Filter by Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map(m => (
                    <SelectItem key={m} value={m}>{getMonthLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger data-testid="select-filter-vendor">
                  <SelectValue placeholder="Filter by Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger data-testid="select-filter-site">
                  <SelectValue placeholder="Filter by Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.siteName || s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Purchase</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="text-total-purchase">{formatCurrency(totals.totalPurchase)}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Paid Amount</p>
              <p className="text-2xl font-bold text-emerald-600" data-testid="text-paid-amount">{formatCurrency(totals.paidAmount)}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className="text-2xl font-bold text-red-600" data-testid="text-pending-amount">{formatCurrency(totals.pendingAmount)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total Purchase</TableHead>
                  <TableHead className="text-right">Paid Amount</TableHead>
                  <TableHead className="text-right">Pending Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummary.map((row, idx) => (
                  <TableRow key={`${row.vendorId}-${row.month}`} data-testid={`row-vendor-payment-${idx}`}>
                    <TableCell className="font-medium" data-testid={`text-vendor-${idx}`}>{row.vendorName}</TableCell>
                    <TableCell data-testid={`text-month-${idx}`}>{row.monthLabel}</TableCell>
                    <TableCell className="text-right font-medium" data-testid={`text-purchase-${idx}`}>{formatCurrency(row.totalPurchase)}</TableCell>
                    <TableCell className="text-right text-emerald-600" data-testid={`text-paid-${idx}`}>{formatCurrency(row.paidAmount)}</TableCell>
                    <TableCell className={`text-right ${row.pendingAmount > 0 ? 'text-red-600 font-semibold' : ''}`} data-testid={`text-pending-${idx}`}>
                      {formatCurrency(row.pendingAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          row.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          row.status === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }
                        data-testid={`badge-status-${idx}`}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No vendor payment data found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
