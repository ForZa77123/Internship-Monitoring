import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/activity-logs/[id]/validate
 *
 * ADMIN approves or rejects an intern's activity log entry.
 *
 * Expected payload:
 * {
 *   "action": "APPROVED" | "REJECTED",
 *   "note": string (optional rejection/approval note)
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin access required." },
      { status: 403 }
    );
  }

  let body: { action?: string; note?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { action, note } = body;

  if (!action || !["APPROVED", "REJECTED"].includes(action)) {
    return NextResponse.json(
      { error: 'action must be "APPROVED" or "REJECTED".' },
      { status: 400 }
    );
  }

  const log = await prisma.activityLog.findUnique({
    where: { id: params.id },
  });

  if (!log) {
    return NextResponse.json(
      { error: "Activity log not found." },
      { status: 404 }
    );
  }

  const updated = await prisma.activityLog.update({
    where: { id: params.id },
    data: {
      isValidated: true,
      validationStatus: action,
      validationNote: note ?? null,
      validatedAt: new Date(),
    },
  });

  return NextResponse.json({
    message: `Activity log ${action.toLowerCase()} successfully.`,
    data: updated,
  });
}
