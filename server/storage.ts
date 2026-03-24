import { db } from "./db";
import { hashPassword, isPasswordHashed } from "./auth";
import { eq, and, inArray, desc } from "drizzle-orm";
import { ERP_PERMISSION_ACTIONS, ERP_PERMISSION_MODULES, ERP_ROLES, type PermissionAction, type PermissionMap, type PermissionModule } from "@shared/permissions";
import {
  sites, vendors, materials, purchaseOrders, grns, bills, payments, poTemplates, templateStyles, vendorLedgerEntries,
  materialIssues, siteStock, stockLedger, materialRateHistory, vendorMaterialRates, users, userProfile, systemSettings, permissions, rolePermissions,
  type Site, type InsertSite,
  type Vendor, type InsertVendor,
  type Material, type InsertMaterial,
  type PurchaseOrder, type InsertPurchaseOrder,
  type GRN, type InsertGRN,
  type Bill, type InsertBill,
  type Payment, type InsertPayment,
  type POTemplate, type InsertPOTemplate,
  type TemplateStyle, type InsertTemplateStyle,
  type MaterialIssue, type InsertMaterialIssue,
  type SiteStock,
  type InsertStockLedger,
  type MaterialRateHistoryEntry, type InsertMaterialRateHistory,
  type VendorMaterialRate,
  type User, type InsertUser,
  type UserProfile, type InsertUserProfile,
  type SystemSettings, type InsertSystemSettings
} from "@shared/schema";

export interface IStorage {
  getSites(): Promise<Site[]>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: number, site: Partial<InsertSite>): Promise<Site | undefined>;
  deleteSite(id: number): Promise<void>;

  getVendors(): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<void>;

  getMaterials(): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, material: Partial<InsertMaterial>): Promise<Material | undefined>;
  deleteMaterial(id: number): Promise<void>;

  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: number): Promise<void>;

  getGrns(): Promise<GRN[]>;
  createGrn(grn: InsertGRN): Promise<GRN>;
  updateGrn(id: number, grn: Partial<InsertGRN>): Promise<GRN | undefined>;
  deleteGrn(id: number): Promise<void>;

  getBills(): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<void>;

  getPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<void>;


  getPOTemplates(): Promise<POTemplate[]>;
  createPOTemplate(template: InsertPOTemplate): Promise<POTemplate>;
  updatePOTemplate(id: number, template: Partial<InsertPOTemplate>): Promise<POTemplate | undefined>;
  deletePOTemplate(id: number): Promise<void>;

  getTemplateStyles(): Promise<TemplateStyle[]>;
  createTemplateStyle(style: InsertTemplateStyle): Promise<TemplateStyle>;
  updateTemplateStyle(id: number, style: Partial<InsertTemplateStyle>): Promise<TemplateStyle | undefined>;
  deleteTemplateStyle(id: number): Promise<void>;

  getMaterialIssues(): Promise<MaterialIssue[]>;
  createMaterialIssue(issue: InsertMaterialIssue): Promise<MaterialIssue>;
  updateMaterialIssue(id: number, issue: Partial<InsertMaterialIssue>): Promise<MaterialIssue | undefined>;
  deleteMaterialIssue(id: number): Promise<void>;

  getSiteStocks(): Promise<SiteStock[]>;
  upsertSiteStock(siteId: string, materialId: string, receivedDelta: number, issuedDelta: number, override?: { receivedQty: number; issuedQty: number }): Promise<SiteStock>;

  getMaterialRateHistoryEntries(): Promise<MaterialRateHistoryEntry[]>;
  createMaterialRateHistoryEntry(entry: InsertMaterialRateHistory): Promise<MaterialRateHistoryEntry>;

  getVendorMaterialRates(): Promise<VendorMaterialRate[]>;
  getVendorMaterialRatesByVendor(vendorId: string): Promise<VendorMaterialRate[]>;
  upsertVendorMaterialRate(vendorId: string, materialId: string, rate: number): Promise<VendorMaterialRate>;
  deleteVendorMaterialRate(id: number): Promise<void>;

  getVendorLedger(vendorId: string, startDate?: string, endDate?: string): Promise<VendorLedgerEntry[]>;
  getVendorStatement(vendorId: string, month: string): Promise<VendorStatement>;
  getVendorPayables(): Promise<VendorPayable[]>;
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  ensureDefaultAdminUser(): Promise<void>;
  getUserProfiles(): Promise<UserProfile[]>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: number, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  ensureDefaultUserProfile(): Promise<void>;
  userHasPermission(role: string, moduleName: string, action: string): Promise<boolean>;
  getRolePermissionMap(role: string): Promise<PermissionMap>;
  setRolePermissionMap(role: string, map: PermissionMap): Promise<void>;

  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(settings: Partial<InsertSystemSettings>): Promise<SystemSettings>;
  createDatabaseBackup(): Promise<{ fileName: string; filePath: string }>;
  listBackups(): Promise<string[]>;
  resetDemoData(): Promise<void>;
}

export type VendorLedgerEntry = {
  date: string;
  type: "opening_balance" | "bill" | "payment";
  reference: string;
  debit: number;
  credit: number;
  balance: number;
};

export type VendorStatement = {
  vendorName: string;
  month: string;
  openingBalance: number;
  totalBills: number;
  totalPayments: number;
  closingBalance: number;
  transactions: VendorLedgerEntry[];
};

export type VendorPayable = {
  vendorId: number;
  vendorName: string;
  outstanding: number;
};

export type CostAnalysisFilters = {
  siteId?: string;
  vendorId?: string;
  materialId?: string;
  startDate?: string;
  endDate?: string;
};

export type CostAnalysisMaterialRow = {
  materialId: string;
  materialName: string;
  quantity: number;
  totalCost: number;
};

export type CostAnalysisCombinationRow = {
  key: string;
  name: string;
  totalAmount: number;
};

export type CostAnalysisRow = {
  id: string;
  name: string;
  totalAmount: number;
};

