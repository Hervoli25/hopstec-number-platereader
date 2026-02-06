import type { ParkingSession, ParkingSettings, FrequentParker } from "@shared/schema";

export interface ParkingFeeResult {
  durationMinutes: number;
  durationFormatted: string;
  baseFee: number;
  discount: number;
  finalFee: number;
  currency: string;
  isGracePeriod: boolean;
  hasMonthlyPass: boolean;
}

export function calculateParkingDuration(entryAt: Date, exitAt?: Date | null): {
  minutes: number;
  formatted: string;
} {
  const end = exitAt ? new Date(exitAt) : new Date();
  const start = new Date(entryAt);
  const diffMs = end.getTime() - start.getTime();
  const minutes = Math.floor(diffMs / 60000);

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  let formatted: string;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    formatted = `${days}d ${remainingHours}h ${mins}m`;
  } else if (hours > 0) {
    formatted = `${hours}h ${mins}m`;
  } else {
    formatted = `${mins}m`;
  }

  return { minutes, formatted };
}

export function calculateParkingFee(
  session: ParkingSession,
  settings: ParkingSettings | null,
  parker?: FrequentParker | null
): ParkingFeeResult {
  const { minutes, formatted } = calculateParkingDuration(
    session.entryAt!,
    session.exitAt
  );

  const hourlyRate = settings?.hourlyRate || 500; // Default $5/hour
  const dailyMax = settings?.dailyMaxRate || 3000; // Default $30/day
  const gracePeriod = settings?.gracePeriodMinutes || 15;
  const currency = settings?.currency || "USD";

  // Check if within grace period
  if (minutes <= gracePeriod) {
    return {
      durationMinutes: minutes,
      durationFormatted: formatted,
      baseFee: 0,
      discount: 0,
      finalFee: 0,
      currency,
      isGracePeriod: true,
      hasMonthlyPass: false
    };
  }

  // Check for monthly pass
  if (parker?.monthlyPassExpiry && new Date(parker.monthlyPassExpiry) > new Date()) {
    return {
      durationMinutes: minutes,
      durationFormatted: formatted,
      baseFee: 0,
      discount: 0,
      finalFee: 0,
      currency,
      isGracePeriod: false,
      hasMonthlyPass: true
    };
  }

  // Calculate base fee (pro-rated by hour)
  const hours = Math.ceil(minutes / 60);
  let baseFee = hours * hourlyRate;

  // Cap at daily maximum per 24-hour period
  const days = Math.ceil(minutes / (24 * 60));
  const maxFee = days * dailyMax;
  baseFee = Math.min(baseFee, maxFee);

  // VIP discount (10%)
  let discount = 0;
  if (parker?.isVip) {
    discount = Math.floor(baseFee * 0.1);
  }

  const finalFee = baseFee - discount;

  return {
    durationMinutes: minutes,
    durationFormatted: formatted,
    baseFee,
    discount,
    finalFee,
    currency,
    isGracePeriod: false,
    hasMonthlyPass: false
  };
}

export function formatCurrency(amountCents: number, currency = "USD"): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount);
}

export function generateConfirmationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface SessionWithCalculations extends ParkingSession {
  durationMinutes: number;
  durationFormatted: string;
  estimatedFee: number;
  isGracePeriod: boolean;
  hasMonthlyPass: boolean;
  parkerInfo?: {
    customerName: string | null;
    isVip: boolean;
    visitCount: number;
  };
}

export function enrichSessionWithCalculations(
  session: ParkingSession,
  settings: ParkingSettings | null,
  parker?: FrequentParker | null
): SessionWithCalculations {
  const feeResult = calculateParkingFee(session, settings, parker);

  return {
    ...session,
    durationMinutes: feeResult.durationMinutes,
    durationFormatted: feeResult.durationFormatted,
    estimatedFee: feeResult.finalFee,
    isGracePeriod: feeResult.isGracePeriod,
    hasMonthlyPass: feeResult.hasMonthlyPass,
    parkerInfo: parker ? {
      customerName: parker.customerName,
      isVip: parker.isVip || false,
      visitCount: parker.visitCount || 0
    } : undefined
  };
}
