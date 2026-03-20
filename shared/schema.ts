import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sites = sqliteTable("sites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteName: text("site_name").notNull().default(""),
  projectName: text("project_name").notNull().default(""),
  siteCode: text("site_code").notNull().default(""),
  poPrefix: text("po_prefix").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  pincode: text("pincode").notNull().default(""),
  contactPerson: text("contact_person").notNull().default(""),
  phone: text("phone").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
  // Legacy columns retained for compatibility with previously generated documents/data.
  name: text("name").notNull().default(""),
  location: text("location").notNull().default(""),
  billingName: text("billing_name").notNull().default(""),
  billingCode: text("billing_code").notNull().default(""),
  billTo: text("bill_to").notNull().default(""),
  shipTo: text("ship_to").notNull().default(""),
  status: text("status").notNull().default("Active"),
}, (table) => ({
  siteCodeUniqueIdx: uniqueIndex("idx_sites_site_code_unique").on(table.siteCode),
}));

export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  gst: text("gst").default(""),
  contactPerson: text("contact_person").default(""),
  phone: text("phone").default(""),
  address: text("address").default(""),
  email: text("email").default(""),
  openingBalance: real("opening_balance").notNull().default(0),
  openingDate: text("opening_date").notNull().default("1970-01-01"),
});

export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").default(""),
  unit: text("unit").default(""),
  defaultRate: real("default_rate").default(0),
});

export const poItemSchema = z.object({
  materialId: z.string(),
  qty: z.number(),
  rate: z.number(),
  amount: z.number(),
  taxPercent: z.number().optional(),
});

export type POItem = z.infer<typeof poItemSchema>;

export const purchaseOrders = sqliteTable("purchase_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayId: text("display_id").notNull(),
  siteId: text("site_id").notNull(),
  vendorId: text("vendor_id").notNull(),
  date: text("date").notNull(),
  expectedDelivery: text("expected_delivery").default(""),
  status: text("status").notNull().default("Pending"),
  items: text("items", { mode: "json" }).notNull().$type<POItem[]>(),
  totalAmount: real("total_amount").notNull().default(0),
  estimatedCartage: real("estimated_cartage").notNull().default(0),
  estimatedLoadingAmount: real("estimated_loading_amount").notNull().default(0),
  otherEstimatedCharges: real("other_estimated_charges").notNull().default(0),
  gstAmount: real("gst_amount").notNull().default(0),
  subTotal: real("sub_total").notNull().default(0),
  freightAmount: real("freight_amount").notNull().default(0),
  freightGstMode: text("freight_gst_mode").notNull().default("exclude"),
  billingName: text("billing_name").default(""),
  billTo: text("bill_to").default(""),
  shippingName: text("shipping_name").default(""),
  shipTo: text("ship_to").default(""),
  poNumber: text("po_number").notNull().default(""),
  runningNumber: integer("running_number").notNull().default(0),
  financialYear: text("financial_year").notNull().default(""),
  prefix: text("prefix").notNull().default(""),
  siteCode: text("site_code").notNull().default(""),
  billingCode: text("billing_code").notNull().default(""),
}, (table) => ({
  poNumberUniqueIdx: uniqueIndex("idx_purchase_orders_po_number_unique").on(table.poNumber),
  siteYearRunningUniqueIdx: uniqueIndex("idx_purchase_orders_site_year_running_unique").on(table.siteId, table.financialYear, table.runningNumber),
}));

export const grnItemSchema = z.object({
  materialId: z.string(),
  orderedQty: z.number(),
  receivedQty: z.number(),
});

export type GRNItem = z.infer<typeof grnItemSchema>;

export const grns = sqliteTable("grns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayId: text("display_id").notNull(),
  siteId: text("site_id").notNull(),
  poId: text("po_id").notNull(),
  date: text("date").notNull(),
  items: text("items", { mode: "json" }).notNull().$type<GRNItem[]>(),
  status: text("status").notNull().default("Pending Bill"),
  grnNumber: text("grn_number").notNull().default(""),
  runningNumber: integer("running_number").notNull().default(0),
  financialYear: text("financial_year").notNull().default(""),
  siteCode: text("site_code").notNull().default(""),
  billingCode: text("billing_code").notNull().default(""),
}, (table) => ({
  grnNumberUniqueIdx: uniqueIndex("idx_grns_grn_number_unique").on(table.grnNumber),
  siteYearRunningUniqueIdx: uniqueIndex("idx_grns_site_year_running_unique").on(table.siteId, table.financialYear, table.runningNumber),
}));

