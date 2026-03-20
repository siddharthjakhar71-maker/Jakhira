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
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function GRN() {
  const [, setLocation] = useLocation();
  const { grns, pos, materials, vendors, sites, addGRN, updateGRN, deleteGRN, searchQuery } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingGrnId, setViewingGrnId] = useState<number | null>(null);
  
  const [selectedPoDisplayId, setSelectedPoDisplayId] = useState<string>('');
  const [receivedItems, setReceivedItems] = useState<{materialId: string, qty: string}[]>([]);
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openPoId = urlParams.get('open');
    
    if (window.location.hash === '#new' || openPoId) {
      setOpen(true);
      if (openPoId) {
          setSelectedPoDisplayId(openPoId);
          const po = pos.find(p => p.displayId === openPoId);
          if (po) {
              setReceivedItems(po.items.map(i => ({ materialId: i.materialId, qty: '' })));
          }
      }
      const newUrl = window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, [pos]);

  const pendingPOs = pos.filter(p => p.status === 'Pending' || p.status === 'Partial');
  const poDetails = pos.find(p => p.displayId === selectedPoDisplayId);

  useEffect(() => {
      if (poDetails && !editingId) {
          setReceivedItems(poDetails.items.map(i => ({ materialId: i.materialId, qty: '' })));
      }
  }, [poDetails, editingId]);

  const updateReceivedQty = (materialId: string, qty: string) => {
      setReceivedItems(prev => prev.map(item => item.materialId === materialId ? { ...item, qty } : item));
  };

  const getRemainingQty = (materialId: string) => {
      const poItem = poDetails?.items.find(i => i.materialId === materialId);
      if (!poItem) return 0;
      
      const allGrnsForPo = grns.filter(g => g.poId === selectedPoDisplayId && g.id !== editingId);
      const previouslyReceived = allGrnsForPo.reduce((acc, g) => {
          const itemInGrn = g.items.find(i => i.materialId === materialId);
          return acc + (itemInGrn ? itemInGrn.receivedQty : 0);
      }, 0);
      
      return poItem.qty - previouslyReceived;
  };

  const filteredGRNs = grns.filter(g => 
    g.displayId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.poId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenEdit = (g: any) => {
      setSelectedPoDisplayId(g.poId);
      
      const po = pos.find(p => p.displayId === g.poId);
      if (po) {
          const loadedItems = po.items.map(poItem => {
              const grnItem = g.items.find((i:any) => i.materialId === poItem.materialId);
              return {
                  materialId: poItem.materialId,
                  qty: grnItem ? grnItem.receivedQty.toString() : ''
              };
          });
          setReceivedItems(loadedItems);
      }

      setGrnDate(g.date);
      setEditingId(g.id);
      setOpen(true);
  }

  const viewingGrn = grns.find(g => g.id === viewingGrnId);
  const viewingPo = viewingGrn ? pos.find(p => p.displayId === viewingGrn.poId) : null;
  const viewingVendor = vendors.find(v => v.id.toString() === viewingPo?.vendorId);
  const viewingSite = sites.find(s => s.id.toString() === viewingGrn?.siteId);
  const viewMaterialTotalQty = viewingGrn ? viewingGrn.items.reduce((sum, item) => sum + item.receivedQty, 0) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poDetails) return;

    const grnItemsToSave = poDetails.items.map(poItem => {
        const receivedInput = receivedItems.find(i => i.materialId === poItem.materialId)?.qty;
        const remaining = getRemainingQty(poItem.materialId);
        const qtyToRecord = receivedInput ? Number(receivedInput) : (editingId ? 0 : remaining);
        
        return {
            materialId: poItem.materialId,
            orderedQty: poItem.qty,
            receivedQty: qtyToRecord
        };
    }).filter(i => i.receivedQty > 0);

    if (grnItemsToSave.length === 0) {
        alert("Please enter a received quantity for at least one item.");
        return;
    }

    if (editingId) {
        updateGRN(editingId, {
            date: grnDate,
            items: grnItemsToSave
        });
    } else {
        addGRN({
          poId: poDetails.displayId,
          siteId: poDetails.siteId,
          date: grnDate,
          items: grnItemsToSave
        });
    }
    setOpen(false);
    setEditingId(null);
    setSelectedPoDisplayId('');
    setReceivedItems([]);
    setGrnDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Goods Receipt Note (GRN)</h1>
            <p className="text-sm text-muted-foreground">Log material deliveries against purchase orders.</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if(!isOpen) {
                  setEditingId(null);
                  setSelectedPoDisplayId('');
                  setReceivedItems([]);
              }
          }}>
            <Button data-testid="button-receive-material" onClick={() => setLocation("/grn/create")}><Plus className="w-4 h-4 mr-2" /> Receive Material</Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit GRN' : 'Create Partial/Full GRN'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                <div className="grid gap-2">
                  <Label>Select Purchase Order</Label>
                  <Select required value={selectedPoDisplayId} onValueChange={setSelectedPoDisplayId} disabled={!!editingId}>
                    <SelectTrigger><SelectValue placeholder="Select pending/partial PO" /></SelectTrigger>
                    <SelectContent>
                      {(editingId ? [pos.find(p=>p.displayId===selectedPoDisplayId)].filter(Boolean) : pendingPOs).map(po => po && (
                        <SelectItem key={po.id} value={po.displayId}>{po.displayId} - {vendors.find(v=>v.id.toString()===po.vendorId)?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                    <Label>Receipt Date</Label>
                    <Input type="date" value={grnDate} onChange={(e) => setGrnDate(e.target.value)} />
                </div>
                
                {poDetails && (
                  <div className="bg-muted p-4 rounded-md mt-2 space-y-4">
                    <h4 className="font-medium text-sm border-b border-muted-foreground/20 pb-2">Items to Receive</h4>
                    
                    {poDetails.items.map((poItem, idx) => {
                        const remainingQty = getRemainingQty(poItem.materialId);
                        const rItem = receivedItems.find(i => i.materialId === poItem.materialId);
                        const currentInputVal = rItem ? rItem.qty : '';
                        
                        const allGrnsForPo = grns.filter(g => g.poId === selectedPoDisplayId && g.id !== editingId);
                        const previouslyReceived = allGrnsForPo.reduce((acc, g) => {
                            const itemInGrn = g.items.find(i => i.materialId === poItem.materialId);
                            return acc + (itemInGrn ? itemInGrn.receivedQty : 0);
                        }, 0);

                        return (
                            <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-background p-3 rounded-lg border shadow-sm">
                                <div className="col-span-12 md:col-span-4">
                                    <div className="text-sm font-medium">{materials.find(m => m.id.toString() === poItem.materialId)?.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Ordered: {poItem.qty} | Rcvd: {previouslyReceived} | Rem: <span className="text-emerald-600 font-medium">{remainingQty}</span>
                                    </div>
                                </div>
                                
                                <div className="col-span-12 md:col-span-8 flex items-center justify-end gap-3">
                                    <Label className="text-xs whitespace-nowrap">Receive Qty:</Label>
                                    <Input 
                                      type="number" 
                                      className="w-32 h-9"
                                      max={remainingQty + (editingId ? Number(currentInputVal) : 0)} 
                                      placeholder={`Up to ${remainingQty}`}
                                      value={currentInputVal} 
                                      onChange={e => updateReceivedQty(poItem.materialId, e.target.value)} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                  </div>
                )}

                <Button type="submit" disabled={!selectedPoDisplayId} data-testid="button-save-grn">{editingId ? 'Update' : 'Record'} Receipt</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={!!viewingGrnId} onOpenChange={(isOpen) => !isOpen && setViewingGrnId(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View GRN</DialogTitle>
            </DialogHeader>

            {viewingGrn && (
              <div className="space-y-6">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Goods Receipt Note</p>
                      <h3 className="text-2xl font-bold tracking-tight">{viewingGrn.displayId}</h3>
                    </div>
                    <Badge variant="outline" className={viewingGrn.status === 'Billed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>{viewingGrn.status}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                    <div><span className="text-muted-foreground">GRN Date:</span><p className="font-medium">{viewingGrn.date}</p></div>
                    <div><span className="text-muted-foreground">PO Reference:</span><p className="font-medium">{viewingGrn.poId}</p></div>
                    <div><span className="text-muted-foreground">Vendor:</span><p className="font-medium">{viewingVendor?.name || '-'}</p></div>
                    <div><span className="text-muted-foreground">Site:</span><p className="font-medium">{viewingSite?.siteName || viewingSite?.name || '-'}</p></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4 text-sm space-y-2">
                    <h3 className="font-semibold">Receipt Details</h3>
                    <div><span className="text-muted-foreground">Document Number:</span><p className="font-medium">{viewingGrn.displayId}</p></div>
                    <div><span className="text-muted-foreground">Receipt Date:</span><p className="font-medium">{viewingGrn.date}</p></div>
                    <div><span className="text-muted-foreground">Total Received Qty:</span><p className="font-medium">{viewMaterialTotalQty}</p></div>
                  </div>
                  <div className="rounded-lg border p-4 text-sm space-y-2">
                    <h3 className="font-semibold">Reference Details</h3>
                    <div><span className="text-muted-foreground">Vendor Name:</span><p className="font-medium">{viewingVendor?.name || '-'}</p></div>
                    <div><span className="text-muted-foreground">Site Name:</span><p className="font-medium">{viewingSite?.siteName || viewingSite?.name || '-'}</p></div>
                    <div><span className="text-muted-foreground">PO Reference:</span><p className="font-medium">{viewingGrn.poId}</p></div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold">Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Ordered Qty</TableHead>
                        <TableHead className="text-right">Received Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingGrn.items.map((item, idx) => (
                        <TableRow key={`${item.materialId}-${idx}`}>
                          <TableCell>{materials.find(m => m.id.toString() === item.materialId)?.name || '-'}</TableCell>
                          <TableCell className="text-right">{item.orderedQty}</TableCell>
                          <TableCell className="text-right">{item.receivedQty}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="space-y-1 text-sm rounded-md bg-muted/30 p-3 md:w-2/3 ml-auto">
                    <div className="flex justify-between"><span>Charges:</span><span>₹0.00</span></div>
                    <div className="flex justify-between"><span>GST:</span><span>₹0.00</span></div>
                    <div className="flex justify-between font-semibold border-t pt-2"><span>Total Qty:</span><span>{viewMaterialTotalQty}</span></div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => { setViewingGrnId(null); handleOpenEdit(viewingGrn); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => setViewingGrnId(null)}>
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
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>PO Reference</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Material / Qty Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGRNs.map((grn) => {
                  const site = sites.find(s => s.id.toString() === grn.siteId);
                  const itemCount = grn.items.length;
                  const firstItem = grn.items[0];
                  const firstMaterial = materials.find(m => m.id.toString() === firstItem?.materialId);
                  const poRef = pos.find(p => p.displayId === grn.poId);
                  const vendor = vendors.find(v => v.id.toString() === poRef?.vendorId);
                  
                  return (
                    <TableRow key={grn.id} data-testid={`row-grn-${grn.id}`}>
                      <TableCell className="font-medium text-primary">{grn.displayId}</TableCell>
                      <TableCell>{grn.date}</TableCell>
                      <TableCell className="text-primary cursor-pointer hover:underline">{grn.poId}</TableCell>
                      <TableCell className="text-muted-foreground">{site?.siteName || site?.name || '-'}</TableCell>
                      <TableCell>{vendor?.name || '-'}</TableCell>
                      <TableCell>
                          {itemCount === 1 
                            ? `${firstItem.receivedQty} x ${firstMaterial?.name}` 
                            : `${itemCount} items (${grn.items.reduce((s,i)=>s+i.receivedQty,0)} total qty)`
                          }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={grn.status === 'Billed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
                          {grn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setViewingGrnId(grn.id)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {grn.status === 'Pending Bill' ? (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(grn)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteGRN(grn.id)}>
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
                {filteredGRNs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No GRNs recorded yet.</TableCell>
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
