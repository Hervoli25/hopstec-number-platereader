import { eq, and, isNull, desc, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  washJobs, washPhotos, parkingSessions, eventLogs, userRoles,
  type WashJob, type InsertWashJob,
  type WashPhoto, type InsertWashPhoto,
  type ParkingSession, type InsertParkingSession,
  type EventLog, type InsertEventLog,
  type UserRole, type InsertUserRole
} from "@shared/schema";
import { normalizePlate } from "./lib/plate-utils";

export interface IStorage {
  // User roles
  getUserRole(userId: string): Promise<UserRole | undefined>;
  upsertUserRole(role: InsertUserRole): Promise<UserRole>;

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

  // Wash Jobs
  async createWashJob(job: InsertWashJob): Promise<WashJob> {
    const plateNormalized = normalizePlate(job.plateDisplay);
    const [result] = await db
      .insert(washJobs)
      .values({ ...job, plateNormalized })
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
    const [result] = await db
      .update(washJobs)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(washJobs.id, id))
      .returning();
    return result;
  }

  async completeWashJob(id: string): Promise<WashJob | undefined> {
    const [result] = await db
      .update(washJobs)
      .set({ status: "complete", endAt: new Date(), updatedAt: new Date() })
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

    return {
      todayWashes: todayResult?.count || 0,
      weekWashes: weekResult?.count || 0,
      monthWashes: monthResult?.count || 0,
      avgCycleTimeMinutes: avgResult?.avgMinutes || 0,
      technicianStats: [] // Would need a join with users table
    };
  }
}

export const storage = new DatabaseStorage();
