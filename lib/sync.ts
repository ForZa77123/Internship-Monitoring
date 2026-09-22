import { prisma } from "@/lib/prisma";
import { PresenceStatus } from "@prisma/client";

interface RawAILog {
  timestamp: string;
  personnel_id: string;
  area_id?: string;
  status?: string;
  physical_state?: string;
  confidence_score?: number;
}

function mapStatus(state?: string, status?: string): PresenceStatus {
  if (status === "Out-of-Region") return PresenceStatus.AWAY;
  if (state === "Dynamic") return PresenceStatus.ACTIVE;
  if (state === "Static") return PresenceStatus.IDLE;
  return PresenceStatus.AWAY;
}

export async function syncAILogs(targetUrl?: string): Promise<{ inserted: number; skipped: number; total: number }> {
  const url = targetUrl || process.env.AI_LOGS_URL || "http://192.168.8.186:5000/api/logs";

  let rawLogs: RawAILog[] = [];
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { inserted: 0, skipped: 0, total: 0 };
    rawLogs = await res.json();
  } catch {
    return { inserted: 0, skipped: 0, total: 0 };
  }

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  let inserted = 0;
  let skipped = 0;

  for (const item of rawLogs) {
    if (!item.personnel_id || !item.timestamp) {
      skipped++;
      continue;
    }

    const cleanName = item.personnel_id.replace(/^\d+_/, "").replace(/_/g, " ").trim();
    let user = users.find(
      (u) => u.id === item.personnel_id || u.name.toLowerCase().includes(cleanName.toLowerCase())
    );

    if (!user) {
      const email = `${cleanName.toLowerCase().replace(/\s+/g, ".")}@intern.com`;
      try {
        user = await prisma.user.create({
          data: { name: cleanName, email, password: "auto-generated", role: "INTERN" },
          select: { id: true, name: true },
        });
        users.push(user);
      } catch {
        skipped++;
        continue;
      }
    }

    const timestamp = new Date(item.timestamp);
    if (isNaN(timestamp.getTime())) {
      skipped++;
      continue;
    }

    const exists = await prisma.presenceLog.findFirst({
      where: { userId: user.id, timestamp },
      select: { id: true },
    });

    if (exists) {
      skipped++;
      continue;
    }

    await prisma.presenceLog.create({
      data: {
        userId: user.id,
        status: mapStatus(item.physical_state, item.status),
        timestamp,
      },
    });
    inserted++;
  }

  return { inserted, skipped, total: rawLogs.length };
}
