import type { NextFunction, Request, Response } from "express";
import { getPermissionModuleForPath, isAdminRole, type PermissionAction, type PermissionModule } from "@shared/permissions";
import { storage } from "./storage";

export type SessionUser = {
  id: number;
  email: string;
  role: string;
};

export type AuthenticatedRequest = Request & {
  session: Request["session"] & {
    user?: SessionUser;
  };
};

export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return next();
  };
}

export function getSessionUser(req: Request): SessionUser | undefined {
  return (req as AuthenticatedRequest).session?.user;
}

export function requirePermission(moduleName?: PermissionModule | null, action: PermissionAction = "view") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sessionUser = getSessionUser(req);

    if (!sessionUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isAdminRole(sessionUser.role)) {
      return next();
    }

    const resolvedModule = moduleName ?? getPermissionModuleForPath(req.path);
    if (!resolvedModule) {
      return next();
    }

    const allowed = await storage.userHasPermission(sessionUser.role, resolvedModule, action);
    if (!allowed) {
      return res.status(403).json({ message: `Permission denied: ${resolvedModule}.${action}` });
    }

    return next();
  };
}
