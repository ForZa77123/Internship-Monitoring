import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

function sanitizeCsv(value: unknown): string {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ");
  return `"${(/^[=+\-@]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * GET /api/export
 *
 * Generates a CSV export of intern data.
 * Query params:
 *   - type: "presence" | "logsheet" | "summary"
 *   - internId: (optional) filter by specific intern
 *   - startDate: (optional) ISO date string
 *   - endDate: (optional) ISO date string
 *
 * Protected: ADMIN only.
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "summary";
  const internId = searchParams.get("internId");
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  if (!["presence", "logsheet", "summary"].includes(type)) {
    return NextResponse.json({ error: "Invalid export type." }, { status: 400 });
  }

  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);
  if ((startDateStr && !startDate) || (endDateStr && !endDate)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const dateFilter: Record<string, Date> = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
    dateFilter.lte = endDate;
  }

  try {
    if (type === "presence") {
      return await exportPresenceLogs(internId, dateFilter);
    } else if (type === "logsheet") {
      return await exportActivityLogs(internId, dateFilter);
    } else {
      return await exportSummary(internId, dateFilter);
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Gagal membuat laporan." },
      { status: 500 }
    );
  }
}

// ── Export: Presence Logs ────────────────────────────────────────────────────
async function exportPresenceLogs(
  internId: string | null,
  dateFilter: Record<string, Date>
) {
  const where: Record<string, unknown> = {};
  if (internId) where.userId = internId;
  if (Object.keys(dateFilter).length > 0) where.timestamp = dateFilter;

  const logs = await prisma.presenceLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { timestamp: "desc" },
  });

  const csvRows = [
    ["No", "Nama", "Email", "Status", "Waktu"].join(","),
    ...logs.map((log, i) =>
      [
        i + 1,
        sanitizeCsv(log.user.name),
        sanitizeCsv(log.user.email),
        log.status,
        format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
      ].join(",")
    ),
  ];

  const csv = csvRows.join("\n");
  const filename = `laporan_kehadiran_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ── Export: Activity Logs (Logsheet) ─────────────────────────────────────────
async function exportActivityLogs(
  internId: string | null,
  dateFilter: Record<string, Date>
) {
  const where: Record<string, unknown> = {};
  if (internId) where.userId = internId;
  if (Object.keys(dateFilter).length > 0) where.startTime = dateFilter;

  const logs = await prisma.activityLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const csvRows = [
    [
      "No",
      "Nama",
      "Email",
      "Judul Tugas",
      "Deskripsi",
      "Waktu Mulai",
      "Waktu Selesai",
      "Durasi (menit)",
      "Status Validasi",
      "Catatan Admin",
    ].join(","),
    ...logs.map((log, i) => {
      const durationMin = Math.round(
        (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) /
          60000
      );
      const status = log.validationStatus
        ? log.validationStatus === "APPROVED"
          ? "Disetujui"
          : "Ditolak"
        : "Menunggu";
      return [
        i + 1,
        sanitizeCsv(log.user.name),
        sanitizeCsv(log.user.email),
        sanitizeCsv(log.taskTitle),
        sanitizeCsv(log.description),
        format(new Date(log.startTime), "yyyy-MM-dd HH:mm"),
        format(new Date(log.endTime), "yyyy-MM-dd HH:mm"),
        durationMin,
        status,
        sanitizeCsv(log.validationNote ?? "-"),
      ].join(",");
    }),
  ];

  const csv = csvRows.join("\n");
  const filename = `laporan_logsheet_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ── Export: Summary per Intern ───────────────────────────────────────────────
async function exportSummary(
  internId: string | null,
  dateFilter: Record<string, Date>
) {
  const userWhere: Record<string, unknown> = { role: "INTERN" as const };
  if (internId) userWhere.id = internId;

  const interns = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      name: true,
      email: true,
      presenceLogs: {
        where: Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : undefined,
        orderBy: { timestamp: "asc" },
      },
      activityLogs: {
        where: Object.keys(dateFilter).length > 0 ? { startTime: dateFilter } : undefined,
      },
    },
    orderBy: { name: "asc" },
  });

  const csvRows = [
    [
      "No",
      "Nama",
      "Email",
      "Total Log Kehadiran",
      "Log ACTIVE",
      "Log IDLE",
      "Log AWAY",
      "Total Logsheet",
      "Disetujui",
      "Ditolak",
      "Menunggu",
      "Total Jam Diklaim",
    ].join(","),
    ...interns.map((intern, i) => {
      const activeCount = intern.presenceLogs.filter((l) => l.status === "ACTIVE").length;
      const idleCount = intern.presenceLogs.filter((l) => l.status === "IDLE").length;
      const awayCount = intern.presenceLogs.filter((l) => l.status === "AWAY").length;

      const approvedCount = intern.activityLogs.filter(
        (l) => l.validationStatus === "APPROVED"
      ).length;
      const rejectedCount = intern.activityLogs.filter(
        (l) => l.validationStatus === "REJECTED"
      ).length;
      const pendingCount = intern.activityLogs.filter(
        (l) => !l.validationStatus
      ).length;

      const totalClaimedMinutes = intern.activityLogs.reduce((sum, l) => {
        return (
          sum +
          Math.round(
            (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) /
              60000
          )
        );
      }, 0);
      const totalClaimedHours = (totalClaimedMinutes / 60).toFixed(1);

      return [
        i + 1,
        sanitizeCsv(intern.name),
        sanitizeCsv(intern.email),
        intern.presenceLogs.length,
        activeCount,
        idleCount,
        awayCount,
        intern.activityLogs.length,
        approvedCount,
        rejectedCount,
        pendingCount,
        totalClaimedHours,
      ].join(",");
    }),
  ];

  const csv = csvRows.join("\n");
  const filename = `laporan_ringkasan_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
