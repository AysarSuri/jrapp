import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "../../storage";

/* Shape the ported SM routes expect on req.user. JR is a non-branch ERP, so
   branchId/branchName come through as null; SM branch scoping then treats
   admins as "all branches" and other roles as "no branch" (fail-closed). */
export interface SmUser {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  branchId: number | null;
  branchName: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: SmUser;
    }
  }
}

/* Session-based auth (mirrors JR's requireAuth in server/routes.ts) that also
   hydrates req.user from the DB so the ported SM report/branch logic works. */
export const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    req.user = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName ?? user.username,
      role: user.role,
      branchId: null,
      branchName: null,
    };
    next();
  } catch (e) {
    res.status(401).json({ message: "Not authenticated" });
  }
};
