import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInMinutes, startOfDay, endOfDay } from "date-fns";
import type { PresenceLog } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate total ACTIVE minutes from an array of PresenceLogs for a given day.
 * Logic: Consecutive log entries where status is ACTIVE are counted as productive.
 */
export function calculateProductiveMinutes(logs: PresenceLog[]): number {
  if (!logs || logs.length === 0) return 0;

  // Sort by timestamp ascending
  const sorted = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let totalMinutes = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.status === "ACTIVE") {
      const minutes = differenceInMinutes(
        new Date(next.timestamp),
        new Date(current.timestamp)
      );
      totalMinutes += minutes;
    }
  }

  return totalMinutes;
}

/**
 * Format minutes as "Xj Ym" (Indonesian: jam = hours, menit = minutes)
 */
export function formatProductiveTime(minutes: number): string {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}j`;
  return `${hours}j ${mins}m`;
}

/**
 * Calculate discrepancy between activity log duration and actual ACTIVE presence time.
 * Returns the overlap and discrepancy in minutes.
 */
export function calculateDiscrepancy(
  activityStart: Date,
  activityEnd: Date,
  presenceLogs: PresenceLog[]
): { activityMinutes: number; activePresenceMinutes: number; discrepancyMinutes: number; hasFlaggedDiscrepancy: boolean } {
  const activityMinutes = differenceInMinutes(
    new Date(activityEnd),
    new Date(activityStart)
  );

  // Filter presence logs within the activity timeframe
  const relevantLogs = presenceLogs
    .filter(
      (log) =>
        new Date(log.timestamp) >= new Date(activityStart) &&
        new Date(log.timestamp) <= new Date(activityEnd)
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let activePresenceMinutes = 0;
  for (let i = 0; i < relevantLogs.length - 1; i++) {
    if (relevantLogs[i].status === "ACTIVE") {
      activePresenceMinutes += differenceInMinutes(
        new Date(relevantLogs[i + 1].timestamp),
        new Date(relevantLogs[i].timestamp)
      );
    }
  }

  const discrepancyMinutes = activityMinutes - activePresenceMinutes;
  // Flag if intern claimed more than 30 minutes of work but was actually active < 50% of that time
  const hasFlaggedDiscrepancy =
    activityMinutes > 30 && activePresenceMinutes < activityMinutes * 0.5;

  return { activityMinutes, activePresenceMinutes, discrepancyMinutes, hasFlaggedDiscrepancy };
}
