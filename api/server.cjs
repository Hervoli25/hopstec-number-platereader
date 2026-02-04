"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// shared/models/auth.ts
var import_drizzle_orm, import_pg_core, sessions, users;
var init_auth = __esm({
  "shared/models/auth.ts"() {
    "use strict";
    import_drizzle_orm = require("drizzle-orm");
    import_pg_core = require("drizzle-orm/pg-core");
    sessions = (0, import_pg_core.pgTable)(
      "sessions",
      {
        sid: (0, import_pg_core.varchar)("sid").primaryKey(),
        sess: (0, import_pg_core.jsonb)("sess").notNull(),
        expire: (0, import_pg_core.timestamp)("expire").notNull()
      },
      (table) => [(0, import_pg_core.index)("IDX_session_expire").on(table.expire)]
    );
    users = (0, import_pg_core.pgTable)("users", {
      id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      email: (0, import_pg_core.varchar)("email").unique(),
      firstName: (0, import_pg_core.varchar)("first_name"),
      lastName: (0, import_pg_core.varchar)("last_name"),
      profileImageUrl: (0, import_pg_core.varchar)("profile_image_url"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    });
  }
});

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  COUNTRY_HINTS: () => COUNTRY_HINTS,
  PHOTO_RULES: () => PHOTO_RULES,
  SERVICE_CODES: () => SERVICE_CODES,
  WASH_STATUS_ORDER: () => WASH_STATUS_ORDER,
  countryHintEnum: () => countryHintEnum,
  customerConfirmations: () => customerConfirmations,
  customerJobAccess: () => customerJobAccess,
  eventLogs: () => eventLogs,
  insertCustomerConfirmationSchema: () => insertCustomerConfirmationSchema,
  insertCustomerJobAccessSchema: () => insertCustomerJobAccessSchema,
  insertEventLogSchema: () => insertEventLogSchema,
  insertParkingSessionSchema: () => insertParkingSessionSchema,
  insertPhotoRuleSchema: () => insertPhotoRuleSchema,
  insertServiceChecklistItemSchema: () => insertServiceChecklistItemSchema,
  insertUserRoleSchema: () => insertUserRoleSchema,
  insertUserSchema: () => insertUserSchema,
  insertWashJobSchema: () => insertWashJobSchema,
  insertWashPhotoSchema: () => insertWashPhotoSchema,
  insertWebhookRetrySchema: () => insertWebhookRetrySchema,
  parkingSessions: () => parkingSessions,
  photoRuleEnum: () => photoRuleEnum,
  photoRules: () => photoRules,
  serviceChecklistItems: () => serviceChecklistItems,
  sessions: () => sessions,
  userRoleEnum: () => userRoleEnum,
  userRoles: () => userRoles,
  users: () => users2,
  washJobs: () => washJobs,
  washPhotos: () => washPhotos,
  washStatusEnum: () => washStatusEnum,
  webhookRetries: () => webhookRetries
});
var import_drizzle_orm2, import_pg_core2, import_drizzle_zod, userRoleEnum, washStatusEnum, countryHintEnum, photoRuleEnum, userRoles, washJobs, washPhotos, parkingSessions, eventLogs, webhookRetries, users2, customerJobAccess, serviceChecklistItems, customerConfirmations, photoRules, insertUserRoleSchema, insertWashJobSchema, insertWashPhotoSchema, insertParkingSessionSchema, insertEventLogSchema, insertWebhookRetrySchema, insertUserSchema, insertCustomerJobAccessSchema, insertServiceChecklistItemSchema, insertCustomerConfirmationSchema, insertPhotoRuleSchema, WASH_STATUS_ORDER, COUNTRY_HINTS, PHOTO_RULES, SERVICE_CODES;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    import_drizzle_orm2 = require("drizzle-orm");
    import_pg_core2 = require("drizzle-orm/pg-core");
    import_drizzle_zod = require("drizzle-zod");
    init_auth();
    userRoleEnum = (0, import_pg_core2.pgEnum)("user_role", ["technician", "manager", "admin"]);
    washStatusEnum = (0, import_pg_core2.pgEnum)("wash_status", ["received", "prewash", "foam", "rinse", "dry", "complete"]);
    countryHintEnum = (0, import_pg_core2.pgEnum)("country_hint", ["FR", "ZA", "CD", "OTHER"]);
    photoRuleEnum = (0, import_pg_core2.pgEnum)("photo_rule", ["optional", "required", "disabled"]);
    userRoles = (0, import_pg_core2.pgTable)("user_roles", {
      id: (0, import_pg_core2.varchar)("id").primaryKey().default(import_drizzle_orm2.sql`gen_random_uuid()`),
      userId: (0, import_pg_core2.varchar)("user_id").notNull(),
      role: userRoleEnum("role").notNull().default("technician"),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
    });
    washJobs = (0, import_pg_core2.pgTable)("wash_jobs", {
      id: (0, import_pg_core2.varchar)("id").primaryKey().default(import_drizzle_orm2.sql`gen_random_uuid()`),
      plateDisplay: (0, import_pg_core2.varchar)("plate_display", { length: 50 }).notNull(),
      plateNormalized: (0, import_pg_core2.varchar)("plate_normalized", { length: 50 }).notNull(),
      countryHint: countryHintEnum("country_hint").default("OTHER"),
      status: washStatusEnum("status").notNull().default("received"),
      technicianId: (0, import_pg_core2.varchar)("technician_id").notNull(),
      serviceCode: (0, import_pg_core2.varchar)("service_code", { length: 100 }),
      stageTimestamps: (0, import_pg_core2.jsonb)("stage_timestamps").$type(),
      startAt: (0, import_pg_core2.timestamp)("start_at").defaultNow(),
      endAt: (0, import_pg_core2.timestamp)("end_at"),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core2.timestamp)("updated_at").defaultNow()
    });
    washPhotos = (0, import_pg_core2.pgTable)("wash_photos", {
      id: (0, import_pg_core2.varchar)("id").primaryKey().default(import_drizzle_orm2.sql`gen_random_uuid()`),
      washJobId: (0, import_pg_core2.varchar)("wash_job_id").notNull(),
      url: (0, import_pg_core2.text)("url").notNull(),
      statusAtTime: washStatusEnum("status_at_time").notNull(),
      uploadedBy: (0, import_pg_core2.varchar)("uploaded_by"),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
    });
    parkingSessions = (0, import_pg_core2.pgTable)("parking_sessions", {
      id: (0, import_pg_core2.varchar)("id").primaryKey().default(import_drizzle_orm2.sql`gen_random_uuid()`),
      plateDisplay: (0, import_pg_core2.varchar)("plate_display", { length: 50 }).notNull(),
      plateNormalized: (0, import_pg_core2.varchar)("plate_normalized", { length: 50 }).notNull(),
      countryHint: countryHintEnum("country_hint").default("OTHER"),
      entryAt: (0, import_pg_core2.timestamp)("entry_at").defaultNow(),
      exitAt: (0, import_pg_core2.timestamp)("exit_at"),
      entryPhotoUrl: (0, import_pg_core2.text)("entry_photo_url"),
      exitPhotoUrl: (0, import_pg_core2.text)("exit_photo_url"),
      technicianId: (0, import_pg_core2.varchar)("technician_id").notNull(),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core2.timestamp)("updated_at").defaultNow()
    });
    eventLogs = (0, import_pg_core2.pgTable)("event_logs", {
      id: (0, import_pg_core2.varchar)("id").primaryKey().default(import_drizzle_orm2.sql`gen_random_uuid()`),
      type: (0, import_pg_core2.varchar)("type", { length: 50 }).notNull(),
      plateDisplay: (0, import_pg_core2.varchar)("plate_display", { length: 50 }),
      plateNormalized: (0, import_pg_core2.varchar)("plate_normalized", { length: 50 }),
      countryHint: countryHintEnum("country_hint"),
      washJobId: (0, import_pg_core2.varchar)("wash_job_id"),
      parkingSessionId: (0, import_pg_core2.varchar)("parking_session_id"),
      userId: (0, import_pg_core2.varchar)("user_id"),
      payloadJson: (0, import_pg_core2.jsonb)("payload_json"),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
    });
    webhookRetries = (0, import_pg_core2.pgTable)("webhook_retries", {
      id: (0, import_pg_core2.varchar)("id").primaryKey().default(import_drizzle_orm2.sql`gen_random_uuid()`),
      targetUrl: (0, import_pg_core2.text)("target_url").notNull(),
      payloadJson: (0, import_pg_core2.jsonb)("payload_json").notNull(),
      attempts: (0, import_pg_core2.integer)("attempts").default(0),
      lastError: (0, import_pg_core2.text)("last_error"),
      nextRetryAt: (0, import_pg_core2.timestamp)("next_retry_at"),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
    });
    users2 = (0, import_pg_core2.pgTable)("users", {
      id: (0, import_pg_core2.varchar)("id").primaryKey(),
      email: (0, import_pg_core2.varchar)("email", { length: 255 }),
      firstName: (0, import_pg_core2.varchar)("first_name", { length: 255 }),
      lastName: (0, import_pg_core2.varchar)("last_name", { length: 255 }),
      profileImageUrl: (0, import_pg_core2.varchar)("profile_image_url", { length: 512 }),
      passwordHash: (0, import_pg_core2.text)("password_hash"),
      role: userRoleEnum("role").default("technician"),
      isActive: (0, import_pg_core2.boolean)("is_active").default(true),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core2.timestamp)("updated_at").defaultNow()
    });
    customerJobAccess = (0, import_pg_core2.pgTable)("customer_job_access", {
      id: (0, import_pg_core2.varchar)("id").primaryKey().default(import_drizzle_orm2.sql`gen_random_uuid()`),
      washJobId: (0, import_pg_core2.varchar)("wash_job_id").notNull(),
      token: (0, import_pg_core2.varchar)("token", { length: 64 }).notNull().unique(),
      customerName: (0, import_pg_core2.varchar)("customer_name", { length: 255 }),
      customerEmail: (0, import_pg_core2.varchar)("customer_email", { length: 255 }),
      serviceCode: (0, import_pg_core2.varchar)("service_code", { length: 50 }),
      lastViewedAt: (0, import_pg_core2.timestamp)("last_viewed_at"),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
    });
    serviceChecklistItems = (0, import_pg_core2.pgTable)("service_checklist_items", {
      id: (0, import_pg_core2.varchar)("id").primaryKey().default(import_drizzle_orm2.sql`gen_random_uuid()`),
      washJobId: (0, import_pg_core2.varchar)("wash_job_id").notNull(),
      label: (0, import_pg_core2.varchar)("label", { length: 255 }).notNull(),
      orderIndex: (0, import_pg_core2.integer)("order_index").default(0),
      expected: (0, import_pg_core2.boolean)("expected").default(true),
      confirmed: (0, import_pg_core2.boolean)("confirmed").default(false),
      confirmedAt: (0, import_pg_core2.timestamp)("confirmed_at"),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
    });
    customerConfirmations = (0, import_pg_core2.pgTable)("customer_confirmations", {
      id: (0, import_pg_core2.varchar)("id").primaryKey().default(import_drizzle_orm2.sql`gen_random_uuid()`),
      washJobId: (0, import_pg_core2.varchar)("wash_job_id").notNull(),
      accessToken: (0, import_pg_core2.varchar)("access_token", { length: 64 }).notNull(),
      rating: (0, import_pg_core2.integer)("rating"),
      notes: (0, import_pg_core2.text)("notes"),
      issueReported: (0, import_pg_core2.text)("issue_reported"),
      confirmedAt: (0, import_pg_core2.timestamp)("confirmed_at").defaultNow(),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
    });
    photoRules = (0, import_pg_core2.pgTable)("photo_rules", {
      id: (0, import_pg_core2.varchar)("id").primaryKey().default(import_drizzle_orm2.sql`gen_random_uuid()`),
      step: washStatusEnum("step").notNull().unique(),
      rule: photoRuleEnum("rule").notNull().default("optional"),
      updatedBy: (0, import_pg_core2.varchar)("updated_by"),
      updatedAt: (0, import_pg_core2.timestamp)("updated_at").defaultNow(),
      createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
    });
    insertUserRoleSchema = (0, import_drizzle_zod.createInsertSchema)(userRoles).omit({ id: true, createdAt: true });
    insertWashJobSchema = (0, import_drizzle_zod.createInsertSchema)(washJobs).omit({ id: true, createdAt: true, updatedAt: true });
    insertWashPhotoSchema = (0, import_drizzle_zod.createInsertSchema)(washPhotos).omit({ id: true, createdAt: true });
    insertParkingSessionSchema = (0, import_drizzle_zod.createInsertSchema)(parkingSessions).omit({ id: true, createdAt: true, updatedAt: true });
    insertEventLogSchema = (0, import_drizzle_zod.createInsertSchema)(eventLogs).omit({ id: true, createdAt: true });
    insertWebhookRetrySchema = (0, import_drizzle_zod.createInsertSchema)(webhookRetries).omit({ id: true, createdAt: true });
    insertUserSchema = (0, import_drizzle_zod.createInsertSchema)(users2).omit({ createdAt: true, updatedAt: true });
    insertCustomerJobAccessSchema = (0, import_drizzle_zod.createInsertSchema)(customerJobAccess).omit({ id: true, createdAt: true });
    insertServiceChecklistItemSchema = (0, import_drizzle_zod.createInsertSchema)(serviceChecklistItems).omit({ id: true, createdAt: true });
    insertCustomerConfirmationSchema = (0, import_drizzle_zod.createInsertSchema)(customerConfirmations).omit({ id: true, createdAt: true });
    insertPhotoRuleSchema = (0, import_drizzle_zod.createInsertSchema)(photoRules).omit({ id: true, createdAt: true });
    WASH_STATUS_ORDER = ["received", "prewash", "foam", "rinse", "dry", "complete"];
    COUNTRY_HINTS = ["FR", "ZA", "CD", "OTHER"];
    PHOTO_RULES = ["optional", "required", "disabled"];
    SERVICE_CODES = ["BASIC", "PREMIUM", "DELUXE", "CUSTOM"];
  }
});

