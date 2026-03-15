# JAKHIRA - Procurement Dashboard

## Overview
A fully offline, single-user Purchase Department procurement dashboard for "JAKHIRA" (real estate company). Built with React/TypeScript frontend and Express/SQLite backend. Runs entirely locally with no cloud or internet dependencies.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS + shadcn/ui + Recharts
- **Backend**: Express 5 + Drizzle ORM + SQLite (better-sqlite3)
- **Database**: File-based SQLite at `./data/local.db` (persistent, local, offline)
- **State Management**: React Context wrapping TanStack Query for server state
- **Routing**: wouter (client-side)
- **Data Persistence**: SQLite database via Drizzle ORM (all CRUD through `/api/*` routes)

## Authentication
- Single-user login: `siddharthjakhar71@gmail.com` / `8800447427`
- Password stored in `user_profile` table
- Session tracked via `sessionStorage` on client (`app_auth` key)

## Database Schema (shared/schema.ts)
All entities use SQLite `integer` primary keys with autoincrement and a `displayId` text field for human-readable IDs:
- `sites` - Project sites with address, billingName, billTo, shipTo fields (S-1, S-2, ...)
- `vendors` - Supplier companies
- `materials` - Material catalog with default rates
- `purchase_orders` - POs with JSON `items` array stored as text (PO-001, PO-002, ...)
- `grns` - Goods Receipt Notes (GRN-001, ...)
- `bills` - Vendor invoices (BILL-001, ...)
- `payments` - Payment records (PAY-001, ...)
- `po_templates` - Named PO templates with JSON config (header, sections, columns, visibility, footer)
- `template_styles` - Layout styles with JSON config (blocks array, linkedTemplateId)
- `user_profile` - Single user profile + password
- `vendor_quotations` - Vendor quotation comparisons (VQ-001, ...) with JSON items array
- `material_issues` - Material consumption/issue records (ISS-001, ...) with JSON items array
- `site_stock` - Per-site material stock balances (receivedQty, issuedQty)
- `material_rate_history` - Historical material rates from POs and quotations

## Key Files
- `shared/schema.ts` - Drizzle SQLite schema definitions + Zod insert schemas
- `server/db.ts` - SQLite database initialization (creates tables at startup, WAL mode)
- `server/storage.ts` - IStorage interface + DatabaseStorage implementation
- `server/routes.ts` - REST API routes (all prefixed `/api/`)
- `client/src/lib/store.tsx` - React Context store (wraps TanStack Query)
- `client/src/lib/api.ts` - API client functions
- `client/src/App.tsx` - Route definitions + QueryClientProvider
- `client/src/pages/Settings.tsx` - Unified Settings page (General + PO Templates)
- `client/src/pages/POTemplateDesigner.tsx` - PO Template Designer component (embedded in Settings)
- `client/src/pages/TemplateStyleDesigner.tsx` - Grid-based layout builder for PO sections
- `client/src/pages/VendorQuotations.tsx` - Vendor quotation comparison module
- `client/src/pages/StockManagement.tsx` - Site stock tracking + material issues
- `client/src/pages/RateHistory.tsx` - Material rate history viewer
- `client/src/lib/poDocGenerator.ts` - PDF/Excel generator (dynamic block-order-driven)
- `client/src/lib/defaultTemplate.ts` - Default PO template config + ensureTemplateDefaults deep-merger

## Template & Layout System
- **PO Templates** (`po_templates` table): Content config — header, sections, columns, visibility, totals, footer
- **Template Styles** (`template_styles` table): Layout config — grid-based block positions (row/col/colSpan/visible)
- **LayoutBlock schema**: `{ id, label, row, col, colSpan, visible }` — 2-column grid, blocks span 1 or 2 columns
- **Download flow**: `PurchaseOrders.tsx` resolves both templateConfig and layoutBlocks explicitly via `resolveTemplateConfig()` and `resolveLayoutBlocks()` before calling `generatePOPdf()`
- **No silent defaults in generator**: `generatePOPdf` requires both `templateConfig` and `layoutBlocks` — caller must resolve them
- **ensureTemplateDefaults**: Deep-merges all 6 config sections (header, sections, columns, visibility, totals, footer) with defaults to handle missing keys from older saved templates
- **Block rendering order**: PDF generator iterates blocks sorted by row/col, bill-to + ship-to on same row render side-by-side

## PDF Column Alignment Architecture
- **Fixed-mm column widths**: Each non-description column has a fixed mm width (itemNo=12, unit=14, qty=14, gst=12, rate=22, amount=24, hsn=16, taxableAmt=22, sgst=16, cgst=16)
- **Description absorbs remaining space**: Description column width = W (printable width) minus sum of all other visible column widths
- **Proportional compression**: If too many columns are enabled and description would shrink below 25mm, all fixed columns are proportionally compressed to guarantee minimum description width
- **Rounding correction**: Any sub-pixel remainder from rounding is added to the description column (or last column if no description) to guarantee exact W coverage
- **Single unified autoTable**: Items and totals (subtotal, GST, discount, round-off, grand total) render in ONE autoTable call with identical `columnStyles`, guaranteeing mathematical column alignment
- **No colSpan in totals**: Each totals row has N individual cells (one per visible column); empty placeholder cells for unused columns with invisible borders; label in column N-2, value in column N-1
- **Order details via autoTable**: PO details and vendor details use autoTable with 4 fixed-ratio columns (30%|70%|30%|70% of HALF) for precise left/right alignment
- **Bill-to/Ship-to via autoTable**: Address blocks use autoTable with explicit cellWidth for exact 50/50 split

