import type { TenantPlan } from "./schema";

// ─── Plan Limits & Features ─────────────────────────────────────────────────

export interface PlanLimits {
  price: number; // monthly price in cents
  maxWashes: number; // -1 = unlimited
  maxParkingSessions: number; // -1 = unlimited
  maxUsers: number; // -1 = unlimited
  maxBranches: number; // -1 = unlimited
  label: string;
  description: string;
  features: string[];
}

export const BILLING_PLANS: Record<TenantPlan, PlanLimits> = {
  free: {
    price: 0,
    maxWashes: 20,
    maxParkingSessions: 30,
    maxUsers: 3,
    maxBranches: 1,
    label: "Free",
    description: "Get started with basic car wash management",
    features: [
      "Up to 20 washes/month",
      "Up to 3 users",
      "1 branch",
      "Basic analytics",
    ],
  },
  basic: {
    price: 2900,
    maxWashes: 200,
    maxParkingSessions: 150,
    maxUsers: 10,
    maxBranches: 1,
    label: "Basic",
    description: "For small car wash businesses",
    features: [
      "Up to 200 washes/month",
      "Up to 10 users",
      "1 branch",
      "Advanced analytics",
      "Loyalty program",
      "Email notifications",
    ],
  },
  pro: {
    price: 7900,
    maxWashes: 1000,
    maxParkingSessions: 500,
    maxUsers: 50,
    maxBranches: 5,
    label: "Pro",
    description: "For growing businesses with multiple branches",
    features: [
      "Up to 1,000 washes/month",
      "Up to 50 users",
      "Up to 5 branches",
      "Full analytics & reporting",
      "Inventory management",
      "Customer CRM",
      "Priority support",
    ],
  },
  enterprise: {
    price: 19900,
    maxWashes: -1,
    maxParkingSessions: -1,
    maxUsers: -1,
    maxBranches: -1,
    label: "Enterprise",
    description: "Unlimited access for large operations",
    features: [
      "Unlimited washes",
      "Unlimited users",
      "Unlimited branches",
      "All features included",
      "Custom branding",
      "Custom domain",
      "Dedicated support",
      "API access",
    ],
  },
};

// ─── Invoice Types ──────────────────────────────────────────────────────────

export const INVOICE_STATUSES = ["draft", "pending", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = typeof INVOICE_STATUSES[number];

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  total: number; // in cents
}

// ─── Tenant Statuses ────────────────────────────────────────────────────────

export const TENANT_STATUSES = ["trial", "active", "suspended", "inactive"] as const;
export type TenantStatus = typeof TENANT_STATUSES[number];

export const TENANT_STATUS_CONFIG: Record<TenantStatus, { label: string; color: string; bgColor: string }> = {
  trial: { label: "Trial", color: "text-blue-700", bgColor: "bg-blue-100 border-blue-300" },
  active: { label: "Active", color: "text-green-700", bgColor: "bg-green-100 border-green-300" },
  suspended: { label: "Suspended", color: "text-orange-700", bgColor: "bg-orange-100 border-orange-300" },
  inactive: { label: "Inactive", color: "text-gray-700", bgColor: "bg-gray-100 border-gray-300" },
};

export const PLAN_BADGE_CONFIG: Record<TenantPlan, { label: string; color: string; bgColor: string }> = {
  free: { label: "Free", color: "text-gray-700 dark:text-gray-300", bgColor: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600" },
  basic: { label: "Basic", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700" },
  pro: { label: "Pro", color: "text-purple-700 dark:text-purple-300", bgColor: "bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700" },
  enterprise: { label: "Enterprise", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function isOverLimit(current: number, limit: number): boolean {
  return limit !== -1 && current >= limit;
}

export function getUsagePercent(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.round((current / max) * 100), 100);
}

export function generateInvoiceNumber(tenantSlug: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `INV-${tenantSlug.toUpperCase().slice(0, 6)}-${year}${month}-${suffix}`;
}

export function getNextBillingDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function getBillingPeriod(date?: Date): { start: Date; end: Date; label: string } {
  const d = date || new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  const label = `${start.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  return { start, end, label };
}