// server/db.ts
var import_node_postgres, import_pg, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    import_node_postgres = require("drizzle-orm/node-postgres");
    import_pg = __toESM(require("pg"), 1);
    init_schema();
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }
    pool = new import_pg.default.Pool({ connectionString: process.env.DATABASE_URL });
    db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });
  }
});

// server/lib/plate-utils.ts
function normalizePlate(raw) {
  if (!raw) return "";
  return raw.trim().toUpperCase().replace(/[\s\-]+/g, "").replace(/[^A-Z0-9]/g, "");
}
function displayPlate(raw) {
  if (!raw) return "";
  return raw.trim().toUpperCase().replace(/\s+/g, " ");
}
var init_plate_utils = __esm({
  "server/lib/plate-utils.ts"() {
    "use strict";
  }
});

// server/storage.ts
var import_drizzle_orm3, DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    import_drizzle_orm3 = require("drizzle-orm");
    init_db();
    init_schema();
    init_plate_utils();
    DatabaseStorage = class {
      // User Roles
      async getUserRole(userId) {
        const [role] = await db.select().from(userRoles).where((0, import_drizzle_orm3.eq)(userRoles.userId, userId));
        return role;
      }
      async upsertUserRole(role) {
        const existing = await this.getUserRole(role.userId);
        if (existing) {
          const [result] = await db.update(userRoles).set({ role: role.role }).where((0, import_drizzle_orm3.eq)(userRoles.userId, role.userId)).returning();
          return result;
        } else {
          const [result] = await db.insert(userRoles).values(role).returning();
          return result;
        }
      }
      // Users (credentials auth)
      async getUserById(id) {
        const [user] = await db.select().from(users2).where((0, import_drizzle_orm3.eq)(users2.id, id));
        return user;
      }
      async getUserByEmail(email) {
        const [user] = await db.select().from(users2).where((0, import_drizzle_orm3.eq)(users2.email, email));
        return user;
      }
      async createUser(user) {
        const [result] = await db.insert(users2).values(user).returning();
        return result;
      }
      async updateUser(id, data) {
        const [result] = await db.update(users2).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(users2.id, id)).returning();
        return result;
      }
      async getUsers() {
        return db.select().from(users2).orderBy((0, import_drizzle_orm3.desc)(users2.createdAt));
      }
      // Customer job access
      async createCustomerJobAccess(access) {
        const [result] = await db.insert(customerJobAccess).values(access).returning();
        return result;
      }
      async getCustomerJobAccessByToken(token) {
        const [result] = await db.select().from(customerJobAccess).where((0, import_drizzle_orm3.eq)(customerJobAccess.token, token));
        return result;
      }
      async getCustomerJobAccessByJobId(washJobId) {
        const [result] = await db.select().from(customerJobAccess).where((0, import_drizzle_orm3.eq)(customerJobAccess.washJobId, washJobId));
        return result;
      }
      async updateCustomerJobAccessViewedAt(token) {
        const [result] = await db.update(customerJobAccess).set({ lastViewedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(customerJobAccess.token, token)).returning();
        return result;
      }
      // Service checklist
      async createServiceChecklistItems(items) {
        if (items.length === 0) return [];
        return db.insert(serviceChecklistItems).values(items).returning();
      }
      async getServiceChecklistItems(washJobId) {
        return db.select().from(serviceChecklistItems).where((0, import_drizzle_orm3.eq)(serviceChecklistItems.washJobId, washJobId)).orderBy(serviceChecklistItems.orderIndex);
      }
      async updateChecklistItemConfirmed(id, confirmed) {
        const [result] = await db.update(serviceChecklistItems).set({ confirmed, confirmedAt: confirmed ? /* @__PURE__ */ new Date() : null }).where((0, import_drizzle_orm3.eq)(serviceChecklistItems.id, id)).returning();
        return result;
      }
      async updateChecklistItemConfirmedForJob(id, washJobId, confirmed) {
        const [result] = await db.update(serviceChecklistItems).set({ confirmed, confirmedAt: confirmed ? /* @__PURE__ */ new Date() : null }).where((0, import_drizzle_orm3.and)(
          (0, import_drizzle_orm3.eq)(serviceChecklistItems.id, id),
          (0, import_drizzle_orm3.eq)(serviceChecklistItems.washJobId, washJobId)
        )).returning();
        return result;
      }
      // Customer confirmations
      async createCustomerConfirmation(confirmation) {
        const [result] = await db.insert(customerConfirmations).values(confirmation).returning();
        return result;
      }
      async getCustomerConfirmation(washJobId) {
        const [result] = await db.select().from(customerConfirmations).where((0, import_drizzle_orm3.eq)(customerConfirmations.washJobId, washJobId));
        return result;
      }
      // Photo rules
      async getPhotoRules() {
        return db.select().from(photoRules);
      }
      async upsertPhotoRule(rule) {
        const existing = await db.select().from(photoRules).where((0, import_drizzle_orm3.eq)(photoRules.step, rule.step));
        if (existing.length > 0) {
          const [result] = await db.update(photoRules).set({ rule: rule.rule, updatedBy: rule.updatedBy, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(photoRules.step, rule.step)).returning();
          return result;
        } else {
          const [result] = await db.insert(photoRules).values(rule).returning();
          return result;
        }
      }
      // Wash Jobs
      async createWashJob(job) {
        const plateNormalized = normalizePlate(job.plateDisplay);
        const stageTimestamps = { received: (/* @__PURE__ */ new Date()).toISOString() };
        const [result] = await db.insert(washJobs).values({ ...job, plateNormalized, stageTimestamps }).returning();
        return result;
      }
      async getWashJob(id) {
        const [job] = await db.select().from(washJobs).where((0, import_drizzle_orm3.eq)(washJobs.id, id));
        return job;
      }
      async getWashJobs(filters) {
        let query = db.select().from(washJobs);
        const conditions = [];
        if (filters?.status) {
          conditions.push((0, import_drizzle_orm3.eq)(washJobs.status, filters.status));
        }
        if (filters?.technicianId) {
          conditions.push((0, import_drizzle_orm3.eq)(washJobs.technicianId, filters.technicianId));
        }
        if (conditions.length > 0) {
          query = query.where((0, import_drizzle_orm3.and)(...conditions));
        }
        return query.orderBy((0, import_drizzle_orm3.desc)(washJobs.createdAt));
      }
      async updateWashJobStatus(id, status) {
        const [current] = await db.select().from(washJobs).where((0, import_drizzle_orm3.eq)(washJobs.id, id));
        if (!current) return void 0;
        const timestamps = current.stageTimestamps || {};
        timestamps[status] = (/* @__PURE__ */ new Date()).toISOString();
        const [result] = await db.update(washJobs).set({
          status,
          stageTimestamps: timestamps,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm3.eq)(washJobs.id, id)).returning();
        return result;
      }
      async completeWashJob(id) {
        const [current] = await db.select().from(washJobs).where((0, import_drizzle_orm3.eq)(washJobs.id, id));
        if (!current) return void 0;
        const timestamps = current.stageTimestamps || {};
        timestamps["complete"] = (/* @__PURE__ */ new Date()).toISOString();
        const [result] = await db.update(washJobs).set({
          status: "complete",
          stageTimestamps: timestamps,
          endAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm3.eq)(washJobs.id, id)).returning();
        return result;
      }
      // Wash Photos
      async addWashPhoto(photo) {
        const [result] = await db.insert(washPhotos).values(photo).returning();
        return result;
      }
      async getWashPhotos(washJobId) {
        return db.select().from(washPhotos).where((0, import_drizzle_orm3.eq)(washPhotos.washJobId, washJobId));
      }
      // Parking Sessions
      async createParkingEntry(session2) {
        const plateNormalized = normalizePlate(session2.plateDisplay);
        const [result] = await db.insert(parkingSessions).values({ ...session2, plateNormalized }).returning();
        return result;
      }
      async findOpenParkingSession(plateNormalized) {
        const [session2] = await db.select().from(parkingSessions).where((0, import_drizzle_orm3.and)(
          (0, import_drizzle_orm3.eq)(parkingSessions.plateNormalized, plateNormalized),
          (0, import_drizzle_orm3.isNull)(parkingSessions.exitAt)
        ));
        return session2;
      }
      async closeParkingSession(id, exitPhotoUrl) {
        const [result] = await db.update(parkingSessions).set({
          exitAt: /* @__PURE__ */ new Date(),
          exitPhotoUrl: exitPhotoUrl || null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm3.eq)(parkingSessions.id, id)).returning();
        return result;
      }
      async getParkingSessions(filters) {
        let query = db.select().from(parkingSessions);
        if (filters?.open === true) {
          query = query.where((0, import_drizzle_orm3.isNull)(parkingSessions.exitAt));
        } else if (filters?.open === false) {
          query = query.where(import_drizzle_orm3.sql`${parkingSessions.exitAt} IS NOT NULL`);
        }
        return query.orderBy((0, import_drizzle_orm3.desc)(parkingSessions.createdAt));
      }
      // Event Logs
      async logEvent(event) {
        const [result] = await db.insert(eventLogs).values(event).returning();
        return result;
      }
      async getEvents(filters) {
        let query = db.select().from(eventLogs);
        const conditions = [];
        if (filters?.plate) {
          const normalized = normalizePlate(filters.plate);
          conditions.push(import_drizzle_orm3.sql`${eventLogs.plateNormalized} ILIKE ${"%" + normalized + "%"}`);
        }
        if (filters?.type) {
          conditions.push((0, import_drizzle_orm3.eq)(eventLogs.type, filters.type));
        }
        if (conditions.length > 0) {
          query = query.where((0, import_drizzle_orm3.and)(...conditions));
        }
        query = query.orderBy((0, import_drizzle_orm3.desc)(eventLogs.createdAt));
        if (filters?.limit) {
          query = query.limit(filters.limit);
        }
        return query;
      }
      // Analytics
      async getAnalyticsSummary() {
        const now = /* @__PURE__ */ new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [todayResult] = await db.select({ count: import_drizzle_orm3.sql`count(*)::int` }).from(washJobs).where((0, import_drizzle_orm3.gte)(washJobs.createdAt, todayStart));
        const [weekResult] = await db.select({ count: import_drizzle_orm3.sql`count(*)::int` }).from(washJobs).where((0, import_drizzle_orm3.gte)(washJobs.createdAt, weekStart));
        const [monthResult] = await db.select({ count: import_drizzle_orm3.sql`count(*)::int` }).from(washJobs).where((0, import_drizzle_orm3.gte)(washJobs.createdAt, monthStart));
        const [avgResult] = await db.select({
          avgMinutes: import_drizzle_orm3.sql`COALESCE(AVG(EXTRACT(EPOCH FROM (${washJobs.endAt} - ${washJobs.startAt})) / 60)::int, 0)`
        }).from(washJobs).where((0, import_drizzle_orm3.eq)(washJobs.status, "complete"));
        const completedJobs = await db.select({ stageTimestamps: washJobs.stageTimestamps }).from(washJobs).where((0, import_drizzle_orm3.eq)(washJobs.status, "complete"));
        const stageTimeKPIs = {};
        const stages = ["received", "prewash", "foam", "rinse", "dry"];
        for (const job of completedJobs) {
          const timestamps = job.stageTimestamps;
          if (!timestamps) continue;
          for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            const nextStage = stages[i + 1] || "complete";
            if (timestamps[stage] && timestamps[nextStage]) {
              const duration = (new Date(timestamps[nextStage]).getTime() - new Date(timestamps[stage]).getTime()) / 1e3;
              if (duration > 0) {
                if (!stageTimeKPIs[stage]) {
                  stageTimeKPIs[stage] = { avgSeconds: 0, count: 0 };
                }
                stageTimeKPIs[stage].avgSeconds += duration;
                stageTimeKPIs[stage].count++;
              }
            }
          }
        }
        const avgTimePerStage = {};
        for (const [stage, data] of Object.entries(stageTimeKPIs)) {
          if (data.count > 0) {
            avgTimePerStage[stage] = Math.round(data.avgSeconds / data.count);
          }
        }
        const techStats = await db.select({
          technicianId: washJobs.technicianId,
          count: import_drizzle_orm3.sql`count(*)::int`
        }).from(washJobs).where((0, import_drizzle_orm3.gte)(washJobs.createdAt, monthStart)).groupBy(washJobs.technicianId);
        return {
          todayWashes: todayResult?.count || 0,
          weekWashes: weekResult?.count || 0,
          monthWashes: monthResult?.count || 0,
          avgCycleTimeMinutes: avgResult?.avgMinutes || 0,
          avgTimePerStage,
          technicianStats: techStats.map((t) => ({
            userId: t.technicianId,
            name: t.technicianId === "integration" ? "CRM Integration" : `Technician ${t.technicianId.slice(-4)}`,
            count: t.count
          }))
        };
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/lib/credentials-auth.ts
var credentials_auth_exports = {};
__export(credentials_auth_exports, {
  authenticateWithCredentials: () => authenticateWithCredentials,
  createCredentialsUser: () => createCredentialsUser,
  generateJobToken: () => generateJobToken,
  generateToken: () => generateToken,
  hashPassword: () => hashPassword,
  seedUsers: () => seedUsers,
  verifyPassword: () => verifyPassword
});
async function hashPassword(password) {
  return import_bcryptjs.default.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
  return import_bcryptjs.default.compare(password, hash);
}
function generateToken() {
  return import_crypto2.default.randomBytes(32).toString("hex");
}
function generateJobToken() {
  return import_crypto2.default.randomBytes(24).toString("base64url");
}
async function authenticateWithCredentials(email, password) {
  const user = await storage.getUserByEmail(email);
  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }
  if (!user.passwordHash) {
    return { success: false, error: "This account uses Replit authentication" };
  }
  if (!user.isActive) {
    return { success: false, error: "Account is disabled" };
  }
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid email or password" };
  }
  return { success: true, user };
}
async function createCredentialsUser(email, password, role, name) {
  const passwordHash = await hashPassword(password);
  const id = import_crypto2.default.randomUUID();
  const user = await storage.createUser({
    id,
    email,
    passwordHash,
    role,
    firstName: name?.split(" ")[0] || null,
    lastName: name?.split(" ").slice(1).join(" ") || null,
    isActive: true
  });
  return user;
}
async function seedUsers() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const managerEmail = process.env.MANAGER_EMAIL;
  const managerPassword = process.env.MANAGER_PASSWORD;
  const techEmail = process.env.TECH_EMAIL;
  const techPassword = process.env.TECH_PASSWORD;
  const usersToSeed = [];
  if (adminEmail && adminPassword) {
    const existing = await storage.getUserByEmail(adminEmail);
    if (!existing) {
      usersToSeed.push({ email: adminEmail, password: adminPassword, role: "admin", name: "Admin User" });
    }
  }
  if (managerEmail && managerPassword) {
    const existing = await storage.getUserByEmail(managerEmail);
    if (!existing) {
      usersToSeed.push({ email: managerEmail, password: managerPassword, role: "manager", name: "Manager User" });
    }
  }
  if (techEmail && techPassword) {
    const existing = await storage.getUserByEmail(techEmail);
    if (!existing) {
      usersToSeed.push({ email: techEmail, password: techPassword, role: "technician", name: "Technician User" });
    }
  }
  for (const user of usersToSeed) {
    try {
      await createCredentialsUser(user.email, user.password, user.role, user.name);
      console.log(`Created ${user.role} user: ${user.email}`);
    } catch (error) {
      console.error(`Failed to create ${user.role} user:`, error);
    }
  }
  if (usersToSeed.length > 0) {
    console.log(`Seeded ${usersToSeed.length} credentials users`);
  }
}
var import_bcryptjs, import_crypto2, SALT_ROUNDS;
var init_credentials_auth = __esm({
  "server/lib/credentials-auth.ts"() {
    "use strict";
    import_bcryptjs = __toESM(require("bcryptjs"), 1);
    import_crypto2 = __toESM(require("crypto"), 1);
    init_storage();
    SALT_ROUNDS = 10;
  }
});

