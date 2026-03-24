import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import { ERP_PERMISSION_ACTIONS, ERP_PERMISSION_MODULES, ERP_ROLES, buildRolePermissionMap, type PermissionAction, type PermissionModule } from "@shared/permissions";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { hashPassword, isPasswordHashed } from "./auth";

function getDataRoot(): string {
  if (process.env.APP_DATA_DIR) {
    return process.env.APP_DATA_DIR;
  }

  return process.cwd();
}

const DB_PATH = join(getDataRoot(), "data", "local.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_name TEXT NOT NULL DEFAULT '',
    project_name TEXT NOT NULL DEFAULT '',
    site_code TEXT NOT NULL DEFAULT '',
    po_prefix TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    pincode TEXT NOT NULL DEFAULT '',
    contact_person TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    billing_name TEXT NOT NULL DEFAULT '',
    billing_code TEXT NOT NULL DEFAULT '',
    bill_to TEXT NOT NULL DEFAULT '',
    ship_to TEXT NOT NULL DEFAULT ''
  );
CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gst TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  email TEXT DEFAULT '',
  opening_balance REAL NOT NULL DEFAULT 0,
  opening_date TEXT NOT NULL DEFAULT '1970-01-01'
);
  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    unit TEXT DEFAULT '',
    default_rate REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_id TEXT NOT NULL,
    site_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    date TEXT NOT NULL,
    expected_delivery TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pending',
    items TEXT NOT NULL DEFAULT '[]',
    total_amount REAL NOT NULL DEFAULT 0,
    estimated_cartage REAL NOT NULL DEFAULT 0,
    estimated_loading_amount REAL NOT NULL DEFAULT 0,
    other_estimated_charges REAL NOT NULL DEFAULT 0,
    gst_amount REAL NOT NULL DEFAULT 0,
    sub_total REAL NOT NULL DEFAULT 0,
    freight_amount REAL NOT NULL DEFAULT 0,
    freight_gst_mode TEXT NOT NULL DEFAULT 'exclude',
    billing_name TEXT DEFAULT '',
    bill_to TEXT DEFAULT '',
    shipping_name TEXT DEFAULT '',
    ship_to TEXT DEFAULT '',
    po_number TEXT NOT NULL DEFAULT '',
    running_number INTEGER NOT NULL DEFAULT 0,
    financial_year TEXT NOT NULL DEFAULT '',
    prefix TEXT NOT NULL DEFAULT '',
    site_code TEXT NOT NULL DEFAULT '',
    billing_code TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS grns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_id TEXT NOT NULL,
    site_id TEXT NOT NULL,
    po_id TEXT NOT NULL,
    date TEXT NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'Pending Bill',
    grn_number TEXT NOT NULL DEFAULT '',
    running_number INTEGER NOT NULL DEFAULT 0,
    financial_year TEXT NOT NULL DEFAULT '',
    site_code TEXT NOT NULL DEFAULT '',
    billing_code TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_id TEXT NOT NULL,
    vendor_invoice_no TEXT DEFAULT '',
    site_id TEXT NOT NULL,
    grn_id TEXT DEFAULT '',
    po_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    date TEXT NOT NULL,
    due_date TEXT DEFAULT '',
    amount REAL NOT NULL DEFAULT 0,
    material_amount REAL NOT NULL DEFAULT 0,
    actual_cartage REAL NOT NULL DEFAULT 0,
    loading_amount REAL NOT NULL DEFAULT 0,
    other_charges REAL NOT NULL DEFAULT 0,
    gst_amount REAL NOT NULL DEFAULT 0,
    sub_total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Unpaid'
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_id TEXT NOT NULL,
    site_id TEXT DEFAULT '',
    bill_id TEXT NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    mode TEXT DEFAULT '',
    reference TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    UNIQUE(module, action)
  );
  CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    permission_id INTEGER NOT NULL,
    UNIQUE(role, permission_id),
    FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  );

  
  CREATE TABLE IF NOT EXISTS vendor_ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'opening_balance',
    reference TEXT NOT NULL DEFAULT 'Opening Balance',
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS po_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_default TEXT NOT NULL DEFAULT 'false',
    config TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Admin',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    password TEXT NOT NULL DEFAULT '8800447427'
  );
  CREATE TABLE IF NOT EXISTS template_styles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_default TEXT NOT NULL DEFAULT 'false',
    config TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS vendor_quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    site_id TEXT DEFAULT '',
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft',
    items TEXT NOT NULL DEFAULT '[]',
    selected_vendor_id TEXT DEFAULT '',
    converted_po_id TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS material_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_id TEXT NOT NULL,
    site_id TEXT NOT NULL,
    date TEXT NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',
    notes TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS site_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id TEXT NOT NULL,
    material_id TEXT NOT NULL,
    received_qty REAL NOT NULL DEFAULT 0,
    issued_qty REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS stock_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id TEXT NOT NULL,
    site_id TEXT NOT NULL,
    reference_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    qty_in REAL NOT NULL DEFAULT 0,
    qty_out REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS material_rate_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    rate REAL NOT NULL,
    date TEXT NOT NULL,
    po_display_id TEXT DEFAULT '',
    quotation_display_id TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_enabled INTEGER NOT NULL DEFAULT 0,
    backup_frequency TEXT NOT NULL DEFAULT 'weekly',
    backup_location TEXT NOT NULL DEFAULT '/backups',
    updated_at TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS vendor_material_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id TEXT NOT NULL,
    material_id TEXT NOT NULL,
    rate REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT '',
    user_name TEXT NOT NULL DEFAULT '',
    user_role TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT '',
    entity_id TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
