import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["technician", "manager", "admin"]);
export const washStatusEnum = pgEnum("wash_status", ["received", "prewash", "foam", "rinse", "dry", "complete"]);
export const countryHintEnum = pgEnum("country_hint", ["FR", "ZA", "CD", "OTHER"]);

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
  createdAt: timestamp("created_at").defaultNow(),
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

// Insert schemas
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, createdAt: true });
export const insertWashJobSchema = createInsertSchema(washJobs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWashPhotoSchema = createInsertSchema(washPhotos).omit({ id: true, createdAt: true });
export const insertParkingSessionSchema = createInsertSchema(parkingSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventLogSchema = createInsertSchema(eventLogs).omit({ id: true, createdAt: true });
export const insertWebhookRetrySchema = createInsertSchema(webhookRetries).omit({ id: true, createdAt: true });

// Types
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type WashJob = typeof washJobs.$inferSelect;
export type InsertWashJob = z.infer<typeof insertWashJobSchema>;

export type WashPhoto = typeof washPhotos.$inferSelect;
export type InsertWashPhoto = z.infer<typeof insertWashPhotoSchema>;

export type ParkingSession = typeof parkingSessions.$inferSelect;
export type InsertParkingSession = z.infer<typeof insertParkingSessionSchema>;

export type EventLog = typeof eventLogs.$inferSelect;
export type InsertEventLog = z.infer<typeof insertEventLogSchema>;

export type WebhookRetry = typeof webhookRetries.$inferSelect;
export type InsertWebhookRetry = z.infer<typeof insertWebhookRetrySchema>;

// Status flow for wash jobs
export const WASH_STATUS_ORDER = ["received", "prewash", "foam", "rinse", "dry", "complete"] as const;
export type WashStatus = typeof WASH_STATUS_ORDER[number];

// Country hints
export const COUNTRY_HINTS = ["FR", "ZA", "CD", "OTHER"] as const;
export type CountryHint = typeof COUNTRY_HINTS[number];
