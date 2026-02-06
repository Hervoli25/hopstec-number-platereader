import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["technician", "manager", "admin"]);
export const washStatusEnum = pgEnum("wash_status", ["received", "prewash", "foam", "rinse", "dry", "complete"]);
export const countryHintEnum = pgEnum("country_hint", ["FR", "ZA", "CD", "OTHER"]);
export const photoRuleEnum = pgEnum("photo_rule", ["optional", "required", "disabled"]);

// User roles table (extends base users from auth)
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: userRoleEnum("role").notNull().default("technician"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wash Jobs
export const washJobs = pgTable("wash_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plateDisplay: varchar("plate_display", { length: 50 }).notNull(),
  plateNormalized: varchar("plate_normalized", { length: 50 }).notNull(),
  countryHint: countryHintEnum("country_hint").default("OTHER"),
  status: washStatusEnum("status").notNull().default("received"),
  technicianId: varchar("technician_id").notNull(),
  serviceCode: varchar("service_code", { length: 100 }),
  stageTimestamps: jsonb("stage_timestamps").$type<Record<string, string>>(),
  startAt: timestamp("start_at").defaultNow(),
  endAt: timestamp("end_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wash Photos
export const washPhotos = pgTable("wash_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  washJobId: varchar("wash_job_id").notNull(),
  url: text("url").notNull(),
  statusAtTime: washStatusEnum("status_at_time").notNull(),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Parking Settings (configurable rates and capacity)
export const parkingSettings = pgTable("parking_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hourlyRate: integer("hourly_rate").default(500), // in cents (e.g., 500 = $5.00)
  dailyMaxRate: integer("daily_max_rate").default(3000), // max daily charge
  gracePeriodMinutes: integer("grace_period_minutes").default(15),
  totalCapacity: integer("total_capacity").default(50),
  currency: varchar("currency", { length: 3 }).default("USD"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Parking Zones
export const parkingZones = pgTable("parking_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  washJobId: varchar("wash_job_id").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  orderIndex: integer("order_index").default(0),
  expected: boolean("expected").default(true),
  confirmed: boolean("confirmed").default(false),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer confirmations
export const customerConfirmations = pgTable("customer_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  step: washStatusEnum("step").notNull().unique(),
  rule: photoRuleEnum("rule").notNull().default("optional"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
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

// Status flow for wash jobs
export const WASH_STATUS_ORDER = ["received", "prewash", "foam", "rinse", "dry", "complete"] as const;
export type WashStatus = typeof WASH_STATUS_ORDER[number];

// Country hints
export const COUNTRY_HINTS = ["FR", "ZA", "CD", "OTHER"] as const;
export type CountryHint = typeof COUNTRY_HINTS[number];

// Photo rules
export const PHOTO_RULES = ["optional", "required", "disabled"] as const;
export type PhotoRuleType = typeof PHOTO_RULES[number];

// Service codes
export const SERVICE_CODES = ["BASIC", "PREMIUM", "DELUXE", "CUSTOM"] as const;
export type ServiceCode = typeof SERVICE_CODES[number];

// Reservation statuses
export const RESERVATION_STATUSES = ["pending", "confirmed", "checked_in", "completed", "cancelled"] as const;
export type ReservationStatus = typeof RESERVATION_STATUSES[number];