export const bills = sqliteTable("bills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayId: text("display_id").notNull(),
  vendorInvoiceNo: text("vendor_invoice_no").default(""),
  siteId: text("site_id").notNull(),
  grnId: text("grn_id").default(""),
  poId: text("po_id").notNull(),
  vendorId: text("vendor_id").notNull(),
  date: text("date").notNull(),
  dueDate: text("due_date").default(""),
  amount: real("amount").notNull().default(0),
  materialAmount: real("material_amount").notNull().default(0),
  actualCartage: real("actual_cartage").notNull().default(0),
  loadingAmount: real("loading_amount").notNull().default(0),
  otherCharges: real("other_charges").notNull().default(0),
  gstAmount: real("gst_amount").notNull().default(0),
  subTotal: real("sub_total").notNull().default(0),
  status: text("status").notNull().default("Unpaid"),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayId: text("display_id").notNull(),
  siteId: text("site_id").default(""),
  billId: text("bill_id").notNull(),
  date: text("date").notNull(),
  amount: real("amount").notNull().default(0),
  mode: text("mode").default(""),
  reference: text("reference").default(""),
});

export const permissions = sqliteTable("permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  module: text("module").notNull(),
  action: text("action").notNull(),
});

export const rolePermissions = sqliteTable("role_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  role: text("role").notNull(),
  permissionId: integer("permission_id").notNull(),
});

export const vendorLedgerEntries = sqliteTable("vendor_ledger_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vendorId: text("vendor_id").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull().default("opening_balance"),
  reference: text("reference").notNull().default("Opening Balance"),
  debit: real("debit").notNull().default(0),
  credit: real("credit").notNull().default(0),
});

export const poTemplateConfigSchema = z.object({
  style: z.enum(['professional']).optional(),
  header: z.object({
    companyName: z.string(),
    subtitle: z.string(),
    contactDetails: z.string(),
    showContactDetails: z.boolean(),
    showLogo: z.boolean().optional(),
    logoUrl: z.string().optional(),
  }),
  sections: z.object({
    poDetailsTitle: z.string(),
    vendorDetailsTitle: z.string(),
    billToTitle: z.string(),
    shipToTitle: z.string(),
    termsTitle: z.string(),
  }),
  columns: z.array(z.object({
    key: z.string(),
    label: z.string(),
    visible: z.boolean(),
    align: z.enum(['left', 'center', 'right']),
  })),
  visibility: z.object({
    gst: z.boolean(),
    billingName: z.boolean(),
    shipTo: z.boolean(),
    billTo: z.boolean(),
    vendorGst: z.boolean(),
    vendorContact: z.boolean(),
    vendorPhone: z.boolean(),
    vendorEmail: z.boolean(),
    deliveryDate: z.boolean(),
    poStatus: z.boolean(),
  }),
  totals: z.object({
    showSubtotal: z.boolean(),
    showGstBreakup: z.boolean(),
    showDiscount: z.boolean(),
    discountLabel: z.string().optional(),
    showRoundOff: z.boolean(),
    showAmountInWords: z.boolean(),
    enableFreight: z.boolean().optional(),
    freightGstMode: z.enum(["include", "exclude"]).optional(),
  }).optional(),
  footer: z.object({
    terms: z.array(z.string()),
    showSignature: z.boolean(),
    signatureLeftLabel: z.string(),
    signatureRightLabel: z.string(),
    footerNote: z.string(),
    showStampBlock: z.boolean().optional(),
    stampBlockLabel: z.string().optional(),
    signatureImageUrl: z.string().optional(),
  }),
});

export type POTemplateConfig = z.infer<typeof poTemplateConfigSchema>;

export const poTemplates = sqliteTable("po_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  isDefault: text("is_default").notNull().default("false"),
  config: text("config", { mode: "json" }).notNull().$type<POTemplateConfig>(),
});

export const userProfile = sqliteTable("user_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull().default(""),
  company: text("company").notNull().default(""),
  password: text("password").notNull().default("8800447427"),
});

export const systemSettings = sqliteTable("system_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  backupEnabled: integer("backup_enabled").notNull().default(0),
  backupFrequency: text("backup_frequency").notNull().default("weekly"),
  backupLocation: text("backup_location").notNull().default("/backups"),
  updatedAt: text("updated_at").notNull().default(""),
});

export const layoutBlockSchema = z.object({
  id: z.string(),
  label: z.string(),
  row: z.number(),
  col: z.number(),
  colSpan: z.number(),
  visible: z.boolean(),
});

export type LayoutBlock = z.infer<typeof layoutBlockSchema>;

export const templateStyleConfigSchema = z.object({
  blocks: z.array(layoutBlockSchema),
  linkedTemplateId: z.number().optional(),
});

export type TemplateStyleConfig = z.infer<typeof templateStyleConfigSchema>;

