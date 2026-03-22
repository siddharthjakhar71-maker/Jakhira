import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useStore, type Material } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ArrowLeft, CalendarDays, CircleDollarSign, FileText, Plus, Save, ShoppingCart, Trash2, Truck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

const round2 = (value: number) => Math.round(value * 100) / 100;

const initialFormData = {
  siteId: "",
  vendorId: "",
  date: new Date().toISOString().split("T")[0],
  expectedDelivery: "",
  withGst: true,
  billingName: "",
  billingAddress: "",
  shippingAddress: "",
  sameAsBilling: false,
  siteCode: "",
  billingCode: "",
  enableEstimatedCartage: false,
  estimatedCartage: "0",
  otherEstimatedCharges: "0",
  applyRoundOff: false,
};

const initialItems = [{ materialId: "", qty: "", rate: "", taxPercent: "18" }];

const getSiteAddressDefaults = (site?: any) => ({
  billingName: site?.billingName || site?.projectName || site?.siteName || site?.name || "",
  billingAddress: site?.billTo || site?.address || "",
  shippingAddress: site?.shipTo || site?.address || "",
});

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);

const getMaterialSearchCode = (material: Material) => {
  const candidate = (material as Material & { code?: string | null; materialCode?: string | null; materialId?: string | null }).code
    ?? (material as Material & { code?: string | null; materialCode?: string | null; materialId?: string | null }).materialCode
    ?? (material as Material & { code?: string | null; materialCode?: string | null; materialId?: string | null }).materialId
    ?? "";

  return candidate?.toString() ?? "";
};

