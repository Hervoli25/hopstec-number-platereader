import type { WashJob, ServiceCode } from "@shared/schema";
import { SERVICE_PRIORITY_WEIGHT } from "@shared/schema";
import { findCRMMembershipByPlate, findBookingByPlate } from "./booking-db";

interface PriorityResult {
  score: number;
  factors: Record<string, number>;
}

export async function calculateJobPriority(job: WashJob): Promise<PriorityResult> {
  const factors: Record<string, number> = {};

  // 1. Service type weight
  const serviceWeight = SERVICE_PRIORITY_WEIGHT[(job.serviceCode || "STANDARD") as ServiceCode] || 30;
  factors.serviceWeight = serviceWeight;

  // 2. Wait time bonus: +5 per 5 minutes waiting, capped at 50
  const waitMs = Date.now() - new Date(job.createdAt!).getTime();
  const waitMinutes = Math.floor(waitMs / 60000);
  const waitBonus = Math.min(50, Math.floor(waitMinutes / 5) * 5);
  factors.waitBonus = waitBonus;

  // 3. VIP bonus: +30 if CRM member
  try {
    const membership = await findCRMMembershipByPlate(job.plateNormalized);
    if (membership) {
      factors.vipBonus = 30;
    }
  } catch {
    // CRM lookup failure is non-blocking
  }

  // 4. Booking bonus: +20 if has CRM booking
  try {
    const booking = await findBookingByPlate(job.plateNormalized);
    if (booking) {
      factors.bookingBonus = 20;
    }
  } catch {
    // CRM lookup failure is non-blocking
  }

  const score = Object.values(factors).reduce((a, b) => a + b, 0);
  return { score, factors };
}
