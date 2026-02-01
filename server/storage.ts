import { eq, and, isNull, desc, gte, sql, lte, between } from "drizzle-orm";
import { db } from "./db";
import { 
  washJobs, washPhotos, parkingSessions, eventLogs, userRoles, users,
  customerJobAccess, serviceChecklistItems, customerConfirmations, photoRules,
  type WashJob, type InsertWashJob,
  type WashPhoto, type InsertWashPhoto,
  type ParkingSession, type InsertParkingSession,
  type EventLog, type InsertEventLog,
  type UserRole, type InsertUserRole,
  type User, type InsertUser,
  type CustomerJobAccess, type InsertCustomerJobAccess,
  type ServiceChecklistItem, type InsertServiceChecklistItem,
  type CustomerConfirmation, type InsertCustomerConfirmation,
  type PhotoRule, type InsertPhotoRule,
  WASH_STATUS_ORDER
} from "@shared/schema";
import { normalizePlate } from "./lib/plate-utils";

export interface IStorage {
  // User roles
  getUserRole(userId: string): Promise<UserRole | undefined>;
  upsertUserRole(role: InsertUserRole): Promise<UserRole>;

  // Users (credentials auth)
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;

  // Customer job access
  createCustomerJobAccess(access: InsertCustomerJobAccess): Promise<CustomerJobAccess>;
  getCustomerJobAccessByToken(token: string): Promise<CustomerJobAccess | undefined>;
  getCustomerJobAccessByJobId(washJobId: string): Promise<CustomerJobAccess | undefined>;
  updateCustomerJobAccessViewedAt(token: string): Promise<CustomerJobAccess | undefined>;

  // Service checklist
  createServiceChecklistItems(items: InsertServiceChecklistItem[]): Promise<ServiceChecklistItem[]>;
  getServiceChecklistItems(washJobId: string): Promise<ServiceChecklistItem[]>;
  updateChecklistItemConfirmed(id: string, confirmed: boolean): Promise<ServiceChecklistItem | undefined>;
  updateChecklistItemConfirmedForJob(id: string, washJobId: string, confirmed: boolean): Promise<ServiceChecklistItem | undefined>;

  // Customer confirmations
  createCustomerConfirmation(confirmation: InsertCustomerConfirmation): Promise<CustomerConfirmation>;
  getCustomerConfirmation(washJobId: string): Promise<CustomerConfirmation | undefined>;

  // Photo rules
  getPhotoRules(): Promise<PhotoRule[]>;
  upsertPhotoRule(rule: InsertPhotoRule): Promise<PhotoRule>;

  // Wash Jobs
  createWashJob(job: InsertWashJob): Promise<WashJob>;
  getWashJob(id: string): Promise<WashJob | undefined>;
  getWashJobs(filters?: { status?: string; technicianId?: string }): Promise<WashJob[]>;
  updateWashJobStatus(id: string, status: string): Promise<WashJob | undefined>;
  completeWashJob(id: string): Promise<WashJob | undefined>;

  // Wash Photos
  addWashPhoto(photo: InsertWashPhoto): Promise<WashPhoto>;
  getWashPhotos(washJobId: string): Promise<WashPhoto[]>;

  // Parking Sessions
  createParkingEntry(session: InsertParkingSession): Promise<ParkingSession>;
  findOpenParkingSession(plateNormalized: string): Promise<ParkingSession | undefined>;
  closeParkingSession(id: string, exitPhotoUrl?: string): Promise<ParkingSession | undefined>;
  getParkingSessions(filters?: { open?: boolean }): Promise<ParkingSession[]>;

  // Event Logs
  logEvent(event: InsertEventLog): Promise<EventLog>;
  getEvents(filters?: { plate?: string; type?: string; limit?: number }): Promise<EventLog[]>;

