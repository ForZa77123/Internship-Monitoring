import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

/**
 * GET /api/interns/[id]/presence
 *
 * Returns presence logs for a specific intern.
 * - ADMIN can view any intern's history.
 * - INTERN can only view their own history.
 *
 * Query params:
 *   ?date=YYYY-MM-DD  (optional, defaults to today)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // INTERNs can only view their own logs
  if (session.user.role === "INTERN" && session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Verify the target intern exists
  const intern = await prisma.user.findFirst({
    where: { id, role: "INTERN" },
    select: { id: true, name: true },
  });

  if (!intern) {
    return NextResponse.json({ error: "Intern not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  if (isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  const where = {
    userId: id,
    timestamp: {
      gte: startOfDay(targetDate),
      lte: endOfDay(targetDate),
    },
  };

  if (pageParam) {
    const page = Math.max(parseInt(pageParam, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.presenceLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.presenceLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      intern,
    });
  }

  const logs = await prisma.presenceLog.findMany({
    where,
    orderBy: { timestamp: "asc" },
  });

  return NextResponse.json({ data: logs, intern });
}
