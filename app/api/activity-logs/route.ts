import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/activity-logs
 * - ADMIN: returns all activity logs with user info.
 * - INTERN: returns only their own activity logs.
 *
 * POST /api/activity-logs
 * - INTERN: submits a new activity log entry.
 */

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    // ADMIN sees all logs
    const logs = await prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: logs });
  }

  // INTERN sees only their own logs
  const logs = await prisma.activityLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: logs });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "INTERN") {
    return NextResponse.json(
      { error: "Forbidden: Only interns can submit activity logs." },
      { status: 403 }
    );
  }

  let body: {
    taskTitle?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { taskTitle, description, startTime, endTime } = body;

  if (!taskTitle || !description || !startTime || !endTime) {
    return NextResponse.json(
      { error: "taskTitle, description, startTime, and endTime are required." },
      { status: 400 }
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json(
      { error: "startTime and endTime must be valid date strings." },
      { status: 400 }
    );
  }

  if (end <= start) {
    return NextResponse.json(
      { error: "endTime must be after startTime." },
      { status: 400 }
    );
  }

  const log = await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      taskTitle,
      description,
      startTime: start,
      endTime: end,
    },
  });

  return NextResponse.json({ message: "Activity log created.", data: log }, { status: 201 });
}
