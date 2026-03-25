ALTER TABLE sites ADD COLUMN po_prefix TEXT NOT NULL DEFAULT '';

ALTER TABLE purchase_orders ADD COLUMN po_number TEXT NOT NULL DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN running_number INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN financial_year TEXT NOT NULL DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN prefix TEXT NOT NULL DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN site_code TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_site_code_unique ON sites (site_code) WHERE TRIM(site_code) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_po_prefix_unique ON sites (po_prefix) WHERE TRIM(po_prefix) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_po_number_unique ON purchase_orders (po_number) WHERE TRIM(po_number) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_site_year_running_unique ON purchase_orders (site_id, financial_year, running_number) WHERE running_number > 0;