export const templateStyles = sqliteTable("template_styles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  isDefault: text("is_default").notNull().default("false"),
  config: text("config", { mode: "json" }).notNull().$type<TemplateStyleConfig>(),
});

export const insertTemplateStyleSchema = createInsertSchema(templateStyles).omit({ id: true });
export type TemplateStyle = typeof templateStyles.$inferSelect;
export type InsertTemplateStyle = z.infer<typeof insertTemplateStyleSchema>;
export const insertVendorLedgerEntrySchema = createInsertSchema(vendorLedgerEntries).omit({ id: true });
export type VendorLedgerEntryRecord = typeof vendorLedgerEntries.$inferSelect;
export type InsertVendorLedgerEntry = z.infer<typeof insertVendorLedgerEntrySchema>;

export const materialIssueItemSchema = z.object({
  materialId: z.string(),
  qty: z.number(),
});

export type MaterialIssueItemType = z.infer<typeof materialIssueItemSchema>;

export const materialIssues = sqliteTable("material_issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayId: text("display_id").notNull(),
  siteId: text("site_id").notNull(),
  date: text("date").notNull(),
  items: text("items", { mode: "json" }).notNull().$type<MaterialIssueItemType[]>(),
  notes: text("notes").default(""),
});

export const siteStock = sqliteTable("site_stock", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: text("site_id").notNull(),
  materialId: text("material_id").notNull(),
  receivedQty: real("received_qty").notNull().default(0),
  issuedQty: real("issued_qty").notNull().default(0),
});

export const stockLedger = sqliteTable("stock_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  materialId: text("material_id").notNull(),
  siteId: text("site_id").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: text("reference_id").notNull(),
  qtyIn: real("qty_in").notNull().default(0),
  qtyOut: real("qty_out").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
});

export const materialRateHistory = sqliteTable("material_rate_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  materialId: text("material_id").notNull(),
  vendorId: text("vendor_id").notNull(),
  rate: real("rate").notNull(),
  date: text("date").notNull(),
  poDisplayId: text("po_display_id").default(""),
  quotationDisplayId: text("quotation_display_id").default(""),
});

export const vendorMaterialRates = sqliteTable("vendor_material_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vendorId: text("vendor_id").notNull(),
  materialId: text("material_id").notNull(),
  rate: real("rate").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true });
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export const insertVendorMaterialRateSchema = createInsertSchema(vendorMaterialRates).omit({ id: true });
export type VendorMaterialRate = typeof vendorMaterialRates.$inferSelect;
export type InsertVendorMaterialRate = z.infer<typeof insertVendorMaterialRateSchema>;

export const insertPOTemplateSchema = createInsertSchema(poTemplates).omit({ id: true });
export const insertSiteSchema = createInsertSchema(sites).omit({ id: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true });
export const insertGrnSchema = createInsertSchema(grns).omit({ id: true });
export const insertBillSchema = createInsertSchema(bills).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertUserProfileSchema = createInsertSchema(userProfile).omit({ id: true });
export const insertMaterialIssueSchema = createInsertSchema(materialIssues).omit({ id: true });
export const insertSiteStockSchema = createInsertSchema(siteStock).omit({ id: true });
export const insertStockLedgerSchema = createInsertSchema(stockLedger).omit({ id: true });
export const insertMaterialRateHistorySchema = createInsertSchema(materialRateHistory).omit({ id: true });
export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({ id: true });

export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type GRN = typeof grns.$inferSelect;
export type InsertGRN = z.infer<typeof insertGrnSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type PermissionRecord = typeof permissions.$inferSelect;
export type InsertPermissionRecord = z.infer<typeof insertPermissionSchema>;
export type RolePermissionRecord = typeof rolePermissions.$inferSelect;
export type InsertRolePermissionRecord = z.infer<typeof insertRolePermissionSchema>;
export type POTemplate = typeof poTemplates.$inferSelect;
export type InsertPOTemplate = z.infer<typeof insertPOTemplateSchema>;
export type UserProfile = typeof userProfile.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type MaterialIssue = typeof materialIssues.$inferSelect;
export type InsertMaterialIssue = z.infer<typeof insertMaterialIssueSchema>;
export type SiteStock = typeof siteStock.$inferSelect;
export type InsertSiteStock = z.infer<typeof insertSiteStockSchema>;
export type StockLedger = typeof stockLedger.$inferSelect;
export type InsertStockLedger = z.infer<typeof insertStockLedgerSchema>;
export type MaterialRateHistoryEntry = typeof materialRateHistory.$inferSelect;
export type InsertMaterialRateHistory = z.infer<typeof insertMaterialRateHistorySchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