`);

sqlite.exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);");
sqlite.exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);");
sqlite.exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);");




for (const legacyTable of ["purchase" + "_return_items", "purchase" + "_returns"]) {
  sqlite.exec(`DROP TABLE IF EXISTS ${legacyTable};`);
}


const siteColumns = sqlite.prepare("PRAGMA table_info(sites)").all() as Array<{ name: string }>;
if (!siteColumns.some((column) => column.name === "site_name")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN site_name TEXT NOT NULL DEFAULT '';");
}
if (!siteColumns.some((column) => column.name === "project_name")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN project_name TEXT NOT NULL DEFAULT '';");
}
if (!siteColumns.some((column) => column.name === "site_code")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN site_code TEXT NOT NULL DEFAULT '';");
}
if (!siteColumns.some((column) => column.name === "billing_code")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN billing_code TEXT NOT NULL DEFAULT '';");
}

if (!siteColumns.some((column) => column.name === "po_prefix")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN po_prefix TEXT NOT NULL DEFAULT '';");
}
if (!siteColumns.some((column) => column.name === "city")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN city TEXT NOT NULL DEFAULT '';");
}
if (!siteColumns.some((column) => column.name === "state")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN state TEXT NOT NULL DEFAULT '';");
}
if (!siteColumns.some((column) => column.name === "pincode")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN pincode TEXT NOT NULL DEFAULT '';");
}
if (!siteColumns.some((column) => column.name === "contact_person")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN contact_person TEXT NOT NULL DEFAULT '';");
}
if (!siteColumns.some((column) => column.name === "phone")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN phone TEXT NOT NULL DEFAULT '';");
}

const usersColumns = sqlite.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
if (!usersColumns.some((column) => column.name === "phone")) {
  sqlite.exec("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT '';");
}
if (!usersColumns.some((column) => column.name === "avatar_url")) {
  sqlite.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';");
}
if (!usersColumns.some((column) => column.name === "role")) {
  sqlite.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'Admin';");
}
if (!usersColumns.some((column) => column.name === "is_active")) {
  sqlite.exec("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;");
}
if (!usersColumns.some((column) => column.name === "created_at")) {
  sqlite.exec("ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT '';");
}
if (!usersColumns.some((column) => column.name === "updated_at")) {
  sqlite.exec("ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';");
}

const userProfileColumns = sqlite.prepare("PRAGMA table_info(user_profile)").all() as Array<{ name: string }> ;
if (!userProfileColumns.some((column) => column.name === "avatar_url")) {
  sqlite.exec("ALTER TABLE user_profile ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';");
}
sqlite.exec(`
  UPDATE users
  SET avatar_url = (
    SELECT up.avatar_url
    FROM user_profile up
    WHERE LOWER(TRIM(up.email)) = LOWER(TRIM(users.email))
    LIMIT 1
  )
  WHERE COALESCE(NULLIF(users.avatar_url, ''), '') = ''
    AND EXISTS (
      SELECT 1
      FROM user_profile up
      WHERE LOWER(TRIM(up.email)) = LOWER(TRIM(users.email))
        AND COALESCE(NULLIF(up.avatar_url, ''), '') <> ''
    );
