ALTER TABLE sites ADD COLUMN billing_code TEXT NOT NULL DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN billing_code TEXT NOT NULL DEFAULT '';

ALTER TABLE grns ADD COLUMN grn_number TEXT NOT NULL DEFAULT '';
ALTER TABLE grns ADD COLUMN running_number INTEGER NOT NULL DEFAULT 0;
ALTER TABLE grns ADD COLUMN financial_year TEXT NOT NULL DEFAULT '';
ALTER TABLE grns ADD COLUMN site_code TEXT NOT NULL DEFAULT '';
ALTER TABLE grns ADD COLUMN billing_code TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS idx_sites_po_prefix_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_po_number_unique ON purchase_orders (po_number) WHERE TRIM(po_number) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_site_year_running_unique ON purchase_orders (site_id, financial_year, running_number) WHERE running_number > 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_grns_grn_number_unique ON grns (grn_number) WHERE TRIM(grn_number) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_grns_site_year_running_unique ON grns (site_id, financial_year, running_number) WHERE running_number > 0;
