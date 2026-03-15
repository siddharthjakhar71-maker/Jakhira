import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Upload, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef } from "react";
import * as XLSX from 'xlsx';

const emptyForm = { siteName: '', billingName: '', siteCode: '', billingCode: '', address: '', city: '', state: '', pincode: '', contactPerson: '', phone: '', status: 'Active' as const };

export default function Sites() {
  const { sites, addSite, updateSite, deleteSite, addSites, searchQuery } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [viewingSite, setViewingSite] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredSites = sites.filter(s => 
    (s.siteName || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.billingName || s.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.city || s.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenEdit = (site: any) => {
    setFormData({
      siteName: site.siteName || site.name || '',
      billingName: site.billingName || site.projectName || '',
      siteCode: site.siteCode || '',
      billingCode: site.billingCode || site.poPrefix || site.siteCode || '',
      address: site.address || '',
      city: site.city || site.location || '',
      state: site.state || '',
      pincode: site.pincode || '',
      contactPerson: site.contactPerson || '',
      phone: site.phone || '',
      status: site.status,
    });
    setEditingId(site.id);
    setOpen(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siteName || !formData.siteCode || !formData.billingName || !formData.billingCode) return;
    const payload = { ...formData, projectName: formData.billingName, name: formData.siteName, location: formData.city };
    if (editingId) updateSite(editingId, payload);
    else addSite(payload);
    setOpen(false); setEditingId(null); setFormData(emptyForm);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const newSites = data.map((row: any) => ({
        siteName: row['Site Name'] || row['Name'] || 'Unknown Site',
        billingName: row['Billing Name'] || row['Project Name'] || row['Project'] || '',
        projectName: row['Billing Name'] || row['Project Name'] || row['Project'] || '',
        siteCode: row['Site Code'] || '',
        billingCode: row['Billing Code'] || row['PO Prefix'] || row['Prefix'] || row['Site Code'] || '',
        address: row['Address'] || '',
        city: row['City'] || row['Location'] || '',
        state: row['State'] || '',
        pincode: String(row['Pincode'] || ''),
        contactPerson: row['Contact Person'] || '',
        phone: String(row['Phone'] || ''),
        name: row['Site Name'] || row['Name'] || 'Unknown Site',
        location: row['City'] || row['Location'] || '',
        status: (row['Status'] === 'Completed' ? 'Completed' : row['Status'] === 'On Hold' ? 'On Hold' : 'Active') as 'Active' | 'Completed' | 'On Hold'
      })).filter((s:any) => s.siteName && s.siteName !== 'Unknown Site');
      if(newSites.length > 0) addSites(newSites);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return <AppLayout><div className="flex flex-col gap-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold tracking-tight">Sites</h1></div>
      <div className="flex gap-2"><input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Import</Button>
        <Dialog open={open} onOpenChange={(isOpen)=>{setOpen(isOpen); if(!isOpen){setEditingId(null); setFormData(emptyForm);}}}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Site</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]"><DialogHeader><DialogTitle>{editingId ? 'Edit Site' : 'Add New Site'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mt-4">
              <div className="grid gap-2"><Label>Site Name *</Label><Input required value={formData.siteName} onChange={e=>setFormData({...formData, siteName:e.target.value})} /></div>
              <div className="grid gap-2"><Label>Billing Name *</Label><Input required value={formData.billingName} onChange={e=>setFormData({...formData, billingName:e.target.value})} /></div>
              <div className="grid gap-2"><Label>Site Code *</Label><Input required value={formData.siteCode} onChange={e=>setFormData({...formData, siteCode:e.target.value.toUpperCase()})} /></div>
              <div className="grid gap-2"><Label>Billing Code *</Label><Input required value={formData.billingCode} onChange={e=>setFormData({...formData, billingCode:e.target.value.toUpperCase()})} /></div>
              <div className="grid gap-2"><Label>Contact Person</Label><Input value={formData.contactPerson} onChange={e=>setFormData({...formData, contactPerson:e.target.value})} /></div>
              <div className="grid gap-2 col-span-2"><Label>Address</Label><Textarea value={formData.address} onChange={e=>setFormData({...formData, address:e.target.value})} rows={2} /></div>
              <div className="grid gap-2"><Label>City</Label><Input value={formData.city} onChange={e=>setFormData({...formData, city:e.target.value})} /></div>
              <div className="grid gap-2"><Label>State</Label><Input value={formData.state} onChange={e=>setFormData({...formData, state:e.target.value})} /></div>
              <div className="grid gap-2"><Label>Pincode</Label><Input value={formData.pincode} onChange={e=>setFormData({...formData, pincode:e.target.value})} /></div>
              <div className="grid gap-2"><Label>Phone</Label><Input value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} /></div>
              <div className="grid gap-2 col-span-2"><Label>Status</Label><Select value={formData.status} onValueChange={(v)=>setFormData({...formData, status:v as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="On Hold">On Hold</SelectItem></SelectContent></Select></div>
              <Button type="submit" className="col-span-2">{editingId ? 'Update' : 'Save'} Site</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div></div>

    <Dialog open={!!viewingSite} onOpenChange={(isOpen)=>{if(!isOpen) setViewingSite(null);}}><DialogContent><DialogHeader><DialogTitle>Site Details</DialogTitle></DialogHeader>
      {viewingSite && <div className="grid gap-2 text-sm"><div><strong>Site:</strong> {viewingSite.siteName || viewingSite.name}</div><div><strong>Billing Name:</strong> {viewingSite.billingName || viewingSite.projectName || '-'}</div><div><strong>Code:</strong> {viewingSite.siteCode || '-'}</div><div><strong>Billing Code:</strong> {viewingSite.billingCode || viewingSite.poPrefix || '-'}</div><div><strong>Address:</strong> {viewingSite.address || '-'}</div><div><strong>City:</strong> {viewingSite.city || viewingSite.location || '-'}</div><div><strong>State:</strong> {viewingSite.state || '-'}</div><div><strong>Pincode:</strong> {viewingSite.pincode || '-'}</div><div><strong>Contact:</strong> {viewingSite.contactPerson || '-'} ({viewingSite.phone || '-'})</div><div><strong>Status:</strong> <Badge className={viewingSite.status === 'Active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : viewingSite.status === 'Completed' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : 'bg-orange-100 text-orange-800 hover:bg-orange-100'}>{viewingSite.status}</Badge></div></div>}
    </DialogContent></Dialog>

    <Card><CardContent className="p-0 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Site Name</TableHead><TableHead>Billing Name</TableHead><TableHead>Site Code</TableHead><TableHead>Billing Code</TableHead><TableHead>Address</TableHead><TableHead>City</TableHead><TableHead>State</TableHead><TableHead>Pincode</TableHead><TableHead>Contact Person</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
      {filteredSites.map((site)=><TableRow key={site.id}><TableCell>{site.siteName || site.name}</TableCell><TableCell>{site.billingName || site.projectName || '-'}</TableCell><TableCell>{site.siteCode || '-'}</TableCell><TableCell>{site.billingCode || site.poPrefix || '-'}</TableCell><TableCell>{site.address || '-'}</TableCell><TableCell>{site.city || site.location || '-'}</TableCell><TableCell>{site.state || '-'}</TableCell><TableCell>{site.pincode || '-'}</TableCell><TableCell>{site.contactPerson || '-'}</TableCell><TableCell>{site.phone || '-'}</TableCell><TableCell><Badge className={site.status === 'Active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : site.status === 'Completed' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : 'bg-orange-100 text-orange-800 hover:bg-orange-100'}>{site.status}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={()=>setViewingSite(site)}><Eye className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={()=>handleOpenEdit(site)}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={()=>deleteSite(site.id)}><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>)}
      {filteredSites.length===0 && <TableRow><TableCell colSpan={12} className="text-center py-6 text-muted-foreground">No sites found.</TableCell></TableRow>}
    </TableBody></Table></CardContent></Card>
  </div></AppLayout>
}
