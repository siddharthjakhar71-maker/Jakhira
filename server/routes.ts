import type { Express, Request } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { assertProfileImageSize, getProfileImageConfig } from "./lib/profile-image";
import * as XLSX from "xlsx";
import { ERP_PERMISSION_ACTIONS, ERP_PERMISSION_MODULES, ERP_ROLES, PERMISSION_ROUTE_MAP, buildRolePermissionMap, canAccess, isAdminRole, type PermissionAction, type PermissionMap, type PermissionModule } from "@shared/permissions";
import { getSessionUser, requireAuth } from "./auth-middleware";
import { verifyPassword, hashPassword, isPasswordHashed } from "./auth";
import { erpRoleSchema } from "@shared/schema";
import { logAuditEvent } from "./lib/audit-log";

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
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  };

  const getAuditActor = async (req: Request) => {
    const user = await getCurrentUser(req);
    if (!user) return undefined;
    return { id: user.id, name: user.name, role: user.role };
  };

  const isSupportedRole = (role: string) => erpRoleSchema.safeParse(role).success;

  const requirePermission = async (req: Request, res: any, action: string): Promise<boolean> => {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return false;
    }
    if (isAdminRole(user.role)) {
      return true;
    }

    const moduleName = PERMISSION_ROUTE_MAP[req.path as keyof typeof PERMISSION_ROUTE_MAP];
    if (!moduleName) return true;
    const allowed = await storage.userHasPermission(user.role, moduleName, action);
    if (!allowed) {
      res.status(403).json({ message: `Permission denied: ${moduleName}.${action}` });
      return false;
    }
    return true;
  };

  const requireModulePermission = async (req: Request, res: any, moduleName: PermissionModule, action: PermissionAction): Promise<boolean> => {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return false;
    }
    if (isAdminRole(user.role)) {
      return true;
    }

    const allowed = await storage.userHasPermission(user.role, moduleName, action);
    if (!allowed) {
      res.status(403).json({ message: `Permission denied: ${moduleName}.${action}` });
      return false;
    }
    return true;
  };

  const getModuleFromApiPath = (path: string): PermissionModule | undefined => {
    if (path.startsWith("/api/sites")) return "Sites";
    if (path.startsWith("/api/vendors")) return "Vendors";
    if (path.startsWith("/api/materials")) return "Materials";
    if (path.startsWith("/api/pos")) return "Purchase Orders";
    if (path.startsWith("/api/grns")) return "GRN";
    if (path.startsWith("/api/bills")) return "Bills";
    if (path.startsWith("/api/payments")) return "Payments";
    if (path.startsWith("/api/site-stock") || path.startsWith("/api/material-issues")) return "Stock";
    if (path.startsWith("/api/reports")) return "Reports";
    if (path.startsWith("/api/system-tools") || path.startsWith("/api/po-templates") || path.startsWith("/api/template-styles") || path.startsWith("/api/access-control")) return "Settings";
    return undefined;
  };

  const getActionFromMethod = (method: string): PermissionAction => {
    if (method === "GET") return "view";
    if (method === "POST") return "create";
    if (method === "PATCH" || method === "PUT") return "edit";
    if (method === "DELETE") return "delete";
    return "view";
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
  const loginHandler = async (req: Request, res: any) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    await storage.ensureDefaultAdminUser();
    const user = await storage.getUserByEmail(email);

    console.log(`[auth.login] lookup email=${email} found=${Boolean(user)}`);
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account is inactive" });
    }

    const passwordMatched = verifyPassword(password, user.password);
    console.log(`[auth.login] passwordMatch email=${email} matched=${passwordMatched}`);
    if (!passwordMatched) {
      return res.status(401).json({ success: false, message: "Wrong password" });
    }

    if (!isPasswordHashed(user.password)) {
      await storage.updateUser(user.id, { password: hashPassword(password) });
    }

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) {
          reject(error);
          return;
        }
        req.session.user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
        req.session.save((saveError) => {
          if (saveError) {
            reject(saveError);
            return;
          }
          resolve();
        });
      });
    });

    req.session.touch();
    res.cookie("jakhira.sid", req.sessionID, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 12,
      secure: process.env.NODE_ENV === "production",
    });

    await logAuditEvent(storage, { id: user.id, name: user.name, role: user.role }, {
      action: "LOGIN_SUCCESS",
      module: "Authentication",
      entityType: "session",
      entityId: req.sessionID,
      description: `${user.name} logged in successfully.`,
      metadata: { email: user.email },
    });

    return res.json({ success: true, user: sanitizeUser(user) });
  };

  app.post("/api/auth/login", async (req, res) => {
    try {
      return await loginHandler(req, res);
    } catch (error) {
      console.error("[auth.login] error", error);
      return res.status(500).json({ success: false, message: "Login failed due to server error" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      return await loginHandler(req, res);
    } catch (error) {
      console.error("[auth.login] error", error);
      return res.status(500).json({ success: false, message: "Login failed due to server error" });
    }
  });

  app.use("/api", (req, res, next) => requireAuth()(req, res, next));
  app.use("/api", async (req, res, next) => {
    if (req.path.startsWith("/auth/")) {
      return next();
    }

    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isAdminRole(user.role)) {
      return next();
    }

    const moduleName = getModuleFromApiPath(`/api${req.path}`);
    if (!moduleName) {
      return next();
    }

    const action = getActionFromMethod(req.method);
    const allowed = await storage.userHasPermission(user.role, moduleName, action);
    if (!allowed) {
      return res.status(403).json({ message: `Permission denied: ${moduleName}.${action}` });
    }

    return next();
  });

  app.post("/api/auth/logout", async (req, res) => {
    const actor = await getAuditActor(req);
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json({ message: "Failed to logout" });
      }

      res.clearCookie("jakhira.sid");
      void logAuditEvent(storage, actor, {
        action: "LOGOUT",
        module: "Authentication",
        entityType: "session",
        description: `${actor?.name || "User"} logged out.`,
      });
      return res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const user = await getCurrentUser(req);
    return res.json({ user: sanitizeUser(user) });
  });

  app.get("/api/auth/profile", async (req, res) => {
    const user = await getCurrentUser(req);
    return res.json({ profile: sanitizeUser(user) });
  });

  app.get("/api/audit-logs", async (req, res) => {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!isAdminRole(currentUser.role)) {
      return res.status(403).json({ message: "Only Admin can view audit logs" });
    }

    const normalizeQuery = (value: unknown): string | undefined => {
      if (typeof value !== "string") return undefined;
      const normalized = value.trim();
      if (!normalized || normalized.toLowerCase() === "all") return undefined;
      return normalized;
    };

    const logs = await storage.getAuditLogs({
      userId: normalizeQuery(req.query.userId) ?? normalizeQuery(req.query.user) ?? normalizeQuery(req.query.userName),
      module: normalizeQuery(req.query.module),
      date: normalizeQuery(req.query.date),
      startDate: normalizeQuery(req.query.startDate) ?? normalizeQuery(req.query.from),
      endDate: normalizeQuery(req.query.endDate) ?? normalizeQuery(req.query.to),
      limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
      offset: typeof req.query.offset === "string" ? Number(req.query.offset) : undefined,
    });
    return res.json(logs);
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
    if (typeof req.body?.avatarUrl === "string") {
      const avatarUrl = req.body.avatarUrl.trim();
      if (avatarUrl.length > 0) {
        try {
          assertProfileImageSize(avatarUrl);
        } catch (error) {
          return res.status(413).json({
            message: error instanceof Error ? error.message : "Invalid profile image.",
            profileImage: getProfileImageConfig(),
            recommendedUploadMode: "multipart/form-data",
          });
        }
      }
      payload.avatarUrl = avatarUrl;
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

  // Access Control (inside Settings)
  app.use("/api/access-control", async (req, res, next) => {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isAdminRole(currentUser.role)) {
      return res.status(403).json({ message: "Only Admin can manage Access Control users" });
    }

    return next();
  });

  app.get("/api/access-control/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users.map((user) => sanitizeUser(user)));
  });

  app.post("/api/access-control/users", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
    const role = typeof req.body?.role === "string" ? req.body.role.trim() : ERP_ROLES.VIEWER;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (!isSupportedRole(role)) {
      return res.status(400).json({ message: "Unsupported role" });
    }

    const created = await storage.createUser({
      name: typeof req.body?.name === "string" ? req.body.name.trim() : email,
      email,
      phone: typeof req.body?.phone === "string" ? req.body.phone.trim() : "",
      password,
      role,
      isActive: Number(req.body?.isActive ?? 1) ? 1 : 0,
    });
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "CREATE_USER",
      module: "Access Control",
      entityType: "user",
      entityId: created.id,
      description: `User ${created.name} was created with role ${created.role}.`,
      metadata: { email: created.email, isActive: created.isActive },
    });
    res.json(sanitizeUser(created));
  });

  app.patch("/api/access-control/users/:id", async (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (typeof req.body?.role === "string" && !isSupportedRole(req.body.role.trim())) {
      return res.status(400).json({ message: "Unsupported role" });
    }

    const targetUser = await storage.getUserById(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const payload: Record<string, unknown> = {};
    if (typeof req.body?.name === "string") payload.name = req.body.name.trim();
    if (typeof req.body?.email === "string") payload.email = req.body.email.trim().toLowerCase();
    if (typeof req.body?.phone === "string") payload.phone = req.body.phone.trim();
    if (typeof req.body?.role === "string") payload.role = req.body.role.trim();
    if (typeof req.body?.isActive !== "undefined") payload.isActive = Number(req.body?.isActive) ? 1 : 0;
    if (typeof req.body?.password === "string" && req.body.password.trim()) payload.password = hashPassword(req.body.password.trim());
    const updated = await storage.updateUser(targetId, payload);
    if (!updated) return res.status(404).json({ message: "User not found" });
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "UPDATE_USER",
      module: "Access Control",
      entityType: "user",
      entityId: updated.id,
      description: `User ${updated.name} was updated.`,
      metadata: {
        roleChanged: targetUser.role !== updated.role,
        previousRole: targetUser.role,
        newRole: updated.role,
        activeChanged: targetUser.isActive !== updated.isActive,
        previousActive: targetUser.isActive,
        newActive: updated.isActive,
      },
    });
    res.json(sanitizeUser(updated));
  });

  app.delete("/api/access-control/users/:id", async (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (currentUser.id === targetId) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const targetUser = await storage.getUserById(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isTargetAdmin = (targetUser.role || "").trim().toLowerCase() === ERP_ROLES.ADMIN.toLowerCase();
    if (isTargetAdmin && targetUser.isActive) {
      const activeAdminCount = await storage.countActiveAdmins();
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: "Cannot delete the last active Admin account" });
      }
    }

    const deleted = await storage.deleteUser(targetId);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    await logAuditEvent(storage, await getAuditActor(req), {
      action: "DELETE_USER",
      module: "Access Control",
      entityType: "user",
      entityId: targetUser.id,
      description: `User ${targetUser.name} was deleted.`,
      metadata: { email: targetUser.email, role: targetUser.role },
    });

    return res.json({ success: true, message: "User deleted successfully" });
  });

  app.get("/api/access-control/permissions/:role", async (req, res) => {
    const role = typeof req.params.role === "string" ? req.params.role.trim() : "";
    if (!isSupportedRole(role)) {
      return res.status(400).json({ message: "Unsupported role" });
    }
    const map = await storage.getRolePermissionMap(role);
    res.json({ role, modules: ERP_PERMISSION_MODULES, actions: ERP_PERMISSION_ACTIONS, map });
  });

  app.put("/api/access-control/permissions/:role", async (req, res) => {
    const role = typeof req.params.role === "string" ? req.params.role.trim() : "";
    if (!isSupportedRole(role)) {
      return res.status(400).json({ message: "Unsupported role" });
    }
    if (role === ERP_ROLES.ADMIN) {
      return res.status(400).json({ message: "Admin permissions are fixed to full access" });
    }

    const incomingMap = (req.body?.map || {}) as PermissionMap;
    const safeMap: PermissionMap = buildRolePermissionMap(role);
    for (const moduleName of ERP_PERMISSION_MODULES) {
      for (const action of ERP_PERMISSION_ACTIONS) {
        safeMap[moduleName]![action] = canAccess(incomingMap, role, moduleName, action);
      }
    }

    await storage.setRolePermissionMap(role, safeMap);
    const updated = await storage.getRolePermissionMap(role);
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "UPDATE_ROLE_PERMISSIONS",
      module: "Access Control",
      entityType: "role",
      entityId: role,
      description: `Permissions were updated for role ${role}.`,
      metadata: { map: updated },
    });
    res.json({ role, map: updated });
  });

  app.use("/api/system-tools", async (req, res, next) => {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!isAdminRole(currentUser.role)) {
      return res.status(403).json({ message: "Only Admin can access System Tools" });
    }
    return next();
  });

  // Sites
  app.get("/api/sites", async (_req, res) => {
    const result = await storage.getSites();
    res.json(result);
  });

  app.post("/api/sites", async (req, res) => {
    try {
      const result = await storage.createSite(req.body);
      await logAuditEvent(storage, await getAuditActor(req), {
        action: "CREATE_SITE",
        module: "Sites",
        entityType: "site",
        entityId: result.id,
        description: `Site ${result.siteName || result.name} was created.`,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to create site" });
    }
  });

  app.post("/api/sites/batch", async (req, res) => {
    const items: any[] = req.body;
    const results = [];
    for (const item of items) {
      results.push(await storage.createSite(item));
    }
    res.json(results);
  });

  app.patch("/api/sites/:id", async (req, res) => {
    try {
      const result = await storage.updateSite(Number(req.params.id), req.body);
      if (result) {
        await logAuditEvent(storage, await getAuditActor(req), {
          action: "UPDATE_SITE",
          module: "Sites",
          entityType: "site",
          entityId: result.id,
          description: `Site ${result.siteName || result.name} was updated.`,
        });
      }
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to update site" });
    }
  });

  app.delete("/api/sites/:id", async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteSite(Number(req.params.id));
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "DELETE_SITE",
      module: "Sites",
      entityType: "site",
      entityId: id,
      description: `Site ${id} was deleted.`,
    });
    res.json({ success: true });
  });

  // Vendors
  app.get("/api/vendors", async (_req, res) => {
    const result = await storage.getVendors();
    res.json(result);
  });

  app.post("/api/vendors", async (req, res) => {
    const result = await storage.createVendor(req.body);
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "CREATE_VENDOR",
      module: "Vendors",
      entityType: "vendor",
      entityId: result.id,
      description: `Vendor ${result.name} was created.`,
    });
    res.json(result);
  });

  app.post("/api/vendors/batch", async (req, res) => {
    const items: any[] = req.body;
    const results = [];
    for (const item of items) {
      results.push(await storage.createVendor(item));
    }
    res.json(results);
  });

  app.patch("/api/vendors/:id", async (req, res) => {
    const result = await storage.updateVendor(Number(req.params.id), req.body);
    if (result) {
      await logAuditEvent(storage, await getAuditActor(req), {
        action: "UPDATE_VENDOR",
        module: "Vendors",
        entityType: "vendor",
        entityId: result.id,
        description: `Vendor ${result.name} was updated.`,
      });
    }
    res.json(result);
  });

  app.delete("/api/vendors/:id", async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteVendor(id);
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "DELETE_VENDOR",
      module: "Vendors",
      entityType: "vendor",
      entityId: id,
      description: `Vendor ${id} was deleted.`,
    });
    res.json({ success: true });
  });

  // Materials
  app.get("/api/materials", async (_req, res) => {
    const result = await storage.getMaterials();
    res.json(result);
  });

  app.post("/api/materials", async (req, res) => {
    const result = await storage.createMaterial(req.body);
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "CREATE_MATERIAL",
      module: "Materials",
      entityType: "material",
      entityId: result.id,
      description: `Material ${result.name} was created.`,
    });
    res.json(result);
  });

  app.post("/api/materials/batch", async (req, res) => {
    const items: any[] = req.body;
    const results = [];
    for (const item of items) {
      results.push(await storage.createMaterial(item));
    }
    res.json(results);
  });

  app.patch("/api/materials/:id", async (req, res) => {
    const result = await storage.updateMaterial(Number(req.params.id), req.body);
    if (result) {
      await logAuditEvent(storage, await getAuditActor(req), {
        action: "UPDATE_MATERIAL",
        module: "Materials",
        entityType: "material",
        entityId: result.id,
        description: `Material ${result.name} was updated.`,
      });
    }
    res.json(result);
  });

  app.delete("/api/materials/:id", async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteMaterial(id);
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "DELETE_MATERIAL",
      module: "Materials",
      entityType: "material",
      entityId: id,
      description: `Material ${id} was deleted.`,
    });
    res.json({ success: true });
  });

  // PO Templates
  app.get("/api/po-templates", async (_req, res) => {
    const result = await storage.getPOTemplates();
    res.json(result);
  });

  app.post("/api/po-templates", async (req, res) => {
    const result = await storage.createPOTemplate(req.body);
    res.json(result);
  });

  app.patch("/api/po-templates/:id", async (req, res) => {
    const result = await storage.updatePOTemplate(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/po-templates/:id", async (req, res) => {
    await storage.deletePOTemplate(Number(req.params.id));
    res.json({ success: true });
  });

  // Template Styles
  app.get("/api/template-styles", async (_req, res) => {
    const result = await storage.getTemplateStyles();
    res.json(result);
  });

  app.post("/api/template-styles", async (req, res) => {
    const result = await storage.createTemplateStyle(req.body);
    res.json(result);
  });

  app.patch("/api/template-styles/:id", async (req, res) => {
    const result = await storage.updateTemplateStyle(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/template-styles/:id", async (req, res) => {
    await storage.deleteTemplateStyle(Number(req.params.id));
    res.json({ success: true });
  });

  // Purchase Orders
  app.get("/api/pos", async (_req, res) => {
    const result = await storage.getPurchaseOrders();
    res.json(result);
  });

  app.post("/api/pos", async (req, res) => {
    if (!req.body?.siteId) {
      return res.status(400).json({ message: "siteId is required for purchase orders" });
    }
    try {
      const result = await storage.createPurchaseOrder(req.body);
      await logAuditEvent(storage, await getAuditActor(req), {
        action: "CREATE_PO",
        module: "Purchase Orders",
        entityType: "purchase_order",
        entityId: result.id,
        description: `Purchase order ${result.displayId} was created.`,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to create purchase order" });
    }
  });

  app.patch("/api/pos/:id", async (req, res) => {
    const result = await storage.updatePurchaseOrder(Number(req.params.id), req.body);
    if (result) {
      await logAuditEvent(storage, await getAuditActor(req), {
        action: "UPDATE_PO",
        module: "Purchase Orders",
        entityType: "purchase_order",
        entityId: result.id,
        description: `Purchase order ${result.displayId} was updated.`,
      });
    }
    res.json(result);
  });

  app.delete("/api/pos/:id", async (req, res) => {
    const id = Number(req.params.id);
    const purchaseOrders = await storage.getPurchaseOrders();
    const po = purchaseOrders.find((item) => item.id === id);
    await storage.deletePurchaseOrder(id);
    const poReference = (po?.poNumber || po?.displayId || String(id)).trim() || String(id);
    const vendorOrSiteHint = [po?.vendorId, po?.siteId].filter(Boolean).join(" / ");
    const hintSuffix = vendorOrSiteHint ? ` (${vendorOrSiteHint})` : "";
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "DELETE_PO",
      module: "Purchase Orders",
      entityType: "purchase_order",
      entityId: id,
      description: `Deleted Purchase Order ${poReference}${hintSuffix}`,
      metadata: JSON.stringify({
        poNumber: po?.poNumber || "",
        displayId: po?.displayId || "",
        vendorId: po?.vendorId || "",
        siteId: po?.siteId || "",
      }),
    });
    res.json({ success: true });
  });

  // GRNs
  app.get("/api/grns", async (req, res) => {
    if (!(await requirePermission(req, res, "view"))) return;
    const result = await storage.getGrns();
    res.json(result);
  });

  app.post("/api/grns", async (req, res) => {
    const poNumber = req.body?.poId;
    const purchaseOrders = await storage.getPurchaseOrders();
    const po = purchaseOrders.find((item) => item.displayId === poNumber);
    if (!po) {
      return res.status(400).json({ message: "Invalid PO number" });
    }
    const payload = { ...req.body, siteId: po.siteId, poId: po.displayId };
    const result = await storage.createGrn(payload);
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "CREATE_GRN",
      module: "GRN",
      entityType: "grn",
      entityId: result.id,
      description: `GRN ${result.displayId} was created.`,
    });
    res.json(result);
  });

  app.patch("/api/grns/:id", async (req, res) => {
    const result = await storage.updateGrn(Number(req.params.id), req.body);
    if (result) {
      await logAuditEvent(storage, await getAuditActor(req), {
        action: "UPDATE_GRN",
        module: "GRN",
        entityType: "grn",
        entityId: result.id,
        description: `GRN ${result.displayId} was updated.`,
      });
    }
    res.json(result);
  });

  app.delete("/api/grns/:id", async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteGrn(id);
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "DELETE_GRN",
      module: "GRN",
      entityType: "grn",
      entityId: id,
      description: `GRN ${id} was deleted.`,
    });
    res.json({ success: true });
  });

  // Bills
  app.get("/api/bills", async (req, res) => {
    if (!(await requirePermission(req, res, "view"))) return;
    const result = await storage.getBills();
    res.json(result);
  });

  app.post("/api/bills", async (req, res) => {
    const poNumber = req.body?.poId;
    const purchaseOrders = await storage.getPurchaseOrders();
    const po = purchaseOrders.find((item) => item.displayId === poNumber);
    if (!po) {
      return res.status(400).json({ message: "Invalid PO number" });
    }
    const payload = { ...req.body, siteId: po.siteId, poId: po.displayId, vendorId: po.vendorId };
    const result = await storage.createBill(payload);
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "CREATE_BILL",
      module: "Bills",
      entityType: "bill",
      entityId: result.id,
      description: `Bill ${result.displayId} was created.`,
    });
    res.json(result);
  });

  app.patch("/api/bills/:id", async (req, res) => {
    const result = await storage.updateBill(Number(req.params.id), req.body);
    if (result) {
      await logAuditEvent(storage, await getAuditActor(req), {
        action: "UPDATE_BILL",
        module: "Bills",
        entityType: "bill",
        entityId: result.id,
        description: `Bill ${result.displayId} was updated.`,
      });
    }
    res.json(result);
  });

  app.delete("/api/bills/:id", async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteBill(id);
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "DELETE_BILL",
      module: "Bills",
      entityType: "bill",
      entityId: id,
      description: `Bill ${id} was deleted.`,
    });
    res.json({ success: true });
  });

  // Payments
  app.get("/api/payments", async (req, res) => {
    try {
      if (!(await requirePermission(req, res, "view"))) return;
      const result = await storage.getPayments();
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to fetch payments";
      return res.status(500).json({ message });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      if (!(await requireModulePermission(req, res, "Payments", "create"))) return;
      const vendorId = typeof req.body?.vendorId === "string" ? req.body.vendorId.trim() : "";
      const amount = Number(req.body?.amount || 0);
      const paymentDate = typeof req.body?.paymentDate === "string" && req.body.paymentDate
        ? req.body.paymentDate
        : typeof req.body?.date === "string" && req.body.date
          ? req.body.date
          : new Date().toISOString().slice(0, 10);

      if (!vendorId) {
        return res.status(400).json({ message: "vendorId is required" });
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: "amount must be greater than zero" });
      }

      const result = await storage.createPayment({
        ...req.body,
        vendorId,
        amount,
        paymentDate,
        date: paymentDate,
      });
      await logAuditEvent(storage, await getAuditActor(req), {
        action: "CREATE_PAYMENT",
        module: "Payments",
        entityType: "payment",
        entityId: result.id,
        description: `Payment ${result.displayId} was created.`,
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create payment";
      const isClientError = [
        "vendorId is required",
        "amount must be greater than zero",
        "Payment amount must be greater than zero",
        "Payment amount exceeds vendor outstanding",
        "No unpaid bills available for this vendor",
        "Manual adjustment total cannot exceed payment amount",
        "Manual adjustments do not fully allocate payment amount",
        "Unable to fully allocate payment to unpaid bills",
      ].includes(message);
      return res.status(isClientError ? 400 : 500).json({ message });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    const result = await storage.updatePayment(Number(req.params.id), req.body);
    if (result) {
      await logAuditEvent(storage, await getAuditActor(req), {
        action: "UPDATE_PAYMENT",
        module: "Payments",
        entityType: "payment",
        entityId: result.id,
        description: `Payment ${result.displayId} was updated.`,
      });
    }
    res.json(result);
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      if (!(await requireModulePermission(req, res, "Payments", "delete"))) return;
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid payment id" });
      }
      await storage.deletePayment(id);
      await logAuditEvent(storage, await getAuditActor(req), {
        action: "DELETE_PAYMENT",
        module: "Payments",
        entityType: "payment",
        entityId: id,
        description: `Payment ${id} was deleted.`,
      });
      return res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete payment";
      const statusCode = message === "Payment not found" ? 404 : message === "Invalid payment id" ? 400 : 500;
      return res.status(statusCode).json({ message });
    }
  });



  // Vendor Ledger
  app.get("/api/vendors/:id/ledger", async (req, res) => {
    const vendorId = req.params.id;
    const result = await storage.getVendorLedgerDetails(vendorId);
    res.json(result);
  });

  app.get("/api/vendors/:id/outstanding", async (req, res) => {
    const vendorId = req.params.id;
    const outstanding = await storage.getVendorOutstanding(vendorId);
    res.json({ vendorId, outstanding });
  });

  app.get("/api/vendor-ledger/:vendorId", async (req, res) => {
    const { vendorId } = req.params;
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    const result = await storage.getVendorLedger(vendorId, startDate, endDate);
    res.json(result);
  });


  app.get("/api/vendor-statement/:vendorId", async (req, res) => {
    const { vendorId } = req.params;
    const month = typeof req.query.month === "string" ? req.query.month : "";
    if (!month) {
      return res.status(400).json({ message: "month query parameter is required in YYYY-MM format" });
    }
    const result = await storage.getVendorStatement(vendorId, month);
    res.json(result);
  });

  app.get("/api/vendor-payables", async (_req, res) => {
    const result = await storage.getVendorPayables();
    res.json(result);
  });



  app.get("/api/cost-analysis", async (req, res) => {
    const siteId = typeof req.query.siteId === "string" ? req.query.siteId : undefined;
    const vendorId = typeof req.query.vendorId === "string" ? req.query.vendorId : undefined;
    const materialId = typeof req.query.materialId === "string" ? req.query.materialId : undefined;
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    const result = await storage.getCostAnalysisSummary({ siteId, vendorId, materialId, startDate, endDate });
    res.json(result);
  });

  app.post("/api/vendor-rate-import", async (req, res) => {
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

  app.get("/api/system-tools/settings", async (_req, res) => {
    const result = await storage.getSystemSettings();
    res.json(result);
  });

  app.patch("/api/system-tools/settings", async (req, res) => {
    const result = await storage.updateSystemSettings(req.body);
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "UPDATE_SETTINGS",
      module: "System Tools",
      entityType: "system_settings",
      entityId: result.id,
      description: "System backup settings were updated.",
      metadata: req.body,
    });
    res.json(result);
  });

  app.post("/api/system-tools/backup", async (req, res) => {
    const result = await storage.createDatabaseBackup();
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "CREATE_BACKUP",
      module: "System Tools",
      entityType: "backup",
      entityId: result.fileName,
      description: `Database backup ${result.fileName} was created.`,
    });
    res.json(result);
  });

  app.get("/api/system-tools/backup/download", async (_req, res) => {
    const result = await storage.createDatabaseBackup();
    res.download(result.filePath, result.fileName);
  });

  app.get("/api/system-logs", async (_req, res) => {
    res.json([]);
  });

  app.post("/api/system-tools/reset-demo-data", async (req, res) => {
    const { adminPassword } = req.body;
    const currentUser = await getCurrentUser(req);
    if (!currentUser || !verifyPassword(adminPassword, currentUser.password)) {
      return res.status(400).json({ message: "Admin password confirmation failed" });
    }
    await storage.resetDemoData();
    await logAuditEvent(storage, await getAuditActor(req), {
      action: "RESET_DEMO_DATA",
      module: "System Tools",
      entityType: "system",
      description: "Demo data reset was executed.",
    });
    return res.json({ success: true });
  });

  // Material Issues
  app.get("/api/material-issues", async (_req, res) => {
    const result = await storage.getMaterialIssues();
    res.json(result);
  });

  app.post("/api/material-issues", async (req, res) => {
    const result = await storage.createMaterialIssue(req.body);
    res.json(result);
  });

  app.patch("/api/material-issues/:id", async (req, res) => {
    const result = await storage.updateMaterialIssue(Number(req.params.id), req.body);
    res.json(result);
  });

  app.delete("/api/material-issues/:id", async (req, res) => {
    await storage.deleteMaterialIssue(Number(req.params.id));
    res.json({ success: true });
  });

  // Site Stock
  app.get("/api/site-stock", async (_req, res) => {
    const result = await storage.getSiteStocks();
    res.json(result);
  });

  app.post("/api/site-stock/update", async (req, res) => {
    const { siteId, materialId, receivedDelta, issuedDelta } = req.body;
    const result = await storage.upsertSiteStock(siteId, materialId, receivedDelta || 0, issuedDelta || 0);
    res.json(result);
  });

  // Material Rate History
  app.get("/api/rate-history", async (_req, res) => {
    const result = await storage.getMaterialRateHistoryEntries();
    res.json(result);
  });

  app.post("/api/rate-history", async (req, res) => {
    const result = await storage.createMaterialRateHistoryEntry(req.body);
    res.json(result);
  });

  // Vendor Material Rates
  app.get("/api/vendor-material-rates", async (_req, res) => {
    const result = await storage.getVendorMaterialRates();
    res.json(result);
  });

  app.get("/api/vendor-material-rates/:vendorId", async (req, res) => {
    const result = await storage.getVendorMaterialRatesByVendor(req.params.vendorId);
    res.json(result);
  });

  app.post("/api/vendor-material-rates", async (req, res) => {
    const { vendorId, materialId, rate } = req.body;
    const result = await storage.upsertVendorMaterialRate(vendorId, materialId, rate);
    res.json(result);
  });

  app.delete("/api/vendor-material-rates/:id", async (req, res) => {
    await storage.deleteVendorMaterialRate(Number(req.params.id));
    res.json({ success: true });
  });

  return httpServer;
}
