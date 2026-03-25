import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const money = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function Payments() {
  const [, setLocation] = useLocation();
  const { payments, vendors, deletePayment, searchQuery } = useStore();
  const [viewingPaymentId, setViewingPaymentId] = useState<number | null>(null);

  const vendorById = useMemo(
    () => new Map(vendors.map((vendor) => [String(vendor.id), vendor.name])),
    [vendors],
  );

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return payments;

    return payments.filter((payment: any) => {
      const refs = Array.isArray(payment.billRefs) ? payment.billRefs.join(", ").toLowerCase() : "";
      const vendorName = vendorById.get(String(payment.vendorId))?.toLowerCase() || "";
      return (
        String(payment.displayId || "").toLowerCase().includes(q) ||
        String(payment.reference || "").toLowerCase().includes(q) ||
        refs.includes(q) ||
        vendorName.includes(q)
      );
    });
  }, [payments, searchQuery, vendorById]);

  const viewingPayment = payments.find((payment) => payment.id === viewingPaymentId) as any;

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Delete this payment? This will reverse all linked bill adjustments.");
    if (!confirmed) return;
    await deletePayment(id);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
            <p className="text-sm text-muted-foreground">Track vendor-wise payments and linked bill adjustments.</p>
          </div>
          <Button data-testid="button-log-payment" onClick={() => setLocation("/payments/create")}><Plus className="w-4 h-4 mr-2" /> Log Payment</Button>
        </div>

        <Dialog open={!!viewingPaymentId} onOpenChange={(isOpen) => !isOpen && setViewingPaymentId(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
            </DialogHeader>

            {viewingPayment && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><span className="text-muted-foreground">Payment ID:</span><p className="font-medium">{viewingPayment.displayId || `PAY-${viewingPayment.id}`}</p></div>
                  <div><span className="text-muted-foreground">Payment Date:</span><p className="font-medium">{viewingPayment.paymentDate || viewingPayment.date || "-"}</p></div>
                  <div><span className="text-muted-foreground">Vendor:</span><p className="font-medium">{vendorById.get(String(viewingPayment.vendorId)) || "-"}</p></div>
                  <div><span className="text-muted-foreground">Amount:</span><p className="font-medium">{money(Number(viewingPayment.amount || 0))}</p></div>
                  <div><span className="text-muted-foreground">Mode:</span><p className="font-medium">{viewingPayment.mode || "-"}</p></div>
                  <div><span className="text-muted-foreground">Reference:</span><p className="font-medium">{viewingPayment.reference || "-"}</p></div>
                </div>

                <div>
                  <p className="mb-2 font-medium">Adjusted Bills</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill</TableHead>
                        <TableHead className="text-right">Adjusted Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(Array.isArray(viewingPayment.adjustments) ? viewingPayment.adjustments : []).map((adjustment: any, index: number) => (
                        <TableRow key={`${viewingPayment.id}-adj-${index}`}>
                          <TableCell>{adjustment.billDisplayId || `#${adjustment.billId}`}</TableCell>
                          <TableCell className="text-right">{money(Number(adjustment.adjustedAmount || 0))}</TableCell>
                        </TableRow>
                      ))}
                      {(!Array.isArray(viewingPayment.adjustments) || viewingPayment.adjustments.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">No adjustment records found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Bill Ref(s)</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment: any) => (
                  <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                    <TableCell className="font-medium text-primary">{payment.displayId || `PAY-${payment.id}`}</TableCell>
                    <TableCell>{payment.paymentDate || payment.date}</TableCell>
                    <TableCell>{vendorById.get(String(payment.vendorId)) || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{Array.isArray(payment.billRefs) && payment.billRefs.length ? payment.billRefs.join(", ") : "-"}</TableCell>
                    <TableCell>{payment.mode || "-"}</TableCell>
                    <TableCell>{payment.reference || '-'}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">{money(Number(payment.amount || 0))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setViewingPaymentId(payment.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void handleDelete(payment.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No payments recorded yet.</TableCell>
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
