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
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // INTERNs can only view their own logs
  if (session.user.role === "INTERN" && session.user.id !== params.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Verify the target intern exists
  const intern = await prisma.user.findFirst({
    where: { id: params.id, role: "INTERN" },
    select: { id: true, name: true },
  });

  if (!intern) {
    return NextResponse.json({ error: "Intern not found." }, { status: 404 });
  }

  // Parse optional date filter
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  const logs = await prisma.presenceLog.findMany({
    where: {
      userId: params.id,
      timestamp: {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      },
    },
    orderBy: { timestamp: "asc" },
  });

  return NextResponse.json({ data: logs, intern });
}
