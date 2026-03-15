import { AppLayout } from "@/components/layout/AppLayout";
import { BRAND } from "@/config/brand";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';

export default function Reports() {
  const { pos, vendors, bills, payments, sites, materials, grns } = useStore();

  const totalPOAmount = pos.reduce((sum, po) => sum + po.totalAmount, 0);
  const totalBilled = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
  const totalOutstanding = totalBilled - totalPaid;

  const vendorSpend = pos.reduce((acc: any, po) => {
    const vName = vendors.find(v => v.id.toString() === po.vendorId)?.name || 'Unknown';
    if (!acc[vName]) acc[vName] = 0;
    acc[vName] += po.totalAmount;
    return acc;
  }, {});

  const vendorChartData = Object.keys(vendorSpend).map(key => ({ name: key, amount: vendorSpend[key] }));

  const COLORS = ['var(--color-primary)', 'color-mix(in oklab, var(--color-primary) 85%, white)', 'color-mix(in oklab, var(--color-primary) 70%, white)', 'color-mix(in oklab, var(--color-primary) 55%, white)', 'color-mix(in oklab, var(--color-primary) 40%, white)'];

  const overviewData = [
    { name: 'Total POs', value: totalPOAmount },
    { name: 'Total Billed', value: totalBilled },
    { name: 'Total Paid', value: totalPaid },
    { name: 'Outstanding', value: totalOutstanding }
  ];

  const handleExportVendorSpend = () => {
    const ws = XLSX.utils.json_to_sheet(vendorChartData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Spend");
    XLSX.writeFile(wb, "vendor_spend_report.xlsx");
  };

  const handleExportAllData = () => {
    const wb = XLSX.utils.book_new();
    
    const sitesExport = sites.length > 0 ? sites.map(s => ({
        ID: s.id, Name: s.siteName || s.name, Location: s.location, Status: s.status
    })) : [{ ID: 'No Data' }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sitesExport), "Sites");

    const vendorsExport = vendors.length > 0 ? vendors.map(v => ({
        ID: v.id, Name: v.name, Contact: v.contactPerson, Phone: v.phone
    })) : [{ ID: 'No Data' }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendorsExport), "Vendors");

    const materialsExport = materials.length > 0 ? materials.map(m => ({
        ID: m.id, Name: m.name, Category: m.category, Unit: m.unit, DefaultRate: m.defaultRate
    })) : [{ ID: 'No Data' }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(materialsExport), "Materials");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewData), "Summary");
    
    const siteCostingMap = new Map();
    sites.forEach(s => {
        siteCostingMap.set(s.id.toString(), { Name: s.siteName || s.name, Total_PO: 0, Total_Billed: 0, Total_Paid: 0 });
    });
    pos.forEach(p => { if(p.siteId && siteCostingMap.has(p.siteId)) siteCostingMap.get(p.siteId).Total_PO += p.totalAmount; });
    bills.forEach(b => { if(b.siteId && siteCostingMap.has(b.siteId)) siteCostingMap.get(b.siteId).Total_Billed += b.amount; });
    payments.forEach(pay => {
        const b = bills.find(b => b.displayId === pay.billId);
        if (b && b.siteId && siteCostingMap.has(b.siteId)) siteCostingMap.get(b.siteId).Total_Paid += pay.amount;
    });
    const siteCostingExport = Array.from(siteCostingMap.values()).map(data => ({
        Site: data.Name,
        'Total PO Amount': data.Total_PO,
        'Total Billed': data.Total_Billed,
        'Total Paid': data.Total_Paid,
        'Outstanding Balance': data.Total_Billed - data.Total_Paid
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(siteCostingExport.length ? siteCostingExport : [{Site: 'No Data'}]), "Site-wise Costing");

    const vendorCostingMap = new Map();
    vendors.forEach(v => {
        vendorCostingMap.set(v.id.toString(), { Name: v.name, Total_PO: 0, Total_Billed: 0, Total_Paid: 0 });
    });
    pos.forEach(p => { if(vendorCostingMap.has(p.vendorId)) vendorCostingMap.get(p.vendorId).Total_PO += p.totalAmount; });
    bills.forEach(b => { if(vendorCostingMap.has(b.vendorId)) vendorCostingMap.get(b.vendorId).Total_Billed += b.amount; });
    payments.forEach(pay => {
        const b = bills.find(b => b.displayId === pay.billId);
        if (b && vendorCostingMap.has(b.vendorId)) vendorCostingMap.get(b.vendorId).Total_Paid += pay.amount;
    });
    const vendorCostingExport = Array.from(vendorCostingMap.values()).map(data => ({
        Vendor: data.Name,
        'Total PO Amount': data.Total_PO,
        'Total Billed': data.Total_Billed,
        'Total Paid': data.Total_Paid,
        'Outstanding Balance': data.Total_Billed - data.Total_Paid
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendorCostingExport.length ? vendorCostingExport : [{Vendor: 'No Data'}]), "Vendor-wise Costing");

    const posExport = pos.length > 0 ? pos.map(p => ({
        ID: p.displayId,
        Date: p.date,
        Vendor: vendors.find(v => v.id.toString() === p.vendorId)?.name || '',
        Site: sites.find(s => s.id.toString() === p.siteId)?.name || '',
        Items: p.items.length,
        Amount: p.totalAmount,
        Status: p.status
    })) : [{ ID: 'No Data' }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(posExport), "Purchase Orders");

    const grnsExport = grns.length > 0 ? grns.map(g => ({
        ID: g.displayId,
        Date: g.date,
        PO_Reference: g.poId,
        Site: sites.find(s => s.id.toString() === g.siteId)?.name || '',
        Status: g.status
    })) : [{ ID: 'No Data' }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grnsExport), "GRNs");
    
    const billsExport = bills.length > 0 ? bills.map(b => ({
        ID: b.displayId,
        Date: b.date,
        Vendor: vendors.find(v => v.id.toString() === b.vendorId)?.name || '',
        Site: sites.find(s => s.id.toString() === b.siteId)?.name || '',
        Amount: b.amount,
        Status: b.status,
        DueDate: b.dueDate
    })) : [{ ID: 'No Data' }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(billsExport), "Bills");

    const paymentsExport = payments.length > 0 ? payments.map(p => ({
        ID: p.displayId,
        Date: p.date,
        Bill_Reference: p.billId,
        Mode: p.mode,
        Reference: p.reference,
        Amount: p.amount
    })) : [{ ID: 'No Data' }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsExport), "Payments");

    XLSX.writeFile(wb, `${BRAND.shortName}_Master_Report.xlsx`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">High-level summary of your procurement lifecycle.</p>
          </div>
          <Button variant="outline" onClick={handleExportAllData} data-testid="button-export-report">
              <Download className="w-4 h-4 mr-2" />
              Export Master Report (Excel)
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Lifecycle Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overviewData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `₹${v/1000}k`} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Vendor Spend Distribution</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleExportVendorSpend}><Download className="w-4 h-4"/></Button>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vendorChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="var(--color-primary)"
                      dataKey="amount"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {vendorChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
