import pg from "pg";

// Booking system database connection
// This connects to your existing CRM/booking system database
// Includes Notification and Subscription/Membership integration

const BOOKING_DB_URL = process.env.BOOKING_DATABASE_URL;

let bookingPool: pg.Pool | null = null;

export function getBookingPool(): pg.Pool | null {
  if (!BOOKING_DB_URL) {
    console.log("BOOKING_DATABASE_URL not set - CRM integration disabled");
    return null;
  }

  if (!bookingPool) {
    bookingPool = new pg.Pool({
      connectionString: BOOKING_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }

  return bookingPool;
}

// Types for CRM Notification
export interface CRMNotification {
  id: string;
  userId: string;
  type: string; // BOOKING_CONFIRMED, BOOKING_REMINDER, WASH_COMPLETE, PARKING_EXIT, etc.
  title: string;
  message: string;
  channel: "sms" | "email" | "push" | "both";
  status: "pending" | "sent" | "failed" | "read";
  bookingId?: string;
  vehicleId?: string;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Types for CRM Subscription/Membership
export interface CRMSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  type: string; // WASH_UNLIMITED, WASH_COUNT, PARKING_MONTHLY, COMBO
  status: "active" | "expired" | "cancelled" | "paused";
  price: number;
  startDate: Date;
  endDate: Date;
  washesIncluded?: number;
  washesRemaining?: number;
  parkingIncluded: boolean;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
  // User info
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  // Vehicle info
  licensePlate?: string;
}

// CRM Customer (User + Vehicle lookup, regardless of subscription)
export interface CRMCustomer {
  userId: string;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  licensePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  subscription?: CRMSubscription;
}

// CRM Membership (from Membership + MembershipPlanConfig + User.loyaltyPoints)
export interface CRMMembership {
  membershipId: string;
  userId: string;
  memberNumber: string;       // Membership.qrCode (e.g. EKHAYA-40551C30A0A65B7FDD29E150)
  tierName: string;           // MembershipPlanConfig.displayName (e.g. "Basic Member")
  tierCode: string;           // MembershipPlanConfig.name (e.g. "BASIC")
  discountRate: number;       // 0.1 = 10%
  loyaltyMultiplier: number;  // 1.0 or 2.0
  loyaltyPoints: number;      // User.loyaltyPoints
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
}

// Types for booking data
export interface CRMBooking {
  id: string;
  bookingReference: string; // The booking reference/confirmation code from CRM
  status: "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "READY_FOR_PICKUP";
  bookingDate: Date;
  timeSlot: string;
  licensePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  serviceName: string;
  serviceDescription: string;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  totalAmount: number;
  notes: string | null;
}

// Fetch upcoming confirmed bookings
export async function getUpcomingBookings(limit: number = 20): Promise<CRMBooking[]> {
  const pool = getBookingPool();
  if (!pool) return [];

  try {
    const result = await pool.query(`
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

    return result.rows.map(row => ({
      id: row.id,
      bookingReference: row.id.slice(-8).toUpperCase(),
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
      notes: row.notes,
    }));
  } catch (error) {
    console.error("Error fetching bookings from CRM:", error);
    return [];
  }
}

// Fetch today's bookings
export async function getTodayBookings(): Promise<CRMBooking[]> {
  const pool = getBookingPool();
  if (!pool) return [];

  try {
    const result = await pool.query(`
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

    return result.rows.map(row => ({
      id: row.id,
      bookingReference: row.id.slice(-8).toUpperCase(),
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
      notes: row.notes,
    }));
  } catch (error) {
    console.error("Error fetching today's bookings from CRM:", error);
    return [];
  }
}

// Search booking by license plate
export async function findBookingByPlate(licensePlate: string): Promise<CRMBooking | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    // Normalize plate: remove spaces, dashes, convert to uppercase
    const normalizedPlate = licensePlate.replace(/[\s-]/g, "").toUpperCase();

    const result = await pool.query(`
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
      bookingReference: row.id.slice(-8).toUpperCase(),
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
      notes: row.notes,
    };
  } catch (error) {
    console.error("Error searching booking by plate:", error);
    return null;
  }
}

// Update booking status in CRM
export async function updateBookingStatus(
  bookingId: string,
  status: "IN_PROGRESS" | "COMPLETED" | "READY_FOR_PICKUP"
): Promise<boolean> {
  const pool = getBookingPool();
  if (!pool) return false;

  try {
    const completedAt = status === "COMPLETED" ? new Date() : null;

    await pool.query(`
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

// ==========================================
// CRM Notification Functions
// ==========================================

// Fetch notifications from CRM
export async function getCRMNotifications(filters?: {
  userId?: string;
  status?: string;
  type?: string;
  limit?: number;
}): Promise<CRMNotification[]> {
  const pool = getBookingPool();
  if (!pool) return [];

  try {
    let query = `
      SELECT
        n.id,
        n."userId",
        n.type,
        n.title,
        n.message,
        n.channel,
        n.status,
        n."bookingId",
        n."vehicleId",
        n."sentAt",
        n."readAt",
        n."createdAt",
        n."updatedAt"
      FROM "Notification" n
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.userId) {
      query += ` AND n."userId" = $${paramIndex++}`;
      params.push(filters.userId);
    }
    if (filters?.status) {
      query += ` AND n.status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters?.type) {
      query += ` AND n.type = $${paramIndex++}`;
      params.push(filters.type);
    }

    query += ` ORDER BY n."createdAt" DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      message: row.message,
      channel: row.channel,
      status: row.status,
      bookingId: row.bookingId,
      vehicleId: row.vehicleId,
      sentAt: row.sentAt ? new Date(row.sentAt) : undefined,
      readAt: row.readAt ? new Date(row.readAt) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  } catch (error) {
    console.error("Error fetching notifications from CRM:", error);
    return [];
  }
}

// Create notification in CRM
export async function createCRMNotification(notification: {
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: "sms" | "email" | "push" | "both";
  bookingId?: string;
  vehicleId?: string;
}): Promise<CRMNotification | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    const result = await pool.query(`
      INSERT INTO "Notification" (
        "userId", type, title, message, channel, status, "bookingId", "vehicleId", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      notification.userId,
      notification.type,
      notification.title,
      notification.message,
      notification.channel,
      notification.bookingId || null,
      notification.vehicleId || null
    ]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      message: row.message,
      channel: row.channel,
      status: row.status,
      bookingId: row.bookingId,
      vehicleId: row.vehicleId,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  } catch (error) {
    console.error("Error creating notification in CRM:", error);
    return null;
  }
}

// Update notification status in CRM
export async function updateCRMNotificationStatus(
  notificationId: string,
  status: "pending" | "sent" | "failed" | "read"
): Promise<boolean> {
  const pool = getBookingPool();
  if (!pool) return false;

  try {
    const updateFields: string[] = [
      'status = $1',
      '"updatedAt" = CURRENT_TIMESTAMP'
    ];
    const params: any[] = [status, notificationId];

    if (status === "sent") {
      updateFields.push('"sentAt" = CURRENT_TIMESTAMP');
    } else if (status === "read") {
      updateFields.push('"readAt" = CURRENT_TIMESTAMP');
    }

    await pool.query(`
      UPDATE "Notification"
      SET ${updateFields.join(', ')}
      WHERE id = $2
    `, params);

    return true;
  } catch (error) {
    console.error("Error updating notification status in CRM:", error);
    return false;
  }
}

// Get notifications for a user by email/phone (lookup user first)
export async function getCRMNotificationsForCustomer(
  email?: string,
  phone?: string,
  limit = 50
): Promise<CRMNotification[]> {
  const pool = getBookingPool();
  if (!pool || (!email && !phone)) return [];

  try {
    // First find the user
    let userQuery = 'SELECT id FROM "User" WHERE ';
    const userParams: any[] = [];

    if (email) {
      userQuery += 'email = $1';
      userParams.push(email);
    } else if (phone) {
      userQuery += 'phone = $1';
      userParams.push(phone);
    }

    const userResult = await pool.query(userQuery, userParams);
    if (userResult.rows.length === 0) return [];

    const userId = userResult.rows[0].id;
    return getCRMNotifications({ userId, limit });
  } catch (error) {
    console.error("Error fetching notifications for customer:", error);
    return [];
  }
}

// ==========================================
// CRM Subscription/Membership Functions
// ==========================================

// Fetch subscriptions from CRM
export async function getCRMSubscriptions(filters?: {
  userId?: string;
  status?: string;
  type?: string;
  plateNormalized?: string;
}): Promise<CRMSubscription[]> {
  const pool = getBookingPool();
  if (!pool) return [];

  try {
    let query = `
      SELECT
        s.id,
        s."userId",
        s."planId",
        p.name as "planName",
        p.type,
        s.status,
        s.price,
        s."startDate",
        s."endDate",
        s."washesIncluded",
        s."washesRemaining",
        s."parkingIncluded",
        s."autoRenew",
        s."createdAt",
        s."updatedAt",
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone",
        v."licensePlate"
      FROM "Subscription" s
      JOIN "SubscriptionPlan" p ON s."planId" = p.id
      JOIN "User" u ON s."userId" = u.id
      LEFT JOIN "Vehicle" v ON v."userId" = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.userId) {
      query += ` AND s."userId" = $${paramIndex++}`;
      params.push(filters.userId);
    }
    if (filters?.status) {
      query += ` AND s.status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters?.type) {
      query += ` AND p.type = $${paramIndex++}`;
      params.push(filters.type);
    }
    if (filters?.plateNormalized) {
      query += ` AND UPPER(REPLACE(REPLACE(v."licensePlate", ' ', ''), '-', '')) = $${paramIndex++}`;
      params.push(filters.plateNormalized);
    }

    query += ` ORDER BY s."createdAt" DESC`;

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      planId: row.planId,
      planName: row.planName,
      type: row.type,
      status: row.status,
      price: row.price,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      washesIncluded: row.washesIncluded,
      washesRemaining: row.washesRemaining,
      parkingIncluded: row.parkingIncluded,
      autoRenew: row.autoRenew,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      licensePlate: row.licensePlate,
    }));
  } catch (error) {
    console.error("Error fetching subscriptions from CRM:", error);
    return [];
  }
}

