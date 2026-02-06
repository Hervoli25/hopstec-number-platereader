import type { ParkingSession, ParkingSettings, FrequentParker, BusinessSettings, ParkingValidation } from "@shared/schema";
import { SUPPORTED_CURRENCIES } from "@shared/schema";

export interface FeeLineItem {
  label: string;
  amount: number; // in smallest currency unit
  type: "charge" | "discount" | "tax";
}

export interface ParkingFeeResult {
  durationMinutes: number;
  durationFormatted: string;
  lineItems: FeeLineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  finalFee: number;
  currency: string;
  currencySymbol: string;
  locale: string;
  isGracePeriod: boolean;
  hasMonthlyPass: boolean;
  breakdown: string; // Human-readable breakdown
  // Keep backward compatibility
  baseFee: number;
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
  if (hours >= 24) {
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

export function getCurrencyInfo(currencyCode: string = "USD") {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency || { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" };
}

export function formatCurrency(amountCents: number, currencyCode = "USD", locale?: string): string {
  const currencyInfo = getCurrencyInfo(currencyCode);
  const amount = amountCents / 100;

  try {
    return new Intl.NumberFormat(locale || currencyInfo.locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: currencyCode === "JPY" ? 0 : 2,
      maximumFractionDigits: currencyCode === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported locales
    return `${currencyInfo.symbol}${amount.toFixed(2)}`;
  }
}

function isNightTime(date: Date, nightStart: number, nightEnd: number): boolean {
  const hour = date.getHours();
  if (nightStart > nightEnd) {
    // e.g., 22:00 to 06:00
    return hour >= nightStart || hour < nightEnd;
  }
  return hour >= nightStart && hour < nightEnd;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function calculateParkingFee(
  session: ParkingSession,
  settings: ParkingSettings | null,
  parker?: FrequentParker | null,
  businessSettings?: BusinessSettings | null,
  validations?: ParkingValidation[]
): ParkingFeeResult {
  const { minutes, formatted } = calculateParkingDuration(
    session.entryAt!,
    session.exitAt
  );

  // Get currency info
  const currencyCode = businessSettings?.currency || settings?.currency || "USD";
  const currencyInfo = getCurrencyInfo(currencyCode);
  const locale = businessSettings?.locale || currencyInfo.locale;

  const hourlyRate = settings?.hourlyRate || 500;
  const firstHourRate = settings?.firstHourRate || hourlyRate;
  const dailyMax = settings?.dailyMaxRate || 3000;
  const gracePeriod = settings?.gracePeriodMinutes || 15;
  const taxRate = businessSettings?.taxRate || 0;

  const lineItems: FeeLineItem[] = [];
  const breakdownParts: string[] = [];

  // Check if within grace period
  if (minutes <= gracePeriod) {
    return {
      durationMinutes: minutes,
      durationFormatted: formatted,
      lineItems: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      finalFee: 0,
      baseFee: 0,
      currency: currencyCode,
      currencySymbol: currencyInfo.symbol,
      locale,
      isGracePeriod: true,
      hasMonthlyPass: false,
      breakdown: `Free parking (${gracePeriod}min grace period)`
    };
  }

  // Check for monthly pass
  if (parker?.monthlyPassExpiry && new Date(parker.monthlyPassExpiry) > new Date()) {
    return {
      durationMinutes: minutes,
      durationFormatted: formatted,
      lineItems: [{ label: "Monthly Pass", amount: 0, type: "charge" }],
      subtotal: 0,
      discount: 0,
      tax: 0,
      finalFee: 0,
      baseFee: 0,
      currency: currencyCode,
      currencySymbol: currencyInfo.symbol,
      locale,
      isGracePeriod: false,
      hasMonthlyPass: true,
      breakdown: "Monthly pass holder - No charge"
    };
  }

  // Calculate base fee
  const totalHours = Math.ceil(minutes / 60);
  let baseFee = 0;
  const entryDate = new Date(session.entryAt!);

  // First hour calculation
  if (totalHours >= 1) {
    let firstRate = firstHourRate;

    // Check for night/weekend rates for first hour
    if (settings?.nightRate && isNightTime(entryDate, settings.nightStartHour || 22, settings.nightEndHour || 6)) {
      firstRate = settings.nightRate;
      lineItems.push({ label: "First hour (night rate)", amount: firstRate, type: "charge" });
      breakdownParts.push(`First hour (night): ${formatCurrency(firstRate, currencyCode, locale)}`);
    } else if (settings?.weekendRate && isWeekend(entryDate)) {
      firstRate = settings.weekendRate;
      lineItems.push({ label: "First hour (weekend rate)", amount: firstRate, type: "charge" });
      breakdownParts.push(`First hour (weekend): ${formatCurrency(firstRate, currencyCode, locale)}`);
    } else {
      lineItems.push({ label: "First hour", amount: firstRate, type: "charge" });
      breakdownParts.push(`First hour: ${formatCurrency(firstRate, currencyCode, locale)}`);
    }
    baseFee += firstRate;
  }

  // Additional hours
  if (totalHours > 1) {
    const additionalHours = totalHours - 1;
    const additionalFee = additionalHours * hourlyRate;
    lineItems.push({
      label: `Additional ${additionalHours} hour${additionalHours > 1 ? 's' : ''} @ ${formatCurrency(hourlyRate, currencyCode, locale)}/hr`,
      amount: additionalFee,
      type: "charge"
    });
    breakdownParts.push(`${additionalHours} additional hr${additionalHours > 1 ? 's' : ''} × ${formatCurrency(hourlyRate, currencyCode, locale)} = ${formatCurrency(additionalFee, currencyCode, locale)}`);
    baseFee += additionalFee;
  }

  // Cap at daily maximum per 24-hour period
  const days = Math.ceil(minutes / (24 * 60));
  const maxFee = days * dailyMax;
  const originalBaseFee = baseFee;

  let cappedFee = baseFee;
  if (baseFee > maxFee) {
    cappedFee = maxFee;
    const savings = baseFee - maxFee;
    lineItems.push({
      label: `Daily max cap (${days} day${days > 1 ? 's' : ''})`,
      amount: -savings,
      type: "discount"
    });
    breakdownParts.push(`Capped at daily max: ${formatCurrency(maxFee, currencyCode, locale)} (saved ${formatCurrency(savings, currencyCode, locale)})`);
  }

  let subtotal = cappedFee;
  let totalDiscount = baseFee - cappedFee;

  // Apply validation discounts
  if (validations && validations.length > 0) {
    for (const validation of validations) {
      if (validation.discountPercent && validation.discountPercent > 0) {
        const percentDiscount = Math.floor(subtotal * validation.discountPercent / 100);
        lineItems.push({
          label: `${validation.validatorName} validation (${validation.discountPercent}% off)`,
          amount: -percentDiscount,
          type: "discount"
        });
        breakdownParts.push(`${validation.validatorName}: -${formatCurrency(percentDiscount, currencyCode, locale)}`);
        subtotal -= percentDiscount;
        totalDiscount += percentDiscount;
      }
      if (validation.discountAmount && validation.discountAmount > 0) {
        lineItems.push({
          label: `${validation.validatorName} validation`,
          amount: -validation.discountAmount,
          type: "discount"
        });
        breakdownParts.push(`${validation.validatorName}: -${formatCurrency(validation.discountAmount, currencyCode, locale)}`);
        subtotal -= validation.discountAmount;
        totalDiscount += validation.discountAmount;
      }
    }
  }

  // VIP discount (10%)
  if (parker?.isVip) {
    const vipDiscount = Math.floor(subtotal * 0.1);
    lineItems.push({ label: "VIP discount (10%)", amount: -vipDiscount, type: "discount" });
    breakdownParts.push(`VIP discount: -${formatCurrency(vipDiscount, currencyCode, locale)}`);
    subtotal -= vipDiscount;
    totalDiscount += vipDiscount;
  }

  // Calculate tax
  let tax = 0;
  if (taxRate > 0 && subtotal > 0) {
    tax = Math.floor(subtotal * taxRate / 10000);
    const taxLabel = businessSettings?.taxLabel || "Tax";
    lineItems.push({
      label: `${taxLabel} (${(taxRate / 100).toFixed(1)}%)`,
      amount: tax,
      type: "tax"
    });
    breakdownParts.push(`${taxLabel}: +${formatCurrency(tax, currencyCode, locale)}`);
  }

  const finalFee = Math.max(0, subtotal + tax);
  breakdownParts.push(`Total: ${formatCurrency(finalFee, currencyCode, locale)}`);

  return {
    durationMinutes: minutes,
    durationFormatted: formatted,
    lineItems,
    subtotal,
    discount: totalDiscount,
    tax,
    finalFee,
    baseFee: originalBaseFee,
    currency: currencyCode,
    currencySymbol: currencyInfo.symbol,
    locale,
    isGracePeriod: false,
    hasMonthlyPass: false,
    breakdown: breakdownParts.join(" | ")
  };
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
  feeBreakdown?: string;
  currency: string;
  currencySymbol: string;
  parkerInfo?: {
    customerName: string | null;
    isVip: boolean;
    visitCount: number;
  };
}

export function enrichSessionWithCalculations(
  session: ParkingSession,
  settings: ParkingSettings | null,
  parker?: FrequentParker | null,
  businessSettings?: BusinessSettings | null
): SessionWithCalculations {
  const feeResult = calculateParkingFee(session, settings, parker, businessSettings);

  return {
    ...session,
    durationMinutes: feeResult.durationMinutes,
    durationFormatted: feeResult.durationFormatted,
    estimatedFee: feeResult.finalFee,
    isGracePeriod: feeResult.isGracePeriod,
    hasMonthlyPass: feeResult.hasMonthlyPass,
    feeBreakdown: feeResult.breakdown,
    currency: feeResult.currency,
    currencySymbol: feeResult.currencySymbol,
    parkerInfo: parker ? {
      customerName: parker.customerName,
      isVip: parker.isVip || false,
      visitCount: parker.visitCount || 0
    } : undefined
  };
}