`);
if (!siteColumns.some((column) => column.name === "created_at")) {
  sqlite.exec("ALTER TABLE sites ADD COLUMN created_at TEXT NOT NULL DEFAULT '';");
}
sqlite.exec("UPDATE sites SET site_name = COALESCE(NULLIF(site_name, ''), name);");
sqlite.exec("UPDATE sites SET project_name = COALESCE(NULLIF(project_name, ''), name);");
sqlite.exec("UPDATE sites SET city = COALESCE(NULLIF(city, ''), location);");
sqlite.exec("UPDATE sites SET created_at = COALESCE(NULLIF(created_at, ''), date('now'));");

sqlite.exec("UPDATE sites SET site_code = UPPER(REPLACE(COALESCE(NULLIF(site_code, ''), SUBSTR(site_name, 1, 6), SUBSTR(name, 1, 6), 'SITE'), ' ', ''));");
sqlite.exec("UPDATE sites SET po_prefix = UPPER(REPLACE(COALESCE(NULLIF(po_prefix, ''), NULLIF(site_code, ''), SUBSTR(site_name, 1, 6), 'PO'), ' ', ''));");
sqlite.exec("UPDATE sites SET billing_code = UPPER(REPLACE(COALESCE(NULLIF(billing_code, ''), NULLIF(po_prefix, ''), NULLIF(site_code, ''), SUBSTR(site_name, 1, 4), 'BILL'), ' ', ''));");
sqlite.exec("UPDATE sites SET billing_name = COALESCE(NULLIF(billing_name, ''), NULLIF(project_name, ''), NULLIF(site_name, ''), name);");

const vendorColumns = sqlite.prepare("PRAGMA table_info(vendors)").all() as Array<{ name: string }>;

if (!vendorColumns.some((column) => column.name === "opening_balance")) {
  sqlite.exec("ALTER TABLE vendors ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0;");
}
if (!vendorColumns.some((column) => column.name === "opening_date")) {
  sqlite.exec("ALTER TABLE vendors ADD COLUMN opening_date TEXT NOT NULL DEFAULT '1970-01-01';");
}

sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_opening_balance_unique ON vendor_ledger_entries (vendor_id, type) WHERE type = 'opening_balance';");

// Keep exactly one opening balance row per vendor (legacy cleanup).
sqlite.exec(`
  DELETE FROM vendor_ledger_entries
  WHERE type = 'opening_balance'
    AND id NOT IN (
      SELECT MIN(id)
      FROM vendor_ledger_entries
      WHERE type = 'opening_balance'
      GROUP BY vendor_id
    );
`);

// Backfill missing opening-balance rows from vendor master data (legacy compatibility).
sqlite.exec(`
  INSERT INTO vendor_ledger_entries (vendor_id, date, type, reference, debit, credit)
  SELECT
    CAST(v.id AS TEXT),
    COALESCE(NULLIF(v.opening_date, ''), '1970-01-01'),
    'opening_balance',
    'Opening Balance',
    CASE WHEN v.opening_balance >= 0 THEN v.opening_balance ELSE 0 END,
    CASE WHEN v.opening_balance < 0 THEN ABS(v.opening_balance) ELSE 0 END
  FROM vendors v
  WHERE v.opening_balance != 0
    AND NOT EXISTS (
      SELECT 1
      FROM vendor_ledger_entries vle
      WHERE vle.vendor_id = CAST(v.id AS TEXT)
        AND vle.type = 'opening_balance'
    );
`);

// Reflect opening balance/date from the ledger into vendor master to avoid mismatches.
sqlite.exec(`
  UPDATE vendors
  SET
    opening_balance = COALESCE((
      SELECT (COALESCE(vle.debit, 0) - COALESCE(vle.credit, 0))
      FROM vendor_ledger_entries vle
      WHERE vle.vendor_id = CAST(vendors.id AS TEXT)
        AND vle.type = 'opening_balance'
      ORDER BY vle.id ASC
      LIMIT 1
    ), 0),
    opening_date = COALESCE((
      SELECT vle.date
      FROM vendor_ledger_entries vle
      WHERE vle.vendor_id = CAST(vendors.id AS TEXT)
        AND vle.type = 'opening_balance'
      ORDER BY vle.id ASC
      LIMIT 1
    ), opening_date);