// Find active subscription by license plate
export async function findCRMSubscriptionByPlate(licensePlate: string): Promise<CRMSubscription | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    const normalizedPlate = licensePlate.replace(/[\s-]/g, "").toUpperCase();

    const result = await pool.query(`
      SELECT
        s.id,
        s."userId",
        s."planId",
        p.name as "planName",
        p.type,
        s.status,
        s.price,
        s."startDate",
        s."endDate",
        s."washesIncluded",
        s."washesRemaining",
        s."parkingIncluded",
        s."autoRenew",
        s."createdAt",
        s."updatedAt",
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone",
        v."licensePlate"
      FROM "Subscription" s
      JOIN "SubscriptionPlan" p ON s."planId" = p.id
      JOIN "User" u ON s."userId" = u.id
      JOIN "Vehicle" v ON v."userId" = u.id
      WHERE s.status = 'active'
        AND s."endDate" >= CURRENT_DATE
        AND UPPER(REPLACE(REPLACE(v."licensePlate", ' ', ''), '-', '')) = $1
      ORDER BY s."endDate" DESC
      LIMIT 1
    `, [normalizedPlate]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      planId: row.planId,
      planName: row.planName,
      type: row.type,
      status: row.status,
      price: row.price,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      washesIncluded: row.washesIncluded,
      washesRemaining: row.washesRemaining,
      parkingIncluded: row.parkingIncluded,
      autoRenew: row.autoRenew,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      licensePlate: row.licensePlate,
    };
  } catch (error) {
    console.error("Error finding subscription by plate:", error);
    return null;
  }
}

