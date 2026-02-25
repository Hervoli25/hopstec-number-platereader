import type { RequestHandler } from "express";
import { db } from "../db";
import { featureFlags, tenantFeatureOverrides, tenants } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_FEATURE_FLAGS } from "../../shared/features";

/**
 * Check if a feature is enabled for a given tenant.
 * Resolution order: tenant override → flag's plan list → default
 */
export async function isFeatureEnabled(tenantId: string, featureCode: string): Promise<boolean> {
  // 1. Check for tenant-specific override
  const [override] = await db
    .select()
    .from(tenantFeatureOverrides)
    .where(and(eq(tenantFeatureOverrides.tenantId, tenantId), eq(tenantFeatureOverrides.featureCode, featureCode)));
  if (override) return override.enabled;

  // 2. Check the feature flag's plan list
  const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.code, featureCode));
  if (flag) {
    // Get tenant's plan
    const [tenant] = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, tenantId));
    const plan = tenant?.plan || "free";
    const enabledPlans = (flag.enabledForPlans || []) as string[];
    return enabledPlans.includes(plan);
  }

  // 3. Check default definitions
  const defaultDef = DEFAULT_FEATURE_FLAGS.find((f) => f.code === featureCode);
  if (defaultDef) {
    const [tenant] = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, tenantId));
    const plan = tenant?.plan || "free";
    return defaultDef.enabledForPlans.includes(plan);
  }

  // Default tenant ("default") gets everything enabled
  if (tenantId === "default") return true;

  return false;
}

/**
 * Get all enabled features for a tenant.
 */
export async function getEnabledFeatures(tenantId: string): Promise<string[]> {
  const allFlags = await db.select().from(featureFlags);
  const overrides = await db.select().from(tenantFeatureOverrides).where(eq(tenantFeatureOverrides.tenantId, tenantId));
  const [tenant] = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, tenantId));
  const plan = tenant?.plan || "free";

  // Default tenant gets everything
  if (tenantId === "default") {
    return DEFAULT_FEATURE_FLAGS.map((f) => f.code);
  }

  const overrideMap = new Map(overrides.map((o) => [o.featureCode, o.enabled]));
  const enabled: string[] = [];

  // Check DB flags first
  for (const flag of allFlags) {
    if (overrideMap.has(flag.code)) {
      if (overrideMap.get(flag.code)) enabled.push(flag.code);
      overrideMap.delete(flag.code);
    } else {
      const enabledPlans = (flag.enabledForPlans || []) as string[];
      if (enabledPlans.includes(plan)) enabled.push(flag.code);
    }
  }

  // Check default definitions for any not in DB
  for (const def of DEFAULT_FEATURE_FLAGS) {
    if (!allFlags.find((f) => f.code === def.code)) {
      if (overrideMap.has(def.code)) {
        if (overrideMap.get(def.code)) enabled.push(def.code);
      } else if (def.enabledForPlans.includes(plan)) {
        enabled.push(def.code);
      }
    }
  }

  return enabled;
}

/**
 * Middleware: requires a specific feature to be enabled for the current tenant.
 * Returns 403 if the feature is disabled.
 */
export function requireFeature(featureCode: string): RequestHandler {
  return async (req: any, res, next) => {
    const tenantId = req.tenantId || "default";
    // Default tenant always has all features
    if (tenantId === "default") return next();

    const featureEnabled = await isFeatureEnabled(tenantId, featureCode);
    if (!featureEnabled) {
      return res.status(403).json({
        message: `Feature "${featureCode}" is not available on your current plan`,
        featureCode,
      });
    }
    next();
  };
}

/**
 * Seed default feature flags into the database.
 */
export async function seedFeatureFlags(): Promise<void> {
  for (const def of DEFAULT_FEATURE_FLAGS) {
    const [existing] = await db.select().from(featureFlags).where(eq(featureFlags.code, def.code));
    if (!existing) {
      await db.insert(featureFlags).values({
        code: def.code,
        name: def.name,
        description: def.description,
        defaultEnabled: def.enabledForPlans.length > 0,
        enabledForPlans: def.enabledForPlans,
      });
    }
  }
}
