import { AppLayout } from "@/components/layout/AppLayout";
import { ERPHeader } from "@/components/ERPHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function PaymentCreate() {
  const { vendors, bills, addPayment } = useStore();
  const [, setLocation] = useLocation();
  const formRef = useRef<HTMLFormElement>(null);

  const [vendorId, setVendorId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [manualAdjustments, setManualAdjustments] = useState<Record<number, string>>({});

  const vendorBills = useMemo(
    () => bills
      .filter((bill) => bill.vendorId === vendorId)
      .filter((bill) => {
        const billAmount = Number(bill.amount || 0);
        const paidAmount = Number(bill.paidAmount || 0);
        return billAmount - paidAmount > 0;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id),
    [bills, vendorId],
  );

  const { data: outstandingData } = useQuery({
    queryKey: ["vendorOutstanding", vendorId],
    queryFn: () => api.getVendorOutstanding(vendorId),
    enabled: Boolean(vendorId),
  });

  const totalOutstanding = Number(outstandingData?.outstanding || 0);
  const paymentAmount = Number(amount || 0);

  const manualTotal = useMemo(
    () => Object.values(manualAdjustments).reduce((sum, value) => sum + Number(value || 0), 0),
    [manualAdjustments],
  );
  const manualOverAllocated = manualTotal > paymentAmount;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!vendorId || paymentAmount <= 0) return;
    if (manualMode && manualOverAllocated) return;

    const payload: Record<string, unknown> = {
      vendorId,
      paymentDate,
      amount: paymentAmount,
      notes,
    };

    if (manualMode) {
      const adjustments = vendorBills
        .map((bill) => ({
          billId: bill.id,
          adjustedAmount: Math.max(0, Math.min(Number(manualAdjustments[bill.id] || 0), Math.max(Number(bill.amount || 0) - Number(bill.paidAmount || 0), 0))),
        }))
        .filter((entry) => entry.adjustedAmount > 0);
      if (adjustments.length > 0) {
        payload.adjustments = adjustments;
      }
    }

    await addPayment(payload);
    setLocation("/payments");
  };

  return (
    <AppLayout>
      <form ref={formRef} onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-24 pt-4 lg:px-6">
        <ERPHeader
          title="Vendor Payment"
          subtitle="Auto-adjust payment against oldest unpaid bills"
          onCancel={() => setLocation("/payments")}
          onSave={() => formRef.current?.requestSubmit()}
          saveDisabled={!vendorId || paymentAmount <= 0 || (manualMode && (manualTotal <= 0 || manualOverAllocated))}
        />

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Entry</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>{vendors.map((vendor) => <SelectItem key={vendor.id} value={vendor.id.toString()}>{vendor.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Payment Date</Label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Payment Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
            <div className="space-y-2"><Label>Total Outstanding</Label><Input readOnly value={money(totalOutstanding)} /></div>
            <div className="space-y-2 md:col-span-2 lg:col-span-4">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Narration / bank remarks" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Unpaid Bills</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant={manualMode ? "secondary" : "outline"} onClick={() => setManualMode(!manualMode)}>
                {manualMode ? "Use Auto" : "Manual Adjustment"}
              </Button>
              <Button type="submit">Auto Adjust Payment</Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {manualMode && manualOverAllocated && (
              <p className="mb-3 text-sm text-destructive">
                Manual adjusted total cannot be greater than payment amount.
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Bill Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  {manualMode && <TableHead className="text-right">Manual Adjust</TableHead>}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorBills.map((bill) => {
                  const billAmount = Number(bill.amount || 0);
                  const paid = Number(bill.paidAmount || 0);
                  const balance = Math.max(billAmount - paid, 0);
                  return (
                    <TableRow key={bill.id}>
                      <TableCell>{bill.displayId}</TableCell>
                      <TableCell>{bill.date}</TableCell>
                      <TableCell className="text-right">{money(billAmount)}</TableCell>
                      <TableCell className="text-right">{money(paid)}</TableCell>
                      <TableCell className="text-right">{money(balance)}</TableCell>
                      {manualMode && (
                        <TableCell className="text-right">
                          <Input
                            className="ml-auto h-8 w-32 text-right"
                            type="number"
                            step="0.01"
                            max={balance}
                            value={manualAdjustments[bill.id] || ""}
                            onChange={(e) => setManualAdjustments((prev) => ({ ...prev, [bill.id]: e.target.value }))}
                          />
                        </TableCell>
                      )}
                      <TableCell>{bill.status}</TableCell>
                    </TableRow>
                  );
                })}
                {!vendorBills.length && (
                  <TableRow><TableCell colSpan={manualMode ? 7 : 6} className="text-center text-muted-foreground">Select a vendor to view unpaid bills.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </form>
    </AppLayout>
  );
}
