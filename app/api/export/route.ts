import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateProductiveMinutes } from "@/lib/utils";
import { recordUserLog } from "@/lib/user-log";
import { isDemoViewerSession } from "@/lib/demo-viewer";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import ExcelJS from "exceljs";

function parseWIBDate(value: string | null, isEnd: boolean): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T${isEnd ? "23:59:59.999" : "00:00:00"}+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  if (isEnd) date.setHours(23, 59, 59, 999);
  return date;
}

function statusPresenceLabel(status: string): string {
  return status === "ACTIVE" ? "Aktif" : status === "IDLE" ? "Idle" : "Tidak di Tempat";
}

async function buildXlsx(
  sheetName: string,
  title: string,
  dateFilter: Record<string, Date>,
  headers: string[],
  rows: (string | number)[][],
  filename: string
): Promise<NextResponse> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistem Monitoring Peserta Magang";
  const ws = wb.addWorksheet(sheetName);

  const periodText = `Periode: ${
    dateFilter.gte ? format(dateFilter.gte, "dd/MM/yyyy") : "Awal"
  } s/d ${dateFilter.lte ? format(dateFilter.lte, "dd/MM/yyyy") : "Sekarang"}`;

  ws.mergeCells(1, 1, 1, headers.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, headers.length);
  const metaCell = ws.getCell(2, 1);
  metaCell.value = `Tanggal Cetak: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeId })} WIB  |  ${periodText}`;
  metaCell.font = { italic: true, size: 10, color: { argb: "FF555555" } };
  metaCell.alignment = { horizontal: "center" };

  const headerRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFB0B0B0" } },
      bottom: { style: "thin", color: { argb: "FFB0B0B0" } },
      left: { style: "thin", color: { argb: "FFB0B0B0" } },
      right: { style: "thin", color: { argb: "FFB0B0B0" } },
    };
  });
  headerRow.height = 22;

  rows.forEach((row, ri) => {
    const r = ws.getRow(5 + ri);
    row.forEach((val, ci) => {
      const cell = r.getCell(ci + 1);
      cell.value = val;
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
        left: { style: "thin", color: { argb: "FFD9D9D9" } },
        right: { style: "thin", color: { argb: "FFD9D9D9" } },
      };
      if (ri % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7FB" } };
      }
    });
  });

  ws.columns.forEach((col, i) => {
    const header = headers[i] ?? "";
    let max = header.length;
    rows.slice(0, 200).forEach((row) => {
      const len = String(row[i] ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(Math.max(max + 4, 10), 50);
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: headers.length } };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * GET /api/export
 *
 * Generates an XLSX export of intern data.
 * - ADMIN: can filter any intern via internId.
 * - INTERN: forced to their own data (internId ignored).
 * Query params:
 *   - type: "presence" | "logsheet" | "summary"
 *   - internId: (optional) filter by specific intern
 *   - startDate: (optional) ISO date string
 *   - endDate: (optional) ISO date string
 *
 * Protected: ADMIN and INTERN only.
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "summary";
  let internId = searchParams.get("internId");

  if (session.user.role === "INTERN") {
    internId = session.user.id;
  } else if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  if (!["presence", "logsheet", "summary"].includes(type)) {
    return NextResponse.json({ error: "Invalid export type." }, { status: 400 });
  }

  const startDate = parseWIBDate(startDateStr, false);
  const endDate = parseWIBDate(endDateStr, true);
  if ((startDateStr && !startDate) || (endDateStr && !endDate)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const dateFilter: Record<string, Date> = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  try {
    const labelMap: Record<string, string> = {
      presence: "Laporan Kehadiran Fisik AI",
      logsheet: "Laporan Logsheet Aktivitas",
      summary: "Laporan Ringkasan Performa",
    };
    if (!isDemoViewerSession(session)) {
      await recordUserLog({
        userId: session.user.id,
        action: "EXPORT_REPORT",
        description: `Mengunduh file Excel: ${labelMap[type] ?? type}`,
      });
    }

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

  const headers = ["No", "Nama Peserta", "Email", "Status Deteksi", "Tanggal", "Waktu (WIB)"];
  const rows: (string | number)[][] = logs.map((log, i) => {
    const dt = new Date(log.timestamp);
    return [
      i + 1,
      log.user.name,
      log.user.email,
      statusPresenceLabel(log.status),
      format(dt, "dd/MM/yyyy"),
      format(dt, "HH:mm:ss"),
    ];
  });

  return buildXlsx(
    "Kehadiran",
    "SISTEM MONITORING PESERTA MAGANG — LAPORAN KEHADIRAN FISIK (AI)",
    dateFilter,
    headers,
    rows,
    `laporan_kehadiran_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
  );
}

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

  const headers = [
    "No",
    "Nama Peserta",
    "Email",
    "Judul Tugas",
    "Deskripsi",
    "Waktu Mulai (WIB)",
    "Waktu Selesai (WIB)",
    "Durasi",
    "Status Validasi",
    "Catatan Admin",
  ];
  const rows: (string | number)[][] = logs.map((log, i) => {
    const durationMin = Math.round(
      (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 60000
    );
    const status = log.validationStatus
      ? log.validationStatus === "APPROVED"
        ? "Disetujui"
        : "Ditolak"
      : "Menunggu";
    return [
      i + 1,
      log.user.name,
      log.user.email,
      log.taskTitle,
      log.description,
      format(new Date(log.startTime), "dd/MM/yyyy HH:mm"),
      format(new Date(log.endTime), "dd/MM/yyyy HH:mm"),
      `${Math.floor(durationMin / 60)}j ${durationMin % 60}m`,
      status,
      log.validationNote ?? "-",
    ];
  });

  return buildXlsx(
    "Logsheet",
    "SISTEM MONITORING PESERTA MAGANG — LAPORAN LOGSHEET AKTIVITAS",
    dateFilter,
    headers,
    rows,
    `laporan_logsheet_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
  );
}

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
      department: true,
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

  const headers = [
    "No",
    "Nama Peserta",
    "Email",
    "Divisi",
    "Total Log Kehadiran",
    "Log Aktif",
    "Log Idle",
    "Log Away",
    "Total Logsheet",
    "Disetujui",
    "Ditolak",
    "Menunggu",
    "Total Jam Produktif (AI)",
    "Total Jam Diklaim",
  ];
  const rows: (string | number)[][] = interns.map((intern, i) => {
    const activeCount = intern.presenceLogs.filter((l) => l.status === "ACTIVE").length;
    const idleCount = intern.presenceLogs.filter((l) => l.status === "IDLE").length;
    const awayCount = intern.presenceLogs.filter((l) => l.status === "AWAY").length;

    const approvedCount = intern.activityLogs.filter(
      (l) => l.validationStatus === "APPROVED"
    ).length;
    const rejectedCount = intern.activityLogs.filter(
      (l) => l.validationStatus === "REJECTED"
    ).length;
    const pendingCount = intern.activityLogs.filter((l) => !l.validationStatus).length;

    const productiveMinutesAI = calculateProductiveMinutes(intern.presenceLogs);

    const totalClaimedMinutes = intern.activityLogs.reduce((sum, l) => {
      return (
        sum +
        Math.round(
          (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / 60000
        )
      );
    }, 0);

    return [
      i + 1,
      intern.name,
      intern.email,
      intern.department ?? "-",
      intern.presenceLogs.length,
      activeCount,
      idleCount,
      awayCount,
      intern.activityLogs.length,
      approvedCount,
      rejectedCount,
      pendingCount,
      `${(productiveMinutesAI / 60).toFixed(1)} jam`,
      `${(totalClaimedMinutes / 60).toFixed(1)} jam`,
    ];
  });

  return buildXlsx(
    "Ringkasan",
    "SISTEM MONITORING PESERTA MAGANG — RINGKASAN PERFORMA PESERTA",
    dateFilter,
    headers,
    rows,
    `laporan_ringkasan_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
  );
}
