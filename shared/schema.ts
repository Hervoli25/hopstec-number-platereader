import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["technician", "manager", "admin"]);
export const washStatusEnum = pgEnum("wash_status", ["received", "prewash", "rinse", "dry_vacuum", "simple_polish", "detailing_polish", "tyre_shine", "clay_treatment", "complete"]);
export const countryHintEnum = pgEnum("country_hint", ["FR", "ZA", "CD", "OTHER"]);
export const photoRuleEnum = pgEnum("photo_rule", ["optional", "required", "disabled"]);
export const loyaltyTransactionTypeEnum = pgEnum("loyalty_transaction_type", ["earn_wash", "earn_bonus", "redeem", "expire", "adjust"]);
export const loyaltyTierEnum = pgEnum("loyalty_tier", ["basic", "premium"]);
export const inventoryCategoryEnum = pgEnum("inventory_category", ["chemicals", "cloths_towels", "wax_polish", "equipment", "packaging", "other"]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["draft", "submitted", "received", "cancelled"]);
export const tenantPlanEnum = pgEnum("tenant_plan", ["free", "basic", "pro", "enterprise"]);

// Tenants (multi-tenancy)
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  plan: tenantPlanEnum("plan").notNull().default("free"),
  isActive: boolean("is_active").default(true),
  primaryColor: varchar("primary_color", { length: 20 }),
  secondaryColor: varchar("secondary_color", { length: 20 }),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  customDomain: varchar("custom_domain", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Branches (under tenant)
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  timezone: varchar("timezone", { length: 50 }).default("Africa/Johannesburg"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User roles table (extends base users from auth)
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  userId: varchar("user_id").notNull(),
  role: userRoleEnum("role").notNull().default("technician"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wash Jobs
export const washJobs = pgTable("wash_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  plateDisplay: varchar("plate_display", { length: 50 }).notNull(),
  plateNormalized: varchar("plate_normalized", { length: 50 }).notNull(),
  countryHint: countryHintEnum("country_hint").default("OTHER"),
  status: washStatusEnum("status").notNull().default("received"),
  technicianId: varchar("technician_id").notNull(),
  serviceCode: varchar("service_code", { length: 100 }),
  stageTimestamps: jsonb("stage_timestamps").$type<Record<string, string>>(),
  priority: integer("priority").default(0),
  priorityFactors: jsonb("priority_factors").$type<Record<string, number>>(),
  startAt: timestamp("start_at").defaultNow(),
  endAt: timestamp("end_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wash Photos
export const washPhotos = pgTable("wash_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  washJobId: varchar("wash_job_id").notNull(),
  url: text("url").notNull(),
  statusAtTime: washStatusEnum("status_at_time").notNull(),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business Settings (for white-labeling and multi-tenancy)
export const businessSettings = pgTable("business_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  businessName: varchar("business_name", { length: 255 }).default("ParkWash Pro"),
  businessLogo: text("business_logo"), // URL or base64
  businessAddress: text("business_address"),
  businessPhone: varchar("business_phone", { length: 50 }),
  businessEmail: varchar("business_email", { length: 255 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  currencySymbol: varchar("currency_symbol", { length: 10 }).default("$"),
  locale: varchar("locale", { length: 10 }).default("en-US"), // for number/date formatting
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  taxRate: integer("tax_rate").default(0), // percentage * 100 (e.g., 1500 = 15%)
  taxLabel: varchar("tax_label", { length: 50 }).default("Tax"),
  receiptFooter: text("receipt_footer"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Parking Settings (configurable rates and capacity)
export const parkingSettings = pgTable("parking_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  // Base rates (in smallest currency unit - cents, centimes, etc.)
  hourlyRate: integer("hourly_rate").default(500),
  firstHourRate: integer("first_hour_rate"), // If set, first hour has different rate
  dailyMaxRate: integer("daily_max_rate").default(3000),
  weeklyRate: integer("weekly_rate"), // Discount for weekly parkers
  monthlyPassRate: integer("monthly_pass_rate").default(5000), // Monthly pass price
  // Time-based pricing
  nightRate: integer("night_rate"), // Override rate for night hours
  nightStartHour: integer("night_start_hour").default(22), // 10 PM
  nightEndHour: integer("night_end_hour").default(6), // 6 AM
  weekendRate: integer("weekend_rate"), // Override rate for weekends
  // Policies
  gracePeriodMinutes: integer("grace_period_minutes").default(15),
  overstayPenaltyRate: integer("overstay_penalty_rate"), // Penalty per hour for overstay
  lostTicketFee: integer("lost_ticket_fee").default(2000), // Fee for lost ticket
  validationDiscountPercent: integer("validation_discount_percent").default(0), // For mall validation
  // Capacity
  totalCapacity: integer("total_capacity").default(50),
  // Currency (now uses businessSettings, kept for backward compatibility)
  currency: varchar("currency", { length: 3 }).default("USD"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Parking Zones
export const parkingZones = pgTable("parking_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  capacity: integer("capacity").default(10),
  hourlyRate: integer("hourly_rate"), // override global rate if set
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Parking Sessions
export const parkingSessions = pgTable("parking_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  plateDisplay: varchar("plate_display", { length: 50 }).notNull(),
  plateNormalized: varchar("plate_normalized", { length: 50 }).notNull(),
  countryHint: countryHintEnum("country_hint").default("OTHER"),
  entryAt: timestamp("entry_at").defaultNow(),
  exitAt: timestamp("exit_at"),
  entryPhotoUrl: text("entry_photo_url"),
  exitPhotoUrl: text("exit_photo_url"),
  technicianId: varchar("technician_id").notNull(),
  zoneId: varchar("zone_id"),
  spotNumber: varchar("spot_number", { length: 20 }),
  calculatedFee: integer("calculated_fee"), // in cents
  paidAmount: integer("paid_amount"), // in cents
  isPaid: boolean("is_paid").default(false),
  washJobId: varchar("wash_job_id"), // link to wash if bundled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Frequent Parkers (VIP recognition)
export const frequentParkers = pgTable("frequent_parkers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  plateNormalized: varchar("plate_normalized", { length: 50 }).notNull().unique(),
  plateDisplay: varchar("plate_display", { length: 50 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  visitCount: integer("visit_count").default(1),
  totalSpent: integer("total_spent").default(0), // in cents
  isVip: boolean("is_vip").default(false),
  monthlyPassExpiry: timestamp("monthly_pass_expiry"),
  notes: text("notes"),
  lastVisitAt: timestamp("last_visit_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Parking Reservations (pre-booking)
export const parkingReservations = pgTable("parking_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  plateDisplay: varchar("plate_display", { length: 50 }),
  plateNormalized: varchar("plate_normalized", { length: 50 }),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  zoneId: varchar("zone_id"),
  spotNumber: varchar("spot_number", { length: 20 }),
  reservedFrom: timestamp("reserved_from").notNull(),
  reservedUntil: timestamp("reserved_until").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, confirmed, checked_in, completed, cancelled
  confirmationCode: varchar("confirmation_code", { length: 20 }).notNull(),
  parkingSessionId: varchar("parking_session_id"), // linked when checked in
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Log (append-only audit trail)
export const eventLogs = pgTable("event_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  type: varchar("type", { length: 50 }).notNull(),
  plateDisplay: varchar("plate_display", { length: 50 }),
  plateNormalized: varchar("plate_normalized", { length: 50 }),
  countryHint: countryHintEnum("country_hint"),
  washJobId: varchar("wash_job_id"),
  parkingSessionId: varchar("parking_session_id"),
  userId: varchar("user_id"),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Webhook Retry Queue
export const webhookRetries = pgTable("webhook_retries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  targetUrl: text("target_url").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  attempts: integer("attempts").default(0),
  lastError: text("last_error"),
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table (extends Replit auth users with credentials support)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().default("default"),
  email: varchar("email", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url", { length: 512 }),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").default("technician"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer job access tokens
export const customerJobAccess = pgTable("customer_job_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  washJobId: varchar("wash_job_id").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 255 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  serviceCode: varchar("service_code", { length: 50 }),
  lastViewedAt: timestamp("last_viewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service checklist items
export const serviceChecklistItems = pgTable("service_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  washJobId: varchar("wash_job_id").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  orderIndex: integer("order_index").default(0),
  expected: boolean("expected").default(true),
  confirmed: boolean("confirmed").default(false),
  confirmedAt: timestamp("confirmed_at"),
  skipped: boolean("skipped").default(false),
  skippedReason: varchar("skipped_reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer confirmations
export const customerConfirmations = pgTable("customer_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  washJobId: varchar("wash_job_id").notNull(),
  accessToken: varchar("access_token", { length: 64 }).notNull(),
  rating: integer("rating"),
  notes: text("notes"),
  issueReported: text("issue_reported"),
  confirmedAt: timestamp("confirmed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Photo rules configuration (manager can set per step)
export const photoRules = pgTable("photo_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  step: washStatusEnum("step").notNull().unique(),
  rule: photoRuleEnum("rule").notNull().default("optional"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service Packages (for carwash packages/bundles)
export const servicePackages = pgTable("service_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: text("description"),
  price: integer("price").notNull(), // in smallest currency unit
  durationMinutes: integer("duration_minutes").default(30), // estimated time
  services: jsonb("services").$type<string[]>().default([]), // list of included services
  steps: jsonb("steps").$type<string[]>().default([]), // ordered wash steps for this package
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Memberships (for recurring customers)
export const customerMemberships = pgTable("customer_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  plateNormalized: varchar("plate_normalized", { length: 50 }),
  plateDisplay: varchar("plate_display", { length: 50 }),
  membershipType: varchar("membership_type", { length: 50 }).notNull(), // wash_unlimited, parking_monthly, combo
  price: integer("price").notNull(), // monthly price
  startDate: timestamp("start_date").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  autoRenew: boolean("auto_renew").default(false),
  washesIncluded: integer("washes_included"), // null = unlimited
  washesUsed: integer("washes_used").default(0),
  parkingIncluded: boolean("parking_included").default(false),
  status: varchar("status", { length: 20 }).default("active"), // active, expired, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loyalty Accounts (one per plate/customer)
export const loyaltyAccounts = pgTable("loyalty_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  plateNormalized: varchar("plate_normalized", { length: 50 }).notNull().unique(),
  plateDisplay: varchar("plate_display", { length: 50 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  crmUserId: varchar("crm_user_id", { length: 255 }),
  membershipNumber: varchar("membership_number", { length: 20 }).notNull().unique(),
  tier: loyaltyTierEnum("tier").default("basic"),
  pointsBalance: integer("points_balance").default(0),
  lifetimePoints: integer("lifetime_points").default(0),
  totalWashes: integer("total_washes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loyalty Transactions (append-only audit log)
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  loyaltyAccountId: varchar("loyalty_account_id").notNull(),
  type: loyaltyTransactionTypeEnum("type").notNull(),
  points: integer("points").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  washJobId: varchar("wash_job_id"),
  serviceCode: varchar("service_code", { length: 100 }),
  description: text("description"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Parking Validations (for mall/store validations)
export const parkingValidations = pgTable("parking_validations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  parkingSessionId: varchar("parking_session_id").notNull(),
  validatorName: varchar("validator_name", { length: 255 }).notNull(), // Store name
  validatorCode: varchar("validator_code", { length: 50 }).notNull(), // Store code
  discountMinutes: integer("discount_minutes").default(0), // Free minutes
  discountPercent: integer("discount_percent").default(0), // % off total
  discountAmount: integer("discount_amount").default(0), // Fixed amount off
  validatedBy: varchar("validated_by"),
  validatedAt: timestamp("validated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer Notifications (SMS/Email queue)
export const customerNotifications = pgTable("customer_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  // Customer info
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  plateNormalized: varchar("plate_normalized", { length: 50 }),
  // Notification details
  channel: varchar("channel", { length: 20 }).notNull(), // sms, email, both
  type: varchar("type", { length: 50 }).notNull(), // wash_ready, wash_complete, parking_reminder, membership_expiry, booking_confirmation
  subject: varchar("subject", { length: 255 }), // email subject
  message: text("message").notNull(),
  // Reference to related entities
  washJobId: varchar("wash_job_id"),
  parkingSessionId: varchar("parking_session_id"),
  bookingId: varchar("booking_id"), // CRM booking ID
  membershipId: varchar("membership_id"),
  // Delivery status
  status: varchar("status", { length: 20 }).default("pending"), // pending, sent, failed, cancelled
  sentAt: timestamp("sent_at"),
  failedAt: timestamp("failed_at"),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0),
  // Scheduling
  scheduledFor: timestamp("scheduled_for"), // null = send immediately
  // Tracking
  externalId: varchar("external_id", { length: 255 }), // Twilio SID, SendGrid ID, etc.
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification Templates (for customizable messages)
export const notificationTemplates = pgTable("notification_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  code: varchar("code", { length: 50 }).notNull().unique(), // wash_ready, wash_complete, etc.
  name: varchar("name", { length: 100 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(), // sms, email
  subject: varchar("subject", { length: 255 }), // for email
  body: text("body").notNull(), // supports {{placeholders}}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Technician Time Logs (clock in/out, breaks, absences)
export const technicianTimeLogs = pgTable("technician_time_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  technicianId: varchar("technician_id").notNull(),
  clockInAt: timestamp("clock_in_at").notNull(),
  clockOutAt: timestamp("clock_out_at"),
  totalMinutes: integer("total_minutes"), // calculated on clock-out
  breakLogs: jsonb("break_logs").$type<Array<{
    type: "lunch" | "short" | "absent";
    startAt: string;
    endAt?: string;
    durationMinutes?: number;
    notes?: string;
  }>>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff Alerts (running late, absent, etc. sent by technicians to management)
export const staffAlerts = pgTable("staff_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  technicianId: varchar("technician_id").notNull(),
  type: varchar("type").notNull().$type<"running_late" | "absent" | "emergency" | "other">(),
  message: text("message"),
  estimatedArrival: varchar("estimated_arrival"), // e.g. "10:30"
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: varchar("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Push Subscriptions (Web Push notifications)
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userId: varchar("user_id"),       // for staff (technician/manager/admin)
  customerToken: varchar("customer_token", { length: 64 }), // for customer tracking pages
  createdAt: timestamp("created_at").defaultNow(),
});

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory Items
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  category: inventoryCategoryEnum("category").notNull().default("other"),
  unit: varchar("unit", { length: 50 }).notNull().default("units"),
  costPerUnit: integer("cost_per_unit").default(0), // in cents
  sellingPricePerUnit: integer("selling_price_per_unit").default(0), // in cents
  currentStock: integer("current_stock").default(0), // in hundredths (e.g. 150 = 1.50 units)
  minimumStock: integer("minimum_stock").default(0), // in hundredths
  supplierId: varchar("supplier_id"),
  consumptionMap: jsonb("consumption_map").$type<Record<string, number>>(), // ServiceCode → quantity per wash (hundredths)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory Consumption (tracks usage per wash job)
export const inventoryConsumption = pgTable("inventory_consumption", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  inventoryItemId: varchar("inventory_item_id").notNull(),
  washJobId: varchar("wash_job_id"),
  quantity: integer("quantity").notNull(), // in hundredths
  costAtTime: integer("cost_at_time").default(0), // cost per unit at time of consumption, in cents
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().default("default"),
  branchId: varchar("branch_id"),
  supplierId: varchar("supplier_id").notNull(),
  status: purchaseOrderStatusEnum("status").notNull().default("draft"),
  items: jsonb("items").$type<Array<{
    inventoryItemId: string;
    itemName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>>().default([]),
  totalCost: integer("total_cost").default(0), // in cents
  notes: text("notes"),
  orderedAt: timestamp("ordered_at"),
  receivedAt: timestamp("received_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Billing Snapshots (monthly usage per tenant)
export const billingSnapshots = pgTable("billing_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // "2026-02"
  washCount: integer("wash_count").default(0),
  parkingSessionCount: integer("parking_session_count").default(0),
  activeUserCount: integer("active_user_count").default(0),
  branchCount: integer("branch_count").default(0),
  storageUsedMb: integer("storage_used_mb").default(0),
  estimatedAmount: integer("estimated_amount").default(0), // in cents
  planAtTime: varchar("plan_at_time", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feature Flags (global definitions)
export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  defaultEnabled: boolean("default_enabled").default(false),
  enabledForPlans: jsonb("enabled_for_plans").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenant Feature Overrides (per-tenant toggles)
export const tenantFeatureOverrides = pgTable("tenant_feature_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  featureCode: varchar("feature_code", { length: 50 }).notNull(),
  enabled: boolean("enabled").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, createdAt: true });
export const insertWashJobSchema = createInsertSchema(washJobs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWashPhotoSchema = createInsertSchema(washPhotos).omit({ id: true, createdAt: true });
export const insertParkingSessionSchema = createInsertSchema(parkingSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertParkingSettingsSchema = createInsertSchema(parkingSettings).omit({ id: true, createdAt: true });
export const insertParkingZoneSchema = createInsertSchema(parkingZones).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFrequentParkerSchema = createInsertSchema(frequentParkers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertParkingReservationSchema = createInsertSchema(parkingReservations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventLogSchema = createInsertSchema(eventLogs).omit({ id: true, createdAt: true });
export const insertWebhookRetrySchema = createInsertSchema(webhookRetries).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertCustomerJobAccessSchema = createInsertSchema(customerJobAccess).omit({ id: true, createdAt: true });
export const insertServiceChecklistItemSchema = createInsertSchema(serviceChecklistItems).omit({ id: true, createdAt: true });
export const insertCustomerConfirmationSchema = createInsertSchema(customerConfirmations).omit({ id: true, createdAt: true });
export const insertPhotoRuleSchema = createInsertSchema(photoRules).omit({ id: true, createdAt: true });
export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({ id: true, createdAt: true });
export const insertServicePackageSchema = createInsertSchema(servicePackages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerMembershipSchema = createInsertSchema(customerMemberships).omit({ id: true, createdAt: true, updatedAt: true });
export const insertParkingValidationSchema = createInsertSchema(parkingValidations).omit({ id: true, createdAt: true });
export const insertCustomerNotificationSchema = createInsertSchema(customerNotifications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTechnicianTimeLogSchema = createInsertSchema(technicianTimeLogs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStaffAlertSchema = createInsertSchema(staffAlerts).omit({ id: true, createdAt: true });
export const insertLoyaltyAccountSchema = createInsertSchema(loyaltyAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInventoryConsumptionSchema = createInsertSchema(inventoryConsumption).omit({ id: true, createdAt: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBillingSnapshotSchema = createInsertSchema(billingSnapshots).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantFeatureOverrideSchema = createInsertSchema(tenantFeatureOverrides).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type WashJob = typeof washJobs.$inferSelect;
export type InsertWashJob = z.infer<typeof insertWashJobSchema>;

export type WashPhoto = typeof washPhotos.$inferSelect;
export type InsertWashPhoto = z.infer<typeof insertWashPhotoSchema>;

export type ParkingSession = typeof parkingSessions.$inferSelect;
export type InsertParkingSession = z.infer<typeof insertParkingSessionSchema>;

export type ParkingSettings = typeof parkingSettings.$inferSelect;
export type InsertParkingSettings = z.infer<typeof insertParkingSettingsSchema>;

export type ParkingZone = typeof parkingZones.$inferSelect;
export type InsertParkingZone = z.infer<typeof insertParkingZoneSchema>;

export type FrequentParker = typeof frequentParkers.$inferSelect;
export type InsertFrequentParker = z.infer<typeof insertFrequentParkerSchema>;

export type ParkingReservation = typeof parkingReservations.$inferSelect;
export type InsertParkingReservation = z.infer<typeof insertParkingReservationSchema>;

export type EventLog = typeof eventLogs.$inferSelect;
export type InsertEventLog = z.infer<typeof insertEventLogSchema>;

export type WebhookRetry = typeof webhookRetries.$inferSelect;
export type InsertWebhookRetry = z.infer<typeof insertWebhookRetrySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type CustomerJobAccess = typeof customerJobAccess.$inferSelect;
export type InsertCustomerJobAccess = z.infer<typeof insertCustomerJobAccessSchema>;

export type ServiceChecklistItem = typeof serviceChecklistItems.$inferSelect;
export type InsertServiceChecklistItem = z.infer<typeof insertServiceChecklistItemSchema>;

export type CustomerConfirmation = typeof customerConfirmations.$inferSelect;
export type InsertCustomerConfirmation = z.infer<typeof insertCustomerConfirmationSchema>;

export type PhotoRule = typeof photoRules.$inferSelect;
export type InsertPhotoRule = z.infer<typeof insertPhotoRuleSchema>;

export type BusinessSettings = typeof businessSettings.$inferSelect;
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;

export type ServicePackage = typeof servicePackages.$inferSelect;
export type InsertServicePackage = z.infer<typeof insertServicePackageSchema>;

export type CustomerMembership = typeof customerMemberships.$inferSelect;
export type InsertCustomerMembership = z.infer<typeof insertCustomerMembershipSchema>;

export type ParkingValidation = typeof parkingValidations.$inferSelect;
export type InsertParkingValidation = z.infer<typeof insertParkingValidationSchema>;

export type CustomerNotification = typeof customerNotifications.$inferSelect;
export type InsertCustomerNotification = z.infer<typeof insertCustomerNotificationSchema>;

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;

export type TechnicianTimeLog = typeof technicianTimeLogs.$inferSelect;
export type InsertTechnicianTimeLog = z.infer<typeof insertTechnicianTimeLogSchema>;

export type StaffAlert = typeof staffAlerts.$inferSelect;
export type InsertStaffAlert = z.infer<typeof insertStaffAlertSchema>;

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export type LoyaltyAccount = typeof loyaltyAccounts.$inferSelect;
export type InsertLoyaltyAccount = z.infer<typeof insertLoyaltyAccountSchema>;

export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type InventoryConsumption = typeof inventoryConsumption.$inferSelect;
export type InsertInventoryConsumption = z.infer<typeof insertInventoryConsumptionSchema>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;

export type BillingSnapshot = typeof billingSnapshots.$inferSelect;
export type InsertBillingSnapshot = z.infer<typeof insertBillingSnapshotSchema>;

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;

export type TenantFeatureOverride = typeof tenantFeatureOverrides.$inferSelect;
export type InsertTenantFeatureOverride = z.infer<typeof insertTenantFeatureOverrideSchema>;

// Status flow for wash jobs
export const WASH_STATUS_ORDER = ["received", "prewash", "rinse", "dry_vacuum", "simple_polish", "detailing_polish", "tyre_shine", "clay_treatment", "complete"] as const;
export type WashStatus = typeof WASH_STATUS_ORDER[number];

// Country hints
export const COUNTRY_HINTS = ["FR", "ZA", "CD", "OTHER"] as const;
export type CountryHint = typeof COUNTRY_HINTS[number];

// Photo rules
export const PHOTO_RULES = ["optional", "required", "disabled"] as const;
export type PhotoRuleType = typeof PHOTO_RULES[number];

// Service codes
export const SERVICE_CODES = ["STANDARD", "RIM_ONLY", "TYRE_SHINE_ONLY", "HEADLIGHT_RESTORATION", "FULL_VALET"] as const;
export type ServiceCode = typeof SERVICE_CODES[number];

// Service type configuration — determines step vs timer mode
export const SERVICE_TYPE_CONFIG: Record<ServiceCode, {
  label: string;
  mode: "steps" | "timer";
  description: string;
  durationMinutes: number;
  steps: string[];
}> = {
  STANDARD: {
    label: "Standard Wash",
    mode: "steps",
    description: "Full car wash with all available steps",
    durationMinutes: 30,
    steps: ["Pre-rinse", "Soap wash", "High-pressure rinse", "Hand dry", "Interior vacuum", "Tyre shine", "Window cleaning"],
  },
  RIM_ONLY: {
    label: "Rim Only",
    mode: "steps",
    description: "Rim cleaning service",
    durationMinutes: 15,
    steps: ["Wheel spray", "Brush agitation", "Rinse", "Rim polish"],
  },
  TYRE_SHINE_ONLY: {
    label: "Tyre Shine Only",
    mode: "steps",
    description: "Tyre shine service",
    durationMinutes: 10,
    steps: ["Tyre cleaning", "Tyre dressing", "Shine application"],
  },
  HEADLIGHT_RESTORATION: {
    label: "Headlight Restoration",
    mode: "steps",
    description: "Headlight cleaning & restoration",
    durationMinutes: 20,
    steps: ["Masking tape surround", "Wet sanding", "Compound polish", "UV sealant application"],
  },
  FULL_VALET: {
    label: "Full Valet",
    mode: "steps",
    description: "Full valet — complete interior & exterior detail",
    durationMinutes: 60,
    steps: ["Exterior pre-rinse", "Foam wash", "High-pressure rinse", "Clay bar treatment", "Hand dry", "Interior vacuum", "Dashboard & trim clean", "Seat shampooing", "Liquid wax", "Tyre shine", "Window cleaning", "Final inspection"],
  },
};

// Vehicle sizes for pricing tiers
export const VEHICLE_SIZES = ["small", "medium", "large"] as const;
export type VehicleSize = typeof VEHICLE_SIZES[number];

// Service tiers
export const SERVICE_TIERS = ["BASIC", "STANDARD", "PREMIUM", "DELUXE", "EXECUTIVE"] as const;
export type ServiceTier = typeof SERVICE_TIERS[number];

// Named service packages (matched to CRM services)
export interface ServicePackageConfig {
  label: string;
  description: string;
  tier: ServiceTier;
  durationMinutes: number;
  steps: string[];
  pricing: Record<VehicleSize, number>; // price in ZAR (whole numbers)
  serviceCode: ServiceCode; // maps to legacy service code for loyalty/priority
}

export const SERVICE_PACKAGES: Record<string, ServicePackageConfig> = {
  VAMOS: {
    label: "Vamos",
    description: "Quick vacuum service for a clean interior. Perfect for regular maintenance between washes.",
    tier: "BASIC",
    durationMinutes: 15,
    serviceCode: "STANDARD",
    pricing: { small: 80, medium: 100, large: 120 },
    steps: ["Interior vacuum", "Floor mats cleaning", "Seat vacuuming", "Trunk vacuuming"],
  },
  VAGABUNDO: {
    label: "Vagabundo",
    description: "Exterior wash only service. Get your car sparkling clean on the outside.",
    tier: "BASIC",
    durationMinutes: 20,
    serviceCode: "STANDARD",
    pricing: { small: 120, medium: 140, large: 160 },
    steps: ["Pre-rinse", "Soap application", "High-pressure wash", "Spot-free rinse", "Hand dry", "Tire shine"],
  },
  LE_RACONTEUR: {
    label: "Le Raconteur",
    description: "Complete wash and vacuum service. The perfect combination for a clean car inside and out.",
    tier: "STANDARD",
    durationMinutes: 30,
    serviceCode: "STANDARD",
    pricing: { small: 150, medium: 170, large: 200 },
    steps: ["Exterior wash", "Pre-rinse", "Soap application", "High-pressure wash", "Hand dry", "Interior vacuum", "Tire shine"],
  },
  LA_OBRA: {
    label: "La Obra",
    description: "Wash, vacuum and liquid express wax. Enhanced protection and shine for your vehicle.",
    tier: "PREMIUM",
    durationMinutes: 40,
    serviceCode: "FULL_VALET",
    pricing: { small: 180, medium: 200, large: 230 },
    steps: ["Complete exterior wash", "Interior vacuum", "Liquid express wax", "Enhanced shine", "Paint protection", "Tire shine", "Window cleaning"],
  },
  MAMACITA: {
    label: "Mamacita",
    description: "Wash, vacuum and high definition wax. Premium protection with superior shine and durability.",
    tier: "PREMIUM",
    durationMinutes: 50,
    serviceCode: "FULL_VALET",
    pricing: { small: 250, medium: 280, large: 300 },
    steps: ["Complete exterior wash", "Interior vacuum", "High definition wax", "Superior paint protection", "Enhanced gloss finish", "Tire shine treatment", "Window cleaning inside & out", "Dashboard wipe"],
  },
  THE_JL_SPECIAL: {
    label: "The JL Special",
    description: "Wash, vacuum plus liquid clay treatment and high definition wax. Professional detailing for exceptional results.",
    tier: "DELUXE",
    durationMinutes: 75,
    serviceCode: "FULL_VALET",
    pricing: { small: 450, medium: 470, large: 500 },
    steps: ["Complete exterior wash", "Interior vacuum", "Liquid clay treatment", "High definition wax", "Professional paint correction", "Enhanced gloss finish", "Tire shine treatment", "Window cleaning inside & out", "Dashboard & trim detail"],
  },
  THE_GUNNER: {
    label: "The Gunner",
    description: "Wash, vacuum, and fabric/leather interior deep clean. Complete interior and exterior transformation.",
    tier: "DELUXE",
    durationMinutes: 90,
    serviceCode: "FULL_VALET",
    pricing: { small: 650, medium: 700, large: 800 },
    steps: ["Complete exterior wash", "Interior deep vacuum", "Fabric/leather deep clean", "Stain removal treatment", "Interior sanitization", "Dashboard & trim restoration", "High definition wax", "Tire shine treatment", "Window cleaning inside & out"],
  },
  THE_BIG_KAHUNA: {
    label: "The Big Kahuna",
    description: "Full valet service. The ultimate complete car care experience with attention to every detail.",
    tier: "EXECUTIVE",
    durationMinutes: 150,
    serviceCode: "FULL_VALET",
    pricing: { small: 1000, medium: 1200, large: 1400 },
    steps: ["Complete exterior wash", "Clay bar treatment", "Machine polishing", "Paint correction", "Ceramic sealant application", "Interior deep vacuum", "Fabric/leather deep clean", "Dashboard & trim restoration", "Engine bay cleaning", "Tire shine treatment", "Window cleaning inside & out", "Final inspection"],
  },
};

// Service package codes for validation
export const SERVICE_PACKAGE_CODES = Object.keys(SERVICE_PACKAGES) as string[];

// Tier colors for UI display
export const SERVICE_TIER_COLORS: Record<ServiceTier, string> = {
  BASIC: "bg-slate-500",
  STANDARD: "bg-blue-500",
  PREMIUM: "bg-purple-500",
  DELUXE: "bg-amber-500",
  EXECUTIVE: "bg-rose-500",
};

// Loyalty points earned per service type
export const LOYALTY_POINTS_PER_SERVICE: Record<ServiceCode, number> = {
  STANDARD: 100,
  RIM_ONLY: 30,
  TYRE_SHINE_ONLY: 25,
  HEADLIGHT_RESTORATION: 50,
  FULL_VALET: 150,
};

// Priority weights by service code (for Smart Task Queue)
export const SERVICE_PRIORITY_WEIGHT: Record<ServiceCode, number> = {
  FULL_VALET: 50,
  STANDARD: 30,
  HEADLIGHT_RESTORATION: 20,
  TYRE_SHINE_ONLY: 10,
  RIM_ONLY: 10,
};

// Loyalty tiers
export const LOYALTY_TIERS = ["basic", "premium"] as const;
export type LoyaltyTier = typeof LOYALTY_TIERS[number];

// Reservation statuses
export const RESERVATION_STATUSES = ["pending", "confirmed", "checked_in", "completed", "cancelled"] as const;
export type ReservationStatus = typeof RESERVATION_STATUSES[number];

// Membership types
export const MEMBERSHIP_TYPES = ["wash_unlimited", "wash_count", "parking_monthly", "combo"] as const;
export type MembershipType = typeof MEMBERSHIP_TYPES[number];

// Notification channels
export const NOTIFICATION_CHANNELS = ["sms", "email", "whatsapp", "both"] as const;
export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number];

// Inventory categories (car-wash optimized)
export const INVENTORY_CATEGORIES = [
  "chemicals", "cloths_towels", "wax_polish", "brushes_sponges",
  "air_fresheners", "interior_care", "tire_wheel_care",
  "sealants_coatings", "safety_gear", "equipment", "packaging", "other",
] as const;
export type InventoryCategory = typeof INVENTORY_CATEGORIES[number];

// Inventory units of measurement
export const INVENTORY_UNITS = [
  "liters", "ml", "units", "kg", "grams",
  "rolls", "packs", "bottles", "pairs", "sheets", "sets",
] as const;
export type InventoryUnit = typeof INVENTORY_UNITS[number];

// Purchase order statuses
export const PURCHASE_ORDER_STATUSES = ["draft", "submitted", "received", "cancelled"] as const;
export type PurchaseOrderStatus = typeof PURCHASE_ORDER_STATUSES[number];

// Tenant plans
export const TENANT_PLANS = ["free", "basic", "pro", "enterprise"] as const;
export type TenantPlan = typeof TENANT_PLANS[number];

// Notification types
export const NOTIFICATION_TYPES = [
  "wash_ready",           // Car is ready for pickup
  "wash_complete",        // Wash job completed
  "parking_entry",        // Vehicle entered parking
  "parking_reminder",     // Parking time reminder
  "parking_exit",         // Vehicle exited with receipt
  "booking_confirmation", // CRM booking confirmed
  "booking_reminder",     // Upcoming booking reminder
  "membership_welcome",   // New membership welcome
  "membership_expiry",    // Membership expiring soon
  "membership_renewed",   // Membership auto-renewed
  "payment_received",     // Payment confirmation
  "custom"               // Custom notification
] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

// Notification statuses
export const NOTIFICATION_STATUSES = ["pending", "queued", "sent", "failed", "cancelled"] as const;
export type NotificationStatus = typeof NOTIFICATION_STATUSES[number];

// Supported currencies with metadata
export const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "fr-FR" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
  { code: "CDF", symbol: "FC", name: "Congolese Franc", locale: "fr-CD" },
  { code: "XAF", symbol: "FCFA", name: "CFA Franc BEAC", locale: "fr-CM" },
  { code: "XOF", symbol: "CFA", name: "CFA Franc BCEAO", locale: "fr-SN" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", locale: "en-KE" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", locale: "en-GH" },
  { code: "MAD", symbol: "DH", name: "Moroccan Dirham", locale: "ar-MA" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound", locale: "ar-EG" },
  { code: "RWF", symbol: "FRw", name: "Rwandan Franc", locale: "rw-RW" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling", locale: "sw-TZ" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling", locale: "en-UG" },
  { code: "BWP", symbol: "P", name: "Botswana Pula", locale: "en-BW" },
  { code: "MZN", symbol: "MT", name: "Mozambican Metical", locale: "pt-MZ" },
  { code: "AOA", symbol: "Kz", name: "Angolan Kwanza", locale: "pt-AO" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", locale: "ar-SA" },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]["code"];
