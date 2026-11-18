import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInMinutes } from "date-fns";
import type { PresenceLog } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns YYYY-MM-DD in Asia/Jakarta (UTC+7).
 */
export function getWIBDateString(date: Date = new Date()): string {
  return new Date(date.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/**
 * Returns start and end of day in Asia/Jakarta (UTC+7) for a given YYYY-MM-DD string (defaults to today in WIB).
 */
export function getWIBDayBounds(dateStr?: string): {
  dateStr: string;
  dayStart: Date;
  dayEnd: Date;
} {
  const targetDate = dateStr ?? getWIBDateString();
  const dayStart = new Date(`${targetDate}T00:00:00+07:00`);
  const dayEnd = new Date(`${targetDate}T23:59:59.999+07:00`);
  return { dateStr: targetDate, dayStart, dayEnd };
}

/**
 * Calculate total ACTIVE minutes from an array of PresenceLogs for a given day.
 * Logic: Consecutive log entries where status is ACTIVE are counted as productive.
 */
export function calculateProductiveMinutes(
  logs: PresenceLog[],
  endOfWindow: Date = new Date()
): number {
  if (!logs || logs.length === 0) return 0;

  const sorted = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const cap = 15 * 60 * 1000;
  let totalMilliseconds = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].status !== "ACTIVE") continue;
    const gap = new Date(sorted[i + 1].timestamp).getTime() - new Date(sorted[i].timestamp).getTime();
    totalMilliseconds += Math.min(gap, cap);
  }

  if (sorted.length > 0 && sorted[sorted.length - 1].status === "ACTIVE") {
    const lastActive = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const capTime = endOfWindow ? endOfWindow.getTime() : lastActive + cap;
    const gap = capTime - lastActive;
    if (gap > 0) totalMilliseconds += Math.min(gap, cap);
  }

  return Math.floor(totalMilliseconds / 60_000);
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

  if (!presenceLogs || presenceLogs.length === 0) {
    return { activityMinutes, activePresenceMinutes: 0, discrepancyMinutes: activityMinutes, hasFlaggedDiscrepancy: activityMinutes > 30 };
  }

  const sorted = [...presenceLogs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let activePresenceMilliseconds = 0;

  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i];
    if (log.status !== "ACTIVE") continue;

    const logTime = new Date(log.timestamp);
    const nextLogTime = i < sorted.length - 1
      ? new Date(sorted[i + 1].timestamp)
      : new Date(logTime.getTime() + 15 * 60 * 1000);
    const activeEnd = new Date(
      Math.min(nextLogTime.getTime(), logTime.getTime() + 15 * 60 * 1000)
    );

    if (logTime > activityEnd) break;
    if (activeEnd < activityStart) continue;

    const overlapStart = logTime > activityStart ? logTime : activityStart;
    const overlapEnd = activeEnd < activityEnd ? activeEnd : activityEnd;

    if (overlapStart < overlapEnd) {
      activePresenceMilliseconds += overlapEnd.getTime() - overlapStart.getTime();
    }
  }

  const activePresenceMinutes = Math.floor(activePresenceMilliseconds / 60_000);
  const discrepancyMinutes = activityMinutes - activePresenceMinutes;
  const hasFlaggedDiscrepancy =
    activityMinutes > 30 && activePresenceMinutes < activityMinutes * 0.5;

  return { activityMinutes, activePresenceMinutes, discrepancyMinutes, hasFlaggedDiscrepancy };
}