// Find subscription by email
export async function findCRMSubscriptionByEmail(email: string): Promise<CRMSubscription | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s."userId",
        s."planId",
        p.name as "planName",
        p.type,
        s.status,
        s.price,
        s."startDate",
        s."endDate",
        s."washesIncluded",
        s."washesRemaining",
        s."parkingIncluded",
        s."autoRenew",
        s."createdAt",
        s."updatedAt",
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone",
        v."licensePlate"
      FROM "Subscription" s
      JOIN "SubscriptionPlan" p ON s."planId" = p.id
      JOIN "User" u ON s."userId" = u.id
      LEFT JOIN "Vehicle" v ON v."userId" = u.id
      WHERE s.status = 'active'
        AND s."endDate" >= CURRENT_DATE
        AND u.email = $1
      ORDER BY s."endDate" DESC
      LIMIT 1
    `, [email]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      planId: row.planId,
      planName: row.planName,
      type: row.type,
      status: row.status,
      price: row.price,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      washesIncluded: row.washesIncluded,
      washesRemaining: row.washesRemaining,
      parkingIncluded: row.parkingIncluded,
      autoRenew: row.autoRenew,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      licensePlate: row.licensePlate,
    };
  } catch (error) {
    console.error("Error finding subscription by email:", error);
    return null;
  }
}

// Find subscription by phone
export async function findCRMSubscriptionByPhone(phone: string): Promise<CRMSubscription | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s."userId",
        s."planId",
        p.name as "planName",
        p.type,
        s.status,
        s.price,
        s."startDate",
        s."endDate",
        s."washesIncluded",
        s."washesRemaining",
        s."parkingIncluded",
        s."autoRenew",
        s."createdAt",
        s."updatedAt",
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone",
        v."licensePlate"
      FROM "Subscription" s
      JOIN "SubscriptionPlan" p ON s."planId" = p.id
      JOIN "User" u ON s."userId" = u.id
      LEFT JOIN "Vehicle" v ON v."userId" = u.id
      WHERE s.status = 'active'
        AND s."endDate" >= CURRENT_DATE
        AND u.phone = $1
      ORDER BY s."endDate" DESC
      LIMIT 1
    `, [phone]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      planId: row.planId,
      planName: row.planName,
      type: row.type,
      status: row.status,
      price: row.price,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      washesIncluded: row.washesIncluded,
      washesRemaining: row.washesRemaining,
      parkingIncluded: row.parkingIncluded,
      autoRenew: row.autoRenew,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      licensePlate: row.licensePlate,
    };
  } catch (error) {
    console.error("Error finding subscription by phone:", error);
    return null;
  }
}

