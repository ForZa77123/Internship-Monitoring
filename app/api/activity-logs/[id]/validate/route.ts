import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ValidationStatus } from "@prisma/client";

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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    where: { id },
  });

  if (!log) {
    return NextResponse.json(
      { error: "Activity log not found." },
      { status: 404 }
    );
  }

  const updated = await prisma.activityLog.update({
    where: { id },
    data: {
      isValidated: true,
      validationStatus: action as ValidationStatus,
      validationNote: note?.trim() || null,
      validatedAt: new Date(),
      validatedById: session.user.id,
    },
  });

  return NextResponse.json({
    message: `Activity log ${action.toLowerCase()} successfully.`,
    data: updated,
  });
}
