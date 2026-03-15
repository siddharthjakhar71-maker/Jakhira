import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { api, queryKeys } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

export default function VendorRateList() {
  const { vendors, materials, vendorMaterialRates, upsertVendorMaterialRate, deleteVendorMaterialRate, searchQuery } = useStore();
  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [formVendorId, setFormVendorId] = useState("");
  const [formMaterialId, setFormMaterialId] = useState("");
  const [formRate, setFormRate] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRate, setEditRate] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredRates = useMemo(() => {
    return vendorMaterialRates.filter(r => {
      if (selectedVendorId !== "all" && r.vendorId !== selectedVendorId) return false;
      if (searchQuery) {
        const vendor = vendors.find(v => v.id.toString() === r.vendorId);
        const material = materials.find(m => m.id.toString() === r.materialId);
        const q = searchQuery.toLowerCase();
        if (!vendor?.name.toLowerCase().includes(q) && !material?.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [vendorMaterialRates, selectedVendorId, searchQuery, vendors, materials]);

  const handleAdd = () => {
    if (!formVendorId || !formMaterialId || !formRate) return;
    upsertVendorMaterialRate(formVendorId, formMaterialId, Number(formRate));
    setAddOpen(false);
    setFormVendorId("");
    setFormMaterialId("");
    setFormRate("");
  };

  const handleSaveEdit = (entry: any) => {
    upsertVendorMaterialRate(entry.vendorId, entry.materialId, Number(editRate));
    setEditingId(null);
    setEditRate("");
  };


  const handleImportFile = async (file?: File) => {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["xlsx", "xls", "csv"].includes(extension)) {
      toast({ title: "Unsupported file", description: "Please upload .xlsx, .xls, or .csv", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fileDataBase64 = btoa(binary);
      await api.importVendorRates(fileDataBase64, file.name);
      await queryClient.invalidateQueries({ queryKey: queryKeys.vendorMaterialRates });
      toast({ title: "Import successful", description: "Vendor rates imported successfully" });
    } catch (error) {
      toast({ title: "Import failed", description: "Could not import vendor rates", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendor Rate List</h1>
            <p className="text-sm text-muted-foreground">Manage vendor-specific material rates. These rates auto-fill when creating Purchase Orders.</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="w-[200px]">
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger data-testid="select-filter-vendor">
                  <SelectValue placeholder="Filter by Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleImportFile(e.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting} data-testid="button-import-rates">
              <Upload className="w-4 h-4 mr-1" /> {isImporting ? "Importing..." : "Import Excel"}
            </Button>
            <Button onClick={() => setAddOpen(true)} data-testid="button-add-rate">
              <Plus className="w-4 h-4 mr-1" /> Add Rate
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRates.map(entry => {
                  const vendor = vendors.find(v => v.id.toString() === entry.vendorId);
                  const material = materials.find(m => m.id.toString() === entry.materialId);
                  const isEditing = editingId === entry.id;
                  return (
                    <TableRow key={entry.id} data-testid={`row-rate-${entry.id}`}>
                      <TableCell className="font-medium">{vendor?.name || 'Unknown'}</TableCell>
                      <TableCell>{material?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-muted-foreground">{material?.unit || '-'}</TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editRate}
                            onChange={e => setEditRate(e.target.value)}
                            className="w-24 ml-auto text-right"
                            data-testid={`input-edit-rate-${entry.id}`}
                          />
                        ) : (
                          <span className="font-semibold" data-testid={`text-rate-${entry.id}`}>{formatCurrency(entry.rate)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {isEditing ? (
                            <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(entry)} data-testid={`button-save-rate-${entry.id}`}>
                              <Save className="w-4 h-4 text-emerald-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingId(entry.id); setEditRate(entry.rate.toString()); }}
                              data-testid={`button-edit-rate-${entry.id}`}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteVendorMaterialRate(entry.id)}
                            data-testid={`button-delete-rate-${entry.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No vendor rates found. Click "Add Rate" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vendor Rate</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div>
                <Label>Vendor</Label>
                <Select value={formVendorId} onValueChange={setFormVendorId}>
                  <SelectTrigger data-testid="select-add-vendor">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Material</Label>
                <Select value={formMaterialId} onValueChange={setFormMaterialId}>
                  <SelectTrigger data-testid="select-add-material">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.name} {m.unit ? `(${m.unit})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rate</Label>
                <Input
                  type="number"
                  value={formRate}
                  onChange={e => setFormRate(e.target.value)}
                  placeholder="Enter rate"
                  data-testid="input-add-rate"
                />
              </div>
              <Button onClick={handleAdd} disabled={!formVendorId || !formMaterialId || !formRate} data-testid="button-save-add">
                Save Rate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