// Find CRM customer by license plate (User + Vehicle, regardless of subscription)
export async function findCRMCustomerByPlate(licensePlate: string): Promise<CRMCustomer | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    const normalizedPlate = licensePlate.replace(/[\s-]/g, "").toUpperCase();

    const result = await pool.query(`
      SELECT
        u.id as "userId",
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone",
        v."licensePlate",
        v.make as "vehicleMake",
        v.model as "vehicleModel",
        v.color as "vehicleColor"
      FROM "Vehicle" v
      JOIN "User" u ON v."userId" = u.id
      WHERE UPPER(REPLACE(REPLACE(v."licensePlate", ' ', ''), '-', '')) = $1
      LIMIT 1
    `, [normalizedPlate]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const subscription = await findCRMSubscriptionByPlate(licensePlate);

    return {
      userId: row.userId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      licensePlate: row.licensePlate,
      vehicleMake: row.vehicleMake,
      vehicleModel: row.vehicleModel,
      vehicleColor: row.vehicleColor,
      subscription: subscription || undefined,
    };
  } catch (error) {
    console.error("Error finding CRM customer by plate:", error);
    return null;
  }
}

// Get booking with membership info
export async function getBookingWithMembership(bookingId: string): Promise<CRMBooking & { subscription?: CRMSubscription } | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    // First get the booking
    const bookingResult = await pool.query(`
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
      WHERE b.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) return null;

    const row = bookingResult.rows[0];
    const booking: CRMBooking = {
      id: row.id,
      bookingReference: row.id.slice(-8).toUpperCase(),
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
      notes: row.notes,
    };

    // Try to find an active subscription for this customer
    const subscription = await findCRMSubscriptionByPlate(row.licensePlate);

    return {
      ...booking,
      subscription: subscription || undefined,
    };
  } catch (error) {
    console.error("Error fetching booking with membership:", error);
    return null;
  }
}

// Get upcoming bookings with membership info
export async function getUpcomingBookingsWithMemberships(limit = 20): Promise<(CRMBooking & { subscription?: CRMSubscription })[]> {
  const bookings = await getUpcomingBookings(limit);

  // Enrich each booking with subscription info
  const enrichedBookings = await Promise.all(
    bookings.map(async (booking) => {
      const subscription = await findCRMSubscriptionByPlate(booking.licensePlate);
      return {
        ...booking,
        subscription: subscription || undefined,
      };
    })
  );

  return enrichedBookings;
}

// ==========================================
// Manager Booking Management Functions
// ==========================================

export interface BookingFilters {
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  customerSearch?: string; // Search by name, email, phone, or plate
  limit?: number;
  offset?: number;
}

// Extended booking with modification tracking
export interface CRMBookingExtended extends CRMBooking {
  isWithinOneHour: boolean;
  canCustomerModify: boolean;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
}

// Get all bookings with filters (for manager view)
export async function getManagerBookings(filters?: BookingFilters): Promise<{ bookings: CRMBookingExtended[]; total: number; error?: string; technicalError?: string }> {
  const pool = getBookingPool();
  if (!pool) {
    console.log("Manager Bookings: CRM database not connected (BOOKING_DATABASE_URL not set)");
    return {
      bookings: [],
      total: 0,
      error: "Booking system temporarily unavailable",
      technicalError: "CRM database not connected (BOOKING_DATABASE_URL not set)"
    };
  }

  console.log("Manager Bookings: Searching with filters:", JSON.stringify(filters));

  try {
    // Booking reference is derived from the last 8 chars of the CRM booking ID
    let query = `
      SELECT
        b.id,
        b.status,
        b."bookingDate",
        b."timeSlot",
        b.notes,
        b."totalAmount",
        b."updatedAt",
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
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND b.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.fromDate) {
      query += ` AND b."bookingDate" >= $${paramIndex++}`;
      params.push(filters.fromDate);
    }

    if (filters?.toDate) {
      query += ` AND b."bookingDate" <= $${paramIndex++}`;
      params.push(filters.toDate);
    }

    if (filters?.customerSearch) {
      const searchTerm = `%${filters.customerSearch}%`;
      // Search by reference (last 8 chars of ID), name, email, phone, or plate
      query += ` AND (
        UPPER(RIGHT(b.id::text, 8)) ILIKE $${paramIndex} OR
        u.name ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex} OR
        u.phone ILIKE $${paramIndex} OR
        v."licensePlate" ILIKE $${paramIndex}
      )`;
      params.push(searchTerm);
      paramIndex++;
    }

    // Count total for pagination
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Add ordering and pagination
    query += ` ORDER BY b."bookingDate" ASC, b."timeSlot" ASC`;

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const bookings: CRMBookingExtended[] = result.rows.map(row => {
      // Parse booking date and time
      const bookingDateTime = new Date(row.bookingDate);
      const [hours, minutes] = (row.timeSlot || "00:00").split(":").map(Number);
      bookingDateTime.setHours(hours || 0, minutes || 0, 0, 0);

      const isWithinOneHour = bookingDateTime <= oneHourFromNow && bookingDateTime >= now;

      return {
        id: row.id,
        bookingReference: row.id.slice(-8).toUpperCase(),
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
        notes: row.notes,
        isWithinOneHour,
        canCustomerModify: !isWithinOneHour && row.status === 'CONFIRMED',
        lastModifiedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
      };
    });

    console.log(`Manager Bookings: Found ${bookings.length} bookings out of ${total} total`);
    return { bookings, total };
  } catch (error) {
    console.error("Error fetching manager bookings:", error);
    return {
      bookings: [],
      total: 0,
      error: "Unable to fetch bookings. Please try again later.",
      technicalError: String(error)
    };
  }
}

