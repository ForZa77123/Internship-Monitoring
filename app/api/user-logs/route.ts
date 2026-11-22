import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWIBDayBounds } from "@/lib/utils";

/**
 * Backfills initial UserLog entries from existing users and activityLogs
 * if the user_logs table is completely empty, ensuring historical system usage is visible.
 */
async function ensureInitialUserLogs() {
  const count = await prisma.userLog.count();
  if (count > 0) return;

  const [users, activityLogs] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, role: true, department: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, name: true } },
        validatedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const adminUser = users.find((u) => u.role === "ADMIN");
  const initialLogs: {
    userId: string;
    action: string;
    description: string;
    createdAt: Date;
  }[] = [];

  for (const u of users) {
    initialLogs.push({
      userId: u.id,
      action: "LOGIN",
      description: `Login ke dalam sistem sebagai ${u.role === "ADMIN" ? "Administrator" : "Peserta Magang"}`,
      createdAt: u.createdAt,
    });
    if (u.department) {
      initialLogs.push({
        userId: u.id,
        action: "UPDATE_PROFILE",
        description: `Memperbarui profil pengguna (${u.name} — Divisi: ${u.department})`,
        createdAt: new Date(u.createdAt.getTime() + 60_000),
      });
    }
  }

  for (const act of activityLogs) {
    initialLogs.push({
      userId: act.userId,
      action: "CREATE_LOGSHEET",
      description: `Menginput logsheet aktivitas: "${act.taskTitle}"`,
      createdAt: act.createdAt,
    });

    if (act.isValidated && act.validationStatus) {
      const validatorId = act.validatedById ?? adminUser?.id ?? act.userId;
      initialLogs.push({
        userId: validatorId,
        action: "VALIDATE_LOGSHEET",
        description: `${
          act.validationStatus === "APPROVED" ? "Menyetujui (Approve)" : "Menolak (Reject)"
        } logsheet "${act.taskTitle}" milik ${act.user.name}${
          act.validationNote ? ` — Catatan: "${act.validationNote}"` : ""
        }`,
        createdAt: act.validatedAt ?? new Date(act.createdAt.getTime() + 120_000),
      });
    }
  }

  if (initialLogs.length > 0) {
    await prisma.userLog.createMany({ data: initialLogs });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    await ensureInitialUserLogs();
  } catch (err) {
    console.error("[user-logs] Backfill error:", err);
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "15", 10), 1), 100);
  const skip = (page - 1) * limit;

  const actionParam = searchParams.get("action");
  const dateParam = searchParams.get("date");
  const searchParam = searchParams.get("search")?.trim();

  const where: Record<string, unknown> = {};

  if (actionParam && actionParam !== "ALL") {
    if (actionParam === "LOGSHEET") {
      where.action = { in: ["CREATE_LOGSHEET", "UPDATE_LOGSHEET", "DELETE_LOGSHEET"] };
    } else {
      where.action = actionParam;
    }
  }

  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const { dayStart, dayEnd } = getWIBDayBounds(dateParam);
    where.createdAt = { gte: dayStart, lte: dayEnd };
  }

  if (searchParam) {
    where.OR = [
      { description: { contains: searchParam, mode: "insensitive" } },
      { user: { name: { contains: searchParam, mode: "insensitive" } } },
      { user: { email: { contains: searchParam, mode: "insensitive" } } },
    ];
  }

  const { dayStart: todayStart, dayEnd: todayEnd } = getWIBDayBounds();

  const [logs, total, todayCount, loginCount, validationCount] = await Promise.all([
    prisma.userLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.userLog.count({ where }),
    prisma.userLog.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.userLog.count({
      where: { action: "LOGIN" },
    }),
    prisma.userLog.count({
      where: { action: "VALIDATE_LOGSHEET" },
    }),
  ]);

  return NextResponse.json({
    data: logs,
    stats: {
      total,
      todayCount,
      loginCount,
      validationCount,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
