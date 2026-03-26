import type { NextFunction, Request, Response } from "express";

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
    const sessionUser = authReq.session?.user;

    if (!sessionUser?.id || !sessionUser?.email || !sessionUser?.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return next();
  };
}

export function getSessionUser(req: Request): SessionUser | undefined {
  return (req as AuthenticatedRequest).session?.user;
}
