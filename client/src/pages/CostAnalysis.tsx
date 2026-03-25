import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, CostAnalysisResponse, type CostAnalysisFilters } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

const money = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function AnalysisTable({ title, entityLabel, rows }: { title: string; entityLabel: string; rows: { id: string; name: string; totalAmount: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left p-2">{entityLabel}</th><th className="text-right p-2">Total Amount</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No data found.</td></tr> : rows.map((row) => (
              <tr key={row.id} className="border-b"><td className="p-2 font-medium">{row.name}</td><td className="p-2 text-right font-semibold">{money(row.totalAmount)}</td></tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function CostAnalysis() {
  const { sites, vendors, materials } = useStore();
  const [filters, setFilters] = useState<CostAnalysisFilters>({});

  const { data, isLoading } = useQuery<CostAnalysisResponse>({
    queryKey: ["costAnalysis", filters],
    queryFn: () => api.getCostAnalysis(filters),
  });

  const materialRows = useMemo(() => data?.materialBreakdown || [], [data]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cost Analysis</h1>
          <p className="text-sm text-muted-foreground">Filter and analyze costs by site, vendor, material, and date range.</p>
        </div>

        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Site</Label>
              <Select value={filters.siteId || "all"} onValueChange={(v) => setFilters((p) => ({ ...p, siteId: v === "all" ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="All Sites" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Sites</SelectItem>{sites.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.siteName || s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={filters.vendorId || "all"} onValueChange={(v) => setFilters((p) => ({ ...p, vendorId: v === "all" ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="All Vendors" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Vendors</SelectItem>{vendors.map((v) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Select value={filters.materialId || "all"} onValueChange={(v) => setFilters((p) => ({ ...p, materialId: v === "all" ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="All Materials" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Materials</SelectItem>{materials.map((m) => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={filters.startDate || ""} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value || undefined }))} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={filters.endDate || ""} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value || undefined }))} />
            </div>
          </CardContent>
        </Card>

        {isLoading || !data ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Loading cost analysis...</CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardHeader><CardTitle className="text-base">Material Cost (Pure)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{money(data.totalMaterialCost)}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Total Project Cost</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{money(data.totalProjectCost)}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Total Quantity Purchased</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data.totalQuantityPurchased.toLocaleString("en-IN")}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Average Material Rate</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{money(data.averageMaterialRate)}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Top Vendor by Spend</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{data.topVendorsBySpend[0]?.name || "-"}</CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Material-wise Cost Breakdown</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left p-2">Material</th><th className="text-right p-2">Quantity</th><th className="text-right p-2">Total Cost</th></tr></thead>
                  <tbody>{materialRows.length === 0 ? <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No material data found.</td></tr> : materialRows.map((row) => <tr key={row.materialId} className="border-b"><td className="p-2 font-medium">{row.materialName}</td><td className="p-2 text-right">{row.quantity.toLocaleString("en-IN")}</td><td className="p-2 text-right font-semibold">{money(row.totalCost)}</td></tr>)}</tbody>
                </table>
              </CardContent>
            </Card>

            <AnalysisTable title="Site-wise Cost" entityLabel="Site" rows={data.siteWisePurchaseCost} />
            <AnalysisTable title="Vendor-wise Cost" entityLabel="Vendor" rows={data.vendorSpendAnalysis} />
            <AnalysisTable title="Material-wise Cost" entityLabel="Material" rows={data.topMaterialsBySpend} />
            <AnalysisTable title="Site + Vendor Combined Cost" entityLabel="Combination" rows={data.siteVendorCost.map((r) => ({ id: r.key, name: r.name, totalAmount: r.totalAmount }))} />
            <AnalysisTable title="Vendor + Material Cost" entityLabel="Combination" rows={data.vendorMaterialCost.map((r) => ({ id: r.key, name: r.name, totalAmount: r.totalAmount }))} />
          </>
        )}
      </div>
    </AppLayout>
  );
}
