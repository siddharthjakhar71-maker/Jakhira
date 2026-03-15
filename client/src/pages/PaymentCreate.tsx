import { AppLayout } from "@/components/layout/AppLayout";
import { ERPHeader } from "@/components/ERPHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

export default function PaymentCreate() {
  const { payments, bills, vendors, sites, addPayment } = useStore();
  const [, setLocation] = useLocation();

  const [selectedBillDisplayId, setSelectedBillDisplayId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({ date: new Date().toISOString().split("T")[0], mode: "Bank Transfer", reference: "", amount: "" });

  const unpaidBills = useMemo(() => bills.filter((b) => b.status === "Unpaid" || b.status === "Partial"), [bills]);
  const billDetails = bills.find((b) => b.displayId === selectedBillDisplayId);
  const vendor = vendors.find((v) => v.id.toString() === billDetails?.vendorId);
  const site = sites.find((s) => s.id.toString() === billDetails?.siteId);

  const paidSoFar = useMemo(() => {
    if (!billDetails) return 0;
    return payments.filter((p) => p.billId === billDetails.displayId).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments, billDetails]);

  const billAmount = Number(billDetails?.amount || 0);
  const remainingBalance = Math.max(billAmount - paidSoFar, 0);
  const currentPayment = Number(formData.amount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billDetails) return;

    await addPayment({
      billId: billDetails.displayId,
      siteId: billDetails.siteId,
      date: formData.date,
      amount: currentPayment || billDetails.amount,
      mode: formData.mode,
      reference: formData.reference,
    });

    setLocation("/payments");
  };

  return (
    <AppLayout>
      <form ref={formRef} onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-28 pt-4 lg:px-6">
        <ERPHeader
          title="Log Payment"
          subtitle="Payment No: Auto-generated on save"
          onCancel={() => setLocation('/payments')}
          onSave={() => formRef.current?.requestSubmit()}
          saveDisabled={!selectedBillDisplayId}
        >
          <div className="min-w-[150px]"><Label>Date</Label><Input type="date" className="h-11" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
          <div className="min-w-[180px] flex-1"><Label>Vendor</Label><Input className="h-11" readOnly value={vendor?.name || "-"} /></div>
          <div className="min-w-[160px] flex-1"><Label>Site</Label><Input className="h-11" readOnly value={site?.siteName || site?.name || "-"} /></div>
          <div className="min-w-[200px] flex-1"><Label>Bill Reference</Label><Select required value={selectedBillDisplayId} onValueChange={setSelectedBillDisplayId}><SelectTrigger className="h-11"><SelectValue placeholder="Select Bill" /></SelectTrigger><SelectContent>{unpaidBills.map((b) => <SelectItem key={b.id} value={b.displayId}>{b.displayId}</SelectItem>)}</SelectContent></Select></div>
          <div className="min-w-[130px]"><Label>Status</Label><div className="h-11 flex items-center"><Badge variant="outline" className="bg-emerald-50 text-emerald-700">Paid</Badge></div></div>
        </ERPHeader>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><Label>Amount</Label><Input type="number" step="0.01" className="h-11" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder={billDetails?.amount?.toFixed(2) || "0.00"} /></div>
            <div><Label>Mode</Label><Select value={formData.mode} onValueChange={(mode) => setFormData({ ...formData, mode })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{["Cash", "Bank Transfer", "Cheque", "UPI", "RTGS", "NEFT"].map((mode) => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Reference No</Label><Input className="h-11" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="Transaction reference" /></div>
          </CardContent>
        </Card>

        <Card className="sticky bottom-3 z-20 border-2 bg-background/95 backdrop-blur">
          <CardContent className="p-4">
            <div className="ml-auto max-w-md space-y-2 text-sm">
              <div className="flex justify-between"><span>Bill Amount</span><span>₹{billAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>Paid So Far</span><span>₹{paidSoFar.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>Remaining Balance</span><span>₹{remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Current Payment</span><span>₹{(currentPayment || billAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
            </div>
          </CardContent>
        </Card>
      </form>
    </AppLayout>
  );
}
