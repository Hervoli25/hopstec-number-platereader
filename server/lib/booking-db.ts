import pg from "pg";

// Booking system database connection
// This connects to your existing CRM/booking system database

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

// Types for booking data
export interface CRMBooking {
  id: string;
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
