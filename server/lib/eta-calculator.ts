import type { WashJob, ServiceCode } from "@shared/schema";

// Default estimated durations per service code (in minutes)
const DEFAULT_DURATIONS: Record<string, number> = {
  STANDARD: 30,
  FULL_VALET: 60,
  HEADLIGHT_RESTORATION: 20,
  TYRE_SHINE_ONLY: 15,
  RIM_ONLY: 15,
};

export interface QueuePositionResult {
  position: number;
  estimatedMinutes: number;
  estimatedReadyAt: string;
  totalInQueue: number;
}

/**
 * Calculate the queue position and ETA for a given job.
 * @param jobId The job to find the position for
 * @param sortedActiveJobs Active jobs sorted by priority (highest first)
 * @param avgCycleTimeMinutes Historical average cycle time (from analytics)
 */
export function getQueuePosition(
  jobId: string,
  sortedActiveJobs: WashJob[],
  avgCycleTimeMinutes?: number
): QueuePositionResult | null {
  const jobIndex = sortedActiveJobs.findIndex((j) => j.id === jobId);
  if (jobIndex === -1) return null;

  const position = jobIndex + 1;
  const totalInQueue = sortedActiveJobs.length;

  // Sum estimated times for jobs ahead of this one
  let minutesAhead = 0;
  for (let i = 0; i < jobIndex; i++) {
    const ahead = sortedActiveJobs[i];
    const serviceCode = (ahead.serviceCode || "STANDARD") as string;
    const duration = DEFAULT_DURATIONS[serviceCode] || avgCycleTimeMinutes || 30;
    minutesAhead += duration;
  }

  const estimatedReadyAt = new Date(Date.now() + minutesAhead * 60000).toISOString();

  return {
    position,
    estimatedMinutes: minutesAhead,
    estimatedReadyAt,
    totalInQueue,
  };
}
