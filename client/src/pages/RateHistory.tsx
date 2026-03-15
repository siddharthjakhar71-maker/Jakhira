import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useMemo, useState } from "react";

export default function RateHistory() {
  const { rateHistory, materials, vendors, searchQuery } = useStore();
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("all");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");

  const filteredHistory = useMemo(() => {
    return rateHistory
      .filter(entry => {
        const material = materials.find(m => m.id.toString() === entry.materialId);
        const vendor = vendors.find(v => v.id.toString() === entry.vendorId);
        
        const matchesSearch = !searchQuery || 
          material?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          vendor?.name.toLowerCase().includes(searchQuery.toLowerCase());
          
        const matchesMaterial = selectedMaterialId === "all" || entry.materialId === selectedMaterialId;
        const matchesVendor = selectedVendorId === "all" || entry.vendorId === selectedVendorId;
        
        return matchesSearch && matchesMaterial && matchesVendor;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rateHistory, materials, vendors, searchQuery, selectedMaterialId, selectedVendorId]);

  const trendIndicator = useMemo(() => {
    if (selectedMaterialId === "all") return null;
    
    const materialHistory = rateHistory
      .filter(entry => entry.materialId === selectedMaterialId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    if (materialHistory.length < 2) return <Minus className="w-4 h-4 text-muted-foreground" />;
    
    const latest = materialHistory[0].rate;
    const previous = materialHistory[1].rate;
    
    if (latest > previous) return <ArrowUp className="w-4 h-4 text-red-500" />;
    if (latest < previous) return <ArrowDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  }, [rateHistory, selectedMaterialId]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Material Rate History</h1>
              {selectedMaterialId !== "all" && trendIndicator}
            </div>
            <p className="text-sm text-muted-foreground">Track price trends for materials across different vendors.</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="w-[200px]">
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                <SelectTrigger data-testid="select-filter-material">
                  <SelectValue placeholder="Filter by Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {materials.map(m => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
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
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material Name</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Quotation ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((entry) => {
                  const material = materials.find(m => m.id.toString() === entry.materialId);
                  const vendor = vendors.find(v => v.id.toString() === entry.vendorId);
                  
                  return (
                    <TableRow key={entry.id} data-testid={`row-rate-history-${entry.id}`}>
                      <TableCell className="font-medium" data-testid={`text-material-name-${entry.id}`}>
                        {material?.name || "Unknown Material"}
                      </TableCell>
                      <TableCell data-testid={`text-vendor-name-${entry.id}`}>
                        {vendor?.name || "Unknown Vendor"}
                      </TableCell>
                      <TableCell className="font-semibold" data-testid={`text-rate-${entry.id}`}>
                        Rs. {entry.rate.toLocaleString()}
                      </TableCell>
                      <TableCell data-testid={`text-date-${entry.id}`}>
                        {new Date(entry.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell data-testid={`text-po-id-${entry.id}`}>
                        {entry.poDisplayId || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-quotation-id-${entry.id}`}>
                        {entry.quotationDisplayId || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No rate history recorded yet.
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