  // Analytics
  getAnalyticsSummary(): Promise<{
    todayWashes: number;
    weekWashes: number;
    monthWashes: number;
    avgCycleTimeMinutes: number;
    avgTimePerStage: Record<string, number>;
    technicianStats: { userId: string; name: string; count: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User Roles
  async getUserRole(userId: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    return role;
  }

  async upsertUserRole(role: InsertUserRole): Promise<UserRole> {
    // Check if role exists first to avoid ON CONFLICT issues
    const existing = await this.getUserRole(role.userId);
    
    if (existing) {
      // Update existing role
      const [result] = await db
        .update(userRoles)
        .set({ role: role.role })
        .where(eq(userRoles.userId, role.userId))
        .returning();
      return result;
    } else {
      // Insert new role
      const [result] = await db
        .insert(userRoles)
        .values(role)
        .returning();
      return result;
    }
  }

  // Users (credentials auth)
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(user).returning();
    return result;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [result] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Customer job access
  async createCustomerJobAccess(access: InsertCustomerJobAccess): Promise<CustomerJobAccess> {
    const [result] = await db.insert(customerJobAccess).values(access).returning();
    return result;
  }

  async getCustomerJobAccessByToken(token: string): Promise<CustomerJobAccess | undefined> {
    const [result] = await db.select().from(customerJobAccess).where(eq(customerJobAccess.token, token));
    return result;
  }

  async getCustomerJobAccessByJobId(washJobId: string): Promise<CustomerJobAccess | undefined> {
    const [result] = await db.select().from(customerJobAccess).where(eq(customerJobAccess.washJobId, washJobId));
    return result;
  }

  async updateCustomerJobAccessViewedAt(token: string): Promise<CustomerJobAccess | undefined> {
    const [result] = await db
      .update(customerJobAccess)
      .set({ lastViewedAt: new Date() })
      .where(eq(customerJobAccess.token, token))
      .returning();
    return result;
  }

  // Service checklist
  async createServiceChecklistItems(items: InsertServiceChecklistItem[]): Promise<ServiceChecklistItem[]> {
    if (items.length === 0) return [];
    return db.insert(serviceChecklistItems).values(items).returning();
  }

  async getServiceChecklistItems(washJobId: string): Promise<ServiceChecklistItem[]> {
    return db
      .select()
      .from(serviceChecklistItems)
      .where(eq(serviceChecklistItems.washJobId, washJobId))
      .orderBy(serviceChecklistItems.orderIndex);
  }

  async updateChecklistItemConfirmed(id: string, confirmed: boolean): Promise<ServiceChecklistItem | undefined> {
    const [result] = await db
      .update(serviceChecklistItems)
      .set({ confirmed, confirmedAt: confirmed ? new Date() : null })
      .where(eq(serviceChecklistItems.id, id))
      .returning();
    return result;
  }

  async updateChecklistItemConfirmedForJob(id: string, washJobId: string, confirmed: boolean): Promise<ServiceChecklistItem | undefined> {
    const [result] = await db
      .update(serviceChecklistItems)
      .set({ confirmed, confirmedAt: confirmed ? new Date() : null })
      .where(and(
        eq(serviceChecklistItems.id, id),
        eq(serviceChecklistItems.washJobId, washJobId)
      ))
      .returning();
    return result;
  }

  // Customer confirmations
  async createCustomerConfirmation(confirmation: InsertCustomerConfirmation): Promise<CustomerConfirmation> {
    const [result] = await db.insert(customerConfirmations).values(confirmation).returning();
    return result;
  }

  async getCustomerConfirmation(washJobId: string): Promise<CustomerConfirmation | undefined> {
    const [result] = await db.select().from(customerConfirmations).where(eq(customerConfirmations.washJobId, washJobId));
    return result;
  }

  // Photo rules
  async getPhotoRules(): Promise<PhotoRule[]> {
    return db.select().from(photoRules);
  }

  async upsertPhotoRule(rule: InsertPhotoRule): Promise<PhotoRule> {
    const existing = await db.select().from(photoRules).where(eq(photoRules.step, rule.step));
    
    if (existing.length > 0) {
      const [result] = await db
        .update(photoRules)
        .set({ rule: rule.rule, updatedBy: rule.updatedBy, updatedAt: new Date() })
        .where(eq(photoRules.step, rule.step))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(photoRules).values(rule).returning();
      return result;
    }
  }

  // Wash Jobs
  async createWashJob(job: InsertWashJob): Promise<WashJob> {
    const plateNormalized = normalizePlate(job.plateDisplay);
    const stageTimestamps = { received: new Date().toISOString() };
    const [result] = await db
      .insert(washJobs)
      .values({ ...job, plateNormalized, stageTimestamps })
      .returning();
    return result;
  }

  async getWashJob(id: string): Promise<WashJob | undefined> {
    const [job] = await db.select().from(washJobs).where(eq(washJobs.id, id));
    return job;
  }

  async getWashJobs(filters?: { status?: string; technicianId?: string }): Promise<WashJob[]> {
    let query = db.select().from(washJobs);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(washJobs.status, filters.status as any));
    }
    if (filters?.technicianId) {
      conditions.push(eq(washJobs.technicianId, filters.technicianId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(washJobs.createdAt));
  }

  async updateWashJobStatus(id: string, status: string): Promise<WashJob | undefined> {
    // Get current job to update stage timestamps
    const [current] = await db.select().from(washJobs).where(eq(washJobs.id, id));
    if (!current) return undefined;
    
    const timestamps = (current.stageTimestamps || {}) as Record<string, string>;
    timestamps[status] = new Date().toISOString();
    
    const [result] = await db
      .update(washJobs)
      .set({ 
        status: status as any, 
        stageTimestamps: timestamps,
        updatedAt: new Date() 
      })
      .where(eq(washJobs.id, id))
      .returning();
    return result;
  }

  async completeWashJob(id: string): Promise<WashJob | undefined> {
    // Get current job to update stage timestamps
    const [current] = await db.select().from(washJobs).where(eq(washJobs.id, id));
    if (!current) return undefined;
    
    const timestamps = (current.stageTimestamps || {}) as Record<string, string>;
    timestamps["complete"] = new Date().toISOString();
    
    const [result] = await db
      .update(washJobs)
      .set({ 
        status: "complete", 
        stageTimestamps: timestamps,
        endAt: new Date(), 
        updatedAt: new Date() 
      })
      .where(eq(washJobs.id, id))
      .returning();
    return result;
  }

  // Wash Photos
  async addWashPhoto(photo: InsertWashPhoto): Promise<WashPhoto> {
    const [result] = await db.insert(washPhotos).values(photo).returning();
    return result;
  }

  async getWashPhotos(washJobId: string): Promise<WashPhoto[]> {
    return db.select().from(washPhotos).where(eq(washPhotos.washJobId, washJobId));
  }

  // Parking Sessions
  async createParkingEntry(session: InsertParkingSession): Promise<ParkingSession> {
    const plateNormalized = normalizePlate(session.plateDisplay);
    const [result] = await db
      .insert(parkingSessions)
      .values({ ...session, plateNormalized })
      .returning();
    return result;
  }

  async findOpenParkingSession(plateNormalized: string): Promise<ParkingSession | undefined> {
    const [session] = await db
      .select()
      .from(parkingSessions)
      .where(and(
        eq(parkingSessions.plateNormalized, plateNormalized),
        isNull(parkingSessions.exitAt)
      ));
    return session;
  }

  async closeParkingSession(id: string, exitPhotoUrl?: string): Promise<ParkingSession | undefined> {
    const [result] = await db
      .update(parkingSessions)
      .set({ 
        exitAt: new Date(), 
        exitPhotoUrl: exitPhotoUrl || null,
        updatedAt: new Date() 
      })
      .where(eq(parkingSessions.id, id))
      .returning();
    return result;
  }

  async getParkingSessions(filters?: { open?: boolean }): Promise<ParkingSession[]> {
    let query = db.select().from(parkingSessions);
    
    if (filters?.open === true) {
      query = query.where(isNull(parkingSessions.exitAt)) as any;
    } else if (filters?.open === false) {
      query = query.where(sql`${parkingSessions.exitAt} IS NOT NULL`) as any;
    }
    
    return query.orderBy(desc(parkingSessions.createdAt));
  }

  // Event Logs
  async logEvent(event: InsertEventLog): Promise<EventLog> {
    const [result] = await db.insert(eventLogs).values(event).returning();
    return result;
  }

  async getEvents(filters?: { plate?: string; type?: string; limit?: number }): Promise<EventLog[]> {
    let query = db.select().from(eventLogs);
    
    const conditions = [];
    if (filters?.plate) {
      const normalized = normalizePlate(filters.plate);
      conditions.push(sql`${eventLogs.plateNormalized} ILIKE ${'%' + normalized + '%'}`);
    }
    if (filters?.type) {
      conditions.push(eq(eventLogs.type, filters.type));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(eventLogs.createdAt)) as any;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    return query;
  }

  // Analytics
  async getAnalyticsSummary() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count washes
    const [todayResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(washJobs)
      .where(gte(washJobs.createdAt, todayStart));

    const [weekResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(washJobs)
      .where(gte(washJobs.createdAt, weekStart));

    const [monthResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(washJobs)
      .where(gte(washJobs.createdAt, monthStart));

    // Average cycle time for completed jobs
    const [avgResult] = await db
      .select({ 
        avgMinutes: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${washJobs.endAt} - ${washJobs.startAt})) / 60)::int, 0)` 
      })
      .from(washJobs)
      .where(eq(washJobs.status, "complete"));

    // Get completed jobs with stage timestamps for detailed KPIs
    const completedJobs = await db
      .select({ stageTimestamps: washJobs.stageTimestamps })
      .from(washJobs)
      .where(eq(washJobs.status, "complete"));

    // Calculate average time per stage
    const stageTimeKPIs: Record<string, { avgSeconds: number; count: number }> = {};
    const stages = ["received", "prewash", "foam", "rinse", "dry"];
    
    for (const job of completedJobs) {
      const timestamps = job.stageTimestamps as Record<string, string> | null;
      if (!timestamps) continue;
      
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const nextStage = stages[i + 1] || "complete";
        
        if (timestamps[stage] && timestamps[nextStage]) {
          const duration = (new Date(timestamps[nextStage]).getTime() - new Date(timestamps[stage]).getTime()) / 1000;
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
    
    // Calculate averages
    const avgTimePerStage: Record<string, number> = {};
    for (const [stage, data] of Object.entries(stageTimeKPIs)) {
      if (data.count > 0) {
        avgTimePerStage[stage] = Math.round(data.avgSeconds / data.count);
      }
    }

    // Get technician stats
    const techStats = await db
      .select({ 
        technicianId: washJobs.technicianId,
        count: sql<number>`count(*)::int`
      })
      .from(washJobs)
      .where(gte(washJobs.createdAt, monthStart))
      .groupBy(washJobs.technicianId);

    return {
      todayWashes: todayResult?.count || 0,
      weekWashes: weekResult?.count || 0,
      monthWashes: monthResult?.count || 0,
      avgCycleTimeMinutes: avgResult?.avgMinutes || 0,
      avgTimePerStage,
      technicianStats: techStats.map(t => ({ 
        userId: t.technicianId, 
        name: t.technicianId === "integration" ? "CRM Integration" : `Technician ${t.technicianId.slice(-4)}`,
        count: t.count 
      }))
    };
  }
}

export const storage = new DatabaseStorage();
