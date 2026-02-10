import { eq, and, isNull, desc, gte, sql, lte, between, or, asc } from "drizzle-orm";
import { db } from "./db";
import {
  washJobs, washPhotos, parkingSessions, eventLogs, userRoles, users,
  customerJobAccess, serviceChecklistItems, customerConfirmations, photoRules,
  parkingSettings, parkingZones, frequentParkers, parkingReservations,
  businessSettings, servicePackages, customerMemberships, parkingValidations,
  customerNotifications, notificationTemplates, technicianTimeLogs, staffAlerts,
  type WashJob, type InsertWashJob,
  type WashPhoto, type InsertWashPhoto,
  type ParkingSession, type InsertParkingSession,
  type ParkingSettings, type InsertParkingSettings,
  type ParkingZone, type InsertParkingZone,
  type FrequentParker, type InsertFrequentParker,
  type ParkingReservation, type InsertParkingReservation,
  type BusinessSettings, type InsertBusinessSettings,
  type ServicePackage, type InsertServicePackage,
  type CustomerMembership, type InsertCustomerMembership,
  type ParkingValidation, type InsertParkingValidation,
  type CustomerNotification, type InsertCustomerNotification,
  type NotificationTemplate, type InsertNotificationTemplate,
  type TechnicianTimeLog, type InsertTechnicianTimeLog,
  type StaffAlert, type InsertStaffAlert,
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
  closeParkingSession(id: string, exitPhotoUrl?: string, calculatedFee?: number): Promise<ParkingSession | undefined>;
  getParkingSessions(filters?: { open?: boolean; plateSearch?: string; fromDate?: Date; toDate?: Date; zoneId?: string }): Promise<ParkingSession[]>;
  getParkingSession(id: string): Promise<ParkingSession | undefined>;
  updateParkingSession(id: string, data: Partial<InsertParkingSession>): Promise<ParkingSession | undefined>;

  // Parking Settings
  getParkingSettings(): Promise<ParkingSettings | undefined>;
  upsertParkingSettings(settings: InsertParkingSettings): Promise<ParkingSettings>;

  // Parking Zones
  createParkingZone(zone: InsertParkingZone): Promise<ParkingZone>;
  getParkingZones(activeOnly?: boolean): Promise<ParkingZone[]>;
  getParkingZone(id: string): Promise<ParkingZone | undefined>;
  updateParkingZone(id: string, data: Partial<InsertParkingZone>): Promise<ParkingZone | undefined>;
  getZoneOccupancy(zoneId: string): Promise<number>;

  // Frequent Parkers
  getOrCreateFrequentParker(plateNormalized: string, plateDisplay: string): Promise<FrequentParker>;
  getFrequentParker(plateNormalized: string): Promise<FrequentParker | undefined>;
  updateFrequentParker(id: string, data: Partial<InsertFrequentParker>): Promise<FrequentParker | undefined>;
  getFrequentParkers(filters?: { isVip?: boolean; hasMonthlyPass?: boolean }): Promise<FrequentParker[]>;
  incrementParkerVisit(plateNormalized: string, amountSpent?: number): Promise<FrequentParker | undefined>;

  // Parking Reservations
  createParkingReservation(reservation: InsertParkingReservation): Promise<ParkingReservation>;
  getParkingReservations(filters?: { status?: string; fromDate?: Date; toDate?: Date }): Promise<ParkingReservation[]>;
  getParkingReservation(id: string): Promise<ParkingReservation | undefined>;
  getParkingReservationByCode(code: string): Promise<ParkingReservation | undefined>;
  updateParkingReservation(id: string, data: Partial<InsertParkingReservation>): Promise<ParkingReservation | undefined>;
  checkInReservation(id: string, parkingSessionId: string): Promise<ParkingReservation | undefined>;

  // Parking Analytics
  getParkingAnalytics(): Promise<{
    totalActiveSessions: number;
    totalCapacity: number;
    occupancyRate: number;
    todayRevenue: number;
    todayEntries: number;
    todayExits: number;
    avgDurationMinutes: number;
    zoneOccupancy: { zoneId: string; zoneName: string; occupied: number; capacity: number }[];
  }>;

  // Business Settings
  getBusinessSettings(): Promise<BusinessSettings | undefined>;
  upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings>;

  // Service Packages
  createServicePackage(pkg: InsertServicePackage): Promise<ServicePackage>;
  getServicePackages(activeOnly?: boolean): Promise<ServicePackage[]>;
  getServicePackage(id: string): Promise<ServicePackage | undefined>;
  updateServicePackage(id: string, data: Partial<InsertServicePackage>): Promise<ServicePackage | undefined>;

  // Customer Memberships
  createCustomerMembership(membership: InsertCustomerMembership): Promise<CustomerMembership>;
  getCustomerMemberships(filters?: { status?: string; plateNormalized?: string }): Promise<CustomerMembership[]>;
  getCustomerMembership(id: string): Promise<CustomerMembership | undefined>;
  getActiveMembershipForPlate(plateNormalized: string): Promise<CustomerMembership | undefined>;
  updateCustomerMembership(id: string, data: Partial<InsertCustomerMembership>): Promise<CustomerMembership | undefined>;
  incrementMembershipWashUsed(id: string): Promise<CustomerMembership | undefined>;

  // Parking Validations
  createParkingValidation(validation: InsertParkingValidation): Promise<ParkingValidation>;
  getParkingValidations(parkingSessionId: string): Promise<ParkingValidation[]>;

  // Customer Notifications
  createNotification(notification: InsertCustomerNotification): Promise<CustomerNotification>;
  getNotifications(filters?: { status?: string; type?: string; customerPhone?: string; limit?: number }): Promise<CustomerNotification[]>;
  getNotification(id: string): Promise<CustomerNotification | undefined>;
  updateNotificationStatus(id: string, status: string, externalId?: string, failureReason?: string): Promise<CustomerNotification | undefined>;
  getPendingNotifications(limit?: number): Promise<CustomerNotification[]>;

  // Notification Templates
  createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate>;
  getNotificationTemplates(activeOnly?: boolean): Promise<NotificationTemplate[]>;
  getNotificationTemplate(code: string): Promise<NotificationTemplate | undefined>;
  updateNotificationTemplate(id: string, data: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate | undefined>;

  // Membership lookup by plate (for CRM integration)
  findMembershipByPlate(plateNormalized: string): Promise<CustomerMembership | undefined>;
  findMembershipByPhone(phone: string): Promise<CustomerMembership | undefined>;
  findMembershipByEmail(email: string): Promise<CustomerMembership | undefined>;

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

  async getWashJobs(filters?: { status?: string; technicianId?: string; fromDate?: Date }): Promise<WashJob[]> {
    let query = db.select().from(washJobs);

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(washJobs.status, filters.status as any));
    }
    if (filters?.technicianId) {
      conditions.push(eq(washJobs.technicianId, filters.technicianId));
    }
    if (filters?.fromDate) {
      conditions.push(gte(washJobs.createdAt, filters.fromDate));
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

  async closeParkingSession(id: string, exitPhotoUrl?: string, calculatedFee?: number): Promise<ParkingSession | undefined> {
    const [result] = await db
      .update(parkingSessions)
      .set({
        exitAt: new Date(),
        exitPhotoUrl: exitPhotoUrl || null,
        calculatedFee: calculatedFee || null,
        updatedAt: new Date()
      })
      .where(eq(parkingSessions.id, id))
      .returning();
    return result;
  }

  async getParkingSessions(filters?: { open?: boolean; plateSearch?: string; fromDate?: Date; toDate?: Date; zoneId?: string }): Promise<ParkingSession[]> {
    let query = db.select().from(parkingSessions);
    const conditions = [];

    if (filters?.open === true) {
      conditions.push(isNull(parkingSessions.exitAt));
    } else if (filters?.open === false) {
      conditions.push(sql`${parkingSessions.exitAt} IS NOT NULL`);
    }

    if (filters?.plateSearch) {
      const normalized = normalizePlate(filters.plateSearch);
      conditions.push(sql`${parkingSessions.plateNormalized} ILIKE ${'%' + normalized + '%'}`);
    }

    if (filters?.fromDate) {
      conditions.push(gte(parkingSessions.entryAt, filters.fromDate));
    }

    if (filters?.toDate) {
      conditions.push(lte(parkingSessions.entryAt, filters.toDate));
    }

    if (filters?.zoneId) {
      conditions.push(eq(parkingSessions.zoneId, filters.zoneId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(parkingSessions.entryAt));
  }

  async getParkingSession(id: string): Promise<ParkingSession | undefined> {
    const [session] = await db.select().from(parkingSessions).where(eq(parkingSessions.id, id));
    return session;
  }

  async updateParkingSession(id: string, data: Partial<InsertParkingSession>): Promise<ParkingSession | undefined> {
    const [result] = await db
      .update(parkingSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(parkingSessions.id, id))
      .returning();
    return result;
  }

  // Parking Settings
  async getParkingSettings(): Promise<ParkingSettings | undefined> {
    const [settings] = await db.select().from(parkingSettings).limit(1);
    return settings;
  }

  async upsertParkingSettings(settings: InsertParkingSettings): Promise<ParkingSettings> {
    const existing = await this.getParkingSettings();
    if (existing) {
      const [result] = await db
        .update(parkingSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(parkingSettings.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(parkingSettings).values(settings).returning();
      return result;
    }
  }

  // Parking Zones
  async createParkingZone(zone: InsertParkingZone): Promise<ParkingZone> {
    const [result] = await db.insert(parkingZones).values(zone).returning();
    return result;
  }

  async getParkingZones(activeOnly = true): Promise<ParkingZone[]> {
    if (activeOnly) {
      return db.select().from(parkingZones).where(eq(parkingZones.isActive, true)).orderBy(asc(parkingZones.name));
    }
    return db.select().from(parkingZones).orderBy(asc(parkingZones.name));
  }

  async getParkingZone(id: string): Promise<ParkingZone | undefined> {
    const [zone] = await db.select().from(parkingZones).where(eq(parkingZones.id, id));
    return zone;
  }

  async updateParkingZone(id: string, data: Partial<InsertParkingZone>): Promise<ParkingZone | undefined> {
    const [result] = await db
      .update(parkingZones)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(parkingZones.id, id))
      .returning();
    return result;
  }

  async getZoneOccupancy(zoneId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parkingSessions)
      .where(and(eq(parkingSessions.zoneId, zoneId), isNull(parkingSessions.exitAt)));
    return result?.count || 0;
  }

  // Frequent Parkers
  async getOrCreateFrequentParker(plateNormalized: string, plateDisplay: string): Promise<FrequentParker> {
    const existing = await this.getFrequentParker(plateNormalized);
    if (existing) return existing;

    const [result] = await db.insert(frequentParkers).values({
      plateNormalized,
      plateDisplay,
      visitCount: 1,
      lastVisitAt: new Date()
    }).returning();
    return result;
  }

  async getFrequentParker(plateNormalized: string): Promise<FrequentParker | undefined> {
    const [parker] = await db.select().from(frequentParkers).where(eq(frequentParkers.plateNormalized, plateNormalized));
    return parker;
  }

  async updateFrequentParker(id: string, data: Partial<InsertFrequentParker>): Promise<FrequentParker | undefined> {
    const [result] = await db
      .update(frequentParkers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(frequentParkers.id, id))
      .returning();
    return result;
  }

  async getFrequentParkers(filters?: { isVip?: boolean; hasMonthlyPass?: boolean }): Promise<FrequentParker[]> {
    const conditions = [];

    if (filters?.isVip !== undefined) {
      conditions.push(eq(frequentParkers.isVip, filters.isVip));
    }

    if (filters?.hasMonthlyPass) {
      conditions.push(gte(frequentParkers.monthlyPassExpiry, new Date()));
    }

    if (conditions.length > 0) {
      return db.select().from(frequentParkers).where(and(...conditions)).orderBy(desc(frequentParkers.visitCount));
    }

    return db.select().from(frequentParkers).orderBy(desc(frequentParkers.visitCount));
  }

  async incrementParkerVisit(plateNormalized: string, amountSpent = 0): Promise<FrequentParker | undefined> {
    const parker = await this.getFrequentParker(plateNormalized);
    if (!parker) return undefined;

    const [result] = await db
      .update(frequentParkers)
      .set({
        visitCount: (parker.visitCount || 0) + 1,
        totalSpent: (parker.totalSpent || 0) + amountSpent,
        lastVisitAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(frequentParkers.id, parker.id))
      .returning();
    return result;
  }

  // Parking Reservations
  async createParkingReservation(reservation: InsertParkingReservation): Promise<ParkingReservation> {
    const plateNormalized = reservation.plateDisplay ? normalizePlate(reservation.plateDisplay) : null;
    const [result] = await db
      .insert(parkingReservations)
      .values({ ...reservation, plateNormalized })
      .returning();
    return result;
  }

  async getParkingReservations(filters?: { status?: string; fromDate?: Date; toDate?: Date }): Promise<ParkingReservation[]> {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(parkingReservations.status, filters.status));
    }

    if (filters?.fromDate) {
      conditions.push(gte(parkingReservations.reservedFrom, filters.fromDate));
    }

    if (filters?.toDate) {
      conditions.push(lte(parkingReservations.reservedUntil, filters.toDate));
    }

    if (conditions.length > 0) {
      return db.select().from(parkingReservations).where(and(...conditions)).orderBy(asc(parkingReservations.reservedFrom));
    }

    return db.select().from(parkingReservations).orderBy(asc(parkingReservations.reservedFrom));
  }

  async getParkingReservation(id: string): Promise<ParkingReservation | undefined> {
    const [reservation] = await db.select().from(parkingReservations).where(eq(parkingReservations.id, id));
    return reservation;
  }

  async getParkingReservationByCode(code: string): Promise<ParkingReservation | undefined> {
    const [reservation] = await db.select().from(parkingReservations).where(eq(parkingReservations.confirmationCode, code));
    return reservation;
  }

  async updateParkingReservation(id: string, data: Partial<InsertParkingReservation>): Promise<ParkingReservation | undefined> {
    const [result] = await db
      .update(parkingReservations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(parkingReservations.id, id))
      .returning();
    return result;
  }

  async checkInReservation(id: string, parkingSessionId: string): Promise<ParkingReservation | undefined> {
    const [result] = await db
      .update(parkingReservations)
      .set({ status: "checked_in", parkingSessionId, updatedAt: new Date() })
      .where(eq(parkingReservations.id, id))
      .returning();
    return result;
  }

  // Parking Analytics
  async getParkingAnalytics() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Active sessions count
    const [activeResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parkingSessions)
      .where(isNull(parkingSessions.exitAt));

    // Get settings for capacity
    const settings = await this.getParkingSettings();
    const totalCapacity = settings?.totalCapacity || 50;

    // Today's revenue (sum of calculated fees for closed sessions)
    const [revenueResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${parkingSessions.calculatedFee}), 0)::int` })
      .from(parkingSessions)
      .where(and(gte(parkingSessions.exitAt, todayStart), sql`${parkingSessions.exitAt} IS NOT NULL`));

    // Today entries
    const [entriesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parkingSessions)
      .where(gte(parkingSessions.entryAt, todayStart));

    // Today exits
    const [exitsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(parkingSessions)
      .where(and(gte(parkingSessions.exitAt, todayStart), sql`${parkingSessions.exitAt} IS NOT NULL`));

    // Average duration for closed sessions today
    const [avgDurationResult] = await db
      .select({
        avgMinutes: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${parkingSessions.exitAt} - ${parkingSessions.entryAt})) / 60)::int, 0)`
      })
      .from(parkingSessions)
      .where(and(gte(parkingSessions.exitAt, todayStart), sql`${parkingSessions.exitAt} IS NOT NULL`));

    // Zone occupancy
    const zones = await this.getParkingZones();
    const zoneOccupancy = await Promise.all(
      zones.map(async (zone) => {
        const occupied = await this.getZoneOccupancy(zone.id);
        return {
          zoneId: zone.id,
          zoneName: zone.name,
          occupied,
          capacity: zone.capacity || 10
        };
      })
    );

    const totalActive = activeResult?.count || 0;

    return {
      totalActiveSessions: totalActive,
      totalCapacity,
      occupancyRate: totalCapacity > 0 ? Math.round((totalActive / totalCapacity) * 100) : 0,
      todayRevenue: revenueResult?.total || 0,
      todayEntries: entriesResult?.count || 0,
      todayExits: exitsResult?.count || 0,
      avgDurationMinutes: avgDurationResult?.avgMinutes || 0,
      zoneOccupancy
    };
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

  // Business Settings
  async getBusinessSettings(): Promise<BusinessSettings | undefined> {
    const [settings] = await db.select().from(businessSettings).limit(1);
    return settings;
  }

  async upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings> {
    const existing = await this.getBusinessSettings();
    if (existing) {
      const [result] = await db
        .update(businessSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(businessSettings.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(businessSettings).values(settings).returning();
      return result;
    }
  }

  // Service Packages
  async createServicePackage(pkg: InsertServicePackage): Promise<ServicePackage> {
    const insertData = {
      ...pkg,
      services: pkg.services ? (pkg.services as string[]) : []
    };
    const [result] = await db.insert(servicePackages).values(insertData as any).returning();
    return result;
  }

  async getServicePackages(activeOnly = true): Promise<ServicePackage[]> {
    if (activeOnly) {
      return db.select().from(servicePackages).where(eq(servicePackages.isActive, true)).orderBy(asc(servicePackages.sortOrder));
    }
    return db.select().from(servicePackages).orderBy(asc(servicePackages.sortOrder));
  }

  async getServicePackage(id: string): Promise<ServicePackage | undefined> {
    const [pkg] = await db.select().from(servicePackages).where(eq(servicePackages.id, id));
    return pkg;
  }

  async updateServicePackage(id: string, data: Partial<InsertServicePackage>): Promise<ServicePackage | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.services) {
      updateData.services = data.services as string[];
    }
    const [result] = await db
      .update(servicePackages)
      .set(updateData)
      .where(eq(servicePackages.id, id))
      .returning();
    return result;
  }

  // Customer Memberships
  async createCustomerMembership(membership: InsertCustomerMembership): Promise<CustomerMembership> {
    const [result] = await db.insert(customerMemberships).values(membership).returning();
    return result;
  }

  async getCustomerMemberships(filters?: { status?: string; plateNormalized?: string }): Promise<CustomerMembership[]> {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(customerMemberships.status, filters.status));
    }

    if (filters?.plateNormalized) {
      conditions.push(eq(customerMemberships.plateNormalized, filters.plateNormalized));
    }

    if (conditions.length > 0) {
      return db.select().from(customerMemberships).where(and(...conditions)).orderBy(desc(customerMemberships.createdAt));
    }

    return db.select().from(customerMemberships).orderBy(desc(customerMemberships.createdAt));
  }

  async getCustomerMembership(id: string): Promise<CustomerMembership | undefined> {
    const [membership] = await db.select().from(customerMemberships).where(eq(customerMemberships.id, id));
    return membership;
  }

  async getActiveMembershipForPlate(plateNormalized: string): Promise<CustomerMembership | undefined> {
    const [membership] = await db
      .select()
      .from(customerMemberships)
      .where(and(
        eq(customerMemberships.plateNormalized, plateNormalized),
        eq(customerMemberships.status, "active"),
        gte(customerMemberships.expiryDate, new Date())
      ));
    return membership;
  }

  async updateCustomerMembership(id: string, data: Partial<InsertCustomerMembership>): Promise<CustomerMembership | undefined> {
    const [result] = await db
      .update(customerMemberships)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customerMemberships.id, id))
      .returning();
    return result;
  }

  async incrementMembershipWashUsed(id: string): Promise<CustomerMembership | undefined> {
    const membership = await this.getCustomerMembership(id);
    if (!membership) return undefined;

    const [result] = await db
      .update(customerMemberships)
      .set({
        washesUsed: (membership.washesUsed || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(customerMemberships.id, id))
      .returning();
    return result;
  }

  // Parking Validations
  async createParkingValidation(validation: InsertParkingValidation): Promise<ParkingValidation> {
    const [result] = await db.insert(parkingValidations).values(validation).returning();
    return result;
  }

  async getParkingValidations(parkingSessionId: string): Promise<ParkingValidation[]> {
    return db.select().from(parkingValidations).where(eq(parkingValidations.parkingSessionId, parkingSessionId));
  }

  // Customer Notifications
  async createNotification(notification: InsertCustomerNotification): Promise<CustomerNotification> {
    const [result] = await db.insert(customerNotifications).values(notification).returning();
    return result;
  }

  async getNotifications(filters?: { status?: string; type?: string; customerPhone?: string; limit?: number }): Promise<CustomerNotification[]> {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(customerNotifications.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(customerNotifications.type, filters.type));
    }
    if (filters?.customerPhone) {
      conditions.push(eq(customerNotifications.customerPhone, filters.customerPhone));
    }

    let query = db.select().from(customerNotifications);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    query = query.orderBy(desc(customerNotifications.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return query;
  }

  async getNotification(id: string): Promise<CustomerNotification | undefined> {
    const [notification] = await db.select().from(customerNotifications).where(eq(customerNotifications.id, id));
    return notification;
  }

  async updateNotificationStatus(id: string, status: string, externalId?: string, failureReason?: string): Promise<CustomerNotification | undefined> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (status === "sent") {
      updateData.sentAt = new Date();
    } else if (status === "failed") {
      updateData.failedAt = new Date();
      if (failureReason) updateData.failureReason = failureReason;
    }
    if (externalId) updateData.externalId = externalId;

    const [result] = await db
      .update(customerNotifications)
      .set(updateData)
      .where(eq(customerNotifications.id, id))
      .returning();
    return result;
  }

  async getPendingNotifications(limit = 50): Promise<CustomerNotification[]> {
    return db
      .select()
      .from(customerNotifications)
      .where(and(
        eq(customerNotifications.status, "pending"),
        or(
          isNull(customerNotifications.scheduledFor),
          lte(customerNotifications.scheduledFor, new Date())
        )
      ))
      .orderBy(asc(customerNotifications.createdAt))
      .limit(limit);
  }

  // Notification Templates
  async createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate> {
    const [result] = await db.insert(notificationTemplates).values(template).returning();
    return result;
  }

  async getNotificationTemplates(activeOnly = true): Promise<NotificationTemplate[]> {
    if (activeOnly) {
      return db.select().from(notificationTemplates).where(eq(notificationTemplates.isActive, true));
    }
    return db.select().from(notificationTemplates);
  }

  async getNotificationTemplate(code: string): Promise<NotificationTemplate | undefined> {
    const [template] = await db.select().from(notificationTemplates).where(eq(notificationTemplates.code, code));
    return template;
  }

  async updateNotificationTemplate(id: string, data: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate | undefined> {
    const [result] = await db
      .update(notificationTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notificationTemplates.id, id))
      .returning();
    return result;
  }

  // Membership lookup by plate (for CRM integration)
  async findMembershipByPlate(plateNormalized: string): Promise<CustomerMembership | undefined> {
    const [membership] = await db
      .select()
      .from(customerMemberships)
      .where(and(
        eq(customerMemberships.plateNormalized, plateNormalized),
        eq(customerMemberships.status, "active"),
        gte(customerMemberships.expiryDate, new Date())
      ));
    return membership;
  }

  async findMembershipByPhone(phone: string): Promise<CustomerMembership | undefined> {
    const [membership] = await db
      .select()
      .from(customerMemberships)
      .where(and(
        eq(customerMemberships.customerPhone, phone),
        eq(customerMemberships.status, "active"),
        gte(customerMemberships.expiryDate, new Date())
      ));
    return membership;
  }

  // ==========================================
  // Technician Time Logs
  // ==========================================

  async clockIn(technicianId: string, notes?: string): Promise<TechnicianTimeLog> {
    const [log] = await db.insert(technicianTimeLogs).values({
      technicianId,
      clockInAt: new Date(),
      notes: notes || null,
      breakLogs: [],
    }).returning();
    return log;
  }

  async clockOut(logId: string): Promise<TechnicianTimeLog | undefined> {
    const [existing] = await db.select().from(technicianTimeLogs).where(eq(technicianTimeLogs.id, logId));
    if (!existing || existing.clockOutAt) return undefined;

    const clockOut = new Date();
    const totalMs = clockOut.getTime() - existing.clockInAt.getTime();
    // Subtract completed break times
    const breakMinutes = (existing.breakLogs || []).reduce((acc: number, b: any) => {
      return acc + (b.durationMinutes || 0);
    }, 0);
    const totalMinutes = Math.floor(totalMs / 60000) - breakMinutes;

    const [updated] = await db.update(technicianTimeLogs)
      .set({ clockOutAt: clockOut, totalMinutes: Math.max(0, totalMinutes), updatedAt: new Date() })
      .where(eq(technicianTimeLogs.id, logId))
      .returning();
    return updated;
  }

  async getActiveTimeLog(technicianId: string): Promise<TechnicianTimeLog | undefined> {
    const [log] = await db.select().from(technicianTimeLogs)
      .where(and(eq(technicianTimeLogs.technicianId, technicianId), isNull(technicianTimeLogs.clockOutAt)))
      .orderBy(desc(technicianTimeLogs.clockInAt))
      .limit(1);
    return log;
  }

  async getTimeLogs(filters?: { technicianId?: string; fromDate?: Date; toDate?: Date; limit?: number }): Promise<TechnicianTimeLog[]> {
    const conditions: any[] = [];
    if (filters?.technicianId) conditions.push(eq(technicianTimeLogs.technicianId, filters.technicianId));
    if (filters?.fromDate) conditions.push(gte(technicianTimeLogs.clockInAt, filters.fromDate));
    if (filters?.toDate) conditions.push(lte(technicianTimeLogs.clockInAt, filters.toDate));

    let query = db.select().from(technicianTimeLogs);
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    query = query.orderBy(desc(technicianTimeLogs.clockInAt)) as any;
    if (filters?.limit) query = query.limit(filters.limit) as any;
    return query;
  }

  async addBreakLog(logId: string, breakEntry: { type: "lunch" | "short" | "absent"; notes?: string }): Promise<TechnicianTimeLog | undefined> {
    const [existing] = await db.select().from(technicianTimeLogs).where(eq(technicianTimeLogs.id, logId));
    if (!existing) return undefined;

    const updatedBreaks = [...(existing.breakLogs || []), { ...breakEntry, startAt: new Date().toISOString() }];
    const [updated] = await db.update(technicianTimeLogs)
      .set({ breakLogs: updatedBreaks, updatedAt: new Date() })
      .where(eq(technicianTimeLogs.id, logId))
      .returning();
    return updated;
  }

  async endBreakLog(logId: string): Promise<TechnicianTimeLog | undefined> {
    const [existing] = await db.select().from(technicianTimeLogs).where(eq(technicianTimeLogs.id, logId));
    if (!existing) return undefined;

    const breaks = [...(existing.breakLogs || [])];
    const lastBreak = breaks[breaks.length - 1];
    if (!lastBreak || lastBreak.endAt) return existing; // No active break

    const endAt = new Date().toISOString();
    const durationMinutes = Math.floor((new Date(endAt).getTime() - new Date(lastBreak.startAt).getTime()) / 60000);
    breaks[breaks.length - 1] = { ...lastBreak, endAt, durationMinutes };

    const [updated] = await db.update(technicianTimeLogs)
      .set({ breakLogs: breaks, updatedAt: new Date() })
      .where(eq(technicianTimeLogs.id, logId))
      .returning();
    return updated;
  }

  // ==========================================
  // Staff Alerts (running late, absent, etc.)
  // ==========================================

  async createStaffAlert(data: {
    technicianId: string;
    type: "running_late" | "absent" | "emergency" | "other";
    message?: string;
    estimatedArrival?: string;
  }): Promise<StaffAlert> {
    const [alert] = await db.insert(staffAlerts).values({
      technicianId: data.technicianId,
      type: data.type,
      message: data.message || null,
      estimatedArrival: data.estimatedArrival || null,
      acknowledged: false,
    }).returning();
    return alert;
  }

  async getStaffAlerts(filters?: { unacknowledgedOnly?: boolean; technicianId?: string }): Promise<StaffAlert[]> {
    const conditions: any[] = [];
    if (filters?.unacknowledgedOnly) conditions.push(eq(staffAlerts.acknowledged, false));
    if (filters?.technicianId) conditions.push(eq(staffAlerts.technicianId, filters.technicianId));

    let query: any = db.select().from(staffAlerts);
    if (conditions.length > 0) query = query.where(and(...conditions));
    query = query.orderBy(desc(staffAlerts.createdAt));
    return await query;
  }

  async acknowledgeStaffAlert(alertId: string, acknowledgedBy: string): Promise<StaffAlert | undefined> {
    const [updated] = await db.update(staffAlerts)
      .set({ acknowledged: true, acknowledgedBy, acknowledgedAt: new Date() })
      .where(eq(staffAlerts.id, alertId))
      .returning();
    return updated;
  }

  async findMembershipByEmail(email: string): Promise<CustomerMembership | undefined> {
    const [membership] = await db
      .select()
      .from(customerMemberships)
      .where(and(
        eq(customerMemberships.customerEmail, email),
        eq(customerMemberships.status, "active"),
        gte(customerMemberships.expiryDate, new Date())
      ));
    return membership;
  }
}

export const storage = new DatabaseStorage();
