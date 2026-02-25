import { db } from "../db";
import { billingSnapshots, tenants, washJobs, parkingSessions, users, branches } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { BILLING_PLANS } from "../../shared/billing";
import type { TenantPlan } from "@shared/schema";

/**
 * Generate a billing snapshot for a given tenant and month.
 */
export async function generateBillingSnapshot(tenantId: string, month: string): Promise<void> {
  // Parse month "2026-02" to date range
  const [year, mon] = month.split("-").map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 0, 23, 59, 59);

  // Count washes for this tenant in the month
  const [washResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(washJobs)
    .where(and(eq(washJobs.tenantId, tenantId), gte(washJobs.createdAt, startDate), lte(washJobs.createdAt, endDate)));
  const washCount = washResult?.count || 0;

  // Count parking sessions
  const [parkingResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(parkingSessions)
    .where(and(eq(parkingSessions.tenantId, tenantId), gte(parkingSessions.createdAt, startDate), lte(parkingSessions.createdAt, endDate)));
  const parkingSessionCount = parkingResult?.count || 0;

  // Count active users
  const [userResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));
  const activeUserCount = userResult?.count || 0;

  // Count branches
  const [branchResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(branches)
    .where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)));
  const branchCount = branchResult?.count || 0;

  // Get tenant plan
  const [tenant] = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, tenantId));
  const plan = (tenant?.plan || "free") as TenantPlan;
  const planLimits = BILLING_PLANS[plan];
  const estimatedAmount = planLimits.price;

  // Upsert snapshot
  const [existing] = await db
    .select()
    .from(billingSnapshots)
    .where(and(eq(billingSnapshots.tenantId, tenantId), eq(billingSnapshots.month, month)));

  if (existing) {
    await db
      .update(billingSnapshots)
      .set({ washCount, parkingSessionCount, activeUserCount, branchCount, estimatedAmount, planAtTime: plan, updatedAt: new Date() })
      .where(eq(billingSnapshots.id, existing.id));
  } else {
    await db.insert(billingSnapshots).values({
      tenantId,
      month,
      washCount,
      parkingSessionCount,
      activeUserCount,
      branchCount,
      estimatedAmount,
      planAtTime: plan,
    });
  }
}

/**
 * Generate snapshots for all active tenants for the given month.
 */
export async function generateAllSnapshots(month: string): Promise<number> {
  const allTenants = await db.select().from(tenants).where(eq(tenants.isActive, true));
  for (const tenant of allTenants) {
    try {
      await generateBillingSnapshot(tenant.id, month);
    } catch (error) {
      console.error(`Failed to generate snapshot for tenant ${tenant.id}:`, error);
    }
  }
  return allTenants.length;
}
