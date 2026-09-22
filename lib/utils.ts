import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInMinutes } from "date-fns";
import type { PresenceLog } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate total ACTIVE minutes from an array of PresenceLogs for a given day.
 * Logic: Consecutive log entries where status is ACTIVE are counted as productive.
 */
export function calculateProductiveMinutes(logs: PresenceLog[], endOfWindow?: Date): number {
  if (!logs || logs.length === 0) return 0;

  const sorted = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let totalMinutes = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.status === "ACTIVE") {
      let nextTime = new Date(next.timestamp);
      const gap = differenceInMinutes(nextTime, new Date(current.timestamp));
      
      if (gap > 15) {
        nextTime = new Date(new Date(current.timestamp).getTime() + 15 * 60 * 1000);
      }

      const minutes = differenceInMinutes(nextTime, new Date(current.timestamp));
      totalMinutes += minutes;
    }
  }

  if (sorted.length > 0 && sorted[sorted.length - 1].status === "ACTIVE") {
    const lastActive = new Date(sorted[sorted.length - 1].timestamp);
    const capTime = endOfWindow || new Date(lastActive.getTime() + 15 * 60 * 1000);
    const gap = differenceInMinutes(capTime, lastActive);
    if (gap > 0 && gap <= 15) {
      totalMinutes += gap;
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

  if (!presenceLogs || presenceLogs.length === 0) {
    return { activityMinutes, activePresenceMinutes: 0, discrepancyMinutes: activityMinutes, hasFlaggedDiscrepancy: activityMinutes > 30 };
  }

  const sorted = [...presenceLogs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let activePresenceMinutes = 0;

  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i];
    if (log.status !== "ACTIVE") continue;

    const logTime = new Date(log.timestamp);
    let activeEnd = i < sorted.length - 1
      ? new Date(sorted[i + 1].timestamp)
      : new Date(logTime.getTime() + 15 * 60 * 1000);

    if (logTime > new Date(activityEnd)) break;

    if (activeEnd < new Date(activityStart)) continue;

    const overlapStart = logTime > new Date(activityStart) ? logTime : new Date(activityStart);
    const overlapEnd = activeEnd < new Date(activityEnd) ? activeEnd : new Date(activityEnd);

    if (overlapStart < overlapEnd) {
      activePresenceMinutes += differenceInMinutes(overlapEnd, overlapStart);
    }
  }

  const discrepancyMinutes = activityMinutes - activePresenceMinutes;
  const hasFlaggedDiscrepancy =
    activityMinutes > 30 && activePresenceMinutes < activityMinutes * 0.5;

  return { activityMinutes, activePresenceMinutes, discrepancyMinutes, hasFlaggedDiscrepancy };
}
