import type { RequestHandler } from "express";
import { storage } from "../storage";

export type UserRoleType = "technician" | "manager" | "admin";

// Middleware to check if user has required role
export function requireRole(...allowedRoles: UserRoleType[]): RequestHandler {
  return async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let role: UserRoleType = "technician"; // Default to technician

      // For credentials auth, role is in session
      if (req.user?.authType === "credentials") {
        role = req.user.role || "technician";
      } else {
        // For Replit auth, get from userRoles table
        const userRole = await storage.getUserRole(userId);
        role = userRole?.role || "technician";
      }

      if (!allowedRoles.includes(role as UserRoleType)) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ message: "Authorization error" });
    }
  };
}

// Auto-assign role for new users (defaults to technician)
export async function ensureUserRole(userId: string): Promise<void> {
  const existing = await storage.getUserRole(userId);
  if (!existing) {
    await storage.upsertUserRole({ userId, role: "technician" });
  }
}
