import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Upload, Eye, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef } from "react";
import * as XLSX from 'xlsx';

export default function Vendors() {
  const { vendors, addVendor, updateVendor, deleteVendor, addVendors, searchQuery } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', gst: '', contactPerson: '', phone: '', address: '', email: '', openingBalance: 0, openingDate: new Date().toISOString().slice(0, 10) });
  const [viewVendor, setViewVendor] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (v.gst && v.gst.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenEdit = (v: any) => {
      setFormData({ name: v.name, gst: v.gst || '', contactPerson: v.contactPerson || '', phone: v.phone || '', address: v.address || '', email: v.email || '', openingBalance: Number(v.openingBalance || 0), openingDate: v.openingDate || new Date().toISOString().slice(0, 10) });
      setEditingId(v.id);
      setOpen(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
        updateVendor(editingId, formData);
    } else {
        addVendor(formData);
    }
    setOpen(false);
    setEditingId(null);
    setFormData({ name: '', gst: '', contactPerson: '', phone: '', address: '', email: '', openingBalance: 0, openingDate: new Date().toISOString().slice(0, 10) });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const newVendors = data.map((row: any) => ({
          name: row['Company Name'] || row['Name'] || row['Vendor'] || 'Unknown Vendor',
          gst: row['GST'] || row['GST Number'] || '',
          contactPerson: row['Contact Person'] || '',
          phone: row['Phone'] || '',
          address: row['Address'] || row['Vendor Address'] || '',
          email: row['Email'] || '',
          openingBalance: Number(row['Opening Balance'] || 0),
          openingDate: row['Opening Date'] || new Date().toISOString().slice(0, 10)
      })).filter(v => v.name && v.name !== 'Unknown Vendor');
      
      if(newVendors.length > 0) addVendors(newVendors);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendors (Parties)</h1>
            <p className="text-sm text-muted-foreground">Manage your suppliers and their contact details.</p>
          </div>
          <div className="flex gap-2">
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-import-vendors">
              <Upload className="w-4 h-4 mr-2" /> Import
            </Button>
            <Dialog open={open} onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if(!isOpen) {
                    setEditingId(null);
                    setFormData({ name: '', gst: '', contactPerson: '', phone: '', address: '', email: '', openingBalance: 0, openingDate: new Date().toISOString().slice(0, 10) });
                }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-vendor"><Plus className="w-4 h-4 mr-2" /> Add Vendor</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                  <div className="grid gap-2">
                    <Label>Company Name *</Label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} data-testid="input-vendor-name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>GST Number</Label>
                    <Input value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} data-testid="input-vendor-gst" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Contact Person</Label>
                    <Input value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} data-testid="input-vendor-contact" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Vendor Address</Label>
                    <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} data-testid="input-vendor-address" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Phone</Label>
                      <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} data-testid="input-vendor-phone" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} data-testid="input-vendor-email" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Opening Balance</Label>
                      <Input type="number" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: Number(e.target.value || 0)})} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Opening Date</Label>
                      <Input type="date" value={formData.openingDate} onChange={e => setFormData({...formData, openingDate: e.target.value})} />
                    </div>
                  </div>
                  <Button type="submit" className="mt-2" data-testid="button-save-vendor">{editingId ? 'Update' : 'Save'} Vendor</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Opening Balance</TableHead>
                  <TableHead>Opening Date</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                    <TableCell className="font-medium" data-testid={`text-vendor-name-${vendor.id}`}>{vendor.name}</TableCell>
                    <TableCell className="text-muted-foreground">{vendor.gst || '-'}</TableCell>
                    <TableCell>{vendor.contactPerson || '-'}</TableCell>
                    <TableCell>{vendor.phone || '-'}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{vendor.address || '-'}</TableCell>
                    <TableCell>{vendor.email || '-'}</TableCell>
                    <TableCell>{Number(vendor.openingBalance || 0).toFixed(2)}</TableCell>
                    <TableCell>{vendor.openingDate || '-'}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setViewVendor(vendor)} data-testid={`button-view-vendor-${vendor.id}`}>
                                <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(vendor)} data-testid={`button-edit-vendor-${vendor.id}`}>
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteVendor(vendor.id)} data-testid={`button-delete-vendor-${vendor.id}`}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredVendors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No vendors found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!viewVendor} onOpenChange={(open) => !open && setViewVendor(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Vendor Details</DialogTitle></DialogHeader>
            {viewVendor && (
              <div className="space-y-6">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendor</p>
                      <h3 className="text-2xl font-bold tracking-tight">{viewVendor.name}</h3>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                    <div><span className="text-muted-foreground">Contact Person:</span><p className="font-medium">{viewVendor.contactPerson || '-'}</p></div>
                    <div><span className="text-muted-foreground">Phone:</span><p className="font-medium">{viewVendor.phone || '-'}</p></div>
                    <div><span className="text-muted-foreground">Email:</span><p className="font-medium break-all">{viewVendor.email || '-'}</p></div>
                    <div><span className="text-muted-foreground">GST Number:</span><p className="font-medium">{viewVendor.gst || '-'}</p></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4 text-sm space-y-2">
                    <h3 className="font-semibold">Contact Details</h3>
                    <div><span className="text-muted-foreground">Company Name:</span><p className="font-medium">{viewVendor.name}</p></div>
                    <div><span className="text-muted-foreground">Contact Person:</span><p className="font-medium">{viewVendor.contactPerson || '-'}</p></div>
                    <div><span className="text-muted-foreground">Phone:</span><p className="font-medium">{viewVendor.phone || '-'}</p></div>
                    <div><span className="text-muted-foreground">Email:</span><p className="font-medium break-all">{viewVendor.email || '-'}</p></div>
                  </div>
                  <div className="rounded-lg border p-4 text-sm space-y-2">
                    <h3 className="font-semibold">Account Details</h3>
                    <div><span className="text-muted-foreground">GST Number:</span><p className="font-medium">{viewVendor.gst || '-'}</p></div>
                    <div><span className="text-muted-foreground">Opening Balance:</span><p className="font-medium">₹{Number(viewVendor.openingBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
                    <div><span className="text-muted-foreground">Opening Date:</span><p className="font-medium">{viewVendor.openingDate || '-'}</p></div>
                    <div><span className="text-muted-foreground">Address:</span><p className="font-medium whitespace-pre-line">{viewVendor.address || '-'}</p></div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => { setViewVendor(null); handleOpenEdit(viewVendor); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => setViewVendor(null)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
