# Objective
Add 5 new modules to the Purchase Dashboard: Vendor Quotation Comparison, Stock Tracking Per Site, Material Rate History, WhatsApp PO Sending, and corresponding UI pages.

Backend (schema, db, storage, routes, api, store) is already complete. Need to create frontend pages.

# Tasks

### T001: Create Vendor Quotations page
- **Blocked By**: []
- **Details**:
  - Create `client/src/pages/VendorQuotations.tsx`
  - Must import and use `AppLayout` wrapper from `@/components/layout/AppLayout`, `useStore` hook from `@/lib/store`
  - Use existing UI components: Card, CardContent from `@/components/ui/card`, Button from `@/components/ui/button`, Table/TableBody/TableCell/TableHead/TableHeader/TableRow from `@/components/ui/table`, Dialog/DialogContent/DialogHeader/DialogTitle from `@/components/ui/dialog`, Input from `@/components/ui/input`, Label from `@/components/ui/label`, Select/SelectContent/SelectItem/SelectTrigger/SelectValue from `@/components/ui/select`, Badge from `@/components/ui/badge`
  - Icons from `lucide-react`
  - Features:
    - List all vendor quotations in a table (displayId, title, date, status, site)
    - Create/Edit dialog to:
      - Enter title, select site, set date
      - Add multiple rows: each row has vendorId, materialId, qty, rate, amount (auto-calc), deliveryDays
      - Save as items array: `{ vendorId, materialId, qty, rate, amount, deliveryDays }`
    - Comparison view dialog: When clicking "Compare" on a quotation, show a comparison table grouped by material, showing each vendor's rate/total for that material side-by-side. Highlight the lowest rate in green.
    - Allow selecting a vendor as winner (sets selectedVendorId on the quotation, status to "Finalized")
    - "Convert to PO" button: creates a new PO from the selected vendor's items using `addPO`, updates quotation status to "Converted" and sets convertedPOId. The PO needs: vendorId, siteId, date, items (each with materialId, qty, rate, amount, taxPercent: 0), totalAmount
    - Delete quotation
    - Status badges: Draft (gray), Finalized (blue), Converted (green)
    - Record rate history when quotation is saved: call `addRateHistory` for each item with { materialId, vendorId, rate, date, poDisplayId: '', quotationDisplayId: displayId }
  - Store functions available: `vendorQuotations, addVendorQuotation, updateVendorQuotation, deleteVendorQuotation, vendors, materials, sites, addPO, addRateHistory, searchQuery`
  - Use `data-testid` attributes on interactive elements
  - Export as default function
  - Files: `client/src/pages/VendorQuotations.tsx`

### T002: Create Stock Management page
- **Blocked By**: []
- **Details**:
  - Create `client/src/pages/StockManagement.tsx`
  - Must import and use `AppLayout` wrapper from `@/components/layout/AppLayout`, `useStore` hook from `@/lib/store`
  - Use existing UI components same as T001 plus Tabs/TabsContent/TabsList/TabsTrigger from `@/components/ui/tabs`
  - Features:
    - Two tabs using shadcn Tabs: "Stock Balance" and "Material Issues"
    - Stock Balance tab:
      - Shows a table of all siteStocks entries: Site Name, Material Name, Received Qty, Issued Qty, Balance (received - issued)
      - Filter by site dropdown and material search
      - Balance = receivedQty - issuedQty, show negative balances in red text
    - Material Issues tab:
      - List all material issues in a table (displayId, site, date, notes)
      - Create dialog:
        - Select site, date, notes textarea
        - Add item rows: materialId (select), qty (input)
        - On save: calls `addMaterialIssue({ siteId, date, items: [{materialId, qty}], notes })` which automatically updates site stock via the store
      - Delete material issue
  - Store functions available: `siteStocks, materialIssues, addMaterialIssue, updateMaterialIssue, deleteMaterialIssue, sites, materials, searchQuery`
  - Use `data-testid` attributes on interactive elements
  - Export as default function
  - Files: `client/src/pages/StockManagement.tsx`

### T003: Create Rate History page
- **Blocked By**: []
- **Details**:
  - Create `client/src/pages/RateHistory.tsx`
  - Must import and use `AppLayout` wrapper from `@/components/layout/AppLayout`, `useStore` hook from `@/lib/store`
  - Use existing UI components same as T001
  - Features:
    - Shows rate history entries in a table: Material Name, Vendor Name, Rate (formatted with Rs.), Date, PO Number, Quotation ID
    - Filter by material dropdown (select) and vendor dropdown (select), both with "All" option
    - For selected material filter: show a rate trend indicator next to the material name - compare latest rate to previous rate and show ArrowUp (red), ArrowDown (green), or Minus (gray) icon
    - Sort entries by date descending (newest first)
    - Search integration with `searchQuery` - filter by material name or vendor name
    - Show "No rate history recorded yet" when empty
  - Store functions available: `rateHistory, materials, vendors, searchQuery`
  - Use `data-testid` attributes on interactive elements
  - Export as default function
  - Files: `client/src/pages/RateHistory.tsx`