export type CostAnalysisSummary = {
  topMaterialsBySpend: CostAnalysisRow[];
  vendorSpendAnalysis: CostAnalysisRow[];
  siteWisePurchaseCost: CostAnalysisRow[];
  siteVendorCost: CostAnalysisCombinationRow[];
  vendorMaterialCost: CostAnalysisCombinationRow[];
  materialBreakdown: CostAnalysisMaterialRow[];
  totalPurchaseCost: number;
  totalMaterialCost: number;
  totalProjectCost: number;
  totalQuantityPurchased: number;
  averageMaterialRate: number;
  topVendorsBySpend: CostAnalysisRow[];
};

export class DatabaseStorage implements IStorage {
  private getFinancialYearLabel(inputDate?: string): string {
    const parsed = inputDate ? new Date(inputDate) : new Date();
    const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    const month = date.getMonth() + 1;
    const yearStart = month >= 4 ? date.getFullYear() : date.getFullYear() - 1;
    const shortStart = String(yearStart % 100).padStart(2, "0");
    const shortEnd = String((yearStart + 1) % 100).padStart(2, "0");
    return `${shortStart}-${shortEnd}`;
  }

  private normalizeCode(rawValue: string | undefined, fallback: string): string {
    const normalized = (rawValue || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return normalized || fallback;
  }

  private async getSiteCode(siteId: string): Promise<string> {
    const [site] = await db.select().from(sites).where(eq(sites.id, Number(siteId))).limit(1);
    return this.normalizeCode(site?.siteCode, "SITE");
  }

  private async getSiteById(siteId: string): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, Number(siteId))).limit(1);
    return site;
  }

  private async generateDisplayId(prefix: "GRN" | "BILL", siteId: string, date: string, existingDisplayIds: string[]): Promise<string> {
    const siteCode = await this.getSiteCode(siteId);
    const financialYear = this.getFinancialYearLabel(date);
    const pattern = new RegExp(`^${prefix}/${siteCode}/${financialYear}/(\d+)$`);
    const maxSequence = existingDisplayIds.reduce((max, currentId) => {
      const matched = currentId.match(pattern);
      if (!matched) return max;
      const parsed = Number(matched[1]);
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0);
    const sequence = String(maxSequence + 1).padStart(4, "0");
    return `${prefix}/${siteCode}/${financialYear}/${sequence}`;
  }

  private async validateSiteUniqueness(payload: Partial<InsertSite>, excludeId?: number): Promise<void> {
    const normalizedCode = this.normalizeCode(payload.siteCode, "");
    const normalizedBillingCode = this.normalizeCode(payload.billingCode, "");

    if (!normalizedCode) {
      throw new Error("Site code is required");
    }
    if (!normalizedBillingCode) {
      throw new Error("Billing code is required");
    }

    const allSites = await db.select().from(sites);
    const conflictingCode = allSites.find((site) => this.normalizeCode(site.siteCode, "") === normalizedCode && site.id !== excludeId);
    if (conflictingCode) {
      throw new Error("Site code must be unique");
    }
  }

  private async generatePurchaseOrderNumber(siteId: string, poDate?: string): Promise<{ poNumber: string; runningNumber: number; financialYear: string; siteCode: string; billingCode: string; billingName: string }> {
    const site = await this.getSiteById(siteId);
    if (!site) {
      throw new Error("Selected site not found");
    }

    const siteCode = this.normalizeCode(site.siteCode, "");
    const billingCode = this.normalizeCode(site.billingCode, "");
    const billingName = (site.billingName || site.projectName || site.siteName || "").trim();
    if (!siteCode) throw new Error("Site code is required for PO generation");
    if (!billingCode) throw new Error("Billing code is required for PO generation");
    if (!billingName) throw new Error("Billing name is required for PO generation");

    const financialYear = this.getFinancialYearLabel(poDate);

    const [latest] = await db
      .select({ runningNumber: purchaseOrders.runningNumber })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.siteId, siteId), eq(purchaseOrders.financialYear, financialYear)))
      .orderBy(desc(purchaseOrders.runningNumber))
      .limit(1);

    const runningNumber = Number(latest?.runningNumber || 0) + 1;
    const padded = String(runningNumber).padStart(3, "0");
    const poNumber = `${billingCode}/${siteCode}/PO/${financialYear}/${padded}`;
    return { poNumber, runningNumber, financialYear, siteCode, billingCode, billingName };
  }



  private async generateGrnNumber(siteId: string, grnDate?: string): Promise<{ grnNumber: string; runningNumber: number; financialYear: string; siteCode: string; billingCode: string }> {
    const site = await this.getSiteById(siteId);
    if (!site) {
      throw new Error("Selected site not found");
    }

    const siteCode = this.normalizeCode(site.siteCode, "");
    const billingCode = this.normalizeCode(site.billingCode, "");
    if (!siteCode) throw new Error("Site code is required for GRN generation");
    if (!billingCode) throw new Error("Billing code is required for GRN generation");

    const financialYear = this.getFinancialYearLabel(grnDate);

    const [latest] = await db
      .select({ runningNumber: grns.runningNumber })
      .from(grns)
      .where(and(eq(grns.siteId, siteId), eq(grns.financialYear, financialYear)))
      .orderBy(desc(grns.runningNumber))
      .limit(1);

    const runningNumber = Number(latest?.runningNumber || 0) + 1;
    const padded = String(runningNumber).padStart(3, "0");
    const grnNumber = `${billingCode}/${siteCode}/GRN/${financialYear}/${padded}`;
    return { grnNumber, runningNumber, financialYear, siteCode, billingCode };
  }

  private toOpeningEntryAmounts(openingBalance: number): { debit: number; credit: number } {
    if (openingBalance >= 0) {
      return { debit: openingBalance, credit: 0 };
    }
    return { debit: 0, credit: Math.abs(openingBalance) };
  }

  private async syncVendorOpeningBalanceEntry(vendorId: string, openingBalance: number, openingDate: string): Promise<void> {
    const normalizedBalance = Number(openingBalance || 0);
    const normalizedDate = openingDate || new Date().toISOString().slice(0, 10);

    const openingEntries = await db
      .select()
      .from(vendorLedgerEntries)
      .where(and(eq(vendorLedgerEntries.vendorId, vendorId), eq(vendorLedgerEntries.type, "opening_balance")));

    if (normalizedBalance === 0) {
      if (openingEntries.length > 0) {
        await db
          .delete(vendorLedgerEntries)
          .where(and(eq(vendorLedgerEntries.vendorId, vendorId), eq(vendorLedgerEntries.type, "opening_balance")));
      }
      return;
    }

    const { debit, credit } = this.toOpeningEntryAmounts(normalizedBalance);

    if (openingEntries.length === 0) {
      await db.insert(vendorLedgerEntries).values({
        vendorId,
        date: normalizedDate,
        type: "opening_balance",
        reference: "Opening Balance",
        debit,
        credit,
      });
      return;
    }

    const [entryToKeep] = openingEntries.sort((a, b) => a.id - b.id);
    await db
      .update(vendorLedgerEntries)
      .set({
        date: normalizedDate,
        reference: "Opening Balance",
        debit,
        credit,
      })
      .where(eq(vendorLedgerEntries.id, entryToKeep.id));

    const duplicateIds = openingEntries.filter((entry) => entry.id !== entryToKeep.id).map((entry) => entry.id);
    if (duplicateIds.length > 0) {
      await db.delete(vendorLedgerEntries).where(inArray(vendorLedgerEntries.id, duplicateIds));
    }
  }

  private async appendStockLedgerEntry(entry: InsertStockLedger): Promise<void> {
    await db.insert(stockLedger).values({
      ...entry,
      qtyIn: Number(entry.qtyIn || 0),
      qtyOut: Number(entry.qtyOut || 0),
      createdAt: entry.createdAt || new Date().toISOString().slice(0, 10),
    });
  }

  private async rebuildSiteStockFromLedger(siteId: string, materialId: string): Promise<void> {
    const entries = await db
      .select()
      .from(stockLedger)
      .where(and(eq(stockLedger.siteId, siteId), eq(stockLedger.materialId, materialId)));

    const receivedQty = entries.reduce((sum, row) => sum + Number(row.qtyIn || 0), 0);
    const issuedQty = entries.reduce((sum, row) => sum + Number(row.qtyOut || 0), 0);

    await this.upsertSiteStock(siteId, materialId, 0, 0, { receivedQty, issuedQty });
  }

  private normalizeSitePayload(site: Partial<InsertSite>) {
    const siteName = (site.siteName ?? site.name ?? "").toString();
    const billingName = (site.billingName ?? site.projectName ?? site.siteName ?? site.name ?? "").toString();
    const city = (site.city ?? site.location ?? "").toString();
    const siteCode = this.normalizeCode(site.siteCode, "");
    const billingCode = this.normalizeCode(site.billingCode ?? site.poPrefix ?? site.siteCode, "");
    const poPrefix = billingCode;
    const payload: Partial<InsertSite> = {
      ...site,
      siteName,
      projectName: billingName,
      name: siteName,
      city,
      location: city,
      shipTo: site.address ?? site.shipTo ?? "",
      billingName,
      billingCode,
      siteCode,
      poPrefix,
      createdAt: site.createdAt || new Date().toISOString().slice(0, 10),
    };
    return payload;
  }

  async getSites(): Promise<Site[]> {
    return db.select().from(sites);
  }
  async createSite(site: InsertSite): Promise<Site> {
    const payload = this.normalizeSitePayload(site);
    await this.validateSiteUniqueness(payload);
    const [result] = await db.insert(sites).values(payload).returning();
    return result;
  }
  async updateSite(id: number, site: Partial<InsertSite>): Promise<Site | undefined> {
    const payload = this.normalizeSitePayload(site);
    await this.validateSiteUniqueness(payload, id);
    const [result] = await db.update(sites).set(payload).where(eq(sites.id, id)).returning();
    return result;
  }
  async deleteSite(id: number): Promise<void> {
    await db.delete(sites).where(eq(sites.id, id));
  }

  async getVendors(): Promise<Vendor[]> {
    return db.select().from(vendors);
  }
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [result] = await db.insert(vendors).values(vendor).returning();
    await this.syncVendorOpeningBalanceEntry(
      result.id.toString(),
      Number(result.openingBalance || 0),
      result.openingDate || new Date().toISOString().slice(0, 10),
    );
    return result;
  }
  async updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [existing] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    if (!existing) {
      return undefined;
    }

    const openingBalance = Number(vendor.openingBalance ?? existing.openingBalance ?? 0);
    const openingDate = vendor.openingDate ?? existing.openingDate ?? new Date().toISOString().slice(0, 10);

    const [result] = await db
      .update(vendors)
      .set({ ...vendor, openingBalance, openingDate })
      .where(eq(vendors.id, id))
      .returning();

    await this.syncVendorOpeningBalanceEntry(existing.id.toString(), openingBalance, openingDate);
    return result;
  }
  async deleteVendor(id: number): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  async getMaterials(): Promise<Material[]> {
    return db.select().from(materials);
  }
  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [result] = await db.insert(materials).values(material).returning();
    return result;
  }
  async updateMaterial(id: number, material: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [result] = await db.update(materials).set(material).where(eq(materials.id, id)).returning();
    return result;
  }
  async deleteMaterial(id: number): Promise<void> {
    await db.delete(materials).where(eq(materials.id, id));
  }

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return db.select().from(purchaseOrders);
  }
  async createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const site = await this.getSiteById(po.siteId);
    if (!site) {
      throw new Error("Selected site not found");
    }

    const {
      displayId: _displayId,
      poNumber: _poNumber,
      runningNumber: _runningNumber,
      financialYear: _financialYear,
      prefix: _prefix,
      siteCode: _siteCode,
      billingCode: _billingCode,
      billingName: _billingName,
      ...payload
    } = po as any;

    const sequenceMeta = await this.generatePurchaseOrderNumber(po.siteId, po.date);
    const [result] = await db.insert(purchaseOrders).values({
      ...payload,
      displayId: sequenceMeta.poNumber,
      poNumber: sequenceMeta.poNumber,
      runningNumber: sequenceMeta.runningNumber,
      financialYear: sequenceMeta.financialYear,
      siteCode: sequenceMeta.siteCode,
      billingCode: sequenceMeta.billingCode,
      billingName: payload.billingName || sequenceMeta.billingName,
      billTo: payload.billTo || site.billTo || site.address || '',
      shippingName: payload.shippingName || payload.billingName || sequenceMeta.billingName,
      shipTo: payload.shipTo || site.shipTo || site.address || '',
    }).returning();
    return result;
  }
  async updatePurchaseOrder(id: number, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const { displayId: _displayId, poNumber: _poNumber, runningNumber: _runningNumber, financialYear: _financialYear, prefix: _prefix, siteCode: _siteCode, billingCode: _billingCode, ...updatable } = (po as any);
    const [existing] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
    if (!existing) return undefined;

    const resolvedSiteId = updatable.siteId || existing.siteId;
    const site = resolvedSiteId ? await this.getSiteById(resolvedSiteId) : undefined;
    const normalizedUpdate = {
      ...updatable,
      billingName: updatable.billingName ?? existing.billingName ?? site?.billingName ?? '',
      billTo: updatable.billTo ?? existing.billTo ?? site?.billTo ?? site?.address ?? '',
      shippingName: updatable.shippingName ?? existing.shippingName ?? existing.billingName ?? site?.billingName ?? '',
      shipTo: updatable.shipTo ?? existing.shipTo ?? site?.shipTo ?? site?.address ?? '',
    };

    const [result] = await db.update(purchaseOrders).set(normalizedUpdate).where(eq(purchaseOrders.id, id)).returning();
    return result;
  }
  async deletePurchaseOrder(id: number): Promise<void> {
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  async getGrns(): Promise<GRN[]> {
    return db.select().from(grns);
  }
  async createGrn(grn: InsertGRN): Promise<GRN> {
    const [linkedPo] = await db
      .select({ siteId: purchaseOrders.siteId })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.displayId, grn.poId))
      .limit(1);
    const fallbackPoId = Number(grn.poId);
    const [linkedPoById] = Number.isFinite(fallbackPoId)
      ? await db
          .select({ siteId: purchaseOrders.siteId })
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, fallbackPoId))
          .limit(1)
      : [];

    const resolvedSiteId = linkedPo?.siteId || linkedPoById?.siteId || grn.siteId;
    if (!resolvedSiteId) {
      throw new Error("Selected PO not found");
    }

    const sequenceMeta = await this.generateGrnNumber(resolvedSiteId, grn.date);
    const [result] = await db.insert(grns).values({ ...grn, siteId: resolvedSiteId, displayId: sequenceMeta.grnNumber, grnNumber: sequenceMeta.grnNumber, runningNumber: sequenceMeta.runningNumber, financialYear: sequenceMeta.financialYear, siteCode: sequenceMeta.siteCode, billingCode: sequenceMeta.billingCode }).returning();
    for (const item of result.items || []) {
      const receivedQty = Number(item.receivedQty || 0);
      if (receivedQty <= 0) continue;
      await this.appendStockLedgerEntry({
        materialId: item.materialId,
        siteId: result.siteId,
        referenceType: "GRN",
        referenceId: result.displayId,
        qtyIn: receivedQty,
        qtyOut: 0,
        createdAt: result.date,
      });
      await this.rebuildSiteStockFromLedger(result.siteId, item.materialId);
    }
    return result;
  }
  async updateGrn(id: number, grn: Partial<InsertGRN>): Promise<GRN | undefined> {
    const [existing] = await db.select().from(grns).where(eq(grns.id, id)).limit(1);
    const { displayId: _displayId, grnNumber: _grnNumber, runningNumber: _runningNumber, financialYear: _financialYear, siteCode: _siteCode, billingCode: _billingCode, ...updatable } = (grn as any);
    const [result] = await db.update(grns).set(updatable).where(eq(grns.id, id)).returning();
    if (existing) {
      await db.delete(stockLedger).where(and(eq(stockLedger.referenceType, "GRN"), eq(stockLedger.referenceId, existing.displayId)));
      const next = result || existing;
      for (const item of next.items || []) {
        const receivedQty = Number(item.receivedQty || 0);
        if (receivedQty <= 0) continue;
        await this.appendStockLedgerEntry({
          materialId: item.materialId,
          siteId: next.siteId,
          referenceType: "GRN",
          referenceId: next.displayId,
          qtyIn: receivedQty,
          qtyOut: 0,
          createdAt: next.date,
        });
      }
      const uniqueMaterialIds = new Set([...(existing.items || []).map((i) => i.materialId), ...((next.items || []).map((i) => i.materialId))]);
      for (const materialId of Array.from(uniqueMaterialIds)) {
        await this.rebuildSiteStockFromLedger(next.siteId, materialId);
      }
    }
    return result;
  }
  async deleteGrn(id: number): Promise<void> {
    const [existing] = await db.select().from(grns).where(eq(grns.id, id)).limit(1);
    await db.delete(grns).where(eq(grns.id, id));
    if (!existing) return;
    await db.delete(stockLedger).where(and(eq(stockLedger.referenceType, "GRN"), eq(stockLedger.referenceId, existing.displayId)));
    for (const item of existing.items || []) {
      await this.rebuildSiteStockFromLedger(existing.siteId, item.materialId);
    }
  }

  async getBills(): Promise<Bill[]> {
    return db.select().from(bills);
  }
  async createBill(bill: InsertBill): Promise<Bill> {
    const existing = await db.select({ displayId: bills.displayId }).from(bills);
    const displayId = await this.generateDisplayId("BILL", bill.siteId, bill.date, existing.map((entry) => entry.displayId));
    const [result] = await db.insert(bills).values({ ...bill, displayId }).returning();
    return result;
  }
  async updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill | undefined> {
    const [result] = await db.update(bills).set(bill).where(eq(bills.id, id)).returning();
    return result;
  }
  async deleteBill(id: number): Promise<void> {
    await db.delete(bills).where(eq(bills.id, id));
  }

  async getPayments(): Promise<Payment[]> {
    return db.select().from(payments);
  }
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [result] = await db.insert(payments).values(payment).returning();
    return result;
  }
  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [result] = await db.update(payments).set(payment).where(eq(payments.id, id)).returning();
    return result;
  }
  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  async getPOTemplates(): Promise<POTemplate[]> {
    return db.select().from(poTemplates);
  }
  async createPOTemplate(template: InsertPOTemplate): Promise<POTemplate> {
    const [result] = await db.insert(poTemplates).values(template).returning();
    return result;
  }
  async updatePOTemplate(id: number, template: Partial<InsertPOTemplate>): Promise<POTemplate | undefined> {
    const [result] = await db.update(poTemplates).set(template).where(eq(poTemplates.id, id)).returning();
    return result;
  }
  async deletePOTemplate(id: number): Promise<void> {
    await db.delete(poTemplates).where(eq(poTemplates.id, id));
  }

  async getTemplateStyles(): Promise<TemplateStyle[]> {
    return db.select().from(templateStyles);
  }
  async createTemplateStyle(style: InsertTemplateStyle): Promise<TemplateStyle> {
    const [result] = await db.insert(templateStyles).values(style).returning();
    return result;
  }
  async updateTemplateStyle(id: number, style: Partial<InsertTemplateStyle>): Promise<TemplateStyle | undefined> {
    const [result] = await db.update(templateStyles).set(style).where(eq(templateStyles.id, id)).returning();
    return result;
  }
  async deleteTemplateStyle(id: number): Promise<void> {
    await db.delete(templateStyles).where(eq(templateStyles.id, id));
  }

  async getMaterialIssues(): Promise<MaterialIssue[]> {
    return db.select().from(materialIssues);
  }
  async createMaterialIssue(issue: InsertMaterialIssue): Promise<MaterialIssue> {
    const [result] = await db.insert(materialIssues).values(issue).returning();
    for (const item of result.items || []) {
      const qty = Number(item.qty || 0);
      if (qty <= 0) continue;
      await this.appendStockLedgerEntry({
        materialId: item.materialId,
        siteId: result.siteId,
        referenceType: "ISSUE",
        referenceId: result.displayId,
        qtyIn: 0,
        qtyOut: qty,
        createdAt: result.date,
      });
      await this.rebuildSiteStockFromLedger(result.siteId, item.materialId);
    }
    return result;
  }
  async updateMaterialIssue(id: number, issue: Partial<InsertMaterialIssue>): Promise<MaterialIssue | undefined> {
    const [result] = await db.update(materialIssues).set(issue).where(eq(materialIssues.id, id)).returning();
    return result;
  }
  async deleteMaterialIssue(id: number): Promise<void> {
    const [existing] = await db.select().from(materialIssues).where(eq(materialIssues.id, id)).limit(1);
    await db.delete(materialIssues).where(eq(materialIssues.id, id));
    if (!existing) return;
    await db.delete(stockLedger).where(and(eq(stockLedger.referenceType, "ISSUE"), eq(stockLedger.referenceId, existing.displayId)));
    for (const item of existing.items || []) {
      await this.rebuildSiteStockFromLedger(existing.siteId, item.materialId);
    }
  }

  async getSiteStocks(): Promise<SiteStock[]> {
    return db.select().from(siteStock);
  }
  async upsertSiteStock(sId: string, mId: string, receivedDelta: number, issuedDelta: number, override?: { receivedQty: number; issuedQty: number }): Promise<SiteStock> {
    const existing = await db.select().from(siteStock)
      .where(and(eq(siteStock.siteId, sId), eq(siteStock.materialId, mId)));
    const nextReceivedQty = override ? Number(override.receivedQty || 0) : Number(existing[0]?.receivedQty || 0) + receivedDelta;
    const nextIssuedQty = override ? Number(override.issuedQty || 0) : Number(existing[0]?.issuedQty || 0) + issuedDelta;
    if (existing.length > 0) {
      const [result] = await db.update(siteStock).set({
        receivedQty: nextReceivedQty,
        issuedQty: nextIssuedQty,
      }).where(eq(siteStock.id, existing[0].id)).returning();
      return result;
    }
    const [result] = await db.insert(siteStock).values({
      siteId: sId, materialId: mId,
      receivedQty: nextReceivedQty,
      issuedQty: nextIssuedQty,
    }).returning();
    return result;
  }

  async getMaterialRateHistoryEntries(): Promise<MaterialRateHistoryEntry[]> {
    return db.select().from(materialRateHistory);
  }
  async createMaterialRateHistoryEntry(entry: InsertMaterialRateHistory): Promise<MaterialRateHistoryEntry> {
    const [result] = await db.insert(materialRateHistory).values(entry).returning();
    return result;
  }

  async getVendorMaterialRates(): Promise<VendorMaterialRate[]> {
    return db.select().from(vendorMaterialRates);
  }
  async getVendorMaterialRatesByVendor(vendorId: string): Promise<VendorMaterialRate[]> {
    return db.select().from(vendorMaterialRates).where(eq(vendorMaterialRates.vendorId, vendorId));
  }
  async upsertVendorMaterialRate(vendorId: string, materialId: string, rate: number): Promise<VendorMaterialRate> {
    const existing = await db.select().from(vendorMaterialRates)
      .where(and(eq(vendorMaterialRates.vendorId, vendorId), eq(vendorMaterialRates.materialId, materialId)));
    const now = new Date().toISOString();
    if (existing.length > 0) {
      const [result] = await db.update(vendorMaterialRates).set({ rate, updatedAt: now })
        .where(eq(vendorMaterialRates.id, existing[0].id)).returning();
      return result;
    }
    const [result] = await db.insert(vendorMaterialRates).values({ vendorId, materialId, rate, updatedAt: now }).returning();
    return result;
  }
  async deleteVendorMaterialRate(id: number): Promise<void> {
    await db.delete(vendorMaterialRates).where(eq(vendorMaterialRates.id, id));
  }

  async getVendorLedger(vendorId: string, startDate?: string, endDate?: string): Promise<VendorLedgerEntry[]> {
    const [vendorExists] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.id, Number(vendorId))).limit(1);
    if (!vendorExists) {
      return [];
    }

    const vendorBills = await db.select().from(bills).where(eq(bills.vendorId, vendorId));
    const billDisplayIds = vendorBills.map((bill) => bill.displayId);
    const vendorPayments = billDisplayIds.length
      ? await db.select().from(payments).where(inArray(payments.billId, billDisplayIds))
      : [];

    const openingEntries = await db
      .select()
      .from(vendorLedgerEntries)
      .where(and(eq(vendorLedgerEntries.vendorId, vendorId), eq(vendorLedgerEntries.type, "opening_balance")));

    const [openingEntry] = openingEntries.sort((a, b) => a.id - b.id);

    const allEntries = [
      ...(openingEntry ? [{
        date: openingEntry.date,
        type: "opening_balance" as const,
        reference: openingEntry.reference || "Opening Balance",
        debit: Number(openingEntry.debit || 0),
        credit: Number(openingEntry.credit || 0),
      }] : []),
      ...vendorBills.map((bill) => ({
        date: bill.date,
        type: "bill" as const,
        reference: bill.displayId,
        debit: Number(bill.amount || 0),
        credit: 0,
      })),
      ...vendorPayments.map((payment) => ({
        date: payment.date,
        type: "payment" as const,
        reference: payment.displayId,
        debit: 0,
        credit: Number(payment.amount || 0),
      })),
    ].sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      const priority = { opening_balance: 0, bill: 1, payment: 2 };
      return priority[a.type] - priority[b.type];
    });

    let previousBalance = 0;
    const filtered: VendorLedgerEntry[] = [];

    for (const txn of allEntries) {
      const newBalance = previousBalance + txn.debit - txn.credit;
      const isInRange = (!startDate || txn.date >= startDate) && (!endDate || txn.date <= endDate);
      if (isInRange) {
        filtered.push({ ...txn, balance: newBalance });
      }
      previousBalance = newBalance;
    }

    return filtered;
  }

  async getVendorStatement(vendorId: string, month: string): Promise<VendorStatement> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, Number(vendorId))).limit(1);
    if (!vendor) {
      return {
        vendorName: "",
        month,
        openingBalance: 0,
        totalBills: 0,
        totalPayments: 0,
        closingBalance: 0,
        transactions: [],
      };
    }

    const [year, monthValue] = month.split("-").map(Number);
    const monthStart = `${year}-${String(monthValue).padStart(2, "0")}-01`;
    const monthEnd = new Date(year, monthValue, 0).toISOString().slice(0, 10);

    const fullLedger = await this.getVendorLedger(vendorId);
    const openingEntriesTotal = fullLedger
      .filter((entry) => entry.type === "opening_balance")
      .reduce((acc, entry) => acc + entry.debit - entry.credit, 0);
    const carryForwardBeforeMonth = fullLedger
      .filter((entry) => entry.type !== "opening_balance" && entry.date < monthStart)
      .reduce((acc, entry) => acc + entry.debit - entry.credit, 0);
    const openingBalance = openingEntriesTotal + carryForwardBeforeMonth;

    const monthTransactions = fullLedger.filter((entry) => entry.date >= monthStart && entry.date <= monthEnd && entry.type !== "opening_balance");

    const totalBills = monthTransactions.reduce((acc, entry) => acc + entry.debit, 0);
    const totalPayments = monthTransactions.reduce((acc, entry) => acc + entry.credit, 0);
    const closingBalance = openingBalance + totalBills - totalPayments;

    let runningBalance = openingBalance;
    const transactions: VendorLedgerEntry[] = [
      {
        date: monthStart,
        type: "opening_balance",
        reference: "Opening Balance",
        debit: openingBalance,
        credit: 0,
        balance: openingBalance,
      },
    ];

    for (const entry of monthTransactions) {
      runningBalance += entry.debit - entry.credit;
      transactions.push({ ...entry, balance: runningBalance });
    }

    return {
      vendorName: vendor.name,
      month,
      openingBalance,
      totalBills,
      totalPayments,
      closingBalance,
      transactions,
    };
  }

  async getVendorPayables(): Promise<VendorPayable[]> {
    const vendorList = await db.select().from(vendors);
    const results: VendorPayable[] = [];

    for (const vendor of vendorList) {
      const ledger = await this.getVendorLedger(vendor.id.toString());
      const outstanding = ledger.length ? ledger[ledger.length - 1].balance : 0;
      if (outstanding > 0) {
        results.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          outstanding,
        });
      }
    }

    return results.sort((a, b) => b.outstanding - a.outstanding);
  }

  async getCostAnalysisSummary(filters?: CostAnalysisFilters): Promise<CostAnalysisSummary> {
    const allBills = await db.select().from(bills);
    const allPurchaseOrders = await db.select().from(purchaseOrders);

    const filteredBills = allBills.filter((bill) => {
      if (filters?.siteId && bill.siteId !== filters.siteId) return false;
      if (filters?.vendorId && bill.vendorId !== filters.vendorId) return false;
      if (filters?.startDate && bill.date < filters.startDate) return false;
      if (filters?.endDate && bill.date > filters.endDate) return false;
      return true;
    });

    const poByDisplayId = new Map(allPurchaseOrders.map((po) => [po.displayId, po]));
    const materialMap = new Map<string, number>();
    const materialQtyMap = new Map<string, number>();
    const vendorMap = new Map<string, number>();
    const siteMap = new Map<string, number>();
    const siteVendorMap = new Map<string, number>();
    const vendorMaterialMap = new Map<string, number>();

    let totalProjectCost = 0;

    for (const bill of filteredBills) {
      const po = poByDisplayId.get(bill.poId);
      const poItems = Array.isArray(po?.items) ? po!.items : [];
      const fullMaterialAmount = poItems.reduce((sum, item) => sum + Number(item.amount || Number(item.qty || 0) * Number(item.rate || 0)), 0);
      const billMaterialAmount = Number(bill.materialAmount || fullMaterialAmount || 0);

      const selectedItems = filters?.materialId ? poItems.filter((item) => item.materialId === filters.materialId) : poItems;
      const selectedMaterialAmount = selectedItems.reduce((sum, item) => sum + Number(item.amount || Number(item.qty || 0) * Number(item.rate || 0)), 0);
      const selectedRatio = filters?.materialId ? (fullMaterialAmount > 0 ? selectedMaterialAmount / fullMaterialAmount : 0) : 1;

      const effectiveProjectAmount = Number(bill.amount || 0) * selectedRatio;
      const effectiveMaterialAmount = billMaterialAmount * selectedRatio;

      totalProjectCost += effectiveProjectAmount;
      vendorMap.set(bill.vendorId, (vendorMap.get(bill.vendorId) || 0) + effectiveProjectAmount);
      siteMap.set(bill.siteId, (siteMap.get(bill.siteId) || 0) + effectiveProjectAmount);
      siteVendorMap.set(`${bill.siteId}::${bill.vendorId}`, (siteVendorMap.get(`${bill.siteId}::${bill.vendorId}`) || 0) + effectiveProjectAmount);

      const itemScale = selectedMaterialAmount > 0 ? effectiveMaterialAmount / selectedMaterialAmount : 0;
      for (const item of selectedItems) {
        const baseAmount = Number(item.amount || Number(item.qty || 0) * Number(item.rate || 0));
        const itemAmount = baseAmount * itemScale;
        materialMap.set(item.materialId, (materialMap.get(item.materialId) || 0) + itemAmount);
        materialQtyMap.set(item.materialId, (materialQtyMap.get(item.materialId) || 0) + Number(item.qty || 0));
        vendorMaterialMap.set(`${bill.vendorId}::${item.materialId}`, (vendorMaterialMap.get(`${bill.vendorId}::${item.materialId}`) || 0) + itemAmount);
      }
    }



    const materialList = await db.select().from(materials);
    const vendorList = await db.select().from(vendors);
    const siteList = await db.select().from(sites);

    const materialNameById = new Map(materialList.map((m) => [m.id.toString(), m.name]));
    const vendorNameById = new Map(vendorList.map((v) => [v.id.toString(), v.name]));
    const siteNameById = new Map(siteList.map((site) => [site.id.toString(), site.name]));

    const toRows = (map: Map<string, number>, names: Map<string, string>) =>
      Array.from(map.entries())
        .map(([id, totalAmount]) => ({
          id,
          name: names.get(id) || `Unknown (${id})`,
          totalAmount,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

    const materialBreakdown = Array.from(materialMap.entries())
      .map(([materialId, totalCost]) => ({
        materialId,
        materialName: materialNameById.get(materialId) || `Unknown (${materialId})`,
        quantity: Number(materialQtyMap.get(materialId) || 0),
        totalCost,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    const siteVendorCost = Array.from(siteVendorMap.entries())
      .map(([key, totalAmount]) => {
        const [siteId, vendorId] = key.split('::');
        return {
          key,
          name: `${siteNameById.get(siteId) || `Unknown Site (${siteId})`} + ${vendorNameById.get(vendorId) || `Unknown Vendor (${vendorId})`}`,
          totalAmount,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const vendorMaterialCost = Array.from(vendorMaterialMap.entries())
      .map(([key, totalAmount]) => {
        const [vendorId, materialId] = key.split('::');
        return {
          key,
          name: `${vendorNameById.get(vendorId) || `Unknown Vendor (${vendorId})`} + ${materialNameById.get(materialId) || `Unknown Material (${materialId})`}`,
          totalAmount,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const totalMaterialCost = Array.from(materialMap.values()).reduce((sum, value) => sum + value, 0);
    const totalPurchaseCost = totalProjectCost;
    const totalQuantityPurchased = Array.from(materialQtyMap.values()).reduce((sum, qty) => sum + qty, 0);
    const averageMaterialRate = totalQuantityPurchased > 0
      ? materialBreakdown.reduce((sum, row) => sum + row.totalCost, 0) / totalQuantityPurchased
      : 0;

    const vendorSpendAnalysis = toRows(vendorMap, vendorNameById);

    return {
      topMaterialsBySpend: toRows(materialMap, materialNameById),
      vendorSpendAnalysis,
      siteWisePurchaseCost: toRows(siteMap, siteNameById),
      siteVendorCost,
      vendorMaterialCost,
      materialBreakdown,
      totalPurchaseCost,
      totalMaterialCost,
      totalProjectCost,
      totalQuantityPurchased,
      averageMaterialRate,
      topVendorsBySpend: vendorSpendAnalysis.slice(0, 5),
    };
  }


  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const timestamp = new Date().toISOString();
    const payload = {
      ...user,
      email: user.email.trim().toLowerCase(),
      phone: user.phone ?? "",
      password: isPasswordHashed(user.password) ? user.password : hashPassword(user.password),
      role: user.role ?? "Admin",
      isActive: user.isActive ?? 1,
      createdAt: user.createdAt ?? timestamp,
      updatedAt: user.updatedAt ?? timestamp,
    };
    const [result] = await db.insert(users).values(payload).returning();
    return result;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const payload: Partial<InsertUser> = { ...user };
    if (typeof payload.email === "string") {
      payload.email = payload.email.trim().toLowerCase();
    }
    payload.updatedAt = new Date().toISOString();
    const [result] = await db.update(users).set(payload).where(eq(users.id, id)).returning();
    return result;
  }

  async ensureDefaultAdminUser(): Promise<void> {
    const [existing] = await db.select().from(users).limit(1);
    if (existing) return;
    await this.createUser({
      name: "Admin",
      email: "admin@purchase.local",
      phone: "",
      password: hashPassword("admin123"),
      role: "Admin",
      isActive: 1,
    });
  }

  async getUserProfiles(): Promise<UserProfile[]> {
    return db.select().from(userProfile);
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const payload = {
      ...profile,
      phone: profile.phone ?? "",
      role: profile.role ?? "Admin",
      company: profile.company ?? "JAKHIRA",
      avatarUrl: profile.avatarUrl ?? "",
      password: profile.password ?? "admin123",
    };
    const [result] = await db.insert(userProfile).values(payload).returning();
    return result;
  }

  async updateUserProfile(id: number, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [result] = await db.update(userProfile).set(profile).where(eq(userProfile.id, id)).returning();
    return result;
  }

  async ensureDefaultUserProfile(): Promise<void> {
    const [existing] = await db.select().from(userProfile).limit(1);
    if (existing) return;
    await db.insert(userProfile).values({
      name: "Admin",
      email: "admin@purchase.local",
      phone: "",
      role: "Admin",
      company: "JAKHIRA",
      avatarUrl: "",
      password: hashPassword("admin123"),
    });
  }

  async userHasPermission(role: string, moduleName: string, action: string): Promise<boolean> {
    if ((role || "").trim().toLowerCase() === ERP_ROLES.ADMIN.toLowerCase()) {
      return true;
    }

    const normalizedRole = (role || "").trim();
    if (!normalizedRole) return false;

    const matchingPermissions = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(and(eq(permissions.module, moduleName), eq(permissions.action, action)));

    if (!matchingPermissions.length) return false;

    const permissionIds = matchingPermissions.map((entry) => entry.id);
    const roleMatches = await db
      .select()
      .from(rolePermissions)
      .where(and(eq(rolePermissions.role, normalizedRole), inArray(rolePermissions.permissionId, permissionIds)));

    return roleMatches.length > 0;
  }

  async getRolePermissionMap(role: string): Promise<PermissionMap> {
    const normalizedRole = (role || "").trim() || ERP_ROLES.VIEWER;
    const permissionRows = await db.select().from(permissions);
    const roleRows = await db.select().from(rolePermissions).where(eq(rolePermissions.role, normalizedRole));
    const allowedPermissionIds = new Set(roleRows.map((row) => row.permissionId));

    const map: PermissionMap = {};
    for (const moduleName of ERP_PERMISSION_MODULES) {
      map[moduleName] = {};
      for (const action of ERP_PERMISSION_ACTIONS) {
        map[moduleName]![action] = false;
      }
    }

    for (const permission of permissionRows) {
      if (!allowedPermissionIds.has(permission.id)) {
        continue;
      }
      const moduleName = permission.module as PermissionModule;
      const action = permission.action as PermissionAction;
      if (!ERP_PERMISSION_MODULES.includes(moduleName) || !ERP_PERMISSION_ACTIONS.includes(action)) {
        continue;
      }
      map[moduleName]![action] = true;
    }

    return map;
  }

  async setRolePermissionMap(role: string, map: PermissionMap): Promise<void> {
    const normalizedRole = (role || "").trim();
    if (!normalizedRole) {
      return;
    }

    const permissionRows = await db.select().from(permissions);
    const permissionIdByKey = new Map(permissionRows.map((row) => [`${row.module}::${row.action}`, row.id]));
    const nextPermissionIds: number[] = [];

    for (const moduleName of ERP_PERMISSION_MODULES) {
      for (const action of ERP_PERMISSION_ACTIONS) {
        if (!map[moduleName]?.[action]) {
          continue;
        }
        const id = permissionIdByKey.get(`${moduleName}::${action}`);
        if (id) {
          nextPermissionIds.push(id);
        }
      }
    }

    await db.delete(rolePermissions).where(eq(rolePermissions.role, normalizedRole));
    if (nextPermissionIds.length === 0) {
      return;
    }

    await db.insert(rolePermissions).values(
      nextPermissionIds.map((permissionId) => ({
        role: normalizedRole,
        permissionId,
      })),
    );
  }

  async getSystemSettings(): Promise<SystemSettings> {

    const [result] = await db.select().from(systemSettings).limit(1);
    if (result) return result;
    const [created] = await db.insert(systemSettings).values({ backupEnabled: 0, backupFrequency: "weekly", backupLocation: "/backups", updatedAt: new Date().toISOString() }).returning();
    return created;
  }

  async updateSystemSettings(settings: Partial<InsertSystemSettings>): Promise<SystemSettings> {
    const current = await this.getSystemSettings();
    const [updated] = await db.update(systemSettings).set({ ...settings, updatedAt: new Date().toISOString() }).where(eq(systemSettings.id, current.id)).returning();
    return updated;
  }

  async createDatabaseBackup(): Promise<{ fileName: string; filePath: string }> {
    const { mkdirSync, readdirSync, rmSync } = await import("fs");
    const { join } = await import("path");
    const { default: Database } = await import("better-sqlite3");
    const dataDir = process.env.APP_DATA_DIR || process.cwd();
    const source = join(dataDir, "data", "local.db");
    const backupDir = join(dataDir, "backups");
    mkdirSync(backupDir, { recursive: true });
    const now = new Date();
    const stamp = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}_${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}_${String(now.getMinutes()).padStart(2, "0")}`;
    const fileName = `backup_${stamp}.db`;
    const filePath = join(backupDir, fileName);
    const sourceDb = new Database(source, { readonly: true });
    await sourceDb.backup(filePath);
    sourceDb.close();

    const backups = readdirSync(backupDir).filter((name) => name.startsWith("backup_") && name.endsWith(".db")).sort().reverse();
    backups.slice(10).forEach((old) => rmSync(join(backupDir, old), { force: true }));
    return { fileName, filePath };
  }

  async listBackups(): Promise<string[]> {
    const { readdirSync, existsSync } = await import("fs");
    const { join } = await import("path");
    const dataDir = process.env.APP_DATA_DIR || process.cwd();
    const backupDir = join(dataDir, "backups");
    if (!existsSync(backupDir)) return [];
    return readdirSync(backupDir).filter((name) => name.startsWith("backup_") && name.endsWith(".db")).sort().reverse();
  }

  async resetDemoData(): Promise<void> {
    const operationalTables = [
      payments,
      bills,
      grns,
      purchaseOrders,
      vendorLedgerEntries,
      stockLedger,
      siteStock,
      materialIssues,
      materialRateHistory,
      vendorMaterialRates,
      materials,
      vendors,
      sites,
    ];
    for (const table of operationalTables) {
      await db.delete(table as any);
    }
  }

}

export const storage = new DatabaseStorage();
