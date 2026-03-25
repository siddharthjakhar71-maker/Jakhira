import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function RateComparison() {
  const { vendors, materials, vendorMaterialRates, sites, addPO } = useStore();
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertVendorId, setConvertVendorId] = useState<string>("");
  const [convertSiteId, setConvertSiteId] = useState<string>("");

  const toggleVendor = (id: string) => {
    setSelectedVendorIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const comparisonData = useMemo(() => {
    if (selectedVendorIds.length < 2 || selectedMaterialIds.length === 0) return [];
    return selectedMaterialIds.map(matId => {
      const material = materials.find(m => m.id.toString() === matId);
      const vendorRates: Record<string, number | null> = {};
      let lowestRate = Infinity;
      selectedVendorIds.forEach(vId => {
        const rateEntry = vendorMaterialRates.find(r => r.vendorId === vId && r.materialId === matId);
        const rate = rateEntry ? rateEntry.rate : null;
        vendorRates[vId] = rate;
        if (rate !== null && rate < lowestRate) lowestRate = rate;
      });
      return { materialId: matId, materialName: material?.name || 'Unknown', unit: material?.unit || '', vendorRates, lowestRate: lowestRate === Infinity ? null : lowestRate };
    });
  }, [selectedVendorIds, selectedMaterialIds, vendorMaterialRates, materials]);

  const handleExportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const headers = ['Material', 'Unit', ...selectedVendorIds.map(vId => vendors.find(v => v.id.toString() === vId)?.name || 'Unknown'), 'Lowest Rate'];
    const rows = comparisonData.map(row => {
      const cols: any[] = [row.materialName, row.unit];
      selectedVendorIds.forEach(vId => {
        cols.push(row.vendorRates[vId] ?? '-');
      });
      cols.push(row.lowestRate ?? '-');
      return cols;
    });
    const ws = utils.aoa_to_sheet([headers, ...rows]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Rate Comparison');
    writeFile(wb, 'rate-comparison.xlsx');
  };

  const handleConvertToPO = () => {
    if (!convertVendorId) return;
    const items = comparisonData
      .filter(row => row.vendorRates[convertVendorId] !== null)
      .map(row => ({
        materialId: row.materialId,
        qty: 1,
        rate: row.vendorRates[convertVendorId]!,
        amount: row.vendorRates[convertVendorId]!,
        taxPercent: 0,
      }));
    if (items.length === 0) return;
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    addPO({
      vendorId: convertVendorId,
      siteId: convertSiteId,
      date: new Date().toISOString().split('T')[0],
      expectedDelivery: '',
      items,
      totalAmount,
      billingName: '',
    });
    setConvertDialogOpen(false);
    setConvertVendorId("");
    setConvertSiteId("");
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Rate Comparison</h1>
          <p className="text-sm text-muted-foreground">Compare material rates across vendors side by side.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Vendors (min 2)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {vendors.map(v => (
                  <label key={v.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md">
                    <Checkbox
                      checked={selectedVendorIds.includes(v.id.toString())}
                      onCheckedChange={() => toggleVendor(v.id.toString())}
                      data-testid={`checkbox-vendor-${v.id}`}
                    />
                    <span className="text-sm">{v.name}</span>
                  </label>
                ))}
                {vendors.length === 0 && <p className="text-sm text-muted-foreground">No vendors found.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {materials.map(m => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md">
                    <Checkbox
                      checked={selectedMaterialIds.includes(m.id.toString())}
                      onCheckedChange={() => toggleMaterial(m.id.toString())}
                      data-testid={`checkbox-material-${m.id}`}
                    />
                    <span className="text-sm">{m.name}</span>
                    {m.unit && <span className="text-xs text-muted-foreground">({m.unit})</span>}
                  </label>
                ))}
                {materials.length === 0 && <p className="text-sm text-muted-foreground">No materials found.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {comparisonData.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Comparison Results</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportExcel} data-testid="button-export-excel">
                  <Download className="w-4 h-4 mr-1" /> Export Excel
                </Button>
                <Button size="sm" onClick={() => setConvertDialogOpen(true)} data-testid="button-convert-po">
                  <ShoppingCart className="w-4 h-4 mr-1" /> Convert to PO
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Unit</TableHead>
                    {selectedVendorIds.map(vId => {
                      const vendor = vendors.find(v => v.id.toString() === vId);
                      return <TableHead key={vId} className="text-right">{vendor?.name || 'Unknown'}</TableHead>;
                    })}
                    <TableHead className="text-right">Lowest Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map(row => (
                    <TableRow key={row.materialId} data-testid={`row-comparison-${row.materialId}`}>
                      <TableCell className="font-medium">{row.materialName}</TableCell>
                      <TableCell className="text-muted-foreground">{row.unit}</TableCell>
                      {selectedVendorIds.map(vId => {
                        const rate = row.vendorRates[vId];
                        const isLowest = rate !== null && rate === row.lowestRate;
                        return (
                          <TableCell
                            key={vId}
                            className={`text-right font-medium ${isLowest ? 'bg-emerald-50 text-emerald-700' : ''}`}
                            data-testid={`text-rate-${row.materialId}-${vId}`}
                          >
                            {rate !== null ? formatCurrency(rate) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold text-emerald-600">
                        {row.lowestRate !== null ? formatCurrency(row.lowestRate) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {selectedVendorIds.length > 0 && selectedMaterialIds.length > 0 && comparisonData.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No rate data found for the selected vendors and materials. Please add vendor rates first in the Vendor Rate List page.
            </CardContent>
          </Card>
        )}

        {(selectedVendorIds.length < 2 || selectedMaterialIds.length === 0) && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {selectedVendorIds.length < 2 ? 'Please select at least 2 vendors to compare.' : 'Please select at least 1 material to compare.'}
            </CardContent>
          </Card>
        )}

        <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert to Purchase Order</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Select Vendor</label>
                <SearchableSelect options={vendors.filter((vendor) => selectedVendorIds.includes(vendor.id.toString()))} value={convertVendorId} onSelect={(val) => setConvertVendorId(val)} placeholder="Choose vendor" getOptionLabel={(vendor) => vendor.name} getOptionValue={(vendor) => vendor.id.toString()} getOptionDescription={(vendor) => vendor.address || null} data-testid="select-convert-vendor" noResultsText="No matching vendors" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Select Site</label>
                <SearchableSelect options={sites} value={convertSiteId} onSelect={(val) => setConvertSiteId(val)} placeholder="Choose site" getOptionLabel={(site) => site.siteName || site.name} getOptionValue={(site) => site.id.toString()} getOptionDescription={(site) => site.status || null} data-testid="select-convert-site" noResultsText="No matching sites" />
              </div>
              <Button onClick={handleConvertToPO} disabled={!convertVendorId} data-testid="button-confirm-convert">
                Create Purchase Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
