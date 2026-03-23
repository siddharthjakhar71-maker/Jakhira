import type { Express, Request } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { assertProfileImageSize, getProfileImageConfig } from "./lib/profile-image";
import * as XLSX from "xlsx";
import { createEmptyPermissionMap, permissionMapFromRecords } from "@shared/permissions";
import { getSessionUser, requireAuth, requirePermission } from "./auth-middleware";
import { verifyPassword, hashPassword, isPasswordHashed } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const getCurrentUser = async (req: Request) => {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) {
      return undefined;
    }

    return storage.getUserById(sessionUser.id);
  };

  const sanitizeUser = (user: Awaited<ReturnType<typeof storage.getUserById>>) => {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  };

  const DAY_MS = 24 * 60 * 60 * 1000;

  const frequencyDays = (frequency: string) => {
    if (frequency === "daily") return 1;
    if (frequency === "monthly") return 30;
    return 7;
  };

  const parseBackupTime = (fileName: string): Date | null => {
    const match = fileName.match(/^backup_(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})\.db$/);
    if (!match) return null;

    const [, year, month, day, hour, minute] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  };

  let backupInProgress = false;

  const checkIfBackupNeeded = async () => {
    const settings = await storage.getSystemSettings();
    if (!settings.backupEnabled || backupInProgress) return;

    const backups = await storage.listBackups();
    const latestBackup = backups.length ? parseBackupTime(backups[0]) : null;
    const requiredIntervalMs = frequencyDays(settings.backupFrequency) * DAY_MS;
    const backupDue = !latestBackup || Date.now() - latestBackup.getTime() >= requiredIntervalMs;

    if (!backupDue) return;

    backupInProgress = true;
    try {
      await storage.createDatabaseBackup();
    } finally {
      backupInProgress = false;
    }
  };

  const startBackupScheduler = async () => {
    await checkIfBackupNeeded();
    setInterval(() => {
      void checkIfBackupNeeded();
    }, DAY_MS);
  };
  startBackupScheduler();

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    await storage.ensureDefaultAdminUser();
    await storage.ensurePermissionsSeeded();
    const user = await storage.getUserByEmail(email);

    if (!user || !user.isActive || !verifyPassword(password, user.password)) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!isPasswordHashed(user.password)) {
      await storage.updateUser(user.id, { password: hashPassword(password) });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    await new Promise<void>((resolve, reject) => {
      req.session.save((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    return res.json({ success: true, user: sanitizeUser(user) });
  });

  app.use("/api", (req, res, next) => requireAuth()(req, res, next));

  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json({ message: "Failed to logout" });
      }

      res.clearCookie("jakhira.sid");
      return res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const user = await getCurrentUser(req);
    return res.json({ user: sanitizeUser(user) });
  });

  app.get("/api/auth/permissions", async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const permissionRecords = await storage.getRolePermissions(user.role);
    return res.json({
      role: user.role,
      permissions: permissionRecords,
      permissionMap: permissionMapFromRecords(permissionRecords),
      modules: createEmptyPermissionMap(),
    });
  });

  app.get("/api/auth/profile", async (req, res) => {
    const user = await getCurrentUser(req);
    return res.json({ profile: sanitizeUser(user) });
  });

  app.patch("/api/auth/profile", async (req, res) => {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const payload: Record<string, unknown> = {};
    if (typeof req.body?.name === "string") payload.name = req.body.name.trim();
    if (typeof req.body?.email === "string") payload.email = req.body.email.trim().toLowerCase();
    if (typeof req.body?.phone === "string") payload.phone = req.body.phone.trim();
    if (typeof req.body?.role === "string") payload.role = req.body.role.trim();
    if (typeof req.body?.avatarUrl === "string" && req.body.avatarUrl.trim().length > 0) {
      try {
        assertProfileImageSize(req.body.avatarUrl);
      } catch (error) {
        return res.status(413).json({
          message: error instanceof Error ? error.message : "Invalid profile image.",
          profileImage: getProfileImageConfig(),
          recommendedUploadMode: "multipart/form-data",
        });
      }
    }

    const updated = await storage.updateUser(currentUser.id, payload);
    if (!updated) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json({ profile: sanitizeUser(updated) });
  });

  app.post("/api/auth/change-password", async (req, res) => {
    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(404).json({ message: "Profile not found" });
    }
    if (!verifyPassword(currentPassword, user.password)) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    await storage.updateUser(user.id, { password: hashPassword(newPassword) });
    return res.json({ success: true, message: "Password changed successfully" });
  });

  // Sites
  app.get("/api/sites", requirePermission("Sites", "view"), async (_req, res) => {
    const result = await storage.getSites();
    res.json(result);
  });

  app.post("/api/sites", requirePermission("Sites", "create"), async (req, res) => {
    try {
      const result = await storage.createSite(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to create site" });
    }
  });

  app.post("/api/sites/batch", requirePermission("Sites", "create"), async (req, res) => {
    const items: any[] = req.body;
    const results = [];
    for (const item of items) {
      results.push(await storage.createSite(item));
    }
    res.json(results);
  });

  app.patch("/api/sites/:id", requirePermission("Sites", "edit"), async (req, res) => {
    try {
      const result = await storage.updateSite(Number(req.params.id), req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to update site" });
    }
  });

  app.delete("/api/sites/:id", requirePermission("Sites", "delete"), async (req, res) => {
    await storage.deleteSite(Number(req.params.id));
    res.json({ success: true });
  });

  // Vendors
  app.get("/api/vendors", requirePermission("Vendors", "view"), async (_req, res) => {
    const result = await storage.getVendors();
    res.json(result);
  });

  app.post("/api/vendors", requirePermission("Vendors", "create"), async (req, res) => {
    const result = await storage.createVendor(req.body);
    res.json(result);
  });

  app.post("/api/vendors/batch", requirePermission("Vendors", "create"), async (req, res) => {
    const items: any[] = req.body;
    const results = [];
    for (const item of items) {
      results.push(await storage.createVendor(item));
    }
    res.json(results);
  });

  app.patch("/api/vendors/:id", requirePermission("Vendors", "edit"), async (req, res) => {
    const result = await storage.updateVendor(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/vendors/:id", requirePermission("Vendors", "delete"), async (req, res) => {
    await storage.deleteVendor(Number(req.params.id));
    res.json({ success: true });
  });

  // Materials
  app.get("/api/materials", requirePermission("Materials", "view"), async (_req, res) => {
    const result = await storage.getMaterials();
    res.json(result);
  });

  app.post("/api/materials", requirePermission("Materials", "create"), async (req, res) => {
    const result = await storage.createMaterial(req.body);
    res.json(result);
  });

  app.post("/api/materials/batch", requirePermission("Materials", "create"), async (req, res) => {
    const items: any[] = req.body;
    const results = [];
    for (const item of items) {
      results.push(await storage.createMaterial(item));
    }
    res.json(results);
  });

  app.patch("/api/materials/:id", requirePermission("Materials", "edit"), async (req, res) => {
    const result = await storage.updateMaterial(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/materials/:id", requirePermission("Materials", "delete"), async (req, res) => {
    await storage.deleteMaterial(Number(req.params.id));
    res.json({ success: true });
  });

  // PO Templates
  app.get("/api/po-templates", requirePermission("Purchase Orders", "view"), async (_req, res) => {
    const result = await storage.getPOTemplates();
    res.json(result);
  });

  app.post("/api/po-templates", requirePermission("Purchase Orders", "edit"), async (req, res) => {
    const result = await storage.createPOTemplate(req.body);
    res.json(result);
  });

  app.patch("/api/po-templates/:id", requirePermission("Purchase Orders", "edit"), async (req, res) => {
    const result = await storage.updatePOTemplate(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/po-templates/:id", requirePermission("Purchase Orders", "delete"), async (req, res) => {
    await storage.deletePOTemplate(Number(req.params.id));
    res.json({ success: true });
  });

  // Template Styles
  app.get("/api/template-styles", requirePermission("Purchase Orders", "view"), async (_req, res) => {
    const result = await storage.getTemplateStyles();
    res.json(result);
  });

  app.post("/api/template-styles", requirePermission("Purchase Orders", "edit"), async (req, res) => {
    const result = await storage.createTemplateStyle(req.body);
    res.json(result);
  });

  app.patch("/api/template-styles/:id", requirePermission("Purchase Orders", "edit"), async (req, res) => {
    const result = await storage.updateTemplateStyle(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/template-styles/:id", requirePermission("Purchase Orders", "delete"), async (req, res) => {
    await storage.deleteTemplateStyle(Number(req.params.id));
    res.json({ success: true });
  });

  // Purchase Orders
  app.get("/api/pos", requirePermission("Purchase Orders", "view"), async (_req, res) => {
    const result = await storage.getPurchaseOrders();
    res.json(result);
  });

  app.post("/api/pos", requirePermission("Purchase Orders", "create"), async (req, res) => {
    if (!req.body?.siteId) {
      return res.status(400).json({ message: "siteId is required for purchase orders" });
    }
    try {
      const result = await storage.createPurchaseOrder(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to create purchase order" });
    }
  });

  app.patch("/api/pos/:id", requirePermission("Purchase Orders", "edit"), async (req, res) => {
    const result = await storage.updatePurchaseOrder(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/pos/:id", requirePermission("Purchase Orders", "delete"), async (req, res) => {
    await storage.deletePurchaseOrder(Number(req.params.id));
    res.json({ success: true });
  });

  // GRNs
  app.get("/api/grns", requirePermission("GRN", "view"), async (_req, res) => {
    const result = await storage.getGrns();
    res.json(result);
  });

  app.post("/api/grns", requirePermission("GRN", "create"), async (req, res) => {
    const poNumber = req.body?.poId;
    const purchaseOrders = await storage.getPurchaseOrders();
    const po = purchaseOrders.find((item) => item.displayId === poNumber);
    if (!po) {
      return res.status(400).json({ message: "Invalid PO number" });
    }
    const payload = { ...req.body, siteId: po.siteId, poId: po.displayId };
    const result = await storage.createGrn(payload);
    res.json(result);
  });

  app.patch("/api/grns/:id", requirePermission("GRN", "edit"), async (req, res) => {
    const result = await storage.updateGrn(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/grns/:id", requirePermission("GRN", "delete"), async (req, res) => {
    await storage.deleteGrn(Number(req.params.id));
    res.json({ success: true });
  });

  // Bills
  app.get("/api/bills", requirePermission("Bills", "view"), async (_req, res) => {
    const result = await storage.getBills();
    res.json(result);
  });

  app.post("/api/bills", requirePermission("Bills", "create"), async (req, res) => {
    const poNumber = req.body?.poId;
    const purchaseOrders = await storage.getPurchaseOrders();
    const po = purchaseOrders.find((item) => item.displayId === poNumber);
    if (!po) {
      return res.status(400).json({ message: "Invalid PO number" });
    }
    const payload = { ...req.body, siteId: po.siteId, poId: po.displayId, vendorId: po.vendorId };
    const result = await storage.createBill(payload);
    res.json(result);
  });

  app.patch("/api/bills/:id", requirePermission("Bills", "edit"), async (req, res) => {
    const result = await storage.updateBill(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/bills/:id", requirePermission("Bills", "delete"), async (req, res) => {
    await storage.deleteBill(Number(req.params.id));
    res.json({ success: true });
  });

  // Payments
  app.get("/api/payments", requirePermission("Payments", "view"), async (_req, res) => {
    const result = await storage.getPayments();
    res.json(result);
  });

  app.post("/api/payments", requirePermission("Payments", "create"), async (req, res) => {
    const result = await storage.createPayment(req.body);
    res.json(result);
  });

  app.patch("/api/payments/:id", requirePermission("Payments", "edit"), async (req, res) => {
    const result = await storage.updatePayment(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/payments/:id", requirePermission("Payments", "delete"), async (req, res) => {
    await storage.deletePayment(Number(req.params.id));
    res.json({ success: true });
  });



  // Vendor Ledger
  app.get("/api/vendor-ledger/:vendorId", requirePermission("Reports", "view"), async (req, res) => {
    const { vendorId } = req.params;
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    const result = await storage.getVendorLedger(vendorId, startDate, endDate);
    res.json(result);
  });


  app.get("/api/vendor-statement/:vendorId", requirePermission("Reports", "view"), async (req, res) => {
    const { vendorId } = req.params;
    const month = typeof req.query.month === "string" ? req.query.month : "";
    if (!month) {
      return res.status(400).json({ message: "month query parameter is required in YYYY-MM format" });
    }
    const result = await storage.getVendorStatement(vendorId, month);
    res.json(result);
  });

  app.get("/api/vendor-payables", requirePermission("Reports", "view"), async (_req, res) => {
    const result = await storage.getVendorPayables();
    res.json(result);
  });



  app.get("/api/cost-analysis", requirePermission("Reports", "view"), async (req, res) => {
    const siteId = typeof req.query.siteId === "string" ? req.query.siteId : undefined;
    const vendorId = typeof req.query.vendorId === "string" ? req.query.vendorId : undefined;
    const materialId = typeof req.query.materialId === "string" ? req.query.materialId : undefined;
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    const result = await storage.getCostAnalysisSummary({ siteId, vendorId, materialId, startDate, endDate });
    res.json(result);
  });

  app.post("/api/vendor-rate-import", requirePermission("Reports", "create"), async (req, res) => {
    const { fileDataBase64 } = req.body ?? {};

    if (!fileDataBase64 || typeof fileDataBase64 !== "string") {
      return res.status(400).json({ success: false, message: "fileDataBase64 is required" });
    }

    try {
      const fileBuffer = Buffer.from(fileDataBase64, "base64");
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        return res.status(400).json({ success: false, message: "No worksheet found in file" });
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      const vendors = await storage.getVendors();
      const materials = await storage.getMaterials();
      const vendorNameMap = new Map(vendors.map((vendor) => [vendor.name.trim().toLowerCase(), vendor.id.toString()]));
      const materialNameMap = new Map(materials.map((material) => [material.name.trim().toLowerCase(), material.id.toString()]));

      for (const row of rows) {
        const materialName = String(row.Material ?? row.material ?? "").trim();
        const vendorName = String(row.Vendor ?? row.vendor ?? "").trim();
        const rateRaw = row.Rate ?? row.rate ?? "";
        const rate = Number(rateRaw);

        if (!materialName || !vendorName || Number.isNaN(rate)) {
          continue;
        }

        const materialId = materialNameMap.get(materialName.toLowerCase());
        const vendorId = vendorNameMap.get(vendorName.toLowerCase());

        if (!materialId || !vendorId) {
          continue;
        }

        await storage.upsertVendorMaterialRate(vendorId, materialId, rate);
      }

      return res.json({
        success: true,
        message: "Vendor rates imported successfully",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid or unsupported file",
      });
    }
  });


  app.get("/api/users", requirePermission("Users", "view"), async (_req, res) => {
    const result = await storage.getUsers();
    res.json(result.map(sanitizeUser));
  });

  app.post("/api/users", requirePermission("Users", "create"), async (req, res) => {
    const payload = {
      name: typeof req.body?.name === "string" ? req.body.name.trim() : "",
      email: typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "",
      phone: typeof req.body?.phone === "string" ? req.body.phone.trim() : "",
      password: typeof req.body?.password === "string" ? req.body.password : "",
      role: typeof req.body?.role === "string" ? req.body.role.trim() : "Viewer",
      isActive: req.body?.isActive ? 1 : 0,
    };

    if (!payload.name || !payload.email || !payload.password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const user = await storage.createUser(payload);
    res.status(201).json(sanitizeUser(user));
  });

  app.patch("/api/users/:id", requirePermission("Users", "edit"), async (req, res) => {
    const userId = Number(req.params.id);
    const currentUser = await getCurrentUser(req);
    if (currentUser && currentUser.id === userId && req.body?.isActive === 0) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    const payload: Record<string, unknown> = {};
    if (typeof req.body?.name === "string") payload.name = req.body.name.trim();
    if (typeof req.body?.email === "string") payload.email = req.body.email.trim().toLowerCase();
    if (typeof req.body?.phone === "string") payload.phone = req.body.phone.trim();
    if (typeof req.body?.role === "string") payload.role = req.body.role.trim();
    if (typeof req.body?.password === "string" && req.body.password.trim().length > 0) payload.password = req.body.password;
    if (req.body?.isActive !== undefined) payload.isActive = req.body.isActive ? 1 : 0;

    const updated = await storage.updateUser(userId, payload);
    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(sanitizeUser(updated));
  });

  app.get("/api/system-tools/settings", requirePermission("Settings", "view"), async (_req, res) => {
    const result = await storage.getSystemSettings();
    res.json(result);
  });

  app.patch("/api/system-tools/settings", requirePermission("Settings", "edit"), async (req, res) => {
    const result = await storage.updateSystemSettings(req.body);
    res.json(result);
  });

  app.post("/api/system-tools/backup", requirePermission("Settings", "approve"), async (req, res) => {
    const result = await storage.createDatabaseBackup();
    res.json(result);
  });

  app.get("/api/system-tools/backup/download", requirePermission("Settings", "view"), async (req, res) => {
    const result = await storage.createDatabaseBackup();
    res.download(result.filePath, result.fileName);
  });

  app.get("/api/system-logs", requirePermission("Settings", "view"), async (req, res) => {
    res.json([]);
  });

  app.post("/api/system-tools/reset-demo-data", requirePermission("Settings", "delete"), async (req, res) => {
    const { adminPassword } = req.body;
    const currentUser = await getCurrentUser(req);
    if (!currentUser || !verifyPassword(adminPassword, currentUser.password)) {
      return res.status(400).json({ message: "Admin password confirmation failed" });
    }
    await storage.resetDemoData();
    return res.json({ success: true });
  });

  // Material Issues
  app.get("/api/material-issues", requirePermission("Stock", "view"), async (_req, res) => {
    const result = await storage.getMaterialIssues();
    res.json(result);
  });

  app.post("/api/material-issues", requirePermission("Stock", "create"), async (req, res) => {
    const result = await storage.createMaterialIssue(req.body);
    res.json(result);
  });

  app.patch("/api/material-issues/:id", requirePermission("Stock", "edit"), async (req, res) => {
    const result = await storage.updateMaterialIssue(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/material-issues/:id", requirePermission("Stock", "delete"), async (req, res) => {
    await storage.deleteMaterialIssue(Number(req.params.id));
    res.json({ success: true });
  });

  // Site Stock
  app.get("/api/site-stock", requirePermission("Stock", "view"), async (_req, res) => {
    const result = await storage.getSiteStocks();
    res.json(result);
  });

  app.post("/api/site-stock/update", requirePermission("Stock", "edit"), async (req, res) => {
    const { siteId, materialId, receivedDelta, issuedDelta } = req.body;
    const result = await storage.upsertSiteStock(siteId, materialId, receivedDelta || 0, issuedDelta || 0);
    res.json(result);
  });

  // Material Rate History
  app.get("/api/rate-history", requirePermission("Stock", "view"), async (_req, res) => {
    const result = await storage.getMaterialRateHistoryEntries();
    res.json(result);
  });

  app.post("/api/rate-history", requirePermission("Stock", "create"), async (req, res) => {
    const result = await storage.createMaterialRateHistoryEntry(req.body);
    res.json(result);
  });

  // Vendor Material Rates
  app.get("/api/vendor-material-rates", requirePermission("Stock", "view"), async (_req, res) => {
    const result = await storage.getVendorMaterialRates();
    res.json(result);
  });

  app.get("/api/vendor-material-rates/:vendorId", requirePermission("Stock", "view"), async (req, res) => {
    const result = await storage.getVendorMaterialRatesByVendor(req.params.vendorId);
    res.json(result);
  });

  app.post("/api/vendor-material-rates", requirePermission("Stock", "edit"), async (req, res) => {
    const { vendorId, materialId, rate } = req.body;
    const result = await storage.upsertVendorMaterialRate(vendorId, materialId, rate);
    res.json(result);
  });

  app.delete("/api/vendor-material-rates/:id", requirePermission("Stock", "delete"), async (req, res) => {
    await storage.deleteVendorMaterialRate(Number(req.params.id));
    res.json({ success: true });
  });

  return httpServer;
}
