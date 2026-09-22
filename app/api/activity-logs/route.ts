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

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100);
  const skip = (page - 1) * limit;
  const statusParam = searchParams.get("status");
  const validatedParam = searchParams.get("validated");

  const where: Record<string, unknown> = session.user.role === "ADMIN" ? {} : { userId: session.user.id };

  if (statusParam === "pending") {
    where.isValidated = false;
  } else if (statusParam === "approved") {
    where.validationStatus = "APPROVED";
  } else if (statusParam === "rejected") {
    where.validationStatus = "REJECTED";
  }

  if (validatedParam === "false") {
    where.isValidated = false;
  } else if (validatedParam === "true") {
    where.isValidated = true;
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: session.user.role === "ADMIN"
        ? { user: { select: { id: true, name: true, email: true } } }
        : undefined,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return NextResponse.json({
    data: logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
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

  const now = new Date();
  if (end > now) {
    return NextResponse.json(
      { error: "Waktu aktivitas tidak boleh di masa depan." },
      { status: 400 }
    );
  }

  const overlapping = await prisma.activityLog.findFirst({
    where: {
      userId: session.user.id,
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { taskTitle: true },
  });

  if (overlapping) {
    return NextResponse.json(
      { error: `Waktu bertabrakan dengan aktivitas lain: "${overlapping.taskTitle}".` },
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

/**
 * PUT /api/activity-logs
 * INTERN edits and resubmits a REJECTED activity log.
 * Resets validation status back to pending.
 */
export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "INTERN") {
    return NextResponse.json(
      { error: "Forbidden: Only interns can edit their logs." },
      { status: 403 }
    );
  }

  let body: {
    id?: string;
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

  const { id, taskTitle, description, startTime, endTime } = body;

  if (!id || !taskTitle || !description || !startTime || !endTime) {
    return NextResponse.json(
      { error: "id, taskTitle, description, startTime, and endTime are required." },
      { status: 400 }
    );
  }

  // Find the existing log
  const existing = await prisma.activityLog.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Activity log not found." }, { status: 404 });
  }

  // Verify ownership
  if (existing.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Forbidden: You can only edit your own logs." },
      { status: 403 }
    );
  }

  // Only allow editing REJECTED logs
  if (existing.validationStatus !== "REJECTED") {
    return NextResponse.json(
      { error: "Hanya logsheet yang ditolak yang bisa direvisi." },
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

  const now = new Date();
  if (end > now) {
    return NextResponse.json(
      { error: "Waktu aktivitas tidak boleh di masa depan." },
      { status: 400 }
    );
  }

  const overlapping = await prisma.activityLog.findFirst({
    where: {
      userId: session.user.id,
      id: { not: id },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { taskTitle: true },
  });

  if (overlapping) {
    return NextResponse.json(
      { error: `Waktu bertabrakan dengan aktivitas lain: "${overlapping.taskTitle}".` },
      { status: 400 }
    );
  }

  // Update the log and reset validation status
  const updated = await prisma.activityLog.update({
    where: { id },
    data: {
      taskTitle,
      description,
      startTime: start,
      endTime: end,
      isValidated: false,
      validationStatus: null,
      validationNote: null,
      validatedAt: null,
    },
  });

  return NextResponse.json({
    message: "Logsheet berhasil direvisi dan dikirim ulang.",
    data: updated,
  });
}