// Get single booking details
export async function getBookingById(bookingId: string): Promise<CRMBookingExtended | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.status,
        b."bookingDate",
        b."timeSlot",
        b.notes,
        b."totalAmount",
        b."updatedAt",
        b."createdAt",
        v."licensePlate",
        v.make as "vehicleMake",
        v.model as "vehicleModel",
        v.color as "vehicleColor",
        s.id as "serviceId",
        s.name as "serviceName",
        s.description as "serviceDescription",
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone"
      FROM "Booking" b
      JOIN "Vehicle" v ON b."vehicleId" = v.id
      JOIN "Service" s ON b."serviceId" = s.id
      JOIN "User" u ON b."userId" = u.id
      WHERE b.id = $1
    `, [bookingId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const bookingDateTime = new Date(row.bookingDate);
    const [hours, minutes] = (row.timeSlot || "00:00").split(":").map(Number);
    bookingDateTime.setHours(hours || 0, minutes || 0, 0, 0);

    const isWithinOneHour = bookingDateTime <= oneHourFromNow && bookingDateTime >= now;

    return {
      id: row.id,
      bookingReference: row.id.slice(-8).toUpperCase(),
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
      notes: row.notes,
      isWithinOneHour,
      canCustomerModify: !isWithinOneHour && row.status === 'CONFIRMED',
      lastModifiedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
    };
  } catch (error) {
    console.error("Error fetching booking by ID:", error);
    return null;
  }
}

// Update booking (reschedule, change service, update notes)
export async function updateBooking(
  bookingId: string,
  updates: {
    bookingDate?: Date;
    timeSlot?: string;
    serviceId?: string;
    notes?: string;
    status?: string;
  }
): Promise<boolean> {
  const pool = getBookingPool();
  if (!pool) return false;

  try {
    const setClauses: string[] = ['"updatedAt" = CURRENT_TIMESTAMP'];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.bookingDate) {
      setClauses.push(`"bookingDate" = $${paramIndex++}`);
      params.push(updates.bookingDate);
    }

    if (updates.timeSlot) {
      setClauses.push(`"timeSlot" = $${paramIndex++}`);
      params.push(updates.timeSlot);
    }

    if (updates.serviceId) {
      setClauses.push(`"serviceId" = $${paramIndex++}`);
      params.push(updates.serviceId);
    }

    if (updates.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      params.push(updates.notes);
    }

    if (updates.status) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(updates.status);

      if (updates.status === 'COMPLETED') {
        setClauses.push(`"completedAt" = CURRENT_TIMESTAMP`);
      }
    }

    params.push(bookingId);

    await pool.query(`
      UPDATE "Booking"
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
    `, params);

    return true;
  } catch (error) {
    console.error("Error updating booking:", error);
    return false;
  }
}

// Cancel booking
export async function cancelBooking(bookingId: string): Promise<boolean> {
  const pool = getBookingPool();
  if (!pool) return false;

  try {
    await pool.query(`
      UPDATE "Booking"
      SET status = 'CANCELLED',
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [bookingId]);

    return true;
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return false;
  }
}

