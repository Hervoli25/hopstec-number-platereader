import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, tenants } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface TenantContext {
  tenantId: string;
  branchId?: string;
  tenantPlan?: string;
}

/**
 * Express middleware: extracts tenant context from the authenticated user.
 * Sets req.tenantId, req.branchId, req.tenantPlan on the request.
 */
export function extractTenantContext() {
  return async (req: any, _res: Response, next: NextFunction) => {
    try {
      // Get userId from auth
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        // No auth = no tenant context (public routes)
        return next();
      }

      // Look up user's tenantId
      const [user] = await db.select({ tenantId: users.tenantId }).from(users).where(eq(users.id, userId));
      if (!user) {
        return next();
      }

      req.tenantId = user.tenantId;

      // Read branch from header (client sends X-Branch-Id)
      const branchId = req.headers["x-branch-id"] as string | undefined;
      if (branchId && branchId !== "all") {
        req.branchId = branchId;
      }

      // Look up tenant plan
      if (user.tenantId && user.tenantId !== "default") {
        const [tenant] = await db.select({ plan: tenants.plan, isActive: tenants.isActive }).from(tenants).where(eq(tenants.id, user.tenantId));
        if (tenant) {
          if (!tenant.isActive) {
            return _res.status(403).json({ message: "Tenant account is deactivated" });
          }
          req.tenantPlan = tenant.plan;
        }
      } else {
        // Default tenant is always enterprise
        req.tenantPlan = "enterprise";
      }

      next();
    } catch (error) {
      console.error("Tenant context extraction error:", error);
      next(); // Non-blocking — proceed without tenant context
    }
  };
}

/**
 * Middleware: rejects requests without a tenant context.
 */
export function requireTenant() {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }
    next();
  };
}

/**
 * Middleware: rejects requests from non-super-admin users.
 * Super admins are users with role "admin" on the "default" tenant.
 */
export function requireSuperAdmin() {
  return (req: any, res: Response, next: NextFunction) => {
    // isSuperAdmin flag is set by roles middleware
    if (!req.isSuperAdmin) {
      return res.status(403).json({ message: "Super admin access required" });
    }
    next();
  };
}
