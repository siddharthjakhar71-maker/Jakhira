import { AppLayout } from "@/components/layout/AppLayout";
import { useStore, type Material } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, X, Download, FileText, FileSpreadsheet, MessageCircle, Eye, ArrowLeft, Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { generatePOPdf, generatePOExcel, DEFAULT_LAYOUT_BLOCKS } from "@/lib/poDocGenerator";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/defaultTemplate";
import { api } from "@/lib/api";
import type { POTemplateConfig, LayoutBlock } from "@/lib/store";
import { usePermissions } from "@/lib/permissions";

const round2 = (value: number) => Math.round(value * 100) / 100;

const getSiteAddressDefaults = (site?: any) => {
  const billingName = site?.billingName || site?.projectName || site?.siteName || site?.name || "";
  const billTo = site?.billTo || site?.address || "";
  const shippingName = billingName;
  const shipTo = site?.shipTo || site?.address || "";
  return { billingName, billTo, shippingName, shipTo };
};

export default function PurchaseOrders() {
  const { pos, vendors, materials, sites, addPO, updatePO, deletePO, searchQuery, userProfile, poTemplates, templateStyles, vendorMaterialRates } = useStore();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewPO, setViewPO] = useState<any | null>(null);
  const [, setLocation] = useLocation();
  const { canCreate, canEdit, canDelete, canApprove } = usePermissions();

  const [formData, setFormData] = useState({ 
    siteId: '',
    vendorId: '', 
    date: new Date().toISOString().split('T')[0], 
    expectedDelivery: '',
    withGst: true,
    billingName: '',
    billingAddress: '',
    shippingAddress: '',
    sameAsBilling: true,
    siteCode: '',
    billingCode: '',
    enableEstimatedCartage: false,
    estimatedCartage: '0',
    otherEstimatedCharges: '0'
  });

  const [items, setItems] = useState([{ materialId: '', qty: '', rate: '', taxPercent: '0' }]);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const materialRefs = useRef<Array<HTMLInputElement | null>>([]);
  const qtyRefs = useRef<Array<HTMLInputElement | null>>([]);
  const rateRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [pendingMaterialRow, setPendingMaterialRow] = useState<number | null>(null);
  const [newMaterialForm, setNewMaterialForm] = useState({ name: '', category: '', unit: '', defaultRate: '' });
  const [inlineMaterials, setInlineMaterials] = useState<Material[]>([]);
  const materialOptions = useMemo(() => [...materials, ...inlineMaterials], [materials, inlineMaterials]);

  const selectedVendor = vendors.find(v => v.id.toString() === formData.vendorId);
  const selectedSite = sites.find(s => s.id.toString() === formData.siteId);

  const filteredPOs = pos.filter(p => 
    p.displayId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    vendors.find(v => v.id.toString() === p.vendorId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMaterialAmount = () => items.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.rate) || 0)), 0);
  const getEstimatedCartage = () => Number(formData.estimatedCartage) || 0;
  const getOtherEstimatedCharges = () => Number(formData.otherEstimatedCharges) || 0;
  const getEstimatedSubTotal = () => getMaterialAmount() + (formData.enableEstimatedCartage ? getEstimatedCartage() : 0) + getOtherEstimatedCharges();
  const getAverageItemTaxPercent = () => {
    const materialAmount = getMaterialAmount();
    if (materialAmount <= 0) return 0;
    const weightedTax = items.reduce((sum, item) => {
      const base = (Number(item.qty) || 0) * (Number(item.rate) || 0);
      const tax = Number(item.taxPercent) || 0;
      return sum + (base * tax / 100);
    }, 0);
    return (weightedTax / materialAmount) * 100;
  };

  const calculateTaxAmount = () => {
    if (!formData.withGst) return 0;
    return getEstimatedSubTotal() * (getAverageItemTaxPercent() / 100);
  };


  const handleOpenEdit = (p: any) => {
      const currentSite = sites.find(s => s.id.toString() === p.siteId);
      const defaults = getSiteAddressDefaults(currentSite);
      const billingName = p.billingName || defaults.billingName;
      const billingAddress = p.billingAddress || p.billTo || defaults.billTo;
      const shippingAddress = p.shippingAddress || p.shipTo || defaults.shipTo;
      const sameAsBilling = typeof p.sameAsBilling === 'boolean'
        ? p.sameAsBilling
        : billingAddress === shippingAddress;
      setFormData({ 
          siteId: p.siteId || '', 
          vendorId: p.vendorId, 
          date: p.date, 
          expectedDelivery: p.expectedDelivery || '',
          withGst: true,
          billingName,
          billingAddress,
          shippingAddress: sameAsBilling ? billingAddress : shippingAddress,
          sameAsBilling,
          siteCode: p.siteCode || currentSite?.siteCode || '',
          billingCode: p.billingCode || p.prefix || currentSite?.billingCode || currentSite?.poPrefix || '',
          enableEstimatedCartage: Number(p.estimatedCartage ?? p.freightAmount ?? 0) > 0,
          estimatedCartage: (p.estimatedCartage ?? p.freightAmount ?? 0).toString(),
          otherEstimatedCharges: (p.otherEstimatedCharges ?? 0).toString()
      });
      
      const pItems = p.items && p.items.length > 0 
        ? p.items.map((i: any) => ({ materialId: i.materialId, qty: i.qty.toString(), rate: i.rate.toString(), taxPercent: i.taxPercent?.toString() || '0' }))
        : [{ materialId: '', qty: '', rate: '', taxPercent: '0' }];
        
      setItems(pItems);
      setEditingId(p.id);
  }

  const handleMaterialChange = (index: number, val: string) => {
    const vendorRate = vendorMaterialRates.find(r => r.vendorId === formData.vendorId && r.materialId === val);
    const mat = materialOptions.find(m => m.id.toString() === val);
    const rate = vendorRate ? vendorRate.rate.toString() : (mat?.defaultRate?.toString() || '');
    const newItems = [...items];
    newItems[index] = { ...newItems[index], materialId: val, rate };
    setItems(newItems);
    setTimeout(() => qtyRefs.current[index]?.focus(), 0);
  };

  const handleVendorChange = (vendorId: string) => {
    setFormData({ ...formData, vendorId });
    const newItems = items.map(item => {
      if (!item.materialId) return item;
      const vendorRate = vendorMaterialRates.find(r => r.vendorId === vendorId && r.materialId === item.materialId);
      if (vendorRate) return { ...item, rate: vendorRate.rate.toString() };
      const mat = materialOptions.find(m => m.id.toString() === item.materialId);
      return { ...item, rate: mat?.defaultRate?.toString() || item.rate };
    });
    setItems(newItems);
  };

  const updateItem = (index: number, field: string, value: string) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      setItems(newItems);
  }

  const addItemRow = (focusNewMaterial = false) => {
      const nextIndex = items.length;
      setItems([...items, { materialId: '', qty: '', rate: '', taxPercent: '0' }]);
      if (focusNewMaterial) {
        setTimeout(() => materialRefs.current[nextIndex]?.focus(), 0);
      }
  }
  
  const removeItemRow = (index: number) => {
      if (items.length > 1) {
          const newItems = items.filter((_, i) => i !== index);
          setItems(newItems);
      }
  }

  const calculateTotalAmount = () => {
      const subtotal = getEstimatedSubTotal();
      const tax = calculateTaxAmount();
      return subtotal + tax;
  }

  const handleInlineMaterialSave = async () => {
    const name = newMaterialForm.name.trim();
    if (!name) {
      alert('Material name is required.');
      return;
    }

    const created = await api.createMaterial({
      name,
      category: newMaterialForm.category.trim() || null,
      unit: newMaterialForm.unit.trim() || null,
      defaultRate: newMaterialForm.defaultRate === '' ? null : Number(newMaterialForm.defaultRate) || 0,
    });
    const materialId = created?.id?.toString();
    if (created?.id) {
      setInlineMaterials((prev) => [...prev, created]);
    }

    if (pendingMaterialRow !== null && materialId) {
      handleMaterialChange(pendingMaterialRow, materialId);
    }

    setNewMaterialForm({ name: '', category: '', unit: '', defaultRate: '' });
    setMaterialModalOpen(false);
    setPendingMaterialRow(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const meaningfulItems = items.filter(i => i.materialId || i.qty || i.rate);
    if (!formData.siteId || !formData.vendorId || meaningfulItems.length === 0 || meaningfulItems.some(i => !i.materialId)) {
        alert("Please select a site, vendor, add at least one item, and ensure all rows have a material.");
        return;
    }
    if (meaningfulItems.some(i => Number(i.qty) <= 0 || Number(i.rate) < 0)) {
        alert("Each row must have Qty > 0 and Rate >= 0.");
        return;
    }
    if (!formData.billingName.trim() || !formData.billingAddress.trim()) {
        alert("Billing name and billing address are required.");
        return;
    }
    if (!formData.sameAsBilling && !formData.shippingAddress.trim()) {
        alert("Shipping address is required when shipping differs from billing.");
        return;
    }

    const processedItems = meaningfulItems.map(item => {
        const qty = Number(item.qty) || 0;
        const rate = Number(item.rate) || 0;
        const tax = formData.withGst ? (Number(item.taxPercent) || 0) : 0;
        const baseAmount = round2(qty * rate);
        const amount = round2(baseAmount + (baseAmount * tax / 100));
        return { materialId: item.materialId, qty, rate, amount, taxPercent: tax }; 
    });

    const submitData = {
      siteId: formData.siteId,
      vendorId: formData.vendorId,
      date: formData.date || new Date().toISOString().split('T')[0],
      expectedDelivery: formData.expectedDelivery,
      items: processedItems,
      totalAmount: calculateTotalAmount(),
      estimatedCartage: formData.enableEstimatedCartage ? getEstimatedCartage() : 0,
      estimatedLoadingAmount: 0,
      otherEstimatedCharges: getOtherEstimatedCharges(),
      subTotal: getEstimatedSubTotal(),
      gstAmount: calculateTaxAmount(),
      billingName: formData.billingName,
      billingAddress: formData.billingAddress,
      shippingAddress: formData.sameAsBilling ? formData.billingAddress : formData.shippingAddress,
      sameAsBilling: formData.sameAsBilling,
      billTo: formData.billingAddress,
      shipTo: formData.sameAsBilling ? formData.billingAddress : formData.shippingAddress,
      billingCode: formData.billingCode,
      siteCode: formData.siteCode
    };

    if (editingId) {
        updatePO(editingId, submitData);
    } else {
        addPO(submitData);
    }

    setEditingId(null);
    setFormData({ siteId: '', vendorId: '', date: new Date().toISOString().split('T')[0], expectedDelivery: '', withGst: true, billingName: '', billingAddress: '', shippingAddress: '', sameAsBilling: true, siteCode: '', billingCode: '', enableEstimatedCartage: false, estimatedCartage: '0', otherEstimatedCharges: '0' });
    setItems([{ materialId: '', qty: '', rate: '', taxPercent: '0' }]);
    setActiveRow(null);
  };

  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadPO, setDownloadPO] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('none');

  const handleDownloadWithTemplate = (po: any) => {
    setDownloadPO(po);
    const defaultTpl = poTemplates.find(t => t.isDefault === 'true');
    setSelectedTemplateId(defaultTpl ? defaultTpl.id.toString() : poTemplates[0]?.id.toString() || 'default');
    const defaultStyle = templateStyles.find(s => s.isDefault === 'true');
    setSelectedStyleId(defaultStyle ? defaultStyle.id.toString() : 'none');
    setDownloadDialogOpen(true);
  };

  const doDownload = (po: any, format: 'pdf' | 'excel', templateConfig: POTemplateConfig, layoutBlocks: LayoutBlock[]) => {
    const vendor = vendors.find(v => v.id.toString() === po.vendorId);
    const site = sites.find(s => s.id.toString() === po.siteId);
    const docData = { po, site, vendor, materials, userProfile, templateConfig, layoutBlocks };
    if (format === 'pdf') {
      generatePOPdf(docData);
    } else {
      generatePOExcel(docData);
    }
  };

  const resolveTemplateConfig = (): POTemplateConfig => {
    if (selectedStyleId !== 'none') {
      const style = templateStyles.find(s => s.id.toString() === selectedStyleId);
      if (style?.config?.linkedTemplateId) {
        const linked = poTemplates.find(t => t.id === style.config.linkedTemplateId);
        if (linked) return linked.config;
      }
    }

    if (selectedTemplateId && selectedTemplateId !== 'default') {
      const tpl = poTemplates.find(t => t.id.toString() === selectedTemplateId);
      if (tpl) return tpl.config;
    }

    return DEFAULT_TEMPLATE_CONFIG;
  };

  const resolveLayoutBlocks = (): LayoutBlock[] => {
    if (selectedStyleId !== 'none') {
      const style = templateStyles.find(s => s.id.toString() === selectedStyleId);
      if (style?.config?.blocks && style.config.blocks.length > 0) {
        return style.config.blocks;
      }
    }
    return DEFAULT_LAYOUT_BLOCKS;
  };

  const handleDownloadConfirm = (format: 'pdf' | 'excel') => {
    if (!downloadPO) return;
    const templateConfig = resolveTemplateConfig();
    const layoutBlocks = resolveLayoutBlocks();
    doDownload(downloadPO, format, templateConfig, layoutBlocks);
    setDownloadDialogOpen(false);
  };

  const handleWhatsApp = (po: any) => {
    const vendor = vendors.find(v => v.id.toString() === po.vendorId);
    const vendorPhone = vendor?.phone?.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '') || '';
    const poNumber = po.displayId;
    const amount = po.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const vendorName = vendor?.name || 'Vendor';
    const message = `Dear ${vendorName},\n\nPlease find the Purchase Order details:\n\nPO Number: ${poNumber}\nAmount: Rs. ${amount}\n\nPlease find attached purchase order.\n\nRegards,\n${userProfile.company || 'JAKHIRA'}`;
    const encodedMsg = encodeURIComponent(message);
    const url = vendorPhone
      ? `https://wa.me/${vendorPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;
    window.open(url, '_blank');
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
            <p className="text-sm text-muted-foreground">Create and manage purchase orders to vendors.</p>
          </div>
          {canCreate("Purchase Orders") ? <Button data-testid="button-create-po" onClick={() => setLocation('/purchase-orders/create')}><Plus className="w-4 h-4 mr-2" /> Create PO</Button> : null}
            <Dialog open={editingId !== null} onOpenChange={(isOpen) => {
              if (!isOpen) {
                setEditingId(null);
                setFormData({ siteId: '', vendorId: '', date: new Date().toISOString().split('T')[0], expectedDelivery: '', withGst: true, billingName: '', billingAddress: '', shippingAddress: '', sameAsBilling: true, siteCode: '', billingCode: '', enableEstimatedCartage: false, estimatedCartage: '0', otherEstimatedCharges: '0' });
                setItems([{ materialId: '', qty: '', rate: '', taxPercent: '0' }]);
                setActiveRow(null);
              }
            }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Purchase Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Site / Project *</Label>
                      <SearchableSelect options={sites} value={formData.siteId} onSelect={(val) => { const nextSite = sites.find((s) => s.id.toString() === val); const defaults = getSiteAddressDefaults(nextSite); setFormData((prev) => ({ ...prev, siteId: val, billingName: defaults.billingName, billingAddress: defaults.billTo, shippingAddress: prev.sameAsBilling ? defaults.billTo : defaults.shipTo, siteCode: nextSite?.siteCode || '', billingCode: nextSite?.billingCode || nextSite?.poPrefix || '' })); }} placeholder="Select site" getOptionLabel={(site) => site.siteName || site.name} getOptionValue={(site) => site.id.toString()} getOptionDescription={(site) => site.status || null} inputClassName="h-10" noResultsText="No matching sites" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Vendor *</Label>
                      <SearchableSelect options={vendors} value={formData.vendorId} onSelect={(val) => handleVendorChange(val)} placeholder="Select vendor" getOptionLabel={(vendor) => vendor.name} getOptionValue={(vendor) => vendor.id.toString()} getOptionDescription={(vendor) => vendor.address || null} data-testid="select-po-vendor" inputClassName="h-10" noResultsText="No matching vendors" />
                      {selectedVendor && (
                        <p className="text-xs text-muted-foreground">
                          Vendor Address: {selectedVendor.address || '-'}
                        </p>
                      )}
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card className="border bg-muted/20 shadow-none">
                    <CardContent className="space-y-4 p-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Billing Details</h4>
                        <p className="text-xs text-muted-foreground">Auto-filled from the selected site and editable when needed.</p>
                      </div>
                      <div className="grid gap-2">
                        <Label>Billing Name *</Label>
                        <Input
                          value={formData.billingName}
                          onChange={(e) => setFormData({ ...formData, billingName: e.target.value })}
                          placeholder="Billing name"
                          data-testid="input-po-billing-name"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Billing Address *</Label>
                        <Textarea
                          value={formData.billingAddress}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            billingAddress: e.target.value,
                            shippingAddress: prev.sameAsBilling ? e.target.value : prev.shippingAddress
                          }))}
                          placeholder="Billing address"
                          className="min-h-[132px]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border bg-muted/20 shadow-none">
                    <CardContent className="space-y-4 p-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Shipping Details</h4>
                        <p className="text-xs text-muted-foreground">Use the site shipping address or override it for this PO only.</p>
                      </div>
                      <label className="flex items-center gap-3 rounded-md border bg-background p-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={formData.sameAsBilling}
                          onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            sameAsBilling: e.target.checked,
                            shippingAddress: e.target.checked ? prev.billingAddress : prev.shippingAddress
                          }))}
                        />
                        Shipping same as Billing
                      </label>
                      <div className="grid gap-2">
                        <Label>Shipping Address {formData.sameAsBilling ? '' : '*'}</Label>
                        <Textarea
                          value={formData.sameAsBilling ? formData.billingAddress : formData.shippingAddress}
                          disabled={formData.sameAsBilling}
                          onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                          placeholder="Shipping address"
                          className="min-h-[132px]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>PO Date</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} data-testid="input-po-date" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Expected Delivery</Label>
                    <Input type="date" value={formData.expectedDelivery} onChange={e => setFormData({...formData, expectedDelivery: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tax/GST Selection</Label>
                    <Select value={formData.withGst ? 'yes' : 'no'} onValueChange={v => setFormData({...formData, withGst: v === 'yes'})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">With GST</SelectItem>
                        <SelectItem value="no">Without GST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedSite && (
                  <div className="grid grid-cols-2 gap-4 rounded-md border p-3 bg-muted/30">
                    <div className="text-sm"><strong>Site Code:</strong> {selectedSite.siteCode || '-'}</div>
                    <div className="text-sm"><strong>Billing Code:</strong> {selectedSite.billingCode || selectedSite.poPrefix || '-'}</div>
                    <div className="text-sm col-span-2"><strong>PO Preview:</strong> {(selectedSite.billingCode || selectedSite.poPrefix || 'BILL') + '/' + (selectedSite.siteCode || 'SITE') + '/PO/' + ((new Date(formData.date || new Date().toISOString().split('T')[0]).getMonth() >= 3 ? String(new Date(formData.date || new Date().toISOString().split('T')[0]).getFullYear()%100).padStart(2,'0') + '-' + String((new Date(formData.date || new Date().toISOString().split('T')[0]).getFullYear()+1)%100).padStart(2,'0') : String((new Date(formData.date || new Date().toISOString().split('T')[0]).getFullYear()-1)%100).padStart(2,'0') + '-' + String(new Date(formData.date || new Date().toISOString().split('T')[0]).getFullYear()%100).padStart(2,'0'))) + '/XXX'}</div>
                  </div>
                )}
                <div className="grid gap-4">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="toggle-estimated-cartage">Enable Estimated Cartage / Freight</Label>
                    <Switch id="toggle-estimated-cartage" checked={formData.enableEstimatedCartage} onCheckedChange={(checked) => setFormData({ ...formData, enableEstimatedCartage: checked })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.enableEstimatedCartage && (
                      <div className="grid gap-2">
                        <Label>Estimated Cartage / Freight (₹)</Label>
                        <Input type="number" min="0" value={formData.estimatedCartage} onChange={e => setFormData({ ...formData, estimatedCartage: e.target.value })} />
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label>Other Estimated Charges (₹)</Label>
                      <Input type="number" min="0" value={formData.otherEstimatedCharges} onChange={e => setFormData({ ...formData, otherEstimatedCharges: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-sm">Line Items</h4>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItemRow()} data-testid="button-add-po-item">
                        <Plus className="w-4 h-4 mr-2" /> Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-3 overflow-visible">
                      {items.map((item, index) => (
                          <div key={index} className={`grid grid-cols-12 gap-3 items-end bg-muted/20 p-3 rounded-lg border relative overflow-visible transition-colors ${activeRow === index ? 'border-primary/60 ring-1 ring-primary/30' : 'border-muted'}`}>
                             {items.length > 1 && (
                               <Button type="button" variant="ghost" size="icon" className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-background border shadow-sm text-destructive hover:bg-destructive hover:text-white" onClick={() => removeItemRow(index)}>
                                 <X className="w-3 h-3" />
                               </Button>
                             )}
                             <div className="col-span-12 md:col-span-4 grid gap-2">
                                <Label className="text-xs">Material *</Label>
                                <div className="flex gap-2"><SearchableSelect options={materialOptions} value={item.materialId} onSelect={(val) => { handleMaterialChange(index, val); }} placeholder="Type material name" getOptionLabel={(material) => material.name} getOptionValue={(material) => material.id.toString()} getOptionDescription={(material) => material.unit || "-"} inputRef={(el) => { materialRefs.current[index] = el; }} onFocus={() => setActiveRow(index)} onInputChange={() => { updateItem(index, 'materialId', ''); updateItem(index, 'rate', ''); }} inputClassName="h-9" noResultsText="No matching materials" /><Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => { setPendingMaterialRow(index); setMaterialModalOpen(true); }}><Plus className="h-4 w-4" /></Button></div>
                             </div>
                             <div className="col-span-6 md:col-span-2 grid gap-2">
                                <Label className="text-xs">Unit</Label>
                                <Input className="h-9 bg-muted" value={materialOptions.find(m => m.id.toString() === item.materialId)?.unit || ''} readOnly tabIndex={-1} />
                             </div>
                             <div className="col-span-6 md:col-span-1 grid gap-2">
                                <Label className="text-xs">Quantity</Label>
                                <Input ref={(el) => { qtyRefs.current[index] = el; }} type="number" min="0" step="0.01" className="h-9 focus-visible:ring-primary/40" value={item.qty} onFocus={() => setActiveRow(index)} onChange={e => updateItem(index, 'qty', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); rateRefs.current[index]?.focus(); } }} />
                             </div>
                             <div className="col-span-6 md:col-span-1 grid gap-2">
                                <Label className="text-xs">Rate (₹)</Label>
                                <Input ref={(el) => { rateRefs.current[index] = el; }} type="number" min="0" step="0.01" className="h-9 focus-visible:ring-primary/40" value={item.rate} onFocus={() => setActiveRow(index)} onChange={e => updateItem(index, 'rate', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItemRow(true); } }} />
                             </div>
                             <div className={`col-span-6 md:col-span-2 grid gap-2 ${!formData.withGst && 'opacity-50'}`}>
                                <Label className="text-xs">Tax (%)</Label>
                                <Input type="number" min="0" max="100" className="h-9" value={formData.withGst ? item.taxPercent : '0'} disabled={!formData.withGst} onChange={e => updateItem(index, 'taxPercent', e.target.value)} />
                             </div>
                             <div className="col-span-6 md:col-span-2 grid gap-2">
                                <Label className="text-xs text-right block">Total</Label>
                                <div className="h-9 flex items-center justify-end font-medium text-sm">
                                    ₹{round2((Number(item.qty) || 0) * (Number(item.rate) || 0) * (1 + (formData.withGst ? Number(item.taxPercent) : 0) / 100)).toLocaleString(undefined, {maximumFractionDigits: 2})}
                                </div>
                             </div>
                          </div>
                      ))}
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-md flex flex-col items-end mt-4">
                  <div className="flex justify-between w-full md:w-1/2 mb-2 text-sm text-muted-foreground">
                      <span>Material Amount:</span>
                      <span>₹{getMaterialAmount().toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  </div>
                  {formData.enableEstimatedCartage && (
                    <div className="flex justify-between w-full md:w-1/2 mb-2 text-sm text-muted-foreground">
                        <span>Estimated Cartage / Freight:</span>
                        <span>₹{getEstimatedCartage().toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                    </div>
                  )}
                  <div className="flex justify-between w-full md:w-1/2 mb-2 text-sm text-muted-foreground">
                      <span>Other Charges:</span>
                      <span>₹{getOtherEstimatedCharges().toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between w-full md:w-1/2 mb-2 text-sm text-muted-foreground border-b pb-2">
                      <span>Subtotal:</span>
                      <span>₹{getEstimatedSubTotal().toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  </div>
                  {formData.withGst && (
                      <div className="flex justify-between w-full md:w-1/2 mb-3 text-sm text-muted-foreground border-b pb-2">
                          <span>Total GST:</span>
                          <span>₹{calculateTaxAmount().toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                      </div>
                  )}
                  <div className={`flex justify-between w-full md:w-1/2 ${!formData.withGst ? 'border-t pt-2 mt-2' : ''}`}>
                      <span className="font-medium">PO Total:</span>
                      <span className="font-bold text-lg text-primary" data-testid="text-po-grand-total">₹{calculateTotalAmount().toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-2">
                  {!editingId && <Button type="button" variant="outline" onClick={handleSubmit}>Save as Draft</Button>}
                  <Button type="submit" data-testid="button-save-po">{editingId ? 'Update' : 'Publish'} PO</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Site Code</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po) => {
                  const vendor = vendors.find(v => v.id.toString() === po.vendorId);
                  const site = sites.find(s => s.id.toString() === po.siteId);
                  return (
                    <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                      <TableCell className="font-medium text-primary" data-testid={`text-po-id-${po.id}`}>{po.poNumber || po.displayId}</TableCell><TableCell>{po.siteCode || sites.find(s => s.id.toString() === po.siteId)?.siteCode || "-"}</TableCell>
                      <TableCell>{po.date}</TableCell>
                      <TableCell className="text-muted-foreground">{site?.siteName || site?.name || '-'}</TableCell>
                      <TableCell>{vendor?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right font-medium">₹{po.totalAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                            po.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                            po.status === 'Partial' ? 'bg-blue-50 text-blue-700' :
                            'bg-amber-50 text-amber-700'
                          }>
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" data-testid={`button-download-po-${po.id}`}>
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleDownloadWithTemplate(po)} data-testid={`button-download-choose-${po.id}`}>
                                    <Download className="w-4 h-4 text-primary" />
                                    <span>Download PO</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-green-600" onClick={() => handleWhatsApp(po)} title="Send via WhatsApp" data-testid={`button-whatsapp-po-${po.id}`}>
                                  <MessageCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setViewPO(po)} data-testid={`button-view-po-${po.id}`}>
                                  <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(po)} disabled={!canEdit("Purchase Orders")} data-testid={`button-edit-po-${po.id}`}>
                                  <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deletePO(po.id)} disabled={!canDelete("Purchase Orders")} data-testid={`button-delete-po-${po.id}`}>
                                  <Trash2 className="w-4 h-4" />
                              </Button>
                          </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredPOs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No purchase orders found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>



        <Dialog open={!!viewPO} onOpenChange={(isOpen) => !isOpen && setViewPO(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Purchase Order Details</DialogTitle></DialogHeader>
            {viewPO && (() => {
              const vendor = vendors.find(v => v.id.toString() === viewPO.vendorId);
              const site = sites.find(s => s.id.toString() === viewPO.siteId);
              const itemSubtotal = viewPO.items.reduce((sum: number, item: any) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
              const freight = Number(viewPO.estimatedCartage || viewPO.freightAmount || 0);
              const otherCharges = Number(viewPO.otherEstimatedCharges || 0);
              const gstAmount = Number(viewPO.gstAmount || 0);
              const grandTotal = Number(viewPO.totalAmount || 0);
              const poStatusClasses = viewPO.status === 'Completed'
                ? 'bg-emerald-50 text-emerald-700'
                : viewPO.status === 'Cancelled'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-amber-50 text-amber-700';

              return (
                <div className="space-y-6">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Purchase Order</p>
                        <h3 className="text-2xl font-bold tracking-tight">{viewPO.poNumber || viewPO.displayId}</h3>
                      </div>
                      <Badge variant="outline" className={poStatusClasses}>{viewPO.status}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                      <div><span className="text-muted-foreground">PO Date:</span><p className="font-medium">{viewPO.date}</p></div>
                      <div><span className="text-muted-foreground">Expected Delivery:</span><p className="font-medium">{viewPO.expectedDelivery || '-'}</p></div>
                      <div><span className="text-muted-foreground">Vendor Name:</span><p className="font-medium">{vendor?.name || '-'}</p></div>
                      <div><span className="text-muted-foreground">Site Name:</span><p className="font-medium">{site?.siteName || site?.name || '-'}</p></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-4 text-sm space-y-2">
                      <h3 className="font-semibold">Billing Details</h3>
                      <div>
                        <span className="text-muted-foreground">Billing Name:</span>
                        <p className="font-medium whitespace-pre-line">{viewPO.billingName || site?.billingName || site?.projectName || site?.siteName || site?.name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Billing Address:</span>
                        <p className="font-medium whitespace-pre-line">{viewPO.billingAddress || site?.billTo || site?.address || '-'}</p>
                      </div>
                      <div><span className="text-muted-foreground">GST:</span><p className="font-medium">{vendor?.gst || '-'}</p></div>
                    </div>
                    <div className="rounded-lg border p-4 text-sm space-y-2">
                      <h3 className="font-semibold">Shipping Details</h3>
                      <div>
                        <span className="text-muted-foreground">Shipping Address:</span>
                        <p className="font-medium whitespace-pre-line">{viewPO.shippingAddress || site?.shipTo || site?.address || '-'}</p>
                      </div>
                      <div><span className="text-muted-foreground">Site Name:</span><p className="font-medium">{site?.siteName || site?.name || '-'}</p></div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-4">
                    <h3 className="font-semibold">Items</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item No</TableHead>
                          <TableHead>Material Name</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewPO.items.map((item: any, idx: number) => {
                          const material = materials.find(m => m.id.toString() === item.materialId);
                          const lineAmount = Number(item.qty || 0) * Number(item.rate || 0);
                          return (
                            <TableRow key={`${item.materialId}-${idx}`}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{material?.name || 'Unknown'}</TableCell>
                              <TableCell>{material?.unit || '-'}</TableCell>
                              <TableCell className="text-right">{item.qty}</TableCell>
                              <TableCell className="text-right">₹{Number(item.rate || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right">₹{lineAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <div className="space-y-1 text-sm rounded-md bg-muted/30 p-3 md:w-2/3 ml-auto">
                      <div className="flex justify-between"><span>Subtotal:</span><span>₹{itemSubtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between"><span>GST:</span><span>₹{gstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between"><span>Freight:</span><span>₹{freight.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between"><span>Other Charges:</span><span>₹{otherCharges.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between font-semibold border-t pt-2"><span>Grand Total:</span><span>₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => handleDownloadWithTemplate(viewPO)}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print PO
                    </Button>
                    {canEdit("Purchase Orders") ? <Button variant="outline" onClick={() => { setViewPO(null); handleOpenEdit(viewPO); }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button> : null}
                    {canApprove("Purchase Orders") ? <Button variant="outline" onClick={() => updatePOStatus(viewPO.id, "Approved")}>Approve</Button> : null}
                    <Button variant="secondary" onClick={() => setViewPO(null)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
        <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Download Purchase Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid gap-2">
                <Label>Content Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger data-testid="select-download-template">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Standard Template (Default)</SelectItem>
                    {poTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name} {t.isDefault === 'true' ? '★' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {poTemplates.length === 0 && (
                  <p className="text-xs text-muted-foreground">No custom templates saved. Go to Settings &gt; PO Templates to create one.</p>
                )}
              </div>
              {templateStyles.length > 0 && (
                <div className="grid gap-2">
                  <Label>Layout Style</Label>
                  <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                    <SelectTrigger data-testid="select-download-style">
                      <SelectValue placeholder="Choose a layout style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Default Layout</SelectItem>
                      {templateStyles.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name} {s.isDefault === 'true' ? '★' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Controls section ordering and positioning on the PDF</p>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => handleDownloadConfirm('excel')} data-testid="button-download-template-excel">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                  Excel
                </Button>
                <Button onClick={() => handleDownloadConfirm('pdf')} data-testid="button-download-template-pdf">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={materialModalOpen} onOpenChange={setMaterialModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Material</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>Material Name *</Label>
                <Input value={newMaterialForm.name} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, name: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label>Category</Label>
                <Input value={newMaterialForm.category} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, category: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label>Unit</Label>
                <Input value={newMaterialForm.unit} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, unit: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label>Default Rate</Label>
                <Input type="number" min="0" step="0.01" value={newMaterialForm.defaultRate} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, defaultRate: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setMaterialModalOpen(false)}>Cancel</Button>
                <Button onClick={handleInlineMaterialSave}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