// Check if time slot is available (for rescheduling)
export async function isTimeSlotAvailable(
  date: Date,
  timeSlot: string,
  excludeBookingId?: string
): Promise<boolean> {
  const pool = getBookingPool();
  if (!pool) return false;

  try {
    let query = `
      SELECT COUNT(*) as count
      FROM "Booking"
      WHERE DATE("bookingDate") = DATE($1)
        AND "timeSlot" = $2
        AND status NOT IN ('CANCELLED', 'NO_SHOW', 'COMPLETED')
    `;
    const params: any[] = [date, timeSlot];

    if (excludeBookingId) {
      query += ` AND id != $3`;
      params.push(excludeBookingId);
    }

    const result = await pool.query(query, params);
    const count = parseInt(result.rows[0]?.count || '0', 10);

    // Assuming max 1 booking per slot (adjust based on business rules)
    return count === 0;
  } catch (error) {
    console.error("Error checking time slot availability:", error);
    return false;
  }
}

// Get available services from CRM
export async function getCRMServices(): Promise<{ id: string; name: string; description: string; price: number; duration: number }[]> {
  const pool = getBookingPool();
  if (!pool) return [];

  try {
    const result = await pool.query(`
      SELECT id, name, description, price, "durationMinutes" as duration
      FROM "Service"
      WHERE "isActive" = true
      ORDER BY name ASC
    `);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      duration: row.duration,
    }));
  } catch (error) {
    console.error("Error fetching CRM services:", error);
    return [];
  }
}