// server-vercel/entry.ts
var entry_exports = {};
__export(entry_exports, {
  default: () => handler
});
module.exports = __toCommonJS(entry_exports);
var import_express2 = __toESM(require("express"), 1);

// server/routes.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
init_storage();

// server/replit_integrations/auth/replitAuth.ts
var client = __toESM(require("openid-client"), 1);
var import_passport = require("openid-client/passport");
var import_passport2 = __toESM(require("passport"), 1);
var import_express_session = __toESM(require("express-session"), 1);
var import_memoizee = __toESM(require("memoizee"), 1);
var import_connect_pg_simple = __toESM(require("connect-pg-simple"), 1);

// server/replit_integrations/auth/storage.ts
init_auth();
init_db();
var import_drizzle_orm4 = require("drizzle-orm");
var AuthStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm4.eq)(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
};
var authStorage = new AuthStorage();

// server/replit_integrations/auth/replitAuth.ts
var getOidcConfig = (0, import_memoizee.default)(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = (0, import_connect_pg_simple.default)(import_express_session.default);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return (0, import_express_session.default)({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"]
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(import_passport2.default.initialize());
  app2.use(import_passport2.default.session());
  import_passport2.default.serializeUser((user, cb) => cb(null, user));
  import_passport2.default.deserializeUser((user, cb) => cb(null, user));
  if (!process.env.REPL_ID) {
    console.log("Skipping Replit Auth setup (REPL_ID not provided)");
    return;
  }
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  const registeredStrategies = /* @__PURE__ */ new Set();
  const ensureStrategy = (domain) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new import_passport.Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`
        },
        verify
      );
      import_passport2.default.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };
  app2.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    import_passport2.default.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app2.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    import_passport2.default.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, next);
  });
  app2.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
        }).href
      );
    });
  });
}
var isAuthenticated = async (req, res, next) => {
  const user = req.user;
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (user.authType === "credentials") {
    return next();
  }
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now <= user.expires_at) {
    return next();
  }
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// server/replit_integrations/auth/routes.ts
init_storage();
function registerAuthRoutes(app2) {
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      if (req.user?.authType === "credentials") {
        const user2 = await storage.getUserById(userId);
        if (!user2) {
          return res.status(404).json({ message: "User not found" });
        }
        return res.json({
          id: user2.id,
          email: user2.email,
          firstName: user2.firstName,
          lastName: user2.lastName,
          role: user2.role || "technician",
          profileImageUrl: user2.profileImageUrl,
          authType: "credentials"
        });
      }
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const userRole = await storage.getUserRole(userId);
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRole?.role || "technician",
        profileImageUrl: user.profileImageUrl,
        authType: "replit"
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

// server/routes.ts
init_plate_utils();

// server/lib/roles.ts
init_storage();
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      let role = "technician";
      if (req.user?.authType === "credentials") {
        role = req.user.role || "technician";
      } else {
        const userRole = await storage.getUserRole(userId);
        role = userRole?.role || "technician";
      }
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ message: "Authorization error" });
    }
  };
}
async function ensureUserRole(userId) {
  const existing = await storage.getUserRole(userId);
  if (!existing) {
    await storage.upsertUserRole({ userId, role: "technician" });
  }
}

// server/lib/photo-storage.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = require("crypto");
var UPLOAD_DIR = import_path.default.join(process.cwd(), "uploads");
if (!import_fs.default.existsSync(UPLOAD_DIR)) {
  import_fs.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
async function savePhoto(base64Data) {
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Image, "base64");
  const filename = `${(0, import_crypto.randomUUID)()}.jpg`;
  const filepath = import_path.default.join(UPLOAD_DIR, filename);
  await import_fs.default.promises.writeFile(filepath, buffer);
  return {
    url: `/uploads/${filename}`,
    filename
  };
}

// server/routes.ts
init_credentials_auth();
var import_zod = require("zod");
init_schema();

// server/lib/booking-db.ts
var import_pg2 = __toESM(require("pg"), 1);
var BOOKING_DB_URL = process.env.BOOKING_DATABASE_URL;
var bookingPool = null;
function getBookingPool() {
  if (!BOOKING_DB_URL) {
    console.log("BOOKING_DATABASE_URL not set - CRM integration disabled");
    return null;
  }
  if (!bookingPool) {
    bookingPool = new import_pg2.default.Pool({
      connectionString: BOOKING_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 5
    });
  }
  return bookingPool;
}
async function getUpcomingBookings(limit = 20) {
  const pool2 = getBookingPool();
  if (!pool2) return [];
  try {
    const result = await pool2.query(`
      SELECT
        b.id,
        b.status,
        b."bookingDate",
        b."timeSlot",
        b.notes,
        b."totalAmount",
        v."licensePlate",
        v.make as "vehicleMake",
        v.model as "vehicleModel",
        v.color as "vehicleColor",
        s.name as "serviceName",
        s.description as "serviceDescription",
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone"
      FROM "Booking" b
      JOIN "Vehicle" v ON b."vehicleId" = v.id
      JOIN "Service" s ON b."serviceId" = s.id
      JOIN "User" u ON b."userId" = u.id
      WHERE b.status IN ('CONFIRMED', 'IN_PROGRESS')
        AND b."bookingDate" >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY b."bookingDate" ASC, b."timeSlot" ASC
      LIMIT $1
    `, [limit]);
    return result.rows.map((row) => ({
      id: row.id,
      status: row.status,
      bookingDate: new Date(row.bookingDate),
      timeSlot: row.timeSlot,
      licensePlate: row.licensePlate,
      vehicleMake: row.vehicleMake,
      vehicleModel: row.vehicleModel,
      vehicleColor: row.vehicleColor,
      serviceName: row.serviceName,
      serviceDescription: row.serviceDescription,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      totalAmount: row.totalAmount,
      notes: row.notes
    }));
  } catch (error) {
    console.error("Error fetching bookings from CRM:", error);
    return [];
  }
}
async function getTodayBookings() {
  const pool2 = getBookingPool();
  if (!pool2) return [];
  try {
    const result = await pool2.query(`
      SELECT
        b.id,
        b.status,
        b."bookingDate",
        b."timeSlot",
        b.notes,
        b."totalAmount",
        v."licensePlate",
        v.make as "vehicleMake",
        v.model as "vehicleModel",
        v.color as "vehicleColor",
        s.name as "serviceName",
        s.description as "serviceDescription",
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone"
      FROM "Booking" b
      JOIN "Vehicle" v ON b."vehicleId" = v.id
      JOIN "Service" s ON b."serviceId" = s.id
      JOIN "User" u ON b."userId" = u.id
      WHERE b.status IN ('CONFIRMED', 'IN_PROGRESS', 'READY_FOR_PICKUP')
        AND DATE(b."bookingDate") = CURRENT_DATE
      ORDER BY b."timeSlot" ASC
    `);
    return result.rows.map((row) => ({
      id: row.id,
      status: row.status,
      bookingDate: new Date(row.bookingDate),
      timeSlot: row.timeSlot,
      licensePlate: row.licensePlate,
      vehicleMake: row.vehicleMake,
      vehicleModel: row.vehicleModel,
      vehicleColor: row.vehicleColor,
      serviceName: row.serviceName,
      serviceDescription: row.serviceDescription,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      totalAmount: row.totalAmount,
      notes: row.notes
    }));
  } catch (error) {
    console.error("Error fetching today's bookings from CRM:", error);
    return [];
  }
}
async function findBookingByPlate(licensePlate) {
  const pool2 = getBookingPool();
  if (!pool2) return null;
  try {
    const normalizedPlate = licensePlate.replace(/[\s-]/g, "").toUpperCase();
    const result = await pool2.query(`
      SELECT
        b.id,
        b.status,
        b."bookingDate",
        b."timeSlot",
        b.notes,
        b."totalAmount",
        v."licensePlate",
        v.make as "vehicleMake",
        v.model as "vehicleModel",
        v.color as "vehicleColor",
        s.name as "serviceName",
        s.description as "serviceDescription",
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone"
      FROM "Booking" b
      JOIN "Vehicle" v ON b."vehicleId" = v.id
      JOIN "Service" s ON b."serviceId" = s.id
      JOIN "User" u ON b."userId" = u.id
      WHERE b.status IN ('CONFIRMED', 'IN_PROGRESS')
        AND UPPER(REPLACE(REPLACE(v."licensePlate", ' ', ''), '-', '')) = $1
        AND b."bookingDate" >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY b."bookingDate" ASC
      LIMIT 1
    `, [normalizedPlate]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      status: row.status,
      bookingDate: new Date(row.bookingDate),
      timeSlot: row.timeSlot,
      licensePlate: row.licensePlate,
      vehicleMake: row.vehicleMake,
      vehicleModel: row.vehicleModel,
      vehicleColor: row.vehicleColor,
      serviceName: row.serviceName,
      serviceDescription: row.serviceDescription,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      totalAmount: row.totalAmount,
      notes: row.notes
    };
  } catch (error) {
    console.error("Error searching booking by plate:", error);
    return null;
  }
}
async function updateBookingStatus(bookingId, status) {
  const pool2 = getBookingPool();
  if (!pool2) return false;
  try {
    const completedAt = status === "COMPLETED" ? /* @__PURE__ */ new Date() : null;
    await pool2.query(`
      UPDATE "Booking"
      SET status = $1,
          "completedAt" = $2,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [status, completedAt, bookingId]);
    return true;
  } catch (error) {
    console.error("Error updating booking status:", error);
    return false;
  }
}

