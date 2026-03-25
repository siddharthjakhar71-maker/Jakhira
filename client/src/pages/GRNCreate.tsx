import { AppLayout } from "@/components/layout/AppLayout";
import { ERPHeader } from "@/components/ERPHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { useStore } from "@/lib/store";
import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

export default function GRNCreate() {
  const { pos, grns, materials, sites, addGRN } = useStore();
  const [, setLocation] = useLocation();
  const [selectedPoDisplayId, setSelectedPoDisplayId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split("T")[0]);
  const [receivedItems, setReceivedItems] = useState<{ materialId: string; qty: string }[]>([]);

  const pendingPOs = useMemo(() => pos.filter((p) => p.status === "Pending" || p.status === "Partial"), [pos]);
  const poDetails = pos.find((p) => p.displayId === selectedPoDisplayId);
  const selectedSite = sites.find((s) => s.id.toString() === poDetails?.siteId);

  const getRemainingQty = (materialId: string) => {
    if (!poDetails) return 0;
    const poItem = poDetails.items.find((i) => i.materialId === materialId);
    if (!poItem) return 0;
    const previouslyReceived = grns
      .filter((g) => g.poId === selectedPoDisplayId)
      .reduce((acc, g) => acc + (g.items.find((i) => i.materialId === materialId)?.receivedQty || 0), 0);
    return poItem.qty - previouslyReceived;
  };

  const onPoChange = (poId: string) => {
    setSelectedPoDisplayId(poId);
    const po = pos.find((p) => p.displayId === poId);
    setReceivedItems(po ? po.items.map((i) => ({ materialId: i.materialId, qty: "" })) : []);
  };

  const totalReceived = receivedItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poDetails) return;

    const items = poDetails.items
      .map((poItem) => {
        const qty = Number(receivedItems.find((i) => i.materialId === poItem.materialId)?.qty || 0);
        return { materialId: poItem.materialId, orderedQty: poItem.qty, receivedQty: qty };
      })
      .filter((i) => i.receivedQty > 0);

    if (!items.length) {
      alert("Please enter a received quantity for at least one item.");
      return;
    }

    await addGRN({ poId: poDetails.displayId, siteId: poDetails.siteId, date: grnDate, items });
    setLocation("/grn");
  };

  return (
    <AppLayout>
      <form ref={formRef} onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-28 pt-4 lg:px-6">
        <ERPHeader
          title="Create GRN"
          subtitle="GRN No: Auto-generated on save"
          onCancel={() => setLocation('/grn')}
          onSave={() => formRef.current?.requestSubmit()}
          saveDisabled={!selectedPoDisplayId}
        >
          <div className="min-w-[160px] flex-1"><Label>Date</Label><Input type="date" className="h-11" value={grnDate} onChange={(e) => setGrnDate(e.target.value)} /></div>
          <div className="min-w-[220px] flex-1"><Label>Site</Label><Input className="h-11" readOnly value={selectedSite?.siteName || selectedSite?.name || "-"} /></div>
          <div className="min-w-[200px] flex-1"><Label>PO Reference</Label><SearchableSelect options={pendingPOs} value={selectedPoDisplayId} onSelect={(val) => onPoChange(val)} placeholder="Select PO" getOptionLabel={(po) => po.displayId} getOptionValue={(po) => po.displayId} getOptionDescription={(po) => sites.find((s) => s.id.toString() === po.siteId)?.siteName || sites.find((s) => s.id.toString() === po.siteId)?.name || null} inputClassName="h-11" noResultsText="No matching purchase orders" /></div>
          <div className="min-w-[140px]"><Label>Status</Label><div className="h-11 flex items-center"><Badge variant="outline" className="bg-amber-50 text-amber-700">Pending Bill</Badge></div></div>
        </ERPHeader>

        <Card>
          <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-[56vh] overflow-auto rounded-md border">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-left">Sr No</th><th className="p-3 text-left">Material Name</th><th className="p-3 text-right">Ordered Qty</th><th className="p-3 text-right">Received Qty</th><th className="p-3 text-right">Balance Qty</th></tr></thead>
                <tbody>
                  {poDetails?.items.map((poItem, idx) => {
                    const material = materials.find((m) => m.id.toString() === poItem.materialId);
                    const balance = getRemainingQty(poItem.materialId);
                    const current = receivedItems.find((i) => i.materialId === poItem.materialId)?.qty || "";
                    return (
                      <tr key={`${poItem.materialId}-${idx}`}>
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{material?.name || poItem.materialId}</td>
                        <td className="p-2 text-right">{poItem.qty}</td>
                        <td className="p-2"><Input type="number" step="0.01" className="h-11 text-right" value={current} onChange={(e) => setReceivedItems((prev) => prev.map((it) => it.materialId === poItem.materialId ? { ...it, qty: e.target.value } : it))} /></td>
                        <td className="p-2 text-right">{Math.max(balance - (Number(current) || 0), 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="sticky bottom-3 z-20 border-2 bg-background/95 backdrop-blur">
          <CardContent className="p-4">
            <div className="ml-auto max-w-md space-y-2 text-sm">
              <div className="flex justify-between"><span>Total Lines</span><span>{poDetails?.items.length || 0}</span></div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total Received Qty</span><span>{totalReceived.toFixed(2)}</span></div>
            </div>
          </CardContent>
        </Card>
      </form>
    </AppLayout>
  );
}
