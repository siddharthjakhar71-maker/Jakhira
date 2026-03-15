import { AppLayout } from "@/components/layout/AppLayout";
import { ERPHeader } from "@/components/ERPHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

const round2 = (value: number) => Math.round(value * 100) / 100;

export default function BillCreate() {
  const { grns, pos, vendors, sites, addBill } = useStore();
  const [, setLocation] = useLocation();

  const [selectedGrnDisplayId, setSelectedGrnDisplayId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [withGst, setWithGst] = useState(true);
  const [applyRoundOff, setApplyRoundOff] = useState(false);
  const [actualCartage, setActualCartage] = useState("0");
  const [loadingAmount, setLoadingAmount] = useState("0");
  const [otherCharges, setOtherCharges] = useState("0");

  const unbilledGrns = useMemo(() => grns.filter((g) => g.status === "Pending Bill"), [grns]);
  const grnDetails = grns.find((g) => g.displayId === selectedGrnDisplayId);
  const poDetails = grnDetails ? pos.find((p) => p.displayId === grnDetails.poId) : null;
  const vendor = vendors.find((v) => v.id.toString() === poDetails?.vendorId);
  const site = sites.find((s) => s.id.toString() === poDetails?.siteId);

  const getMaterialAmount = () => {
    if (!grnDetails || !poDetails) return 0;
    return grnDetails.items.reduce((sum, grnItem) => {
      const poItem = poDetails.items.find((i) => i.materialId === grnItem.materialId);
      return sum + grnItem.receivedQty * (poItem?.rate || 0);
    }, 0);
  };

  const getPoTaxRate = () => {
    if (!poDetails?.items.length) return 0;
    const base = poDetails.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0);
    if (base <= 0) return 0;
    const weightedTax = poDetails.items.reduce((sum, item) => {
      const lineBase = Number(item.qty || 0) * Number(item.rate || 0);
      return sum + lineBase * (Number(item.taxPercent || 0) / 100);
    }, 0);
    return (weightedTax / base) * 100;
  };

  const mat = getMaterialAmount();
  const cartage = Number(actualCartage) || 0;
  const loading = Number(loadingAmount) || 0;
  const other = Number(otherCharges) || 0;
  const subTotal = mat + cartage + loading + other;
  const gstAmount = withGst ? subTotal * (getPoTaxRate() / 100) : 0;
  const rawGrand = subTotal + gstAmount;
  const grandTotal = applyRoundOff ? Math.round(rawGrand) : rawGrand;
  const roundOffAmount = round2(grandTotal - rawGrand);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnDetails || !poDetails) return;

    await addBill({
      grnId: grnDetails.displayId,
      poId: poDetails.displayId,
      vendorId: poDetails.vendorId,
      siteId: poDetails.siteId,
      date: billDate,
      dueDate,
      amount: grandTotal,
      materialAmount: mat,
      actualCartage: cartage,
      loadingAmount: loading,
      otherCharges: other,
      subTotal,
      gstAmount,
      vendorInvoiceNo: vendorInvoiceNo.trim(),
    });

    setLocation("/bills");
  };

  return (
    <AppLayout>
      <form ref={formRef} onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-28 pt-4 lg:px-6">
        <ERPHeader
          title="Create Bill"
          subtitle="Bill No: Auto-generated on save"
          onCancel={() => setLocation('/bills')}
          onSave={() => formRef.current?.requestSubmit()}
          saveDisabled={!selectedGrnDisplayId}
        >
          <div className="min-w-[200px] flex-1"><Label>Vendor Invoice No</Label><Input className="h-11" value={vendorInvoiceNo} onChange={(e) => setVendorInvoiceNo(e.target.value)} /></div>
          <div className="min-w-[150px]"><Label>Date</Label><Input type="date" className="h-11" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
          <div className="min-w-[180px] flex-1"><Label>Vendor</Label><Input className="h-11" readOnly value={vendor?.name || "-"} /></div>
          <div className="min-w-[160px] flex-1"><Label>Site</Label><Input className="h-11" readOnly value={site?.siteName || site?.name || "-"} /></div>
          <div className="min-w-[200px] flex-1"><Label>GRN Reference</Label><Select required value={selectedGrnDisplayId} onValueChange={setSelectedGrnDisplayId}><SelectTrigger className="h-11"><SelectValue placeholder="Select GRN" /></SelectTrigger><SelectContent>{unbilledGrns.map((grn) => <SelectItem key={grn.id} value={grn.displayId}>{grn.displayId}</SelectItem>)}</SelectContent></Select></div>
          <div className="min-w-[130px]"><Label>Status</Label><div className="h-11 flex items-center"><Badge variant="outline" className="bg-destructive/10 text-destructive">Unpaid</Badge></div></div>
        </ERPHeader>

        <Card className="bg-muted/30">
          <CardHeader><CardTitle className="text-base">Charges</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><Label>Material Amount</Label><Input className="h-11" readOnly value={mat.toFixed(2)} /></div>
            <div><Label>Cartage</Label><Input type="number" step="0.01" className="h-11" value={actualCartage} onChange={(e) => setActualCartage(e.target.value)} /></div>
            <div><Label>Loading</Label><Input type="number" step="0.01" className="h-11" value={loadingAmount} onChange={(e) => setLoadingAmount(e.target.value)} /></div>
            <div><Label>Other Charges</Label><Input type="number" step="0.01" className="h-11" value={otherCharges} onChange={(e) => setOtherCharges(e.target.value)} /></div>
            <div><Label>Due Date</Label><Input type="date" className="h-11" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div><Label>GST</Label><div className="h-11 flex items-center gap-2"><Checkbox checked={withGst} onCheckedChange={(v) => setWithGst(v === true)} /><span className="text-sm">Apply GST ({getPoTaxRate().toFixed(2)}%)</span></div></div>
            <div><Label>Round Off</Label><div className="h-11 flex items-center gap-2"><Checkbox checked={applyRoundOff} onCheckedChange={(v) => setApplyRoundOff(v === true)} /><span className="text-sm">Apply round off</span></div></div>
          </CardContent>
        </Card>

        <Card className="sticky bottom-3 z-20 border-2 bg-background/95 backdrop-blur">
          <CardContent className="p-4">
            <div className="ml-auto max-w-md space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>Additional Charges</span><span>₹{(cartage + loading + other).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>GST</span><span>₹{gstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              {applyRoundOff && <div className="flex justify-between"><span>Round Off</span><span>{roundOffAmount >= 0 ? "+" : ""}{roundOffAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Grand Total</span><span>₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
            </div>
          </CardContent>
        </Card>
      </form>
    </AppLayout>
  );
}
