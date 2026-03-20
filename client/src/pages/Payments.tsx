import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Payments() {
  const [, setLocation] = useLocation();
  const { payments, bills, vendors, sites, grns, pos, materials, addPayment, updatePayment, deletePayment, searchQuery } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingPaymentId, setViewingPaymentId] = useState<number | null>(null);

  const [selectedBillDisplayId, setSelectedBillDisplayId] = useState('');
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], mode: 'Bank Transfer', reference: '' });
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openBillId = urlParams.get('open');
    
    if (window.location.hash === '#new' || openBillId) {
      setOpen(true);
      if (openBillId) setSelectedBillDisplayId(openBillId);
      
      const newUrl = window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, []);

  const unpaidBills = bills.filter(b => b.status === 'Unpaid' || b.status === 'Partial');
  const billDetails = bills.find(b => b.displayId === selectedBillDisplayId);
  
  const filteredPayments = payments.filter(p => 
    p.displayId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.billId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.reference && p.reference.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenEdit = (p: any) => {
      setSelectedBillDisplayId(p.billId);
      setFormData({ date: p.date, mode: p.mode || 'Bank Transfer', reference: p.reference || '' });
      setEditingId(p.id);
      setOpen(true);
  }

  const viewingPayment = payments.find(p => p.id === viewingPaymentId);
  const viewingBill = bills.find(b => b.displayId === viewingPayment?.billId);
  const viewingVendor = vendors.find(v => v.id.toString() === viewingBill?.vendorId);
  const viewingSite = sites.find(s => s.id.toString() === viewingBill?.siteId);
  const viewingGrn = grns.find(g => g.displayId === viewingBill?.grnId);
  const viewingPo = pos.find(p => p.displayId === viewingBill?.poId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billDetails) return;

    if (editingId) {
        updatePayment(editingId, {
            date: formData.date,
            mode: formData.mode,
            reference: formData.reference
        });
    } else {
        addPayment({
          billId: billDetails.displayId,
          siteId: billDetails.siteId,
          date: formData.date,
          amount: billDetails.amount, 
          mode: formData.mode,
          reference: formData.reference
        });
    }
    
    setOpen(false);
    setEditingId(null);
    setSelectedBillDisplayId('');
    setFormData({ date: new Date().toISOString().split('T')[0], mode: 'Bank Transfer', reference: '' });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
            <p className="text-sm text-muted-foreground">Record and track payments made against vendor bills.</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if(!isOpen) {
                  setEditingId(null);
                  setSelectedBillDisplayId('');
                  setFormData({ date: new Date().toISOString().split('T')[0], mode: 'Bank Transfer', reference: '' });
              }
          }}>
            <Button data-testid="button-log-payment" onClick={() => setLocation("/payments/create")}><Plus className="w-4 h-4 mr-2" /> Log Payment</Button>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Payment' : 'Log Payment'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                <div className="grid gap-2">
                  <Label>Select Bill</Label>
                  <Select required value={selectedBillDisplayId} onValueChange={setSelectedBillDisplayId} disabled={!!editingId}>
                    <SelectTrigger><SelectValue placeholder="Select Bill" /></SelectTrigger>
                    <SelectContent>
                      {(editingId ? [billDetails].filter(Boolean) : unpaidBills).map(b => b && (
                        <SelectItem key={b.id} value={b.displayId}>{b.displayId} - ₹{b.amount.toLocaleString()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {billDetails && (
                  <div className="bg-muted p-4 rounded-md mt-2 flex justify-between items-center">
                    <span className="font-medium">Amount to Pay:</span>
                    <span className="text-lg font-bold">₹{billDetails.amount.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                  </div>
                )}

                <div className="grid gap-2">
                    <Label>Payment Date</Label>
                    <Input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>

                <div className="grid gap-2">
                  <Label>Payment Mode (Optional)</Label>
                  <Select value={formData.mode} onValueChange={v => setFormData({...formData, mode: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Reference / Transaction No. (Optional)</Label>
                  <Input value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} />
                </div>

                <Button type="submit" disabled={!selectedBillDisplayId} data-testid="button-save-payment">{editingId ? 'Update' : 'Record'} Payment</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={!!viewingPaymentId} onOpenChange={(isOpen) => !isOpen && setViewingPaymentId(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Payment</DialogTitle>
            </DialogHeader>

            {viewingPayment && viewingBill && (
              <div className="space-y-6">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment</p>
                      <h3 className="text-2xl font-bold tracking-tight">{viewingPayment.displayId}</h3>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Paid</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                    <div><span className="text-muted-foreground">Payment Date:</span><p className="font-medium">{viewingPayment.date}</p></div>
                    <div><span className="text-muted-foreground">Bill Reference:</span><p className="font-medium">{viewingPayment.billId}</p></div>
                    <div><span className="text-muted-foreground">Vendor:</span><p className="font-medium">{viewingVendor?.name || '-'}</p></div>
                    <div><span className="text-muted-foreground">Site:</span><p className="font-medium">{viewingSite?.siteName || viewingSite?.name || '-'}</p></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4 text-sm space-y-2">
                    <h3 className="font-semibold">Payment Details</h3>
                    <div><span className="text-muted-foreground">Amount:</span><p className="font-medium">₹{Number(viewingPayment.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
                    <div><span className="text-muted-foreground">Payment Mode:</span><p className="font-medium">{viewingPayment.mode || '-'}</p></div>
                    <div><span className="text-muted-foreground">Transaction Reference:</span><p className="font-medium">{viewingPayment.reference || '-'}</p></div>
                    <div><span className="text-muted-foreground">Bill Reference:</span><p className="font-medium">{viewingPayment.billId}</p></div>
                  </div>
                  <div className="rounded-lg border p-4 text-sm space-y-2">
                    <h3 className="font-semibold">Bill Details</h3>
                    <div><span className="text-muted-foreground">PO Reference:</span><p className="font-medium">{viewingBill.poId || '-'}</p></div>
                    <div><span className="text-muted-foreground">GRN Reference:</span><p className="font-medium">{viewingBill.grnId || '-'}</p></div>
                    <div><span className="text-muted-foreground">Vendor Name:</span><p className="font-medium">{viewingVendor?.name || '-'}</p></div>
                    <div><span className="text-muted-foreground">Site Name:</span><p className="font-medium">{viewingSite?.siteName || viewingSite?.name || '-'}</p></div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold">Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingGrn?.items.map((grnItem, idx) => {
                        const poItem = viewingPo?.items.find(i => i.materialId === grnItem.materialId);
                        const lineAmount = Number(grnItem.receivedQty || 0) * Number(poItem?.rate || 0);
                        return (
                          <TableRow key={`${grnItem.materialId}-${idx}`}>
                            <TableCell>{materials.find(m => m.id.toString() === grnItem.materialId)?.name || '-'}</TableCell>
                            <TableCell className="text-right">{grnItem.receivedQty}</TableCell>
                            <TableCell className="text-right">₹{Number(poItem?.rate || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">₹{lineAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="space-y-1 text-sm rounded-md bg-muted/30 p-3 md:w-2/3 ml-auto">
                    <div className="flex justify-between"><span>Charges:</span><span>₹{(Number(viewingBill.actualCartage || 0) + Number(viewingBill.loadingAmount || 0) + Number(viewingBill.otherCharges || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>GST:</span><span>₹{Number(viewingBill.gstAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between font-semibold border-t pt-2"><span>Total:</span><span>₹{Number(viewingPayment.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => { setViewingPaymentId(null); handleOpenEdit(viewingPayment); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => setViewingPaymentId(null)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
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
                  <TableHead>Bill Ref</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((pay) => {
                  const bill = bills.find(b => b.displayId === pay.billId);
                  const vendor = vendors.find(v => v.id.toString() === bill?.vendorId);
                  const isLocked = bill?.status === 'Paid' || bill?.status === 'Finalized';
                  return (
                    <TableRow key={pay.id} data-testid={`row-payment-${pay.id}`}>
                      <TableCell className="font-medium text-primary">{pay.displayId}</TableCell>
                      <TableCell>{pay.date}</TableCell>
                      <TableCell className="text-muted-foreground">{pay.billId}</TableCell>
                      <TableCell>{vendor?.name}</TableCell>
                      <TableCell>{pay.mode}</TableCell>
                      <TableCell>{pay.reference || '-'}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">₹{pay.amount.toLocaleString(undefined, {maximumFractionDigits:2})}</TableCell>
                      <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setViewingPaymentId(pay.id)}>
                                  <Eye className="w-4 h-4" />
                              </Button>
                              {isLocked ? (
                                <span className="text-xs text-muted-foreground">Locked</span>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(pay)}>
                                      <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deletePayment(pay.id)}>
                                      <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                          </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