`);

const poColumns = sqlite.prepare("PRAGMA table_info(purchase_orders)").all() as Array<{ name: string }>;
if (!poColumns.some((column) => column.name === "freight_amount")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN freight_amount REAL NOT NULL DEFAULT 0;");
}

if (!poColumns.some((column) => column.name === "estimated_cartage")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN estimated_cartage REAL NOT NULL DEFAULT 0;");
}
if (!poColumns.some((column) => column.name === "estimated_loading_amount")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN estimated_loading_amount REAL NOT NULL DEFAULT 0;");
}
if (!poColumns.some((column) => column.name === "other_estimated_charges")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN other_estimated_charges REAL NOT NULL DEFAULT 0;");
}
if (!poColumns.some((column) => column.name === "gst_amount")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN gst_amount REAL NOT NULL DEFAULT 0;");
}
if (!poColumns.some((column) => column.name === "sub_total")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN sub_total REAL NOT NULL DEFAULT 0;");
}
if (!poColumns.some((column) => column.name === "freight_gst_mode")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN freight_gst_mode TEXT NOT NULL DEFAULT 'exclude';");
}

if (!poColumns.some((column) => column.name === "po_number")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN po_number TEXT NOT NULL DEFAULT '';");
}
if (!poColumns.some((column) => column.name === "running_number")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN running_number INTEGER NOT NULL DEFAULT 0;");
}
if (!poColumns.some((column) => column.name === "financial_year")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN financial_year TEXT NOT NULL DEFAULT '';");
}
if (!poColumns.some((column) => column.name === "prefix")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN prefix TEXT NOT NULL DEFAULT '';");
}
if (!poColumns.some((column) => column.name === "site_code")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN site_code TEXT NOT NULL DEFAULT '';");
}
if (!poColumns.some((column) => column.name === "billing_code")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN billing_code TEXT NOT NULL DEFAULT '';");
}
if (!poColumns.some((column) => column.name === "bill_to")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN bill_to TEXT NOT NULL DEFAULT '';");
}
if (!poColumns.some((column) => column.name === "shipping_name")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN shipping_name TEXT NOT NULL DEFAULT '';");
}
if (!poColumns.some((column) => column.name === "ship_to")) {
  sqlite.exec("ALTER TABLE purchase_orders ADD COLUMN ship_to TEXT NOT NULL DEFAULT '';");
}

const grnColumns = sqlite.prepare("PRAGMA table_info(grns)").all() as Array<{ name: string }>;
if (!grnColumns.some((column) => column.name === "grn_number")) {
  sqlite.exec("ALTER TABLE grns ADD COLUMN grn_number TEXT NOT NULL DEFAULT '';");
}
if (!grnColumns.some((column) => column.name === "running_number")) {
  sqlite.exec("ALTER TABLE grns ADD COLUMN running_number INTEGER NOT NULL DEFAULT 0;");
}
if (!grnColumns.some((column) => column.name === "financial_year")) {
  sqlite.exec("ALTER TABLE grns ADD COLUMN financial_year TEXT NOT NULL DEFAULT '';");
}
if (!grnColumns.some((column) => column.name === "site_code")) {
  sqlite.exec("ALTER TABLE grns ADD COLUMN site_code TEXT NOT NULL DEFAULT '';");
}
if (!grnColumns.some((column) => column.name === "billing_code")) {
  sqlite.exec("ALTER TABLE grns ADD COLUMN billing_code TEXT NOT NULL DEFAULT '';");
}

sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_site_code_unique ON sites (site_code) WHERE TRIM(site_code) <> '';");
sqlite.exec("DROP INDEX IF EXISTS idx_sites_po_prefix_unique;");
sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_po_number_unique ON purchase_orders (po_number) WHERE TRIM(po_number) <> '';");
sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_site_year_running_unique ON purchase_orders (site_id, financial_year, running_number) WHERE running_number > 0;");
sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_grns_grn_number_unique ON grns (grn_number) WHERE TRIM(grn_number) <> '';");
sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_grns_site_year_running_unique ON grns (site_id, financial_year, running_number) WHERE running_number > 0;");

sqlite.exec(`
  UPDATE purchase_orders
  SET
    financial_year = CASE
      WHEN TRIM(financial_year) = '' THEN
        CASE
          WHEN CAST(strftime('%m', COALESCE(NULLIF(date, ''), date('now'))) AS INTEGER) >= 4
            THEN printf('%02d-%02d', CAST(strftime('%Y', COALESCE(NULLIF(date, ''), date('now'))) AS INTEGER) % 100, (CAST(strftime('%Y', COALESCE(NULLIF(date, ''), date('now'))) AS INTEGER) + 1) % 100)
          ELSE printf('%02d-%02d', (CAST(strftime('%Y', COALESCE(NULLIF(date, ''), date('now'))) AS INTEGER) - 1) % 100, CAST(strftime('%Y', COALESCE(NULLIF(date, ''), date('now'))) AS INTEGER) % 100)
        END
      ELSE financial_year
    END,
    prefix = COALESCE(NULLIF(prefix, ''), (SELECT po_prefix FROM sites s WHERE CAST(s.id AS TEXT) = purchase_orders.site_id), 'PO'),
    site_code = COALESCE(NULLIF(site_code, ''), (SELECT site_code FROM sites s WHERE CAST(s.id AS TEXT) = purchase_orders.site_id), 'SITE'),
    billing_code = COALESCE(NULLIF(billing_code, ''), (SELECT billing_code FROM sites s WHERE CAST(s.id AS TEXT) = purchase_orders.site_id), (SELECT po_prefix FROM sites s WHERE CAST(s.id AS TEXT) = purchase_orders.site_id), 'BILL')
