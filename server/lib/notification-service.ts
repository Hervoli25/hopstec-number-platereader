import { storage } from "../storage";
import { format } from "date-fns";

// ==========================================
// Booking Notification Template System
// ==========================================

export type BookingNotificationType = "BOOKING_CANCELLED" | "BOOKING_MODIFIED" | "BOOKING_RESCHEDULED";

export interface BookingNotificationData {
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  bookingReference: string;
  licensePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  serviceName: string;
  // Original booking details
  originalDate?: Date | string;
  originalTimeSlot?: string;
  // New booking details (for reschedule/modify)
  newDate?: Date | string;
  newTimeSlot?: string;
  newServiceName?: string;
  newNotes?: string;
  // Change reason (manually entered by manager)
  reason?: string;
  bookingId: string;
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return "N/A";
  try {
    return format(new Date(date), "EEEE, MMMM d, yyyy");
  } catch {
    return String(date);
  }
}

// ==========================================
// Email Templates
// ==========================================

function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || "");
}

const TEMPLATES: Record<BookingNotificationType, { subject: string; body: string }> = {
  BOOKING_CANCELLED: {
    subject: "Your booking {{bookingReference}} has been cancelled",
    body: `Dear {{customerName}},

We regret to inform you that your booking has been cancelled.

Booking Details:
━━━━━━━━━━━━━━━━━━━━━━━
Reference:    {{bookingReference}}
Vehicle:      {{licensePlate}} ({{vehicleMake}} {{vehicleModel}})
Service:      {{serviceName}}
Date:         {{originalDate}}
Time:         {{originalTimeSlot}}
━━━━━━━━━━━━━━━━━━━━━━━

{{reasonSection}}

We apologise for any inconvenience caused. We would love to have you back — please don't hesitate to rebook at your earliest convenience.

If you have any questions, please contact us directly.

Warm regards,
The HOPSVOIR Team`,
  },
  BOOKING_MODIFIED: {
    subject: "Your booking {{bookingReference}} has been updated",
    body: `Dear {{customerName}},

Your booking details have been updated by our team.

Updated Booking Details:
━━━━━━━━━━━━━━━━━━━━━━━
Reference:    {{bookingReference}}
Vehicle:      {{licensePlate}} ({{vehicleMake}} {{vehicleModel}})
Service:      {{serviceName}}
Date:         {{newDate}}
Time:         {{newTimeSlot}}
━━━━━━━━━━━━━━━━━━━━━━━

{{reasonSection}}

Please review the updated details above. If you have any questions or concerns, please contact us.

Warm regards,
The HOPSVOIR Team`,
  },
  BOOKING_RESCHEDULED: {
    subject: "Your booking {{bookingReference}} has been rescheduled",
    body: `Dear {{customerName}},

Your booking has been rescheduled. Here are your updated appointment details:

Rescheduled Booking:
━━━━━━━━━━━━━━━━━━━━━━━
Reference:    {{bookingReference}}
Vehicle:      {{licensePlate}} ({{vehicleMake}} {{vehicleModel}})
Service:      {{serviceName}}

Previous Appointment:
  Date: {{originalDate}}
  Time: {{originalTimeSlot}}

New Appointment:
  Date: {{newDate}}
  Time: {{newTimeSlot}}
━━━━━━━━━━━━━━━━━━━━━━━

{{reasonSection}}

Please make note of your new appointment time. If this time does not work for you, please contact us to arrange an alternative.

Warm regards,
The HOPSVOIR Team`,
  },
};

// ==========================================
// Template Rendering
// ==========================================

export function renderBookingNotification(
  type: BookingNotificationType,
  data: BookingNotificationData
): { subject: string; body: string } {
  const template = TEMPLATES[type];
  const reasonSection = data.reason
    ? `Reason for change:\n${data.reason}\n`
    : "";

  const vars: Record<string, string> = {
    customerName: data.customerName || "Valued Customer",
    bookingReference: data.bookingReference,
    licensePlate: data.licensePlate,
    vehicleMake: data.vehicleMake || "",
    vehicleModel: data.vehicleModel || "",
    serviceName: data.serviceName,
    originalDate: formatDate(data.originalDate),
    originalTimeSlot: data.originalTimeSlot || "N/A",
    newDate: formatDate(data.newDate || data.originalDate),
    newTimeSlot: data.newTimeSlot || data.originalTimeSlot || "N/A",
    reasonSection,
  };

  return {
    subject: renderTemplate(template.subject, vars),
    body: renderTemplate(template.body, vars),
  };
}

// ==========================================
// Queue Notification in DB
// ==========================================

export async function queueBookingNotification(
  type: BookingNotificationType,
  data: BookingNotificationData,
  triggeredBy?: string
): Promise<string | null> {
  try {
    const { subject, body } = renderBookingNotification(type, data);

    // Determine channel based on available contact info
    const hasEmail = !!data.customerEmail;
    const hasPhone = !!data.customerPhone;
    const channel = hasEmail && hasPhone ? "both" : hasEmail ? "email" : hasPhone ? "sms" : "email";

    const notification = await storage.createNotification({
      customerName: data.customerName || undefined,
      customerEmail: data.customerEmail || undefined,
      customerPhone: data.customerPhone || undefined,
      channel,
      type: type.toLowerCase(),
      subject,
      message: body,
      bookingId: data.bookingId,
      status: "pending",
      createdBy: triggeredBy || "system",
    });

    // Log in event log
    await storage.logEvent({
      type: "notification_queued",
      userId: triggeredBy,
      payloadJson: {
        notificationId: notification.id,
        notificationType: type,
        bookingId: data.bookingId,
        bookingReference: data.bookingReference,
        customerEmail: data.customerEmail,
        channel,
      },
    });

    return notification.id;
  } catch (error) {
    console.error("Failed to queue booking notification:", error);
    return null;
  }
}

// ==========================================
// Mark notification as manually sent
// ==========================================

export async function markNotificationSent(notificationId: string): Promise<void> {
  await storage.updateNotificationStatus(notificationId, "sent");
}

// ==========================================
// Detect what changed between two booking states
// ==========================================

export interface BookingChangeSummary {
  type: BookingNotificationType;
  hasDateChange: boolean;
  hasTimeChange: boolean;
  hasOtherChange: boolean;
}

export function detectBookingChangeType(
  original: { bookingDate: Date | string; timeSlot: string; notes?: string | null; status?: string },
  updates: { bookingDate?: Date | string; timeSlot?: string; notes?: string; status?: string }
): BookingChangeSummary {
  const hasDateChange = !!updates.bookingDate &&
    new Date(updates.bookingDate).toDateString() !== new Date(original.bookingDate).toDateString();
  const hasTimeChange = !!updates.timeSlot && updates.timeSlot !== original.timeSlot;
  const hasOtherChange = (updates.notes !== undefined && updates.notes !== (original.notes || "")) ||
    (updates.status !== undefined && updates.status !== original.status);

  let type: BookingNotificationType = "BOOKING_MODIFIED";
  if (hasDateChange || hasTimeChange) {
    type = "BOOKING_RESCHEDULED";
  }

  return { type, hasDateChange, hasTimeChange, hasOtherChange };
}
