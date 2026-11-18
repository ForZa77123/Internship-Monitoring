import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateProductiveMinutes, getWIBDayBounds } from "@/lib/utils";

/**
 * GET /api/interns
 *
 * Returns all interns with:
 * - Their latest presence status (from today's logs in WIB)
 * - Today's total productive (ACTIVE) time in minutes
 *
 * Protected: ADMIN only.
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { dayStart, dayEnd } = getWIBDayBounds();
  const now = new Date();

  const interns = await prisma.user.findMany({
    where: { role: "INTERN" },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      presenceLogs: {
        where: {
          timestamp: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        orderBy: { timestamp: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = interns.map((intern) => {
    const latestLog = intern.presenceLogs[0] ?? null;
    const productiveMinutes = calculateProductiveMinutes(
      [...intern.presenceLogs].reverse(),
      now
    );

    return {
      id: intern.id,
      name: intern.name,
      email: intern.email,
      department: intern.department,
      currentStatus: latestLog?.status ?? "UNKNOWN",
      lastSeen: latestLog?.timestamp ?? null,
      productiveMinutesToday: productiveMinutes,
    };
  });

  return NextResponse.json({ data: result });
}