`);

sqlite.exec(`
  UPDATE grns
  SET
    financial_year = CASE
      WHEN TRIM(financial_year) = '' THEN
        CASE
          WHEN CAST(strftime('%m', COALESCE(NULLIF(date, ''), date('now'))) AS INTEGER) >= 4
            THEN printf('%02d-%02d', CAST(strftime('%Y', COALESCE(NULLIF(date, ''), date('now'))) AS INTEGER) % 100, (CAST(strftime('%Y', COALESCE(NULLIF(date, ''), date('now'))) AS INTEGER) + 1) % 100)
          ELSE printf('%02d-%02d', (CAST(strftime('%Y', COALESCE(NULLIF(date, ''), date('now'))) AS INTEGER) - 1) % 100, CAST(strftime('%Y', COALESCE(NULLIF(date, ''), date('now'))) AS INTEGER) % 100)
        END
      ELSE financial_year
    END,
    site_code = COALESCE(NULLIF(site_code, ''), (SELECT site_code FROM sites s WHERE CAST(s.id AS TEXT) = grns.site_id), 'SITE'),
    billing_code = COALESCE(NULLIF(billing_code, ''), (SELECT billing_code FROM sites s WHERE CAST(s.id AS TEXT) = grns.site_id), (SELECT po_prefix FROM sites s WHERE CAST(s.id AS TEXT) = grns.site_id), 'BILL')
`);

const billColumns = sqlite.prepare("PRAGMA table_info(bills)").all() as Array<{ name: string }>;
if (!billColumns.some((column) => column.name === "vendor_invoice_no")) {
  sqlite.exec("ALTER TABLE bills ADD COLUMN vendor_invoice_no TEXT DEFAULT '';");
}
if (!billColumns.some((column) => column.name === "material_amount")) {
  sqlite.exec("ALTER TABLE bills ADD COLUMN material_amount REAL NOT NULL DEFAULT 0;");
}
if (!billColumns.some((column) => column.name === "actual_cartage")) {
  sqlite.exec("ALTER TABLE bills ADD COLUMN actual_cartage REAL NOT NULL DEFAULT 0;");
}
if (!billColumns.some((column) => column.name === "loading_amount")) {
  sqlite.exec("ALTER TABLE bills ADD COLUMN loading_amount REAL NOT NULL DEFAULT 0;");
}
if (!billColumns.some((column) => column.name === "other_charges")) {
  sqlite.exec("ALTER TABLE bills ADD COLUMN other_charges REAL NOT NULL DEFAULT 0;");
}
if (!billColumns.some((column) => column.name === "gst_amount")) {
  sqlite.exec("ALTER TABLE bills ADD COLUMN gst_amount REAL NOT NULL DEFAULT 0;");
}
if (!billColumns.some((column) => column.name === "sub_total")) {
  sqlite.exec("ALTER TABLE bills ADD COLUMN sub_total REAL NOT NULL DEFAULT 0;");
}



sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (email);");
sqlite.exec("UPDATE users SET created_at = COALESCE(NULLIF(created_at, ''), datetime('now'));");
sqlite.exec("UPDATE users SET updated_at = COALESCE(NULLIF(updated_at, ''), created_at, datetime('now'));");

sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_module_action ON permissions (module, action);");
sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_role_permission ON role_permissions (role, permission_id);");

for (const moduleName of ERP_PERMISSION_MODULES) {
  for (const action of ERP_PERMISSION_ACTIONS) {
    sqlite.prepare("INSERT OR IGNORE INTO permissions (module, action) VALUES (?, ?)").run(moduleName, action);
  }
}

sqlite.exec(`
  UPDATE permissions
  SET module = CASE
    WHEN module IN ('Grn', 'grn', 'GRN') THEN 'GRN'
    WHEN module IN ('Bill', 'bill', 'Bills') THEN 'Bills'
    WHEN module IN ('Payment', 'payment', 'Payments') THEN 'Payments'
    ELSE module
  END
  WHERE module IN ('Grn', 'grn', 'GRN', 'Bill', 'bill', 'Bills', 'Payment', 'payment', 'Payments');
