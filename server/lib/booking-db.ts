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
