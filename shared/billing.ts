import type { TenantPlan } from "./schema";

export interface PlanLimits {
  price: number; // monthly price in cents
  maxWashes: number; // -1 = unlimited
  maxUsers: number; // -1 = unlimited
  maxBranches: number; // -1 = unlimited
  label: string;
}

export const BILLING_PLANS: Record<TenantPlan, PlanLimits> = {
  free: { price: 0, maxWashes: 50, maxUsers: 3, maxBranches: 1, label: "Free" },
  basic: { price: 2900, maxWashes: 200, maxUsers: 10, maxBranches: 1, label: "Basic" },
  pro: { price: 7900, maxWashes: 1000, maxUsers: 50, maxBranches: 5, label: "Pro" },
  enterprise: { price: 19900, maxWashes: -1, maxUsers: -1, maxBranches: -1, label: "Enterprise" },
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function isOverLimit(current: number, limit: number): boolean {
  return limit !== -1 && current >= limit;
}