export default function PurchaseOrderCreate() {
  const { vendors, materials, sites, addPO, vendorMaterialRates } = useStore();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState(initialFormData);
  const [items, setItems] = useState(initialItems);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const materialRefs = useRef<Array<HTMLInputElement | null>>([]);
  const qtyRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [pendingMaterialRow, setPendingMaterialRow] = useState<number | null>(null);
  const [newMaterialForm, setNewMaterialForm] = useState({ name: "", category: "", unit: "", defaultRate: "" });
  const [inlineMaterials, setInlineMaterials] = useState<Material[]>([]);
  const materialOptions = useMemo(() => [...materials, ...inlineMaterials], [materials, inlineMaterials]);
  const selectedSite = sites.find((s) => s.id.toString() === formData.siteId);
  const selectedVendor = vendors.find((v) => v.id.toString() === formData.vendorId);

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
  const gst = formData.withGst
    ? items.reduce((sum, i) => {
        const base = (Number(i.qty) || 0) * (Number(i.rate) || 0);
        return sum + base * ((Number(i.taxPercent) || 0) / 100);
      }, 0)
    : 0;
  const rawGrandTotal = subtotal + gst;
  const roundedTotal = Math.round(rawGrandTotal);
  const roundOffAmount = roundedTotal - rawGrandTotal;
  const grandTotal = formData.applyRoundOff ? roundedTotal : rawGrandTotal;
  const validLineCount = items.filter((item) => item.materialId).length;

  const addItemRow = (focus = false) => {
    const index = items.length;
    setItems([...items, { materialId: "", qty: "", rate: "", taxPercent: "18" }]);
    if (focus) setTimeout(() => materialRefs.current[index]?.focus(), 0);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setItems(initialItems);
    materialRefs.current = [];
    qtyRefs.current = [];
    setActiveRow(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const meaningfulItems = items.filter((i) => i.materialId || i.qty || i.rate);
    if (!formData.siteId || !formData.vendorId || meaningfulItems.length === 0 || meaningfulItems.some((i) => !i.materialId)) {
      alert("Please select site/vendor and complete at least one material row.");
      return;
    }
    if (!formData.billingName.trim() || !formData.billingAddress.trim()) {
      alert("Billing name and billing address are required.");
      return;
    }
    if (!(formData.sameAsBilling ? formData.billingAddress : formData.shippingAddress).trim()) {
      alert("Shipping address is required.");
      return;
    }

    const processedItems = meaningfulItems.map((item) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const tax = formData.withGst ? Number(item.taxPercent) || 0 : 0;
      const baseAmount = round2(qty * rate);
      return { materialId: item.materialId, qty, rate, amount: round2(baseAmount + (baseAmount * tax / 100)), taxPercent: tax };
    });

    const submitData = {
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
      billingAddress: formData.billingAddress,
      shippingAddress: formData.sameAsBilling ? formData.billingAddress : formData.shippingAddress,
      billTo: formData.billingAddress,
      shippingName: formData.billingName,
      shipTo: formData.sameAsBilling ? formData.billingAddress : formData.shippingAddress,
      billingCode: formData.billingCode,
      siteCode: formData.siteCode,
    };

    addPO(submitData);
    resetForm();
    setLocation("/pos");
  };

  return (
    <AppLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-16">
        <PageHeader
          eyebrow="Purchase workflow"
          title="Create Purchase Order"
          description="Refreshed ERP shell, modern forms, and a horizontal line-items workspace while preserving the existing vendor, GST, totals, and submission logic."
          actions={
            <>
              <Link href="/pos">
                <a>
                  <Button type="button" variant="outline">
                    <ArrowLeft className="h-4 w-4" />Back to list
                  </Button>
                </a>
              </Link>
              <Button type="submit" className="rounded-xl">
                <Save className="h-4 w-4" />
                Save Purchase Order
              </Button>
            </>
          }
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[28px] border-border/60 bg-card/95 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/30">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl"><ShoppingCart className="h-5 w-5 text-primary" />PO Header</CardTitle>
                    <CardDescription>Set the site, vendor, schedule, and billing references for this order.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full px-3 py-1">Status: Draft</Badge>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">{validLineCount} line items</Badge>
                    <Badge variant="secondary" className="rounded-full px-3 py-1">{selectedVendor ? selectedVendor.name : "Vendor pending"}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label>PO Reference</Label>
                    <div className="flex h-12 items-center rounded-2xl border border-dashed border-primary/35 bg-primary/5 px-4 text-sm font-medium text-foreground">
                      {(selectedSite?.billingCode || selectedSite?.poPrefix || "BILL") + "/" + (selectedSite?.siteCode || "SITE") + "/PO/XXX"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="po-date">PO Date</Label>
                    <Input id="po-date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="h-12 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Site</Label>
                    <Select
                      required
                      value={formData.siteId}
                      onValueChange={(val) => {
                        const site = sites.find((x) => x.id.toString() === val);
                        const defaults = getSiteAddressDefaults(site);
                        setFormData((prev) => ({
                          ...prev,
                          siteId: val,
                          billingName: defaults.billingName,
                          billingAddress: defaults.billingAddress,
                          shippingAddress: prev.sameAsBilling ? defaults.billingAddress : defaults.shippingAddress,
                          siteCode: site?.siteCode || "",
                          billingCode: site?.billingCode || site?.poPrefix || "",
                        }));
                      }}
                    >
                      <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Select site" /></SelectTrigger>
                      <SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.siteName || s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor</Label>
                    <SearchableSelect
                      options={vendors}
                      value={formData.vendorId}
                      onSelect={(vendorId) => setFormData({ ...formData, vendorId })}
                      placeholder="Select vendor"
                      getOptionLabel={(vendor) => vendor.name}
                      getOptionValue={(vendor) => vendor.id.toString()}
                      getOptionDescription={(vendor) => vendor.address || null}
                      inputClassName="h-12 rounded-2xl"
                      noResultsText="No matching vendors"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-date">Expected Delivery</Label>
                    <Input id="delivery-date" type="date" value={formData.expectedDelivery} onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })} className="h-12 rounded-2xl" />
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Include GST</p>
                        <p className="text-xs text-muted-foreground">Keep existing tax calculation logic.</p>
                      </div>
                      <Switch checked={formData.withGst} onCheckedChange={(checked) => setFormData({ ...formData, withGst: checked })} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Freight in subtotal</p>
                        <p className="text-xs text-muted-foreground">Uses the current estimated cartage fields.</p>
                      </div>
                      <Switch checked={formData.enableEstimatedCartage} onCheckedChange={(checked) => setFormData({ ...formData, enableEstimatedCartage: checked })} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Apply round off</p>
                        <p className="text-xs text-muted-foreground">Grand total rounding only.</p>
                      </div>
                      <Switch checked={formData.applyRoundOff} onCheckedChange={(checked) => setFormData({ ...formData, applyRoundOff: checked })} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-border/60 bg-card/95 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/30">
                <CardTitle className="text-xl">Vendor, billing & delivery</CardTitle>
                <CardDescription>Convert the previous stacked form into a structured ERP information grid while keeping data bindings intact.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-6 xl:grid-cols-2">
                  <Card className="rounded-3xl border-border/60 bg-background shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">Billing details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Billing Name</Label>
                        <Input value={formData.billingName} readOnly className="h-12 rounded-2xl bg-muted/40" />
                      </div>
                      <div className="space-y-2">
                        <Label>Billing Address</Label>
                        <Textarea value={formData.billingAddress} readOnly className="min-h-[150px] rounded-2xl bg-muted/40" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-3xl border-border/60 bg-background shadow-none">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-base">Shipping details</CardTitle>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Switch
                            checked={formData.sameAsBilling}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                sameAsBilling: checked,
                                shippingAddress: checked ? prev.billingAddress : prev.shippingAddress,
                              }))
                            }
                          />
                          Same as billing
                        </label>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Shipping Address</Label>
                        <Textarea
                          value={formData.sameAsBilling ? formData.billingAddress : formData.shippingAddress}
                          disabled={formData.sameAsBilling}
                          onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                          className="min-h-[150px] rounded-2xl"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Estimated Freight</Label>
                    <Input type="number" step="0.01" value={formData.estimatedCartage} onChange={(e) => setFormData({ ...formData, estimatedCartage: e.target.value })} className="h-12 rounded-2xl" disabled={!formData.enableEstimatedCartage} />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Charges</Label>
                    <Input type="number" step="0.01" value={formData.otherEstimatedCharges} onChange={(e) => setFormData({ ...formData, otherEstimatedCharges: e.target.value })} className="h-12 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Remarks / notes</Label>
                    <Textarea placeholder="Optional notes for this PO layout. Stored logic remains unchanged." className="min-h-[48px] rounded-2xl" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-border/60 bg-card/95 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/30">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-xl">Line items</CardTitle>
                    <CardDescription>Horizontal ERP table with overflow handling and fixed column rhythm. Business logic, API payload, and row behavior stay intact.</CardDescription>
                  </div>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => addItemRow(true)}>
                    <Plus className="h-4 w-4" />Add row
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-[1180px] w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="px-4 py-3 text-left font-medium">#</th>
                        <th className="px-4 py-3 text-left font-medium">Material</th>
                        <th className="px-4 py-3 text-left font-medium">Unit</th>
                        <th className="px-4 py-3 text-left font-medium">Qty</th>
                        <th className="px-4 py-3 text-left font-medium">Rate</th>
                        <th className="px-4 py-3 text-left font-medium">GST %</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const material = materialOptions.find((x) => x.id.toString() === item.materialId);
                        const amount = (Number(item.qty) || 0) * (Number(item.rate) || 0);

                        return (
                          <tr key={index} className={cn("border-b border-border/50 align-top transition-colors hover:bg-muted/20", activeRow === index && "bg-primary/5")}>
                            <td className="px-4 py-4 font-medium text-muted-foreground">{index + 1}</td>
                            <td className="px-4 py-4">
                              <div className="flex min-w-[320px] gap-2">
                                <SearchableSelect
                                  options={materialOptions}
                                  value={item.materialId}
                                  onSelect={(val) => selectMaterial(index, val)}
                                  placeholder="Search material"
                                  getOptionLabel={(m) => m.name}
                                  getOptionValue={(m) => m.id.toString()}
                                  getOptionDescription={(m) => [getMaterialSearchCode(m), m.category, m.unit].filter(Boolean).join(" • ") || "-"}
                                  getOptionSearchText={(m) => [m.name, getMaterialSearchCode(m), m.category].filter(Boolean).join(" ")}
                                  onInputChange={() => {
                                    const next = [...items];
                                    next[index] = { ...next[index], materialId: "", rate: "" };
                                    setItems(next);
                                  }}
                                  inputRef={(el) => (materialRefs.current[index] = el)}
                                  onFocus={() => setActiveRow(index)}
                                  inputClassName="h-12 rounded-2xl"
                                  noResultsText="No matching materials"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-12 w-12 shrink-0 rounded-2xl"
                                  onClick={() => {
                                    setPendingMaterialRow(index);
                                    setMaterialModalOpen(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{material?.unit || "-"}</td>
                            <td className="px-4 py-4">
                              <Input
                                ref={(el) => {
                                  qtyRefs.current[index] = el;
                                }}
                                type="number"
                                step="0.01"
                                value={item.qty}
                                onFocus={() => setActiveRow(index)}
                                onChange={(e) => setItems(items.map((row, i) => (i === index ? { ...row, qty: e.target.value } : row)))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addItemRow(true);
                                  }
                                }}
                                className="h-12 min-w-[120px] rounded-2xl"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.rate}
                                onFocus={() => setActiveRow(index)}
                                onChange={(e) => setItems(items.map((row, i) => (i === index ? { ...row, rate: e.target.value } : row)))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addItemRow(true);
                                  }
                                }}
                                className="h-12 min-w-[140px] rounded-2xl"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.taxPercent}
                                disabled={!formData.withGst}
                                onFocus={() => setActiveRow(index)}
                                onChange={(e) => setItems(items.map((row, i) => (i === index ? { ...row, taxPercent: e.target.value } : row)))}
                                className="h-12 min-w-[120px] rounded-2xl"
                              />
                            </td>
                            <td className="px-4 py-4 text-right font-semibold">{formatMoney(amount)}</td>
                            <td className="px-4 py-4 text-right">
                              <Button type="button" variant="ghost" size="icon" className="rounded-xl" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== index))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            <Card className="rounded-[28px] border-border/60 bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">PO summary</CardTitle>
                <CardDescription>Real-time totals using the same pricing and tax rules already implemented.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-primary/10 p-2 text-primary"><CircleDollarSign className="h-5 w-5" /></div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Grand total</p>
                        <p className="text-lg font-semibold">{formatMoney(grandTotal)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-primary/10 p-2 text-primary"><Truck className="h-5 w-5" /></div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Freight</p>
                        <p className="text-lg font-semibold">{formatMoney(getFreight())}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-primary/10 p-2 text-primary"><CalendarDays className="h-5 w-5" /></div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected delivery</p>
                        <p className="text-sm font-semibold">{formData.expectedDelivery || "Not scheduled"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-primary/10 p-2 text-primary"><FileText className="h-5 w-5" /></div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendor</p>
                        <p className="text-sm font-semibold">{selectedVendor?.name || "Not selected"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Material subtotal</span><span className="font-medium">{formatMoney(getMaterialAmount())}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Estimated freight</span><span className="font-medium">{formatMoney(getFreight())}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Other charges</span><span className="font-medium">{formatMoney(getOther())}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">GST</span><span className="font-medium">{formatMoney(gst)}</span></div>
                  {formData.applyRoundOff ? <div className="flex items-center justify-between"><span className="text-muted-foreground">Round off</span><span className="font-medium">{roundOffAmount >= 0 ? "+" : ""}{roundOffAmount.toFixed(2)}</span></div> : null}
                </div>

                <Separator />

                <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white dark:bg-slate-50 dark:text-slate-950">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">Net payable</span>
                    <span className="text-xl font-semibold">{formatMoney(grandTotal)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setLocation("/pos")}>Cancel</Button>
                  <Button type="submit" className="flex-1 rounded-xl">Save</Button>
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      </form>

      <Dialog open={materialModalOpen} onOpenChange={setMaterialModalOpen}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Add material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={newMaterialForm.name} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, name: e.target.value })} className="h-12 rounded-2xl" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={newMaterialForm.category} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, category: e.target.value })} className="h-12 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={newMaterialForm.unit} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, unit: e.target.value })} className="h-12 rounded-2xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Rate</Label>
              <Input type="number" value={newMaterialForm.defaultRate} onChange={(e) => setNewMaterialForm({ ...newMaterialForm, defaultRate: e.target.value })} className="h-12 rounded-2xl" />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setMaterialModalOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  const created = await api.createMaterial({
                    name: newMaterialForm.name.trim(),
                    category: newMaterialForm.category || null,
                    unit: newMaterialForm.unit || null,
                    defaultRate: newMaterialForm.defaultRate === "" ? null : Number(newMaterialForm.defaultRate) || 0,
                  });
                  if (created?.id) {
                    setInlineMaterials((prev) => [...prev, created]);
                    if (pendingMaterialRow !== null) selectMaterial(pendingMaterialRow, created.id.toString());
                  }
                  setMaterialModalOpen(false);
                  setPendingMaterialRow(null);
                  setNewMaterialForm({ name: "", category: "", unit: "", defaultRate: "" });
                }}
              >
                Save Material
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