// server/routes.ts
var sseClients = /* @__PURE__ */ new Set();
var customerSseClients = /* @__PURE__ */ new Set();
function broadcastEvent(data) {
  const message = `data: ${JSON.stringify(data)}

`;
  sseClients.forEach((client2) => {
    client2.write(message);
  });
  if (data.job?.id || data.washJobId) {
    const jobId = data.job?.id || data.washJobId;
    customerSseClients.forEach((client2) => {
      if (client2.washJobId === jobId) {
        client2.res.write(message);
      }
    });
  }
}
var createWashJobSchema = import_zod.z.object({
  plateDisplay: import_zod.z.string().min(1, "Plate is required"),
  countryHint: import_zod.z.enum(COUNTRY_HINTS).optional().default("OTHER"),
  photo: import_zod.z.string().optional()
});
var updateStatusSchema = import_zod.z.object({
  status: import_zod.z.enum(WASH_STATUS_ORDER)
});
var parkingSchema = import_zod.z.object({
  plateDisplay: import_zod.z.string().min(1, "Plate is required"),
  countryHint: import_zod.z.enum(COUNTRY_HINTS).optional().default("OTHER"),
  photo: import_zod.z.string().optional()
});
async function registerRoutes(httpServer2, app2) {
  await setupAuth(app2);
  registerAuthRoutes(app2);
  await seedUsers();
  app2.use("/uploads", import_express.default.static(import_path2.default.join(process.cwd(), "uploads")));
  const credentialsRegisterSchema = import_zod.z.object({
    email: import_zod.z.string().email(),
    password: import_zod.z.string().min(6),
    firstName: import_zod.z.string().min(1),
    lastName: import_zod.z.string().optional()
  });
  app2.post("/api/auth/credentials/register", async (req, res) => {
    try {
      const result = credentialsRegisterSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Please fill in all required fields correctly" });
      }
      const { email, password, firstName, lastName } = result.data;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      const { createCredentialsUser: createCredentialsUser2 } = await Promise.resolve().then(() => (init_credentials_auth(), credentials_auth_exports));
      const name = lastName ? `${firstName} ${lastName}` : firstName;
      await createCredentialsUser2(email, password, "technician", name);
      res.json({ success: true, message: "Account created successfully" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  const credentialsLoginSchema = import_zod.z.object({
    email: import_zod.z.string().email(),
    password: import_zod.z.string().min(1)
  });
  app2.post("/api/auth/credentials/login", async (req, res) => {
    try {
      const result = credentialsLoginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid email or password format" });
      }
      const { email, password } = result.data;
      const authResult = await authenticateWithCredentials(email, password);
      if (!authResult.success || !authResult.user) {
        return res.status(401).json({ message: authResult.error || "Authentication failed" });
      }
      const user = authResult.user;
      req.login({
        claims: { sub: user.id },
        authType: "credentials",
        role: user.role,
        email: user.email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
      }, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            role: user.role
          }
        });
      });
    } catch (error) {
      console.error("Credentials login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err2) => {
        if (err2) {
          console.error("Session destroy error:", err2);
        }
        res.json({ message: "Logged out successfully" });
      });
    });
  });
  app2.use("/api", async (req, res, next) => {
    if (req.user?.authType === "credentials") {
      return next();
    }
    if (req.user?.claims?.sub) {
      await ensureUserRole(req.user.claims.sub);
    }
    next();
  });
  app2.get("/api/user/role", isAuthenticated, async (req, res) => {
    try {
      if (req.user?.authType === "credentials") {
        return res.json({ role: req.user.role || "technician" });
      }
      const userId = req.user?.claims?.sub;
      const userRole = await storage.getUserRole(userId);
      res.json({ role: userRole?.role || "technician" });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ message: "Failed to fetch role" });
    }
  });
  app2.get("/api/user/me", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      let role = "technician";
      let userDetails = null;
      if (req.user?.authType === "credentials") {
        role = req.user.role || "technician";
        userDetails = await storage.getUserById(userId);
      } else {
        const userRole = await storage.getUserRole(userId);
        role = userRole?.role || "technician";
      }
      res.json({
        userId,
        role,
        authType: req.user?.authType || "replit",
        email: req.user?.email,
        name: req.user?.name,
        userDetails
      });
    } catch (error) {
      console.error("Error fetching user info:", error);
      res.status(500).json({ message: "Failed to fetch user info" });
    }
  });
  app2.get("/api/stream", isAuthenticated, (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    sseClients.add(res);
    req.on("close", () => {
      sseClients.delete(res);
    });
    res.write('data: {"type":"connected"}\n\n');
  });
  app2.post("/api/wash-jobs", isAuthenticated, async (req, res) => {
    try {
      const result = createWashJobSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }
      const { plateDisplay, countryHint, photo } = result.data;
      const userId = req.user?.claims?.sub;
      let photoUrl;
      if (photo) {
        try {
          const saved = await savePhoto(photo);
          photoUrl = saved.url;
        } catch (err) {
          console.error("Photo save error:", err);
        }
      }
      const job = await storage.createWashJob({
        plateDisplay: displayPlate(plateDisplay),
        plateNormalized: normalizePlate(plateDisplay),
        countryHint,
        technicianId: userId,
        status: "received",
        startAt: /* @__PURE__ */ new Date()
      });
      const token = generateJobToken();
      await storage.createCustomerJobAccess({
        washJobId: job.id,
        token,
        customerName: null,
        customerEmail: null,
        serviceCode: null
      });
      if (photoUrl) {
        await storage.addWashPhoto({
          washJobId: job.id,
          url: photoUrl,
          statusAtTime: "received"
        });
      }
      await storage.logEvent({
        type: "wash_created",
        plateDisplay: job.plateDisplay,
        plateNormalized: job.plateNormalized,
        countryHint: job.countryHint,
        washJobId: job.id,
        userId,
        payloadJson: { hasPhoto: !!photoUrl }
      });
      broadcastEvent({ type: "wash_created", job });
      const baseUrl = process.env.APP_URL || `https://${req.hostname}`;
      res.json({
        ...job,
        customerUrl: `${baseUrl}/customer/job/${token}`,
        customerToken: token
      });
    } catch (error) {
      console.error("Error creating wash job:", error);
      res.status(500).json({ message: "Failed to create wash job" });
    }
  });
  app2.get("/api/wash-jobs", isAuthenticated, async (req, res) => {
    try {
      const { status, my } = req.query;
      const userId = req.user?.claims?.sub;
      const filters = {};
      if (status) filters.status = status;
      if (my === "true" || my === "") filters.technicianId = userId;
      const jobs = await storage.getWashJobs(filters);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching wash jobs:", error);
      res.status(500).json({ message: "Failed to fetch wash jobs" });
    }
  });
  app2.get("/api/wash-jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getWashJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching wash job:", error);
      res.status(500).json({ message: "Failed to fetch wash job" });
    }
  });
  app2.patch("/api/wash-jobs/:id/status", isAuthenticated, async (req, res) => {
    try {
      const result = updateStatusSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }
      const { status } = result.data;
      const userId = req.user?.claims?.sub;
      let job;
      if (status === "complete") {
        job = await storage.completeWashJob(req.params.id);
      } else {
        job = await storage.updateWashJobStatus(req.params.id, status);
      }
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      await storage.logEvent({
        type: "wash_status_update",
        plateDisplay: job.plateDisplay,
        plateNormalized: job.plateNormalized,
        countryHint: job.countryHint,
        washJobId: job.id,
        userId,
        payloadJson: { status }
      });
      broadcastEvent({ type: "wash_status_update", job });
      res.json(job);
    } catch (error) {
      console.error("Error updating wash job status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });
  app2.post("/api/wash-jobs/:id/photos", isAuthenticated, async (req, res) => {
    try {
      const { photo } = req.body;
      if (!photo) {
        return res.status(400).json({ message: "Photo is required" });
      }
      const job = await storage.getWashJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      const saved = await savePhoto(photo);
      const washPhoto = await storage.addWashPhoto({
        washJobId: job.id,
        url: saved.url,
        statusAtTime: job.status
      });
      await storage.logEvent({
        type: "wash_photo",
        plateDisplay: job.plateDisplay,
        plateNormalized: job.plateNormalized,
        countryHint: job.countryHint,
        washJobId: job.id,
        userId: req.user?.claims?.sub,
        payloadJson: { photoUrl: saved.url }
      });
      res.json(washPhoto);
    } catch (error) {
      console.error("Error adding wash photo:", error);
      res.status(500).json({ message: "Failed to add photo" });
    }
  });
  app2.post("/api/parking/entry", isAuthenticated, async (req, res) => {
    try {
      const result = parkingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }
      const { plateDisplay, countryHint, photo } = result.data;
      const userId = req.user?.claims?.sub;
      const normalized = normalizePlate(plateDisplay);
      const existing = await storage.findOpenParkingSession(normalized);
      if (existing) {
        return res.status(409).json({
          message: "Vehicle already has an open parking session",
          existingSession: existing
        });
      }
      let entryPhotoUrl = null;
      if (photo) {
        try {
          const saved = await savePhoto(photo);
          entryPhotoUrl = saved.url;
        } catch (err) {
          console.error("Photo save error:", err);
        }
      }
      const session2 = await storage.createParkingEntry({
        plateDisplay: displayPlate(plateDisplay),
        plateNormalized: normalized,
        countryHint,
        technicianId: userId,
        entryAt: /* @__PURE__ */ new Date(),
        entryPhotoUrl
      });
      await storage.logEvent({
        type: "parking_entry",
        plateDisplay: session2.plateDisplay,
        plateNormalized: session2.plateNormalized,
        countryHint: session2.countryHint,
        parkingSessionId: session2.id,
        userId,
        payloadJson: { hasPhoto: !!entryPhotoUrl }
      });
      broadcastEvent({ type: "parking_entry", session: session2 });
      res.json(session2);
    } catch (error) {
      console.error("Error creating parking entry:", error);
      res.status(500).json({ message: "Failed to create parking entry" });
    }
  });
  app2.post("/api/parking/exit", isAuthenticated, async (req, res) => {
    try {
      const result = parkingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }
      const { plateDisplay, photo } = result.data;
      const userId = req.user?.claims?.sub;
      const normalized = normalizePlate(plateDisplay);
      const session2 = await storage.findOpenParkingSession(normalized);
      if (!session2) {
        return res.status(404).json({
          message: "No open parking session found for this plate"
        });
      }
      let exitPhotoUrl;
      if (photo) {
        try {
          const saved = await savePhoto(photo);
          exitPhotoUrl = saved.url;
        } catch (err) {
          console.error("Photo save error:", err);
        }
      }
      const closedSession = await storage.closeParkingSession(session2.id, exitPhotoUrl);
      await storage.logEvent({
        type: "parking_exit",
        plateDisplay: session2.plateDisplay,
        plateNormalized: session2.plateNormalized,
        countryHint: session2.countryHint,
        parkingSessionId: session2.id,
        userId,
        payloadJson: { hasPhoto: !!exitPhotoUrl }
      });
      broadcastEvent({ type: "parking_exit", session: closedSession });
      res.json(closedSession);
    } catch (error) {
      console.error("Error processing parking exit:", error);
      res.status(500).json({ message: "Failed to process parking exit" });
    }
  });
  app2.get("/api/parking/sessions", isAuthenticated, async (req, res) => {
    try {
      const { open } = req.query;
      const filters = {};
      if (open === "true") filters.open = true;
      if (open === "false") filters.open = false;
      const sessions2 = await storage.getParkingSessions(filters);
      res.json(sessions2);
    } catch (error) {
      console.error("Error fetching parking sessions:", error);
      res.status(500).json({ message: "Failed to fetch parking sessions" });
    }
  });
  app2.get("/api/events", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { plate, type, limit } = req.query;
      const events = await storage.getEvents({
        plate,
        type,
        limit: limit ? parseInt(limit) : 100
      });
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });
  app2.get("/api/analytics/summary", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const summary = await storage.getAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
  app2.get("/api/queue/stats", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const activeJobs = await storage.getWashJobs({ status: void 0 });
      const openParking = await storage.getParkingSessions({ open: true });
      const analytics = await storage.getAnalyticsSummary();
      res.json({
        activeWashes: activeJobs.filter((j) => j.status !== "complete").length,
        parkedVehicles: openParking.length,
        todayWashes: analytics.todayWashes,
        activeJobs: activeJobs.filter((j) => j.status !== "complete")
      });
    } catch (error) {
      console.error("Error fetching queue stats:", error);
      res.status(500).json({ message: "Failed to fetch queue stats" });
    }
  });
  app2.get("/api/crm/bookings", isAuthenticated, async (req, res) => {
    try {
      const bookings = await getUpcomingBookings(30);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching CRM bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
  app2.get("/api/crm/bookings/today", isAuthenticated, async (req, res) => {
    try {
      const bookings = await getTodayBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching today's bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
  app2.get("/api/crm/bookings/search", isAuthenticated, async (req, res) => {
    try {
      const { plate } = req.query;
      if (!plate || typeof plate !== "string") {
        return res.status(400).json({ message: "Plate parameter required" });
      }
      const booking = await findBookingByPlate(plate);
      if (!booking) {
        return res.status(404).json({ message: "No booking found for this plate" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error searching CRM booking:", error);
      res.status(500).json({ message: "Failed to search booking" });
    }
  });
  app2.patch("/api/crm/bookings/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      const status = req.body.status;
      if (!["IN_PROGRESS", "COMPLETED", "READY_FOR_PICKUP"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const success = await updateBookingStatus(id, status);
      if (!success) {
        return res.status(500).json({ message: "Failed to update booking status" });
      }
      res.json({ message: "Booking status updated" });
    } catch (error) {
      console.error("Error updating CRM booking status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });
  app2.get("/api/admin/users", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const users3 = await storage.getUsers();
      res.json(users3);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.post("/api/admin/users", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const schema = import_zod.z.object({
        email: import_zod.z.string().email(),
        password: import_zod.z.string().min(6),
        firstName: import_zod.z.string().min(1),
        lastName: import_zod.z.string().optional(),
        role: import_zod.z.enum(["technician", "manager", "admin"])
      });
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid user data" });
      }
      const { email, password, firstName, lastName, role } = result.data;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const { createCredentialsUser: createCredentialsUser2 } = await Promise.resolve().then(() => (init_credentials_auth(), credentials_auth_exports));
      const name = lastName ? `${firstName} ${lastName}` : firstName;
      const user = await createCredentialsUser2(email, password, role, name);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  app2.patch("/api/admin/users/:userId/role", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const userId = req.params.userId;
      const { role } = req.body;
      if (!["technician", "manager", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const user = await storage.updateUser(userId, { role });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });
  app2.patch("/api/admin/users/:userId/active", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const userId = req.params.userId;
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "Invalid status" });
      }
      const user = await storage.updateUser(userId, { isActive });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });
  app2.get("/api/customer/job/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const access = await storage.getCustomerJobAccessByToken(token);
      if (!access) {
        return res.status(404).json({ message: "Job not found" });
      }
      await storage.updateCustomerJobAccessViewedAt(token);
      const job = await storage.getWashJob(access.washJobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      const photos = await storage.getWashPhotos(access.washJobId);
      const checklist = await storage.getServiceChecklistItems(access.washJobId);
      const confirmation = await storage.getCustomerConfirmation(access.washJobId);
      res.json({
        job,
        photos,
        checklist,
        confirmation,
        customerName: access.customerName,
        serviceCode: access.serviceCode
      });
    } catch (error) {
      console.error("Error fetching customer job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });
  app2.get("/api/customer/stream/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const access = await storage.getCustomerJobAccessByToken(token);
      if (!access) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      const client2 = { res, washJobId: access.washJobId };
      customerSseClients.add(client2);
      req.on("close", () => {
        customerSseClients.delete(client2);
      });
      res.write('data: {"type":"connected"}\n\n');
    } catch (error) {
      res.status(500).json({ message: "Stream error" });
    }
  });
  app2.post("/api/customer/confirm/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { checklistConfirmations, rating, notes, issueReported } = req.body;
      const access = await storage.getCustomerJobAccessByToken(token);
      if (!access) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (checklistConfirmations && Array.isArray(checklistConfirmations)) {
        for (const item of checklistConfirmations) {
          if (item.id && typeof item.confirmed === "boolean") {
            await storage.updateChecklistItemConfirmedForJob(
              item.id,
              access.washJobId,
              item.confirmed
            );
          }
        }
      }
      const confirmation = await storage.createCustomerConfirmation({
        washJobId: access.washJobId,
        accessToken: token,
        rating: rating || null,
        notes: notes || null,
        issueReported: issueReported || null
      });
      await storage.logEvent({
        type: "customer_confirmation",
        washJobId: access.washJobId,
        payloadJson: { rating, hasNotes: !!notes, hasIssue: !!issueReported }
      });
      res.json({ message: "Confirmation recorded", confirmation });
    } catch (error) {
      console.error("Error saving customer confirmation:", error);
      res.status(500).json({ message: "Failed to save confirmation" });
    }
  });
  const integrationJobSchema = import_zod.z.object({
    plateDisplay: import_zod.z.string().min(1),
    customerName: import_zod.z.string().optional(),
    customerEmail: import_zod.z.string().email().optional(),
    serviceCode: import_zod.z.string().optional(),
    serviceChecklist: import_zod.z.array(import_zod.z.string()).optional()
  });
  app2.post("/api/integrations/create-job", async (req, res) => {
    try {
      const secret = req.headers["x-integration-secret"] || req.headers["authorization"];
      if (secret !== process.env.INTEGRATION_SECRET) {
        return res.status(401).json({ message: "Invalid integration secret" });
      }
      const result = integrationJobSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }
      const { plateDisplay, customerName, customerEmail, serviceCode, serviceChecklist } = result.data;
      const job = await storage.createWashJob({
        plateDisplay: displayPlate(plateDisplay),
        plateNormalized: normalizePlate(plateDisplay),
        countryHint: "OTHER",
        technicianId: "integration",
        status: "received",
        startAt: /* @__PURE__ */ new Date()
      });
      const token = generateJobToken();
      const access = await storage.createCustomerJobAccess({
        washJobId: job.id,
        token,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        serviceCode: serviceCode || null
      });
      const checklistItems = serviceChecklist || WASH_STATUS_ORDER.filter((s) => s !== "received");
      await storage.createServiceChecklistItems(
        checklistItems.map((label, index2) => ({
          washJobId: job.id,
          label,
          orderIndex: index2,
          expected: true,
          confirmed: false
        }))
      );
      await storage.logEvent({
        type: "integration_job_created",
        plateDisplay: job.plateDisplay,
        plateNormalized: job.plateNormalized,
        washJobId: job.id,
        payloadJson: { serviceCode, hasCustomer: !!customerName }
      });
      broadcastEvent({ type: "wash_created", job });
      const baseUrl = process.env.APP_URL || `https://${req.hostname}`;
      res.json({
        job,
        customerUrl: `${baseUrl}/customer/job/${token}`,
        token
      });
    } catch (error) {
      console.error("Error creating integration job:", error);
      res.status(500).json({ message: "Failed to create job" });
    }
  });
  app2.post("/api/ocr/plate-candidates", isAuthenticated, async (req, res) => {
    res.json({
      candidates: [],
      confidence: [],
      message: "OCR not available in MVP. Please enter plate manually."
    });
  });
  return httpServer2;
}

// server-vercel/entry.ts
var import_http = require("http");
var import_config = require("dotenv/config");
var app = (0, import_express2.default)();
var httpServer = (0, import_http.createServer)(app);
app.use(
  import_express2.default.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express2.default.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      console.log(`${req.method} ${path3} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});
var initialized = false;
var initPromise = null;
async function initialize() {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    console.log("Initializing Vercel serverless function...");
    await registerRoutes(httpServer, app);
    app.use((err, _req, res, next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Internal Server Error:", err);
      if (res.headersSent) {
        return next(err);
      }
      return res.status(status).json({ message });
    });
    initialized = true;
    console.log("Vercel serverless function initialized");
  })();
  return initPromise;
}
async function handler(req, res) {
  await initialize();
  return new Promise((resolve, reject) => {
    app(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
