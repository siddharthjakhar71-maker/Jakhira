import { useStore, type TemplateStyleConfig, type LayoutBlock } from "@/lib/store";
import { DEFAULT_LAYOUT_BLOCKS } from "@/lib/poDocGenerator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Save, Trash2, Star, Copy, GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, Layout, Columns, Maximize2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DEFAULT_STYLE_CONFIG: TemplateStyleConfig = {
  blocks: JSON.parse(JSON.stringify(DEFAULT_LAYOUT_BLOCKS)),
};

const BLOCK_COLORS: Record<string, string> = {
  header: 'bg-blue-500',
  'order-details': 'bg-sky-500',
  'bill-to': 'bg-green-500',
  'ship-to': 'bg-emerald-500',
  'item-table': 'bg-purple-500',
  'totals-summary': 'bg-violet-500',
  terms: 'bg-orange-500',
  signature: 'bg-rose-500',
};

const BLOCK_LIGHT_COLORS: Record<string, string> = {
  header: 'bg-blue-100 border-blue-300 text-blue-800',
  'order-details': 'bg-sky-100 border-sky-300 text-sky-800',
  'bill-to': 'bg-green-100 border-green-300 text-green-800',
  'ship-to': 'bg-emerald-100 border-emerald-300 text-emerald-800',
  'item-table': 'bg-purple-100 border-purple-300 text-purple-800',
  'totals-summary': 'bg-violet-100 border-violet-300 text-violet-800',
  terms: 'bg-orange-100 border-orange-300 text-orange-800',
  signature: 'bg-rose-100 border-rose-300 text-rose-800',
};

