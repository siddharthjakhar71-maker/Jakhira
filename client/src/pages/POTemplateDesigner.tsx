import { useStore, type POTemplateConfig, type POTemplateColumn } from "@/lib/store";
import { DEFAULT_TEMPLATE_CONFIG, ensureTemplateDefaults } from "@/lib/defaultTemplate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Save, Trash2, Star, GripVertical, Eye, EyeOff, Copy, X, Building2, Users, Table2, Calculator, FileText, PenTool } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

function ToggleRow({ label, description, checked, onCheckedChange, testId }: { label: string; description?: string; checked: boolean; onCheckedChange: (v: boolean) => void; testId: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors" data-testid={testId}>
      <div className="space-y-0.5">
        <Label className="text-sm font-medium cursor-pointer">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={`switch-${testId}`} />
    </div>
  );
}

export default function POTemplateDesigner() {
  const { poTemplates, addPOTemplate, updatePOTemplate, deletePOTemplate } = useStore();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [config, setConfig] = useState<POTemplateConfig>(JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG)));
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const selectedTemplate = poTemplates.find(t => t.id === selectedId);

  useEffect(() => {
    if (selectedTemplate) {
      setTemplateName(selectedTemplate.name);
      setConfig(ensureTemplateDefaults(JSON.parse(JSON.stringify(selectedTemplate.config))));
      setIsNew(false);
    }
  }, [selectedId]);

  const handleNew = () => {
    setSelectedId(null);
    setTemplateName('');
    setConfig(JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG)));
    setIsNew(true);
  };

  const handleDuplicate = () => {
    if (!selectedTemplate) return;
    setSelectedId(null);
    setTemplateName(selectedTemplate.name + ' (Copy)');
    setConfig(ensureTemplateDefaults(JSON.parse(JSON.stringify(selectedTemplate.config))));
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({ title: "Template name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const isDefault = poTemplates.length === 0 ? 'true' : 'false';
      if (isNew || !selectedId) {
        await addPOTemplate({ name: templateName, isDefault, config });
        toast({ title: "Template created", description: `"${templateName}" has been saved.` });
      } else {
        await updatePOTemplate(selectedId, { name: templateName, config });
        toast({ title: "Template updated", description: `"${templateName}" has been saved.` });
      }
      setIsNew(false);
    } catch {
      toast({ title: "Error saving template", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSetDefault = async (id: number) => {
    for (const t of poTemplates) {
      if (t.id === id) {
        await updatePOTemplate(t.id, { isDefault: 'true' });
      } else if (t.isDefault === 'true') {
        await updatePOTemplate(t.id, { isDefault: 'false' });
      }
    }
    toast({ title: "Default template updated" });
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    await deletePOTemplate(selectedId);
    setSelectedId(null);
    setIsNew(false);
    setTemplateName('');
    setConfig(JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG)));
    setDeleteDialogOpen(false);
    toast({ title: "Template deleted" });
  };

  const updateHeader = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, header: { ...prev.header, [field]: value } }));
  };

  const updateSection = (field: keyof POTemplateConfig['sections'], value: string) => {
    setConfig(prev => ({ ...prev, sections: { ...prev.sections, [field]: value } }));
  };

  const updateVisibility = (field: keyof POTemplateConfig['visibility'], value: boolean) => {
    setConfig(prev => ({ ...prev, visibility: { ...prev.visibility, [field]: value } }));
  };

  const updateTotals = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      totals: { ...(prev.totals || DEFAULT_TEMPLATE_CONFIG.totals!), [field]: value },
    }));
  };

  const updateFooter = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, footer: { ...prev.footer, [field]: value } }));
  };

  const updateColumn = (index: number, field: keyof POTemplateColumn, value: any) => {
    setConfig(prev => {
      const cols = [...prev.columns];
      cols[index] = { ...cols[index], [field]: value };
      return { ...prev, columns: cols };
    });
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    setConfig(prev => {
      const cols = [...prev.columns];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= cols.length) return prev;
      [cols[index], cols[target]] = [cols[target], cols[index]];
      return { ...prev, columns: cols };
    });
  };

  const addColumn = () => {
    setConfig(prev => ({
      ...prev,
      columns: [...prev.columns, { key: `custom_${Date.now()}`, label: 'New Column', visible: true, align: 'left' as const }],
    }));
  };

  const removeColumn = (index: number) => {
    const col = config.columns[index];
    const protectedKeys = ['itemNo', 'description', 'amount'];
    if (protectedKeys.includes(col.key)) {
      toast({ title: "Cannot remove this column", description: "Item No, Description, and Amount are required columns.", variant: "destructive" });
      return;
    }
    setConfig(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index),
    }));
  };

  const updateTerm = (index: number, value: string) => {
    setConfig(prev => {
      const terms = [...prev.footer.terms];
      terms[index] = value;
      return { ...prev, footer: { ...prev.footer, terms } };
    });
  };

  const addTerm = () => {
    setConfig(prev => ({
      ...prev,
      footer: { ...prev.footer, terms: [...prev.footer.terms, ''] },
    }));
  };

  const removeTerm = (index: number) => {
    setConfig(prev => ({
      ...prev,
      footer: { ...prev.footer, terms: prev.footer.terms.filter((_, i) => i !== index) },
    }));
  };

  const totals = config.totals || DEFAULT_TEMPLATE_CONFIG.totals!;
  const hasEditing = isNew || selectedId !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-po-templates-title">PO Templates</h3>
          <p className="text-sm text-muted-foreground">Create and customize purchase order document templates</p>
        </div>
        {hasEditing && (
          <Button onClick={handleSave} disabled={saving} size="sm" data-testid="button-save-template">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNew} data-testid="button-new-template">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {poTemplates.length === 0 && !isNew && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <p>No templates yet.</p>
                  <Button variant="link" size="sm" onClick={handleNew} className="mt-1">Create your first template</Button>
                </div>
              )}
              <div className="space-y-1">
                {poTemplates.map(t => (
                  <button
                    key={t.id}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${
                      selectedId === t.id && !isNew ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                    }`}
                    onClick={() => { setSelectedId(t.id); setIsNew(false); }}
                    data-testid={`button-template-${t.id}`}
                  >
                    <span className="truncate">{t.name}</span>
                    {t.isDefault === 'true' && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0 ml-1" />
                    )}
                  </button>
                ))}
                {isNew && (
                  <div className="px-3 py-2 rounded-md text-sm bg-primary/10 text-primary font-medium">
                    New Template
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-9">
          {!hasEditing ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p>Select a template to edit or create a new one.</p>
                <Button variant="outline" className="mt-4" onClick={handleNew} data-testid="button-create-first-template">
                  <Plus className="w-4 h-4 mr-2" /> Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 grid gap-2">
                      <Label>Template Name</Label>
                      <Input
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        placeholder="e.g., Standard PO, Without GST, Construction PO"
                        data-testid="input-template-name"
                      />
                    </div>
                    {selectedId && !isNew && (
                      <div className="flex gap-2 pt-6">
                        <Button variant="outline" size="sm" onClick={handleDuplicate} data-testid="button-duplicate-template">
                          <Copy className="w-4 h-4 mr-1" /> Duplicate
                        </Button>
                        {selectedTemplate?.isDefault !== 'true' && (
                          <Button variant="outline" size="sm" onClick={() => handleSetDefault(selectedId)} data-testid="button-set-default">
                            <Star className="w-4 h-4 mr-1" /> Set Default
                          </Button>
                        )}
                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-white" data-testid="button-delete-template">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Delete Template?</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">This action cannot be undone. Are you sure you want to delete "{templateName}"?</p>
                            <div className="flex gap-2 justify-end mt-4">
                              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                              <Button variant="destructive" onClick={handleDelete} data-testid="button-confirm-delete">Delete</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="header">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="header" className="text-xs gap-1" data-testid="tab-header">
                    <Building2 className="w-3.5 h-3.5" /> Header
                  </TabsTrigger>
                  <TabsTrigger value="site-vendor" className="text-xs gap-1" data-testid="tab-site-vendor">
                    <Users className="w-3.5 h-3.5" /> Site & Vendor
                  </TabsTrigger>
                  <TabsTrigger value="columns" className="text-xs gap-1" data-testid="tab-columns">
                    <Table2 className="w-3.5 h-3.5" /> Item Table
                  </TabsTrigger>
                  <TabsTrigger value="totals" className="text-xs gap-1" data-testid="tab-totals">
                    <Calculator className="w-3.5 h-3.5" /> Totals
                  </TabsTrigger>
                  <TabsTrigger value="footer" className="text-xs gap-1" data-testid="tab-footer">
                    <FileText className="w-3.5 h-3.5" /> Footer
                  </TabsTrigger>
                  <TabsTrigger value="signature" className="text-xs gap-1" data-testid="tab-signature">
                    <PenTool className="w-3.5 h-3.5" /> Signature
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="header">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Header Settings</CardTitle>
                      <CardDescription>Company name, logo, and contact details displayed at the top of the PO</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Company Name</Label>
                        <Input
                          value={config.header.companyName}
                          onChange={e => updateHeader('companyName', e.target.value)}
                          data-testid="input-header-company"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Subtitle / Tagline</Label>
                        <Input
                          value={config.header.subtitle}
                          onChange={e => updateHeader('subtitle', e.target.value)}
                          placeholder="e.g., Real Estate Development & Construction"
                          data-testid="input-header-subtitle"
                        />
                      </div>

                      <Separator />

                      <ToggleRow
                        label="Show Contact Details"
                        description="Display phone, email, address in the header bar"
                        checked={config.header.showContactDetails}
                        onCheckedChange={v => updateHeader('showContactDetails', v)}
                        testId="toggle-show-contact"
                      />
                      {config.header.showContactDetails && (
                        <div className="grid gap-2 ml-4">
                          <Label>Contact Details</Label>
                          <Textarea
                            value={config.header.contactDetails}
                            onChange={e => updateHeader('contactDetails', e.target.value)}
                            placeholder="Phone: +91-XXXXXXXXXX | Email: info@company.com | Address: ..."
                            rows={3}
                            data-testid="input-header-contact"
                          />
                        </div>
                      )}

                      <Separator />

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>PO Details Section Title</Label>
                          <Input value={config.sections.poDetailsTitle} onChange={e => updateSection('poDetailsTitle', e.target.value)} data-testid="input-section-po-details" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Terms Section Title</Label>
                          <Input value={config.sections.termsTitle} onChange={e => updateSection('termsTitle', e.target.value)} data-testid="input-section-terms" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="site-vendor">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Site & Vendor Block</CardTitle>
                      <CardDescription>Control which site and vendor fields appear on the PO document</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Bill To / Ship To</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <ToggleRow
                            label="Bill To Address"
                            description="Billing address section"
                            checked={config.visibility.billTo}
                            onCheckedChange={v => updateVisibility('billTo', v)}
                            testId="toggle-bill-to"
                          />
                          <ToggleRow
                            label="Ship To Address"
                            description="Shipping/delivery address"
                            checked={config.visibility.shipTo}
                            onCheckedChange={v => updateVisibility('shipTo', v)}
                            testId="toggle-ship-to"
                          />
                          <ToggleRow
                            label="Billing Name"
                            description="Company billing name"
                            checked={config.visibility.billingName}
                            onCheckedChange={v => updateVisibility('billingName', v)}
                            testId="toggle-billing-name"
                          />
                          <ToggleRow
                            label="Expected Delivery Date"
                            description="Show delivery date field"
                            checked={config.visibility.deliveryDate}
                            onCheckedChange={v => updateVisibility('deliveryDate', v)}
                            testId="toggle-delivery-date"
                          />
                        </div>
                        {(config.visibility.billTo || config.visibility.shipTo) && (
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            {config.visibility.billTo && (
                              <div className="grid gap-2">
                                <Label className="text-xs text-muted-foreground">Bill To Section Title</Label>
                                <Input value={config.sections.billToTitle} onChange={e => updateSection('billToTitle', e.target.value)} className="h-8 text-sm" data-testid="input-section-bill-to" />
                              </div>
                            )}
                            {config.visibility.shipTo && (
                              <div className="grid gap-2">
                                <Label className="text-xs text-muted-foreground">Ship To Section Title</Label>
                                <Input value={config.sections.shipToTitle} onChange={e => updateSection('shipToTitle', e.target.value)} className="h-8 text-sm" data-testid="input-section-ship-to" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Vendor Details</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <ToggleRow
                            label="Vendor GSTIN"
                            description="Show vendor GST number"
                            checked={config.visibility.vendorGst}
                            onCheckedChange={v => updateVisibility('vendorGst', v)}
                            testId="toggle-vendor-gst"
                          />
                          <ToggleRow
                            label="Vendor Contact Person"
                            description="Show contact name"
                            checked={config.visibility.vendorContact}
                            onCheckedChange={v => updateVisibility('vendorContact', v)}
                            testId="toggle-vendor-contact"
                          />
                          <ToggleRow
                            label="Vendor Phone"
                            description="Show phone number"
                            checked={config.visibility.vendorPhone}
                            onCheckedChange={v => updateVisibility('vendorPhone', v)}
                            testId="toggle-vendor-phone"
                          />
                          <ToggleRow
                            label="Vendor Email"
                            description="Show email address"
                            checked={config.visibility.vendorEmail}
                            onCheckedChange={v => updateVisibility('vendorEmail', v)}
                            testId="toggle-vendor-email"
                          />
                          <ToggleRow
                            label="PO Status"
                            description="Show order status badge"
                            checked={config.visibility.poStatus}
                            onCheckedChange={v => updateVisibility('poStatus', v)}
                            testId="toggle-po-status"
                          />
                        </div>
                        <div className="grid gap-2 mt-3">
                          <Label className="text-xs text-muted-foreground">Vendor Details Section Title</Label>
                          <Input value={config.sections.vendorDetailsTitle} onChange={e => updateSection('vendorDetailsTitle', e.target.value)} className="h-8 text-sm" data-testid="input-section-vendor" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="columns">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Item Table Columns</CardTitle>
                          <CardDescription>Add, remove, reorder, and rename columns in the items table</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={addColumn} data-testid="button-add-column">
                          <Plus className="w-4 h-4 mr-1" /> Add Column
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {config.columns.map((col, idx) => {
                          const isProtected = ['itemNo', 'description', 'amount'].includes(col.key);
                          const isBuiltIn = ['itemNo', 'description', 'unit', 'qty', 'rate', 'gst', 'amount'].includes(col.key);
                          return (
                            <div key={idx} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${col.visible ? 'bg-card' : 'bg-muted/40 opacity-70'}`} data-testid={`column-row-${idx}`}>
                              <div className="flex flex-col gap-0.5">
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} data-testid={`button-move-up-${idx}`}>
                                  <span className="text-xs">&#9650;</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(idx, 'down')} disabled={idx === config.columns.length - 1} data-testid={`button-move-down-${idx}`}>
                                  <span className="text-xs">&#9660;</span>
                                </Button>
                              </div>
                              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 grid grid-cols-3 gap-3">
                                <div className="grid gap-1">
                                  <Label className="text-xs text-muted-foreground">Column Heading</Label>
                                  <Input
                                    value={col.label.replace(/\n/g, ' ')}
                                    onChange={e => updateColumn(idx, 'label', e.target.value)}
                                    className="h-8 text-sm"
                                    data-testid={`input-column-label-${idx}`}
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <Label className="text-xs text-muted-foreground">Key {isBuiltIn && <Badge variant="outline" className="text-[10px] ml-1 py-0">built-in</Badge>}</Label>
                                  <Input
                                    value={col.key}
                                    className="h-8 text-sm bg-muted/50"
                                    disabled={isBuiltIn}
                                    onChange={e => updateColumn(idx, 'key', e.target.value)}
                                    data-testid={`input-column-key-${idx}`}
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <Label className="text-xs text-muted-foreground">Alignment</Label>
                                  <Select value={col.align} onValueChange={v => updateColumn(idx, 'align', v)}>
                                    <SelectTrigger className="h-8 text-sm" data-testid={`select-column-align-${idx}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="left">Left</SelectItem>
                                      <SelectItem value="center">Center</SelectItem>
                                      <SelectItem value="right">Right</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => updateColumn(idx, 'visible', !col.visible)}
                                data-testid={`button-toggle-column-${idx}`}
                              >
                                {col.visible ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeColumn(idx)}
                                disabled={isProtected}
                                data-testid={`button-remove-column-${idx}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      <Separator className="my-4" />

                      <ToggleRow
                        label="GST Column"
                        description="Show GST% column in item table (also controls GST in totals)"
                        checked={config.visibility.gst}
                        onCheckedChange={v => updateVisibility('gst', v)}
                        testId="toggle-gst"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="totals">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Totals Section</CardTitle>
                      <CardDescription>Configure which summary rows appear below the item table</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ToggleRow
                        label="Subtotal"
                        description="Show subtotal before taxes/discount"
                        checked={totals.showSubtotal}
                        onCheckedChange={v => updateTotals('showSubtotal', v)}
                        testId="toggle-subtotal"
                      />
                      <ToggleRow
                        label="GST Breakup"
                        description="Show GST amount as a separate line"
                        checked={totals.showGstBreakup}
                        onCheckedChange={v => updateTotals('showGstBreakup', v)}
                        testId="toggle-gst-breakup"
                      />
                      <ToggleRow
                        label="Discount"
                        description="Show a discount row in totals"
                        checked={totals.showDiscount}
                        onCheckedChange={v => updateTotals('showDiscount', v)}
                        testId="toggle-discount"
                      />
                      {totals.showDiscount && (
                        <div className="grid gap-2 ml-4">
                          <Label className="text-xs text-muted-foreground">Discount Label</Label>
                          <Input
                            value={totals.discountLabel || 'Discount'}
                            onChange={e => updateTotals('discountLabel', e.target.value)}
                            placeholder="e.g., Discount, Trade Discount"
                            className="h-8 text-sm"
                            data-testid="input-discount-label"
                          />
                        </div>
                      )}

                      <ToggleRow
                        label="Enable Cartage / Freight"
                        description="Show cartage/freight row in totals and PO form"
                        checked={!!totals.enableFreight}
                        onCheckedChange={v => updateTotals('enableFreight', v)}
                        testId="toggle-enable-freight"
                      />
                      {totals.enableFreight && (
                        <div className="grid gap-2 ml-4">
                          <Label className="text-xs text-muted-foreground">Freight GST Mode</Label>
                          <Select
                            value={totals.freightGstMode || 'exclude'}
                            onValueChange={(v) => updateTotals('freightGstMode', v)}
                          >
                            <SelectTrigger className="h-8 text-sm" data-testid="select-freight-gst-mode">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="include">GST applied on Freight</SelectItem>
                              <SelectItem value="exclude">GST excluded from Freight</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <ToggleRow
                        label="Round Off"
                        description="Show round-off adjustment row"
                        checked={totals.showRoundOff}
                        onCheckedChange={v => updateTotals('showRoundOff', v)}
                        testId="toggle-round-off"
                      />
                      <ToggleRow
                        label="Amount in Words"
                        description="Display total amount in words (e.g., 'Rupees One Lakh Only')"
                        checked={totals.showAmountInWords}
                        onCheckedChange={v => updateTotals('showAmountInWords', v)}
                        testId="toggle-amount-in-words"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="footer">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Footer -- Terms & Conditions</CardTitle>
                      <CardDescription>Payment terms, warranty, inspection clauses, and other conditions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-medium">Terms & Conditions</Label>
                          <Button variant="outline" size="sm" onClick={addTerm} data-testid="button-add-term">
                            <Plus className="w-4 h-4 mr-1" /> Add Clause
                          </Button>
                        </div>
                        {config.footer.terms.map((term, idx) => (
                          <div key={idx} className="flex gap-2 items-start" data-testid={`term-row-${idx}`}>
                            <span className="text-sm text-muted-foreground font-mono font-medium pt-2 w-6 flex-shrink-0">{idx + 1}.</span>
                            <Textarea
                              value={term}
                              onChange={e => updateTerm(idx, e.target.value)}
                              rows={2}
                              className="text-sm flex-1"
                              data-testid={`input-term-${idx}`}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive mt-1" onClick={() => removeTerm(idx)} data-testid={`button-remove-term-${idx}`}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {config.footer.terms.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No terms added. Click "Add Clause" to add payment terms, warranty, or inspection clauses.</p>
                        )}
                      </div>

                      <Separator />

                      <div className="grid gap-2">
                        <Label>Footer Note</Label>
                        <Input
                          value={config.footer.footerNote}
                          onChange={e => updateFooter('footerNote', e.target.value)}
                          placeholder="e.g., This is a system-generated Purchase Order"
                          data-testid="input-footer-note"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="signature">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Signature Section</CardTitle>
                      <CardDescription>Configure the signature block at the bottom of the PO document</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ToggleRow
                        label="Show Signature Section"
                        description="Display signature lines and labels at the bottom"
                        checked={config.footer.showSignature}
                        onCheckedChange={v => updateFooter('showSignature', v)}
                        testId="toggle-show-signature"
                      />

                      {config.footer.showSignature && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label className="text-sm">Left Signature Label</Label>
                              <Input
                                value={config.footer.signatureLeftLabel}
                                onChange={e => updateFooter('signatureLeftLabel', e.target.value)}
                                placeholder="e.g., Prepared By:"
                                data-testid="input-sig-left"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label className="text-sm">Right Signature Label (Authorized Signatory)</Label>
                              <Input
                                value={config.footer.signatureRightLabel}
                                onChange={e => updateFooter('signatureRightLabel', e.target.value)}
                                placeholder="e.g., Authorized Signatory"
                                data-testid="input-sig-right"
                              />
                            </div>
                          </div>

                          <Separator />

                          <ToggleRow
                            label="Show Stamp Block"
                            description="Display company stamp placeholder area"
                            checked={config.footer.showStampBlock ?? true}
                            onCheckedChange={v => updateFooter('showStampBlock', v)}
                            testId="toggle-stamp-block"
                          />
                          {(config.footer.showStampBlock ?? true) && (
                            <div className="grid gap-2 ml-4">
                              <Label className="text-xs text-muted-foreground">Stamp Block Label</Label>
                              <Input
                                value={config.footer.stampBlockLabel || '(Company Stamp & Signature)'}
                                onChange={e => updateFooter('stampBlockLabel', e.target.value)}
                                placeholder="e.g., (Company Stamp & Signature)"
                                className="h-8 text-sm"
                                data-testid="input-stamp-label"
                              />
                            </div>
                          )}

                          <Separator />

                          <div className="grid gap-2">
                            <Label className="text-sm">Signature Image URL (optional)</Label>
                            <Input
                              value={config.footer.signatureImageUrl || ''}
                              onChange={e => updateFooter('signatureImageUrl', e.target.value)}
                              placeholder="https://example.com/signature.png"
                              data-testid="input-sig-image"
                            />
                            <p className="text-xs text-muted-foreground">Paste a direct image URL for the authorized signature. This will be placed above the signature line in the PDF.</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