## API Routes
All routes prefixed with `/api/`:
- `POST /api/auth/login` - Login
- `POST /api/auth/change-password` - Change password (validates current, forces re-login)
- `GET/PATCH /api/auth/profile` - User profile
- `GET/POST/PATCH/DELETE /api/sites` - Sites CRUD (+ `/batch` for import)
- `GET/POST/PATCH/DELETE /api/vendors` - Vendors CRUD (+ `/batch`)
- `GET/POST/PATCH/DELETE /api/materials` - Materials CRUD (+ `/batch`)
- `GET/POST/PATCH/DELETE /api/po-templates` - PO Template CRUD
- `GET/POST/PATCH/DELETE /api/template-styles` - Template Style CRUD
- `GET/POST/PATCH/DELETE /api/pos` - Purchase Orders CRUD
- `GET/POST/PATCH/DELETE /api/grns` - GRNs CRUD
- `GET/POST/PATCH/DELETE /api/bills` - Bills CRUD
- `GET/POST/PATCH/DELETE /api/payments` - Payments CRUD
- `GET/POST/PATCH/DELETE /api/vendor-quotations` - Vendor Quotation CRUD
- `GET/POST/PATCH/DELETE /api/material-issues` - Material Issues CRUD
- `GET/POST /api/site-stock` - Site stock read + upsert
- `GET/POST /api/rate-history` - Material rate history read + create
- `GET/POST/DELETE /api/vendor-material-rates` - Vendor-specific material rates CRUD (+ `/:vendorId` GET)

## Features
- Full CRUD for all modules
- Excel/CSV import for Sites, Vendors, Materials
- Multi-line-item POs with GST toggle
- GRN receipt tracking with PO status auto-update
- GRN auto-updates site stock (received qty per material per site)
- Bill generation from GRNs
- Payment recording with bill status update
- Dashboard KPIs and charts (dynamic from real data)
- Notification deep-links for pending tasks
- Master Report Excel export
- Profile settings with password change UI
- PO Template Designer (create/edit/delete named templates, set default, customize header/sections/columns/visibility/footer)
- Template Style Designer (drag-and-drop layout builder for PDF section ordering)
- Template-aware PO PDF/Excel download (select template and style when downloading)
- WhatsApp PO sending (opens wa.me with pre-filled vendor message)
- Vendor Quotation Comparison (multi-vendor quotes, side-by-side comparison, lowest rate highlight, convert to PO)
- Stock Management (per-site stock balances, material issue tracking, auto-deduction on issue)
- Material Rate History (price tracking from POs and quotations, trend indicators)
- Vendor Payment Summary (monthly vendor-wise payment tracking with filters by month/vendor/site)
- Vendor Rate List (vendor-specific material rates, auto-fills PO form when vendor selected)
- Rate Comparison Tool (multi-vendor rate comparison table, lowest rate highlight, Excel export, convert to PO)
- Dashboard site filter (properly filters all KPIs, charts, and tables by selected site)

## Database Tables
- `vendor_material_rates` - Vendor-specific material rates (vendorId, materialId, rate, updatedAt)

## New Modules (v2)

### Vendor Quotation Comparison
- Create quotation requests with multiple vendor entries for same materials
- Comparison table groups by material, highlights lowest rate in green
- Select winning vendor → Finalize quotation
- Convert finalized quotation directly to Purchase Order
- Rate history auto-recorded when quotation saved

### Stock Tracking Per Site
- GRN creation auto-increases site stock (receivedQty)
- Material Issue creation auto-decreases site stock (issuedQty)
- Balance = Total Received - Total Issued
- Filter by site and material
- Negative balances highlighted in red

### Material Rate History
- Auto-recorded when POs created or vendor quotations saved
- Tracks: material, vendor, rate, date, PO number, quotation ID
- Filter by material and vendor
- Rate trend indicators (up/down/stable) comparing latest vs previous rate

### WhatsApp PO Sending
- Message button on each PO in the table
- Opens WhatsApp Web (wa.me) with pre-filled message including vendor name, PO number, amount
- Uses vendor phone number if available

## Offline Architecture
- No cloud dependencies, external APIs, or internet-based services
- SQLite database stored at `./data/local.db` (file-based, persistent)
- All data persists between sessions locally
- Single-user system with local authentication
- PDF/Excel generation happens client-side (jspdf + xlsx libraries)

## Cross-Entity References
Entities reference each other via `displayId` strings (not numeric IDs):
- POs reference vendors/sites by numeric id.toString()
- GRNs reference POs by displayId (e.g., "PO-001")
- Bills reference GRNs and POs by displayId
- Payments reference Bills by displayId
- Vendor Quotations reference vendors/materials by numeric id.toString()
- Material Issues reference sites/materials by numeric id.toString()
- Site Stock references sites/materials by id.toString()
- Rate History references materials/vendors by id.toString(), POs/quotations by displayId

## Desktop App (Electron)
- Build folder: `software-build/`
- Portable .exe (no installer needed)
- Data stored next to exe in `data/` folder
- Single-instance lock prevents duplicate processes
- Build on Windows: `npm install && npx @electron/rebuild && npm run dist`