// Get available time slots for a date
export async function getAvailableTimeSlots(date: Date): Promise<string[]> {
  const pool = getBookingPool();
  if (!pool) return [];

  try {
    // Get all booked slots for the date
    const result = await pool.query(`
      SELECT "timeSlot"
      FROM "Booking"
      WHERE DATE("bookingDate") = DATE($1)
        AND status NOT IN ('CANCELLED', 'NO_SHOW', 'COMPLETED')
    `, [date]);

    const bookedSlots = new Set(result.rows.map(r => r.timeSlot));

    // Generate all possible time slots (8 AM to 6 PM in 30-min intervals)
    const allSlots: string[] = [];
    for (let hour = 8; hour < 18; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    // Filter out booked slots
    return allSlots.filter(slot => !bookedSlots.has(slot));
  } catch (error) {
    console.error("Error fetching available time slots:", error);
    return [];
  }
}

// ==========================================
// CRM Membership / Loyalty Functions
// ==========================================

// Find CRM membership by license plate (Vehicle → User → Membership → MembershipPlanConfig)
export async function findCRMMembershipByPlate(licensePlate: string): Promise<CRMMembership | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    const normalizedPlate = licensePlate.replace(/[\s-]/g, "").toUpperCase();

    const result = await pool.query(`
      SELECT
        m.id as "membershipId",
        u.id as "userId",
        m."qrCode" as "memberNumber",
        mpc."displayName" as "tierName",
        mpc.name as "tierCode",
        mpc."discountRate",
        mpc."loyaltyMultiplier",
        u."loyaltyPoints",
        m."isActive",
        m."startDate",
        m."endDate",
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone"
      FROM "Vehicle" v
      JOIN "User" u ON v."userId" = u.id
      JOIN "Membership" m ON m."userId" = u.id
      JOIN "MembershipPlanConfig" mpc ON m."membershipPlanId" = mpc.id
      WHERE UPPER(REPLACE(REPLACE(v."licensePlate", ' ', ''), '-', '')) = $1
        AND m."isActive" = true
      ORDER BY m."createdAt" DESC
      LIMIT 1
    `, [normalizedPlate]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      membershipId: row.membershipId,
      userId: row.userId,
      memberNumber: row.memberNumber,
      tierName: row.tierName,
      tierCode: row.tierCode,
      discountRate: row.discountRate || 0,
      loyaltyMultiplier: row.loyaltyMultiplier || 1,
      loyaltyPoints: row.loyaltyPoints || 0,
      isActive: row.isActive,
      startDate: new Date(row.startDate),
      endDate: row.endDate ? new Date(row.endDate) : null,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
    };
  } catch (error) {
    console.error("Error finding CRM membership by plate:", error);
    return null;
  }
}

// Credit loyalty points to CRM User.loyaltyPoints
export async function creditCRMLoyaltyPoints(
  userId: string,
  points: number
): Promise<{ newBalance: number } | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    const result = await pool.query(`
      UPDATE "User"
      SET "loyaltyPoints" = "loyaltyPoints" + $1
      WHERE id = $2
      RETURNING "loyaltyPoints"
    `, [points, userId]);

    if (result.rows.length === 0) return null;

    return { newBalance: result.rows[0].loyaltyPoints };
  } catch (error) {
    console.error("Error crediting CRM loyalty points:", error);
    return null;
  }
}

// Get CRM loyalty analytics (total members, total points across all members)
export async function getCRMLoyaltyAnalytics(): Promise<{
  totalMembers: number;
  totalPointsAcrossMembers: number;
  topMembers: { memberNumber: string; customerName: string | null; loyaltyPoints: number; tierName: string }[];
} | null> {
  const pool = getBookingPool();
  if (!pool) return null;

  try {
    const [countResult, topResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int as "totalMembers",
          COALESCE(SUM(u."loyaltyPoints"), 0)::int as "totalPoints"
        FROM "Membership" m
        JOIN "User" u ON m."userId" = u.id
        WHERE m."isActive" = true
      `),
      pool.query(`
        SELECT
          m."qrCode" as "memberNumber",
          u.name as "customerName",
          u."loyaltyPoints",
          mpc."displayName" as "tierName"
        FROM "Membership" m
        JOIN "User" u ON m."userId" = u.id
        JOIN "MembershipPlanConfig" mpc ON m."membershipPlanId" = mpc.id
        WHERE m."isActive" = true
        ORDER BY u."loyaltyPoints" DESC
        LIMIT 10
      `),
    ]);

    return {
      totalMembers: countResult.rows[0]?.totalMembers || 0,
      totalPointsAcrossMembers: countResult.rows[0]?.totalPoints || 0,
      topMembers: topResult.rows.map(r => ({
        memberNumber: r.memberNumber,
        customerName: r.customerName,
        loyaltyPoints: r.loyaltyPoints || 0,
        tierName: r.tierName,
      })),
    };
  } catch (error) {
    console.error("Error fetching CRM loyalty analytics:", error);
    return null;
  }
}
