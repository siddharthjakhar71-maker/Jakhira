import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useStore, type Material } from "@/lib/store";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";

const round2 = (value: number) => Math.round(value * 100) / 100;

function MaterialAutocomplete({ materials, value, onSelect, onInputChange, inputRef, onFocus, onAddMaterial }: { materials: Material[]; value: string; onSelect: (materialId: string) => void; onInputChange?: () => void; inputRef?: (el: HTMLInputElement | null) => void; onFocus?: () => void; onAddMaterial: () => void; }) {
  const [searchText, setSearchText] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState<Record<string, string | number>>({});
  const internalInputRef = useRef<HTMLInputElement | null>(null);

  const updateDropdownPosition = () => {
    if (!internalInputRef.current) return;
    const rect = internalInputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      maxHeight: 250,
      overflowY: "auto",
    });
  };

  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!value) {
      setSelectedMaterial(null);
      setSearchText("");
      return;
    }

    const matchedMaterial = materials.find((m) => m.id.toString() === value) || null;
    setSelectedMaterial(matchedMaterial);
    setSearchText(matchedMaterial?.name || "");
  }, [materials, value]);

  const matches = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    if (!text) return materials.slice(0, 20);
    return materials.filter((m) => m.name.toLowerCase().includes(text)).slice(0, 20);
  }, [materials, searchText]);

  useEffect(() => {
    if (activeIndex >= matches.length) {
      setActiveIndex(Math.max(matches.length - 1, 0));
    }
  }, [activeIndex, matches.length]);

  const selectMaterial = (material: Material) => {
    onSelect(material.id.toString());
    setSelectedMaterial(material);
    setSearchText(material.name);
    setOpen(false);
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          ref={(el) => {
            internalInputRef.current = el;
            inputRef?.(el);
          }}
          value={searchText}
          placeholder="Search material"
          onFocus={() => { setOpen(true); onFocus?.(); updateDropdownPosition(); }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setSearchText(e.target.value);
            setSelectedMaterial(null);
            onInputChange?.();
            setOpen(true);
            setActiveIndex(0);
            updateDropdownPosition();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActiveIndex((prev) => Math.min(prev + 1, Math.max(matches.length - 1, 0)));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((prev) => Math.max(prev - 1, 0));
            }
            if (e.key === "Escape") {
              setOpen(false);
            }
            if (e.key === "Enter") {
              const chosen = matches[activeIndex];
              if (!chosen) return;
              e.preventDefault();
              selectMaterial(chosen);
            }
          }}
          className="h-11"
        />
        <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={onAddMaterial}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {open && createPortal(
        <div style={dropdownStyle} className="rounded-md border bg-popover shadow-md">
          {matches.map((material, index) => (
            <button
              type="button"
              key={material.id}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted ${activeIndex === index ? 'bg-muted' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setActiveIndex(index);
                selectMaterial(material);
              }}
            >
              <span>{material.name}</span>
              <span className="text-xs text-muted-foreground">{material.unit || "-"}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function PurchaseOrderCreate() {
  const { vendors, materials, sites, addPO, vendorMaterialRates } = useStore();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    siteId: "", vendorId: "", date: new Date().toISOString().split("T")[0], expectedDelivery: "", withGst: true, billingName: "", siteCode: "", billingCode: "", enableEstimatedCartage: false, estimatedCartage: "0", otherEstimatedCharges: "0", applyRoundOff: false,
  });
  const [items, setItems] = useState([{ materialId: "", qty: "", rate: "", taxPercent: "18" }]);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const materialRefs = useRef<Array<HTMLInputElement | null>>([]);
  const qtyRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [pendingMaterialRow, setPendingMaterialRow] = useState<number | null>(null);
  const [newMaterialForm, setNewMaterialForm] = useState({ name: "", category: "", unit: "", defaultRate: "" });
  const [inlineMaterials, setInlineMaterials] = useState<Material[]>([]);
  const materialOptions = useMemo(() => [...materials, ...inlineMaterials], [materials, inlineMaterials]);
  const selectedSite = sites.find((s) => s.id.toString() === formData.siteId);

  const selectMaterial = (index: number, val: string) => {
    const vendorRate = vendorMaterialRates.find((r) => r.vendorId === formData.vendorId && r.materialId === val);
    const mat = materialOptions.find((m) => m.id.toString() === val);
    const rate = vendorRate ? vendorRate.rate.toString() : mat?.defaultRate?.toString() || "";
    const next = [...items];
    next[index] = { ...next[index], materialId: val, rate };
    setItems(next);
    setTimeout(() => qtyRefs.current[index]?.focus(), 0);
  };

  const getMaterialAmount = () => items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const getFreight = () => (formData.enableEstimatedCartage ? Number(formData.estimatedCartage) || 0 : 0);
  const getOther = () => Number(formData.otherEstimatedCharges) || 0;
  const subtotal = getMaterialAmount() + getFreight() + getOther();
  const gst = formData.withGst ? items.reduce((sum, i) => {
    const base = (Number(i.qty) || 0) * (Number(i.rate) || 0);
    return sum + base * ((Number(i.taxPercent) || 0) / 100);
  }, 0) : 0;
  const rawGrandTotal = subtotal + gst;
  const roundedTotal = Math.round(rawGrandTotal);
  const roundOffAmount = roundedTotal - rawGrandTotal;
  const grandTotal = formData.applyRoundOff ? roundedTotal : rawGrandTotal;

  const addItemRow = (focus = false) => {
    const index = items.length;
    setItems([...items, { materialId: "", qty: "", rate: "", taxPercent: "18" }]);
    if (focus) setTimeout(() => materialRefs.current[index]?.focus(), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const meaningfulItems = items.filter((i) => i.materialId || i.qty || i.rate);
    if (!formData.siteId || !formData.vendorId || meaningfulItems.length === 0 || meaningfulItems.some((i) => !i.materialId)) {
      alert("Please select site/vendor and complete at least one material row.");
      return;
    }

    const processedItems = meaningfulItems.map((item) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const tax = formData.withGst ? Number(item.taxPercent) || 0 : 0;
      const baseAmount = round2(qty * rate);
      return { materialId: item.materialId, qty, rate, amount: round2(baseAmount + (baseAmount * tax / 100)), taxPercent: tax };
    });

    addPO({
      siteId: formData.siteId,
      vendorId: formData.vendorId,
      date: formData.date,
      expectedDelivery: formData.expectedDelivery,
      items: processedItems,
      totalAmount: round2(grandTotal),
      estimatedCartage: getFreight(),
      estimatedLoadingAmount: 0,
      otherEstimatedCharges: getOther(),
      subTotal: round2(subtotal),
      gstAmount: round2(gst),
      billingName: formData.billingName,
      billingCode: formData.billingCode,
      siteCode: formData.siteCode,
    });

    setLocation('/pos');
  };

  return (
    <AppLayout>
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-28 pt-4 lg:px-6">
        <Card className="sticky top-3 z-20 border bg-background/95 backdrop-blur">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-3">
                <h1 className="text-2xl font-bold">Create Purchase Order</h1>
                <p className="text-xs text-muted-foreground">PO No: {(selectedSite?.billingCode || selectedSite?.poPrefix || 'BILL') + '/' + (selectedSite?.siteCode || 'SITE') + '/PO/XXX'}</p>
              </div>
              <div className="lg:col-span-2"><Label>Date</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="h-11" /></div>
              <div className="lg:col-span-3"><Label>Site</Label><Select required value={formData.siteId} onValueChange={(val) => { const s = sites.find((x) => x.id.toString() === val); setFormData({ ...formData, siteId: val, billingName: s?.billingName || s?.projectName || s?.siteName || "", siteCode: s?.siteCode || "", billingCode: s?.billingCode || s?.poPrefix || "" }); }}><SelectTrigger className="h-11"><SelectValue placeholder="Select site" /></SelectTrigger><SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.siteName || s.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="lg:col-span-2"><Label>Vendor</Label><Select required value={formData.vendorId} onValueChange={(vendorId) => setFormData({ ...formData, vendorId })}><SelectTrigger className="h-11"><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="lg:col-span-2 flex gap-2"><Button type="button" variant="outline" className="w-full" onClick={() => setLocation('/pos')}>Cancel</Button><Button type="submit" className="w-full">Save</Button></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader><CardTitle className="text-base">Billing & Site Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div><Label>Billing Name</Label><Input readOnly value={formData.billingName} className="h-11" /></div>
            <div><Label>Expected Delivery</Label><Input type="date" value={formData.expectedDelivery} onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })} className="h-11" /></div>
            <div><Label>Include GST</Label><div className="flex h-11 items-center"><Switch checked={formData.withGst} onCheckedChange={(checked) => setFormData({ ...formData, withGst: checked })} /></div></div>
            <div><Label>Freight in Subtotal</Label><div className="flex h-11 items-center"><Switch checked={formData.enableEstimatedCartage} onCheckedChange={(checked) => setFormData({ ...formData, enableEstimatedCartage: checked })} /></div></div>
            {formData.enableEstimatedCartage && <div><Label>Freight</Label><Input type="number" step="0.01" value={formData.estimatedCartage} onChange={(e) => setFormData({ ...formData, estimatedCartage: e.target.value })} className="h-11" /></div>}
            <div><Label>Other Charges</Label><Input type="number" step="0.01" value={formData.otherEstimatedCharges} onChange={(e) => setFormData({ ...formData, otherEstimatedCharges: e.target.value })} className="h-11" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-[52vh] overflow-auto rounded-md border">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-muted sticky top-0"><tr><th className="p-3 text-left">Sr No</th><th className="p-3 text-left">Material</th><th className="p-3 text-left">Unit</th><th className="p-3 text-left">Qty</th><th className="p-3 text-left">Rate</th><th className="p-3 text-right">Amount</th><th className="p-3"></th></tr></thead>
                <tbody>
                  {items.map((item, index) => {
                    const m = materialOptions.find((x) => x.id.toString() === item.materialId);
                    const amount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                    return <tr key={index} className={activeRow === index ? 'bg-primary/5' : ''}>
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2"><MaterialAutocomplete materials={materialOptions} value={item.materialId} onSelect={(val) => selectMaterial(index, val)} onInputChange={() => {
                        const next = [...items];
                        next[index] = { ...next[index], materialId: "", rate: "" };
                        setItems(next);
                      }} inputRef={(el) => materialRefs.current[index] = el} onFocus={() => setActiveRow(index)} onAddMaterial={() => { setPendingMaterialRow(index); setMaterialModalOpen(true); }} /></td>
                      <td className="p-2">{m?.unit || '-'}</td>
                      <td className="p-2"><Input ref={(el) => { qtyRefs.current[index] = el; }} type="number" step="0.01" value={item.qty} onFocus={() => setActiveRow(index)} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, qty: e.target.value } : row))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItemRow(true); } }} className="h-11" /></td>
                      <td className="p-2"><Input type="number" step="0.01" value={item.rate} onFocus={() => setActiveRow(index)} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, rate: e.target.value } : row))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItemRow(true); } }} className="h-11" /></td>
                      <td className="p-2 text-right font-medium">₹{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right"><Button type="button" variant="ghost" size="icon" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" className="mt-4" onClick={() => addItemRow(true)}><Plus className="mr-2 h-4 w-4" /> Add row</Button>
          </CardContent>
        </Card>

        <Card className="sticky bottom-3 z-20 border-2 bg-background/95 backdrop-blur">
          <CardContent className="p-4">
            <div className="ml-auto max-w-md space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>GST</span><span>₹{gst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>Freight</span><span>₹{getFreight().toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>Other Charges</span><span>₹{getOther().toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex items-center justify-between border-t pt-2"><label className="flex items-center gap-2"><input type="checkbox" checked={formData.applyRoundOff} onChange={(e) => setFormData({ ...formData, applyRoundOff: e.target.checked })} />Apply Round Off</label>{formData.applyRoundOff && <span>Round Off: {roundOffAmount >= 0 ? '+' : ''}{roundOffAmount.toFixed(2)}</span>}</div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Grand Total</span><span>₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
            </div>
          </CardContent>
        </Card>
      </form>

      <Dialog open={materialModalOpen} onOpenChange={setMaterialModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={newMaterialForm.name} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Category</Label><Input value={newMaterialForm.category} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, category: e.target.value })} /></div><div><Label>Unit</Label><Input value={newMaterialForm.unit} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, unit: e.target.value })} /></div></div>
            <div><Label>Default Rate</Label><Input type="number" value={newMaterialForm.defaultRate} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, defaultRate: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMaterialModalOpen(false)}>Cancel</Button><Button onClick={async () => {
              const created = await api.createMaterial({ name: newMaterialForm.name.trim(), category: newMaterialForm.category || null, unit: newMaterialForm.unit || null, defaultRate: newMaterialForm.defaultRate === '' ? null : Number(newMaterialForm.defaultRate) || 0 });
              if (created?.id) {
                setInlineMaterials((prev) => [...prev, created]);
                if (pendingMaterialRow !== null) selectMaterial(pendingMaterialRow, created.id.toString());
              }
              setMaterialModalOpen(false);
              setPendingMaterialRow(null);
              setNewMaterialForm({ name: '', category: '', unit: '', defaultRate: '' });
            }}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