export default function TemplateStyleDesigner() {
  const { templateStyles, addTemplateStyle, updateTemplateStyle, deleteTemplateStyle, poTemplates } = useStore();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [styleName, setStyleName] = useState('');
  const [config, setConfig] = useState<TemplateStyleConfig>(JSON.parse(JSON.stringify(DEFAULT_STYLE_CONFIG)));
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);

  const selectedStyle = templateStyles.find(s => s.id === selectedId);

  useEffect(() => {
    if (selectedStyle) {
      setStyleName(selectedStyle.name);
      const cfg = JSON.parse(JSON.stringify(selectedStyle.config));
      if (!cfg.blocks || cfg.blocks.length === 0) {
        cfg.blocks = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_BLOCKS));
      } else {
        const existingIds = new Set(cfg.blocks.map((b: LayoutBlock) => b.id));
        DEFAULT_LAYOUT_BLOCKS.forEach(def => {
          if (!existingIds.has(def.id)) {
            cfg.blocks.push({ ...def });
          }
        });
        cfg.blocks = cfg.blocks.map((b: any) => {
          if (b.row === undefined) {
            const defBlock = DEFAULT_LAYOUT_BLOCKS.find(d => d.id === b.id);
            return {
              id: b.id,
              label: b.label,
              row: defBlock?.row ?? 0,
              col: defBlock?.col ?? 0,
              colSpan: defBlock?.colSpan ?? 2,
              visible: b.visible ?? true,
            };
          }
          return b;
        });
      }
      setConfig(cfg);
      setIsNew(false);
    }
  }, [selectedId]);

  const handleNew = () => {
    setSelectedId(null);
    setStyleName('');
    setConfig(JSON.parse(JSON.stringify(DEFAULT_STYLE_CONFIG)));
    setIsNew(true);
  };

  const handleDuplicate = () => {
    if (!selectedStyle) return;
    setSelectedId(null);
    setStyleName(selectedStyle.name + ' (Copy)');
    setConfig(JSON.parse(JSON.stringify(selectedStyle.config)));
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!styleName.trim()) {
      toast({ title: "Style name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const isDefault = templateStyles.length === 0 ? 'true' : 'false';
      if (isNew || !selectedId) {
        await addTemplateStyle({ name: styleName, isDefault, config });
        toast({ title: "Style created", description: `"${styleName}" has been saved.` });
      } else {
        await updateTemplateStyle(selectedId, { name: styleName, config });
        toast({ title: "Style updated", description: `"${styleName}" has been saved.` });
      }
      setIsNew(false);
    } catch {
      toast({ title: "Error saving style", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSetDefault = async (id: number) => {
    for (const s of templateStyles) {
      if (s.id === id) {
        await updateTemplateStyle(s.id, { isDefault: 'true' });
      } else if (s.isDefault === 'true') {
        await updateTemplateStyle(s.id, { isDefault: 'false' });
      }
    }
    toast({ title: "Default style updated" });
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    await deleteTemplateStyle(selectedId);
    setSelectedId(null);
    setIsNew(false);
    setDeleteDialogOpen(false);
    toast({ title: "Style deleted" });
  };

  const getMaxRow = () => {
    return Math.max(...config.blocks.map(b => b.row), 0);
  };

  const sortedBlocks = [...config.blocks].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const moveBlockUp = (blockId: string) => {
    setConfig(prev => {
      const block = prev.blocks.find(b => b.id === blockId);
      if (!block || block.row === 0) return prev;

      const targetRow = block.row - 1;
      const blocksInTargetRow = prev.blocks.filter(b => b.row === targetRow);
      const blocks = prev.blocks.map(b => {
        if (b.id === blockId) return { ...b, row: targetRow };
        if (blocksInTargetRow.some(tb => tb.id === b.id)) return { ...b, row: block.row };
        return b;
      });
      return { ...prev, blocks };
    });
  };

  const moveBlockDown = (blockId: string) => {
    setConfig(prev => {
      const block = prev.blocks.find(b => b.id === blockId);
      if (!block) return prev;
      const maxRow = getMaxRow();
      const targetRow = block.row + 1;

      const blocksInTargetRow = prev.blocks.filter(b => b.row === targetRow);
      const blocks = prev.blocks.map(b => {
        if (b.id === blockId) return { ...b, row: targetRow > maxRow ? maxRow + 1 : targetRow };
        if (blocksInTargetRow.some(tb => tb.id === b.id)) return { ...b, row: block.row };
        return b;
      });
      return { ...prev, blocks };
    });
  };

  const toggleColSpan = (blockId: string) => {
    setConfig(prev => {
      const block = prev.blocks.find(b => b.id === blockId);
      if (!block) return prev;

      if (block.colSpan === 2) {
        const blocks = prev.blocks.map(b => {
          if (b.id === blockId) return { ...b, colSpan: 1, col: 0 };
          return b;
        });
        return { ...prev, blocks };
      } else {
        const otherInRow = prev.blocks.find(b => b.row === block.row && b.id !== blockId);
        const blocks = prev.blocks.map(b => {
          if (b.id === blockId) return { ...b, colSpan: 2, col: 0 };
          if (otherInRow && b.id === otherInRow.id) {
            const nextFreeRow = getMaxRow() + 1;
            return { ...b, row: nextFreeRow, col: 0, colSpan: 2 };
          }
          return b;
        });
        return { ...prev, blocks };
      }
    });
  };

  const toggleVisibility = (blockId: string) => {
    setConfig(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, visible: !b.visible } : b),
    }));
  };

  const handleGridDragStart = (e: React.DragEvent, blockId: string) => {
    setDragBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGridDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleGridDrop = (e: React.DragEvent, targetRow: number, targetCol: number) => {
    e.preventDefault();
    if (!dragBlockId) return;

    setConfig(prev => {
      const dragBlock = prev.blocks.find(b => b.id === dragBlockId);
      if (!dragBlock) return prev;

      const targetBlock = prev.blocks.find(b => b.row === targetRow && b.col === targetCol && b.id !== dragBlockId);

      const blocks = prev.blocks.map(b => {
        if (b.id === dragBlockId) {
          return { ...b, row: targetRow, col: targetCol };
        }
        if (targetBlock && b.id === targetBlock.id) {
          return { ...b, row: dragBlock.row, col: dragBlock.col };
        }
        return b;
      });
      return { ...prev, blocks };
    });

    setDragBlockId(null);
  };

  const normalizeRows = () => {
    setConfig(prev => {
      const rows = Array.from(new Set(prev.blocks.map(b => b.row))).sort((a, b) => a - b);
      const rowMap = new Map<number, number>();
      rows.forEach((r, i) => rowMap.set(r, i));
      const blocks = prev.blocks.map(b => ({ ...b, row: rowMap.get(b.row) ?? b.row }));
      return { ...prev, blocks };
    });
  };

  const hasEditing = isNew || selectedId !== null;

  const getGridRows = (): { row: number; blocks: LayoutBlock[] }[] => {
    const rowMap = new Map<number, LayoutBlock[]>();
    sortedBlocks.forEach(b => {
      const existing = rowMap.get(b.row) || [];
      existing.push(b);
      rowMap.set(b.row, existing);
    });
    return Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([row, blocks]) => ({ row, blocks }));
  };

  const gridRows = getGridRows();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-template-styles-title">Template Styles</h3>
          <p className="text-sm text-muted-foreground">Drag-and-drop layout builder for PO document sections</p>
        </div>
        {hasEditing && (
          <Button onClick={handleSave} disabled={saving} size="sm" data-testid="button-save-style">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Style'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Styles</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNew} data-testid="button-new-style">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {templateStyles.length === 0 && !isNew && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <p>No styles yet.</p>
                  <Button variant="link" size="sm" onClick={handleNew} className="mt-1">Create your first style</Button>
                </div>
              )}
              <div className="space-y-1">
                {templateStyles.map(s => (
                  <button
                    key={s.id}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors",
                      selectedId === s.id && !isNew ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                    )}
                    onClick={() => { setSelectedId(s.id); setIsNew(false); }}
                    data-testid={`button-style-${s.id}`}
                  >
                    <span className="truncate">{s.name}</span>
                    {s.isDefault === 'true' && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0 ml-1" />
                    )}
                  </button>
                ))}
                {isNew && (
                  <div className="px-3 py-2 rounded-md text-sm bg-primary/10 text-primary font-medium">
                    New Style
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
                <Layout className="w-10 h-10 mb-3 opacity-30" />
                <p>Select a style to edit or create a new one.</p>
                <Button variant="outline" className="mt-4" onClick={handleNew} data-testid="button-create-first-style">
                  <Plus className="w-4 h-4 mr-2" /> Create Style
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 grid gap-2">
                      <Label>Style Name</Label>
                      <Input
                        value={styleName}
                        onChange={e => setStyleName(e.target.value)}
                        placeholder="e.g., Standard Layout, Compact Layout"
                        data-testid="input-style-name"
                      />
                    </div>
                    {selectedId && !isNew && (
                      <div className="flex gap-2 pt-6">
                        <Button variant="outline" size="sm" onClick={handleDuplicate} data-testid="button-duplicate-style">
                          <Copy className="w-4 h-4 mr-1" /> Duplicate
                        </Button>
                        {selectedStyle?.isDefault !== 'true' && (
                          <Button variant="outline" size="sm" onClick={() => handleSetDefault(selectedId)} data-testid="button-set-default-style">
                            <Star className="w-4 h-4 mr-1" /> Set Default
                          </Button>
                        )}
                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-white" data-testid="button-delete-style">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Delete Style?</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">This action cannot be undone. Are you sure you want to delete "{styleName}"?</p>
                            <div className="flex gap-2 justify-end mt-4">
                              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                              <Button variant="destructive" onClick={handleDelete} data-testid="button-confirm-delete-style">Delete</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2 mt-4">
                    <Label>Linked PO Template (Optional)</Label>
                    <Select
                      value={config.linkedTemplateId?.toString() || 'none'}
                      onValueChange={v => setConfig(prev => ({ ...prev, linkedTemplateId: v === 'none' ? undefined : Number(v) }))}
                    >
                      <SelectTrigger data-testid="select-linked-template">
                        <SelectValue placeholder="No linked template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No linked template</SelectItem>
                        {poTemplates.map(t => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {t.name} {t.isDefault === 'true' ? '\u2605' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Link to a PO Template to inherit its content settings (header, columns, visibility, etc.)</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Layout Grid Canvas</CardTitle>
                  <CardDescription>Drag blocks to reorder rows. Use controls to toggle full-width/half-width, visibility, and position.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg bg-muted/30 p-4 space-y-2" data-testid="layout-grid-canvas">
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      <div className="text-[10px] font-semibold text-muted-foreground text-center uppercase tracking-wider">Column 1</div>
                      <div className="text-[10px] font-semibold text-muted-foreground text-center uppercase tracking-wider">Column 2</div>
                    </div>

                    {gridRows.map(({ row, blocks }) => (
                      <div
                        key={row}
                        className={cn(
                          "grid grid-cols-2 gap-1 min-h-[44px] rounded-md border border-dashed border-gray-300 p-1 transition-colors",
                          dragBlockId ? 'border-primary/40 bg-primary/5' : ''
                        )}
                        onDragOver={handleGridDragOver}
                        onDrop={(e) => {
                          const firstBlock = blocks[0];
                          const emptyCol = blocks.length === 1 && firstBlock.colSpan === 1 ? (firstBlock.col === 0 ? 1 : 0) : -1;
                          handleGridDrop(e, row, emptyCol >= 0 ? emptyCol : 0);
                        }}
                        data-testid={`grid-row-${row}`}
                      >
                        {blocks.map(block => (
                          <div
                            key={block.id}
                            draggable
                            onDragStart={(e) => handleGridDragStart(e, block.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-2 rounded border text-xs font-medium cursor-grab active:cursor-grabbing transition-all select-none",
                              block.colSpan === 2 ? 'col-span-2' : 'col-span-1',
                              block.visible
                                ? BLOCK_LIGHT_COLORS[block.id] || 'bg-muted border-border text-foreground'
                                : 'bg-muted/50 border-border text-muted-foreground opacity-50'
                            )}
                            data-testid={`block-${block.id}`}
                          >
                            <GripVertical className="w-3 h-3 flex-shrink-0 opacity-40" />
                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", BLOCK_COLORS[block.id] || 'bg-gray-400')} />
                            <span className="flex-1 truncate">{block.label}</span>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); moveBlockUp(block.id); }}
                                className="p-0.5 rounded hover:bg-black/10 disabled:opacity-20"
                                disabled={block.row === 0}
                                title="Move up"
                                data-testid={`button-move-up-${block.id}`}
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveBlockDown(block.id); }}
                                className="p-0.5 rounded hover:bg-black/10"
                                title="Move down"
                                data-testid={`button-move-down-${block.id}`}
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleColSpan(block.id); }}
                                className="p-0.5 rounded hover:bg-black/10"
                                title={block.colSpan === 2 ? 'Split to half width' : 'Expand to full width'}
                                data-testid={`button-colspan-${block.id}`}
                              >
                                {block.colSpan === 2 ? <Columns className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleVisibility(block.id); }}
                                className="p-0.5 rounded hover:bg-black/10"
                                title={block.visible ? 'Hide block' : 'Show block'}
                                data-testid={`button-toggle-${block.id}`}
                              >
                                {block.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        ))}
                        {blocks.length === 1 && blocks[0].colSpan === 1 && (
                          <div
                            className="col-span-1 border border-dashed border-gray-300 rounded flex items-center justify-center text-[10px] text-muted-foreground min-h-[36px]"
                            onDragOver={handleGridDragOver}
                            onDrop={(e) => handleGridDrop(e, row, blocks[0].col === 0 ? 1 : 0)}
                          >
                            Drop here
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={normalizeRows} className="text-xs">
                      Compact Rows
                    </Button>
                  </div>

                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Grid snapping:</strong> Each row has 2 columns. Blocks can span 1 column (half-width) or 2 columns (full-width).
                      Drag blocks between rows or use arrows to reorder. Bill To and Ship To on the same row render side-by-side in the PDF.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">PDF Preview</CardTitle>
                  <CardDescription>Shows how the document sections will appear in the generated PDF</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg bg-card p-4 max-w-md mx-auto shadow-sm" data-testid="style-preview">
                    <div className="border-2 border-blue-900 rounded p-2 space-y-1.5">
                      {gridRows.map(({ row, blocks: rowBlocks }) => {
                        const visibleBlocks = rowBlocks.filter(b => b.visible);
                        if (visibleBlocks.length === 0) return null;

                        const hasSideBySide = visibleBlocks.length >= 2 && visibleBlocks.some(b => b.colSpan === 1);

                        if (hasSideBySide) {
                          return (
                            <div key={row} className="grid grid-cols-2 gap-1">
                              {visibleBlocks.map(b => (
                                <div
                                  key={b.id}
                                  className={cn(
                                    "px-2 py-1.5 rounded text-[10px] font-medium border",
                                    b.colSpan === 2 ? 'col-span-2' : 'col-span-1',
                                    BLOCK_LIGHT_COLORS[b.id]
                                  )}
                                >
                                  <div className="flex items-center gap-1">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", BLOCK_COLORS[b.id])} />
                                    {b.label}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        }

                        return (
                          <div key={row} className="space-y-1">
                            {visibleBlocks.map(b => (
                              <div
                                key={b.id}
                                className={cn(
                                  "px-2 py-1.5 rounded text-[10px] font-medium border",
                                  BLOCK_LIGHT_COLORS[b.id]
                                )}
                              >
                                <div className="flex items-center gap-1">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", BLOCK_COLORS[b.id])} />
                                  {b.label}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