`);

sqlite.exec(`
  DELETE FROM permissions
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM permissions
    GROUP BY module, action
  );
`);

sqlite.exec(`
  DELETE FROM role_permissions
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM role_permissions
    GROUP BY role, permission_id
  );
`);

const modulePermissions = sqlite
  .prepare("SELECT id, module, action FROM permissions WHERE module IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
  .all(...ERP_PERMISSION_MODULES) as Array<{ id: number; module: string; action: string }>;

const roleList = Object.values(ERP_ROLES);
for (const role of roleList) {
  const defaultMap = buildRolePermissionMap(role);
  for (const permission of modulePermissions) {
    const moduleName = permission.module as PermissionModule;
    const actionName = permission.action as PermissionAction;
    if (!defaultMap[moduleName]?.[actionName]) {
      continue;
    }
    sqlite.prepare("INSERT OR IGNORE INTO role_permissions (role, permission_id) VALUES (?, ?)").run(role, permission.id);
  }
}

const now = () => new Date().toISOString();

	
const profileCount = sqlite.prepare("SELECT COUNT(*) as c FROM user_profile").get() as { c: number };
if (profileCount.c === 0) {
  sqlite.prepare("INSERT INTO user_profile (name, email, phone, role, company, password) VALUES (?, ?, ?, ?, ?, ?)")
    .run("Admin", "admin@purchase.local", "", "Admin", "JAKHIRA", "admin123");
}

const userCount = sqlite.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
if (userCount.c === 0) {
  const legacyProfile = sqlite.prepare("SELECT name, email, phone, role, password FROM user_profile ORDER BY id ASC LIMIT 1").get() as
    | { name: string; email: string; phone: string; role: string; password: string }
    | undefined;

  const name = legacyProfile?.name?.trim() || "Admin";
  const email = legacyProfile?.email?.trim() || "admin@purchase.local";
  const phone = legacyProfile?.phone?.trim() || "";
  const role = legacyProfile?.role?.trim() || "Admin";
  const rawPassword = legacyProfile?.password?.trim() || "admin123";
  const password = isPasswordHashed(rawPassword) ? rawPassword : hashPassword(rawPassword);
  const timestamp = now();

  sqlite.prepare(`INSERT INTO users (name, email, phone, password, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`)
    .run(name, email, phone, password, role, timestamp, timestamp);
}

const legacyUsers = sqlite.prepare("SELECT id, password FROM users").all() as Array<{ id: number; password: string }>;
for (const user of legacyUsers) {
  if (!isPasswordHashed(user.password)) {
    sqlite.prepare("UPDATE users SET password = ?, updated_at = ? WHERE id = ?")
      .run(hashPassword(user.password), now(), user.id);
  }
}

const settingsCount = sqlite.prepare("SELECT COUNT(*) as c FROM system_settings").get() as { c: number };
if (settingsCount.c === 0) {
  sqlite.prepare("INSERT INTO system_settings (backup_enabled, backup_frequency, backup_location, updated_at) VALUES (0, 'weekly', '/backups', ?)").run(now());
}

export const db = drizzle(sqlite, { schema });
