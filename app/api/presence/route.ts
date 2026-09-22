import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PresenceStatus } from "@prisma/client";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/presence
 *
 * Secure webhook endpoint for the external Python face-recognition AI module.
 * Authentication: X-API-Secret header must match PRESENCE_API_SECRET env var.
 *
 * Expected payload:
 * {
 *   "internId": string,
 *   "status": "ACTIVE" | "IDLE" | "AWAY",
 *   "timestamp": ISO datetime string
 * }
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  
  if (!checkRateLimit(`presence:${ip}`, 60, 60000)) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429 }
    );
  }

  const apiSecret = request.headers.get("X-API-Secret");

  if (!apiSecret || !process.env.PRESENCE_API_SECRET || apiSecret !== process.env.PRESENCE_API_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing API secret." },
      { status: 401 }
    );
  }

  // ── Parse & validate request body ─────────────────────────────────────────
  let body: { internId?: string; status?: string; timestamp?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Bad Request: Invalid JSON body." },
      { status: 400 }
    );
  }

  const { internId, status, timestamp } = body;

  // Validate required fields
  if (!internId || !status || !timestamp) {
    return NextResponse.json(
      { error: "Bad Request: internId, status, and timestamp are required." },
      { status: 400 }
    );
  }

  // Validate status enum
  const validStatuses: string[] = Object.values(PresenceStatus);
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      {
        error: `Bad Request: status must be one of ${validStatuses.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  const parsedTimestamp = new Date(timestamp);
  if (isNaN(parsedTimestamp.getTime())) {
    return NextResponse.json(
      { error: "Bad Request: timestamp must be a valid ISO date string." },
      { status: 400 }
    );
  }

  const now = Date.now();
  const timestampMs = parsedTimestamp.getTime();
  const fiveMinutesMs = 5 * 60 * 1000;
  
  if (timestampMs > now + fiveMinutesMs || timestampMs < now - 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: "Bad Request: timestamp must be within the last 24 hours and not in the future." },
      { status: 400 }
    );
  }

  // ── Verify intern exists ───────────────────────────────────────────────────
  const intern = await prisma.user.findFirst({
    where: { id: internId, role: "INTERN" },
  });

  if (!intern) {
    return NextResponse.json(
      { error: `Not Found: No intern found with id "${internId}".` },
      { status: 404 }
    );
  }

  // ── Create presence log ────────────────────────────────────────────────────
  const log = await prisma.presenceLog.create({
    data: {
      userId: internId,
      status: status as PresenceStatus,
      timestamp: parsedTimestamp,
    },
  });

  return NextResponse.json(
    {
      message: "Presence log recorded successfully.",
      data: log,
    },
    { status: 201 }
  );
}
