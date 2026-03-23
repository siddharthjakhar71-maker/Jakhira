import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function StockManagement() {
  const { canCreate, canDelete } = usePermissions();
  const { 
    siteStocks, 
    materialIssues, 
    addMaterialIssue, 
    deleteMaterialIssue, 
    sites, 
    materials, 
    searchQuery 
  } = useStore();

  const [activeTab, setActiveTab] = useState("stock-balance");
  const [filterSiteId, setFilterSiteId] = useState<string>("all");
  const [materialSearch, setMaterialSearch] = useState("");

  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [issueSiteId, setIssueSiteId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueNotes, setIssueNotes] = useState("");
  const [issueItems, setIssueItems] = useState<{ materialId: string; qty: string }[]>([{ materialId: "", qty: "" }]);

  const filteredStock = siteStocks.filter(stock => {
    const siteMatch = filterSiteId === "all" || stock.siteId === filterSiteId;
    const material = materials.find(m => m.id.toString() === stock.materialId);
    const searchable = [material?.name || "", material?.category || "", material?.unit || ""].join(" ").toLowerCase();
    const stockSearch = materialSearch.trim().toLowerCase();
    const globalSearch = searchQuery.trim().toLowerCase();
    const matchesStockSearch = !stockSearch || searchable.includes(stockSearch);
    const matchesGlobalSearch = !globalSearch || searchable.includes(globalSearch);
    return siteMatch && matchesStockSearch && matchesGlobalSearch;
  });

  const filteredIssues = materialIssues.filter(issue => {
    const site = sites.find(s => s.id.toString() === issue.siteId);
    const siteName = site?.siteName || site?.name.toLowerCase() || "";
    return siteName.includes(searchQuery.toLowerCase()) || issue.displayId.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAddIssueItem = () => {
    setIssueItems([...issueItems, { materialId: "", qty: "" }]);
  };

  const handleRemoveIssueItem = (index: number) => {
    setIssueItems(issueItems.filter((_, i) => i !== index));
  };

  const handleUpdateIssueItem = (index: number, field: "materialId" | "qty", value: string) => {
    const newItems = [...issueItems];
    newItems[index][field] = value;
    setIssueItems(newItems);
  };

  const handleSaveIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const items = issueItems
      .filter(item => item.materialId && Number(item.qty) > 0)
      .map(item => ({
        materialId: item.materialId,
        qty: Number(item.qty)
      }));

    if (items.length === 0) {
      alert("Please add at least one item with quantity > 0");
      return;
    }

    addMaterialIssue({
      siteId: issueSiteId,
      date: issueDate,
      notes: issueNotes,
      items
    });

    setIsIssueDialogOpen(false);
    resetIssueForm();
  };

  const resetIssueForm = () => {
    setIssueSiteId("");
    setIssueDate(new Date().toISOString().split('T')[0]);
    setIssueNotes("");
    setIssueItems([{ materialId: "", qty: "" }]);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Management</h1>
          <p className="text-sm text-muted-foreground">Track site inventory and material issues.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="stock-balance" data-testid="tabs-trigger-stock-balance">Stock Balance</TabsTrigger>
            <TabsTrigger value="material-issues" data-testid="tabs-trigger-material-issues">Material Issues</TabsTrigger>
          </TabsList>

          <TabsContent value="stock-balance" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Label htmlFor="site-filter">Filter by Site</Label>
                    <SearchableSelect options={[{ id: "all", name: "All Sites", siteName: "All Sites", status: "" }, ...sites]} value={filterSiteId} onSelect={(val) => setFilterSiteId(val)} placeholder="All Sites" getOptionLabel={(site) => site.siteName || site.name} getOptionValue={(site) => site.id.toString()} getOptionDescription={(site) => (site.id === "all" ? "Show every site" : site.status || null)} data-testid="select-filter-site" />
                  </div>
                  <div className="flex-[2]">
                    <Label htmlFor="material-search">Search Material</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="material-search"
                        placeholder="Search materials..."
                        className="pl-8"
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        data-testid="input-search-material"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site Name</TableHead>
                        <TableHead>Material Name</TableHead>
                        <TableHead className="text-right">Received Qty</TableHead>
                        <TableHead className="text-right">Issued Qty</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStock.map((stock) => {
                        const site = sites.find(s => s.id.toString() === stock.siteId);
                        const material = materials.find(m => m.id.toString() === stock.materialId);
                        const balance = stock.receivedQty - stock.issuedQty;
                        return (
                          <TableRow key={stock.id} data-testid={`row-stock-${stock.id}`}>
                            <TableCell>{site?.siteName || site?.name || "Unknown Site"}</TableCell>
                            <TableCell>{material?.name || "Unknown Material"}</TableCell>
                            <TableCell className="text-right">{stock.receivedQty}</TableCell>
                            <TableCell className="text-right">{stock.issuedQty}</TableCell>
                            <TableCell className={`text-right font-bold ${balance < 0 ? "text-destructive" : ""}`}>
                              {balance}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredStock.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            No stock records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="material-issues" className="mt-6">
            <div className="flex justify-end mb-4">
              <Dialog open={isIssueDialogOpen} onOpenChange={(open) => {
                setIsIssueDialogOpen(open);
                if (!open) resetIssueForm();
              }}>
                {canCreate("Stock") ? <DialogTrigger asChild>
                  <Button data-testid="button-create-issue"><Plus className="w-4 h-4 mr-2" /> Create Material Issue</Button>
                </DialogTrigger> : null}
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Material Issue</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveIssue} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Site</Label>
                        <SearchableSelect options={sites} value={issueSiteId} onSelect={(val) => setIssueSiteId(val)} placeholder="Select Site" getOptionLabel={(site) => site.siteName || site.name} getOptionValue={(site) => site.id.toString()} getOptionDescription={(site) => site.status || null} data-testid="select-issue-site" noResultsText="No matching sites" />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input 
                          type="date" 
                          required 
                          value={issueDate} 
                          onChange={(e) => setIssueDate(e.target.value)}
                          data-testid="input-issue-date"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea 
                        placeholder="Reason for issue, vehicle details, etc." 
                        value={issueNotes} 
                        onChange={(e) => setIssueNotes(e.target.value)}
                        data-testid="textarea-issue-notes"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Items</Label>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddIssueItem} data-testid="button-add-item">
                          <Plus className="w-4 h-4 mr-2" /> Add Item
                        </Button>
                      </div>
                      
                      {issueItems.map((item, index) => (
                        <div key={index} className="flex items-end gap-3 p-3 border rounded-lg bg-muted/30">
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs">Material</Label>
                            <SearchableSelect options={materials} value={item.materialId} onSelect={(val) => handleUpdateIssueItem(index, "materialId", val)} placeholder="Select Material" getOptionLabel={(material) => material.name} getOptionValue={(material) => material.id.toString()} getOptionDescription={(material) => material.unit || material.category || null} data-testid={`select-item-material-${index}`} noResultsText="No matching materials" />
                          </div>
                          <div className="w-32 space-y-2">
                            <Label className="text-xs">Quantity</Label>
                            <Input 
                              type="number" 
                              required 
                              min="0.01" 
                              step="any"
                              value={item.qty} 
                              onChange={(e) => handleUpdateIssueItem(index, "qty", e.target.value)}
                              data-testid={`input-item-qty-${index}`}
                            />
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive" 
                            onClick={() => handleRemoveIssueItem(index)}
                            disabled={issueItems.length === 1}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" data-testid="button-save-issue">Save Material Issue</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue ID</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.map((issue) => {
                      const site = sites.find(s => s.id.toString() === issue.siteId);
                      return (
                        <TableRow key={issue.id} data-testid={`row-issue-${issue.id}`}>
                          <TableCell className="font-medium text-primary">{issue.displayId}</TableCell>
                          <TableCell>{site?.siteName || site?.name || "Unknown Site"}</TableCell>
                          <TableCell>{issue.date}</TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              {issue.items.map((item, idx) => {
                                const material = materials.find(m => m.id.toString() === item.materialId);
                                return (
                                  <div key={idx}>
                                    {item.qty} x {material?.name || "Unknown"}
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground italic">
                            {issue.notes || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {canDelete("Stock") ? <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive" 
                              onClick={() => deleteMaterialIssue(issue.id)}
                              data-testid={`button-delete-issue-${issue.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button> : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredIssues.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          No material issues recorded yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
