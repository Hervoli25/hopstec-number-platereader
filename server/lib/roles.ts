import type { RequestHandler } from "express";
import { storage } from "../storage";

export type UserRoleType = "technician" | "manager" | "admin" | "super_admin";

// Super admin email - hidden from other users, has full system access
export const SUPER_ADMIN_EMAIL = "hk@hopstecinnovation.com";

// Check if user is super admin
export function isSuperAdmin(email?: string | null): boolean {
  return email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

// Middleware to check if user has required role
export function requireRole(...allowedRoles: UserRoleType[]): RequestHandler {
  return async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let role: UserRoleType = "technician"; // Default to technician
      let userEmail: string | null = null;

      // For credentials auth, role is in session
      if (req.user?.authType === "credentials") {
        role = req.user.role || "technician";
        userEmail = req.user.email;
      } else {
        // For Replit auth, get from userRoles table
        const userRole = await storage.getUserRole(userId);
        role = userRole?.role || "technician";
        // Get email from claims
        userEmail = req.user?.claims?.email || null;
      }

      // Super admin has access to everything
      if (isSuperAdmin(userEmail)) {
        req.user.isSuperAdmin = true;
        req.user.role = "super_admin";
        return next();
      }

      if (!allowedRoles.includes(role as UserRoleType)) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }

      // Store role on request for later use
      req.user.role = role;
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
