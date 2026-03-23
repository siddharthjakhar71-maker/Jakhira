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
import { usePermissions } from "@/lib/permissions";

export default function Materials() {
  const { materials, addMaterial, updateMaterial, deleteMaterial, addMaterials, searchQuery } = useStore();
  const [open, setOpen] = useState(false);
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', category: '', unit: '', defaultRate: '' });
  const [viewMaterial, setViewMaterial] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenEdit = (m: any) => {
      setFormData({ name: m.name, category: m.category || '', unit: m.unit || '', defaultRate: m.defaultRate ? m.defaultRate.toString() : '' });
      setEditingId(m.id);
      setOpen(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const submitData = { ...formData, defaultRate: Number(formData.defaultRate) || 0 };
    
    if (editingId) {
        updateMaterial(editingId, submitData);
    } else {
        addMaterial(submitData);
    }
    
    setOpen(false);
    setEditingId(null);
    setFormData({ name: '', category: '', unit: '', defaultRate: '' });
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
      
      const newMaterials = data.map((row: any) => ({
          name: row['Name'] || row['Material Name'] || row['Item'] || 'Unknown Item',
          category: row['Category'] || '',
          unit: row['Unit'] || row['UOM'] || '',
          defaultRate: Number(row['Default Rate'] || row['Rate'] || row['Price'] || 0)
      })).filter(m => m.name && m.name !== 'Unknown Item');
      
      if(newMaterials.length > 0) addMaterials(newMaterials);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Materials / Items</h1>
            <p className="text-sm text-muted-foreground">Manage your material catalog and default rates.</p>
          </div>
          <div className="flex gap-2">
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            {canCreate("Materials") ? <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-import-materials">
              <Upload className="w-4 h-4 mr-2" /> Import
            </Button> : null}
            <Dialog open={open} onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if(!isOpen) {
                    setEditingId(null);
                    setFormData({ name: '', category: '', unit: '', defaultRate: '' });
                }
            }}>
              <DialogTrigger asChild>
                {canCreate("Materials") ? <Button data-testid="button-add-material"><Plus className="w-4 h-4 mr-2" /> Add Material</Button> : null}
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Material' : 'Add New Material'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                  <div className="grid gap-2">
                    <Label>Material Name *</Label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} data-testid="input-material-name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Category (Optional)</Label>
                    <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} data-testid="input-material-category" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Unit of Measurement (Optional)</Label>
                      <Input placeholder="e.g. Bags, Ton, Nos" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} data-testid="input-material-unit" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Default Rate (₹) (Optional)</Label>
                      <Input type="number" value={formData.defaultRate} onChange={e => setFormData({...formData, defaultRate: e.target.value})} data-testid="input-material-rate" />
                    </div>
                  </div>
                  <Button type="submit" className="mt-2" data-testid="button-save-material">{editingId ? 'Update' : 'Save'} Material</Button>
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
                  <TableHead>Material Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Default Rate</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((item) => (
                  <TableRow key={item.id} data-testid={`row-material-${item.id}`}>
                    <TableCell className="font-medium" data-testid={`text-material-name-${item.id}`}>{item.name}</TableCell>
                    <TableCell>{item.category || '-'}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell className="text-right">₹{(item.defaultRate || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setViewMaterial(item)} data-testid={`button-view-material-${item.id}`}>
                                <Eye className="w-4 h-4" />
                            </Button>
                            {canEdit("Materials") ? <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(item)} data-testid={`button-edit-material-${item.id}`}>
                                <Edit className="w-4 h-4" />
                            </Button> : null}
                            {canDelete("Materials") ? <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMaterial(item.id)} data-testid={`button-delete-material-${item.id}`}>
                                <Trash2 className="w-4 h-4" />
                            </Button> : null}
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMaterials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No materials found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>


        <Dialog open={!!viewMaterial} onOpenChange={(open) => !open && setViewMaterial(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Material Details</DialogTitle></DialogHeader>
            {viewMaterial && (
              <div className="space-y-6">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Material</p>
                      <h3 className="text-2xl font-bold tracking-tight">{viewMaterial.name}</h3>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                    <div><span className="text-muted-foreground">Category:</span><p className="font-medium">{viewMaterial.category || '-'}</p></div>
                    <div><span className="text-muted-foreground">Unit:</span><p className="font-medium">{viewMaterial.unit || '-'}</p></div>
                    <div><span className="text-muted-foreground">Default Rate:</span><p className="font-medium">₹{Number(viewMaterial.defaultRate || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4 text-sm space-y-2">
                    <h3 className="font-semibold">Material Information</h3>
                    <div><span className="text-muted-foreground">Material Name:</span><p className="font-medium">{viewMaterial.name}</p></div>
                    <div><span className="text-muted-foreground">Category:</span><p className="font-medium">{viewMaterial.category || '-'}</p></div>
                  </div>
                  <div className="rounded-lg border p-4 text-sm space-y-2">
                    <h3 className="font-semibold">Commercial Details</h3>
                    <div><span className="text-muted-foreground">Unit of Measurement:</span><p className="font-medium">{viewMaterial.unit || '-'}</p></div>
                    <div><span className="text-muted-foreground">Default Rate:</span><p className="font-medium">₹{Number(viewMaterial.defaultRate || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {canEdit("Materials") ? <Button variant="outline" onClick={() => { setViewMaterial(null); handleOpenEdit(viewMaterial); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button> : null}
                  <Button variant="secondary" onClick={() => setViewMaterial(null)}>
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
