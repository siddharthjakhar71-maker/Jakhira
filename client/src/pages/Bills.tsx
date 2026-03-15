import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function Bills() {
  const [, setLocation] = useLocation();
  const { bills, grns, pos, vendors, sites, materials, addBill, updateBill, deleteBill, searchQuery } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingBillId, setViewingBillId] = useState<number | null>(null);

  const [selectedGrnDisplayId, setSelectedGrnDisplayId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [withGst, setWithGst] = useState(true);
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [actualCartage, setActualCartage] = useState('0');
  const [loadingAmount, setLoadingAmount] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openGrnId = urlParams.get('open');

    if (window.location.hash === '#new' || openGrnId) {
      setOpen(true);
      if (openGrnId) setSelectedGrnDisplayId(openGrnId);

      const newUrl = window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, []);

  const unbilledGrns = grns.filter(g => g.status === 'Pending Bill');
  const grnDetails = grns.find(g => g.displayId === selectedGrnDisplayId);
  const poDetails = grnDetails ? pos.find(p => p.displayId === grnDetails.poId) : null;

  const filteredBills = bills.filter(b =>
    b.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.poId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendors.find(v => v.id.toString() === b.vendorId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMaterialAmount = () => {
    if (!grnDetails || !poDetails) return 0;
    return grnDetails.items.reduce((sum, grnItem) => {
      const poItem = poDetails.items.find(i => i.materialId === grnItem.materialId);
      return sum + (grnItem.receivedQty * (poItem?.rate || 0));
    }, 0);
  };

  const getPoTaxRate = () => {
    if (!poDetails || !poDetails.items.length) return 0;
    const materialBase = poDetails.items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
    if (materialBase <= 0) return 0;
    const weightedTax = poDetails.items.reduce((sum, item) => {
      const base = Number(item.qty || 0) * Number(item.rate || 0);
      return sum + (base * (Number(item.taxPercent || 0) / 100));
    }, 0);
    return (weightedTax / materialBase) * 100;
  };

  const getActualCartage = () => Number(actualCartage) || 0;
  const getLoading = () => Number(loadingAmount) || 0;
  const getOtherCharges = () => Number(otherCharges) || 0;
  const getSubTotal = () => getMaterialAmount() + getActualCartage() + getLoading() + getOtherCharges();
  const getGstAmount = () => (withGst ? (getSubTotal() * (getPoTaxRate() / 100)) : 0);
  const getGrandTotal = () => getSubTotal() + getGstAmount();

  const resetForm = () => {
    setEditingId(null);
    setSelectedGrnDisplayId('');
    setDueDate('');
    setBillDate(new Date().toISOString().split('T')[0]);
    setWithGst(true);
    setVendorInvoiceNo('');
    setActualCartage('0');
    setLoadingAmount('0');
    setOtherCharges('0');
  };

  const handleOpenEdit = (b: any) => {
    setSelectedGrnDisplayId(b.grnId || '');
    setDueDate(b.dueDate || '');
    setBillDate(b.date);
    setWithGst(Number(b.gstAmount || 0) > 0);
    setVendorInvoiceNo(b.vendorInvoiceNo || '');
    setActualCartage((b.actualCartage ?? 0).toString());
    setLoadingAmount((b.loadingAmount ?? 0).toString());
    setOtherCharges((b.otherCharges ?? 0).toString());
    setEditingId(b.id);
    setOpen(true);
  };

  const viewingBill = bills.find(b => b.id === viewingBillId);
  const viewingVendor = vendors.find(v => v.id.toString() === viewingBill?.vendorId);
  const viewingSite = sites.find(s => s.id.toString() === viewingBill?.siteId);
  const viewingGrn = grns.find(g => g.displayId === viewingBill?.grnId);
  const viewingPo = pos.find(p => p.displayId === viewingBill?.poId);
  const viewingTaxRate = (() => {
    if (!viewingPo?.items?.length) return 0;
    const materialBase = viewingPo.items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
    if (materialBase <= 0) return 0;
    const weightedTax = viewingPo.items.reduce((sum, item) => {
      const base = Number(item.qty || 0) * Number(item.rate || 0);
      return sum + (base * (Number(item.taxPercent || 0) / 100));
    }, 0);
    return (weightedTax / materialBase) * 100;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnDetails || !poDetails) return;

    const billPayload = {
      date: billDate,
      dueDate: dueDate,
      amount: getGrandTotal(),
      materialAmount: getMaterialAmount(),
      actualCartage: getActualCartage(),
      loadingAmount: getLoading(),
      otherCharges: getOtherCharges(),
      subTotal: getSubTotal(),
      gstAmount: getGstAmount(),
      vendorInvoiceNo: vendorInvoiceNo.trim(),
    };

    if (editingId) {
      updateBill(editingId, billPayload);
    } else {
      addBill({
        grnId: grnDetails.displayId,
        poId: poDetails.displayId,
        siteId: poDetails.siteId,
        vendorId: poDetails.vendorId,
        ...billPayload,
      });
    }

    setOpen(false);
    resetForm();
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bills & Invoices</h1>
            <p className="text-sm text-muted-foreground">Manage vendor invoices generated from GRNs.</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if(!isOpen) {
              resetForm();
            }
          }}>
            <Button data-testid="button-record-bill" onClick={() => setLocation("/bills/create")}><Plus className="w-4 h-4 mr-2" /> Record Bill</Button>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Bill' : 'Record Vendor Bill'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                <div className="grid gap-2">
                  <Label>Select GRN</Label>
                  <Select required value={selectedGrnDisplayId} onValueChange={setSelectedGrnDisplayId} disabled={!!editingId}>
                    <SelectTrigger><SelectValue placeholder="Select GRN" /></SelectTrigger>
                    <SelectContent>
                      {(editingId ? [grnDetails].filter(Boolean) : unbilledGrns).map(g => g && (
                        <SelectItem key={g.id} value={g.displayId}>{g.displayId} (PO: {g.poId})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {grnDetails && poDetails && (
                  <>
                    <div className="bg-muted p-4 rounded-md mt-2 space-y-2 text-sm">
                      <div><span className="font-medium">Vendor:</span> {vendors.find(v=>v.id.toString()===poDetails.vendorId)?.name}</div>
                      <div><span className="font-medium">Items:</span> {grnDetails.items.length} materials received</div>
                      <div><span className="font-medium">Material Amount:</span> ₹{getMaterialAmount().toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Actual Cartage (₹)</Label>
                        <Input type="number" min="0" value={actualCartage} onChange={e => setActualCartage(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Loading / Unloading (₹)</Label>
                        <Input type="number" min="0" value={loadingAmount} onChange={e => setLoadingAmount(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Other Charges (₹)</Label>
                        <Input type="number" min="0" value={otherCharges} onChange={e => setOtherCharges(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Tax/GST Selection</Label>
                        <Select value={withGst ? 'yes' : 'no'} onValueChange={v => setWithGst(v === 'yes')}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">With GST</SelectItem>
                            <SelectItem value="no">Without GST</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded-md flex flex-col items-end mt-2">
                      <div className="flex justify-between w-full md:w-2/3 mb-2 text-sm text-muted-foreground"><span>Material Amount:</span><span>₹{getMaterialAmount().toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      <div className="flex justify-between w-full md:w-2/3 mb-2 text-sm text-muted-foreground"><span>Actual Cartage:</span><span>₹{getActualCartage().toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      <div className="flex justify-between w-full md:w-2/3 mb-2 text-sm text-muted-foreground"><span>Loading / Unloading:</span><span>₹{getLoading().toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      <div className="flex justify-between w-full md:w-2/3 mb-2 text-sm text-muted-foreground"><span>Other Charges:</span><span>₹{getOtherCharges().toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      <div className="flex justify-between w-full md:w-2/3 mb-2 text-sm text-muted-foreground border-b pb-2"><span>Subtotal:</span><span>₹{getSubTotal().toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      {withGst && <div className="flex justify-between w-full md:w-2/3 mb-3 text-sm text-muted-foreground border-b pb-2"><span>GST:</span><span>₹{getGstAmount().toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>}
                      <div className="flex justify-between w-full md:w-2/3">
                        <span className="font-medium">Bill Total:</span>
                        <span className="font-bold text-lg text-primary">₹{getGrandTotal().toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Vendor Invoice No (Optional)</Label>
                    <Input value={vendorInvoiceNo} onChange={e => setVendorInvoiceNo(e.target.value)} placeholder="As per supplier bill" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Bill Date</Label>
                    <Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Due Date (Optional)</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  <Button type="submit" disabled={!selectedGrnDisplayId} data-testid="button-save-bill">{editingId ? 'Update' : 'Generate'} Bill</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={!!viewingBillId} onOpenChange={(isOpen) => !isOpen && setViewingBillId(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Bill</DialogTitle>
            </DialogHeader>

            {viewingBill && (
              <div className="space-y-6">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h3 className="font-semibold mb-3">Header</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Document Number:</span><p className="font-medium">{viewingBill.displayId}</p></div>
                    <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{viewingBill.date}</p></div>
                    <div><span className="text-muted-foreground">Status:</span><p><Badge variant="outline" className={viewingBill.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : viewingBill.status === 'Partial' ? 'bg-blue-50 text-blue-700' : 'bg-destructive/10 text-destructive'}>{viewingBill.status}</Badge></p></div>
                    <div><span className="text-muted-foreground">Site:</span><p className="font-medium">{viewingSite?.siteName || viewingSite?.name || '-'}</p></div>
                    <div><span className="text-muted-foreground">Vendor:</span><p className="font-medium">{viewingVendor?.name || '-'}</p></div>
                    <div><span className="text-muted-foreground">PO Reference:</span><p className="font-medium">{viewingBill.poId}</p></div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold">Details</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Received Qty</TableHead>
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
                            <TableCell>{materials.find(m => m.id.toString() === grnItem.materialId)?.name || grnItem.materialId}</TableCell>
                            <TableCell className="text-right">{grnItem.receivedQty}</TableCell>
                            <TableCell className="text-right">₹{Number(poItem?.rate || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">₹{lineAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="space-y-1 text-sm rounded-md bg-muted/30 p-3 md:w-2/3 ml-auto">
                    <div className="flex justify-between"><span>Material:</span><span>₹{Number(viewingBill.materialAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>Charges:</span><span>₹{(Number(viewingBill.actualCartage || 0) + Number(viewingBill.loadingAmount || 0) + Number(viewingBill.otherCharges || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>GST ({viewingTaxRate.toFixed(2)}%):</span><span>₹{Number(viewingBill.gstAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between font-semibold border-t pt-2"><span>Total:</span><span>₹{Number(viewingBill.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">Read-only mode. Editing remains a separate action and is only enabled while status is Draft/Unpaid.</div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor Invoice No</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-right">Bill Total</TableHead>
                  <TableHead className="text-right">Cost Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => {
                  const vendor = vendors.find(v => v.id.toString() === bill.vendorId);
                  const site = sites.find(s => s.id.toString() === bill.siteId);
                  const po = pos.find(p => p.displayId === bill.poId);
                  const variance = Number(bill.amount || 0) - Number(po?.totalAmount || 0);
                  const variancePrefix = variance > 0 ? '+' : '';
                  return (
                    <TableRow key={bill.id} data-testid={`row-bill-${bill.id}`}>
                      <TableCell className="font-medium text-primary">{bill.displayId}</TableCell>
                      <TableCell>{bill.date}</TableCell>
                      <TableCell>{bill.vendorInvoiceNo || '-'}</TableCell>
                      <TableCell className="text-destructive font-medium">{bill.dueDate || '-'}</TableCell>
                      <TableCell>{vendor?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{site?.siteName || site?.name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">₹{bill.amount.toLocaleString(undefined, {maximumFractionDigits:2})}</TableCell>
                      <TableCell className={`text-right font-medium ${variance > 0 ? 'text-destructive' : variance < 0 ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                        {variancePrefix}₹{Math.abs(variance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          bill.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                          bill.status === 'Partial' ? 'bg-blue-50 text-blue-700' :
                          'bg-destructive/10 text-destructive'
                        }>
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setViewingBillId(bill.id)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {bill.status === 'Unpaid' ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(bill)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteBill(bill.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Locked</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredBills.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">No bills recorded yet.</TableCell>
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
