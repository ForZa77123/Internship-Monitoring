"use client";

import { useState } from "react";
import useSWR from "swr";
import { format, differenceInMinutes } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatProductiveTime, calculateDiscrepancy } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PresenceLog {
  id: string;
  userId: string;
  status: "ACTIVE" | "IDLE" | "AWAY";
  timestamp: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  taskTitle: string;
  description: string;
  startTime: string;
  endTime: string;
  isValidated: boolean;
  validationStatus: string | null;
  validationNote: string | null;
  validatedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ── Validation Row ─────────────────────────────────────────────────────────────
function ValidationRow({ log }: { log: ActivityLog }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(log.validationStatus);

  // Fetch this intern's presence logs for cross-validation
  const { data: presenceData } = useSWR<{ data: PresenceLog[] }>(
    `/api/interns/${log.userId}/presence?date=${format(new Date(log.startTime), "yyyy-MM-dd")}`,
    fetcher
  );

  const presenceLogs: PresenceLog[] = presenceData?.data ?? [];

  const activityMinutes = differenceInMinutes(
    new Date(log.endTime),
    new Date(log.startTime)
  );

  // Calculate discrepancy using the utility function
  const discrepancy = presenceLogs.length > 0
    ? calculateDiscrepancy(
        new Date(log.startTime),
        new Date(log.endTime),
        presenceLogs as any
      )
    : null;

  const hasFlaggedDiscrepancy = discrepancy?.hasFlaggedDiscrepancy ?? false;

  const handleValidate = async (action: "APPROVED" | "REJECTED") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/activity-logs/${log.id}/validate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });

      if (res.ok) {
        setLocalStatus(action);
        setExpanded(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        hasFlaggedDiscrepancy && !localStatus
          ? "border-orange-500/40 bg-orange-500/5"
          : localStatus === "APPROVED"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : localStatus === "REJECTED"
          ? "border-red-500/30 bg-red-500/5"
          : "border-border bg-card"
      }`}
    >
      {/* Row header */}
      <div className="flex items-center gap-4 p-4">
        {/* Flag icon */}
        <div className="shrink-0">
          {localStatus === "APPROVED" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : localStatus === "REJECTED" ? (
            <XCircle className="w-5 h-5 text-red-400" />
          ) : hasFlaggedDiscrepancy ? (
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          ) : (
            <FileText className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* Intern name & task */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {log.user.name}
            </span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-sm text-foreground truncate">
              {log.taskTitle}
            </span>
            {hasFlaggedDiscrepancy && !localStatus && (
              <Badge variant="flagged">⚠ Ketidaksesuaian Terdeteksi</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(log.startTime), "HH:mm", { locale: localeId })} —{" "}
              {format(new Date(log.endTime), "HH:mm", { locale: localeId })}
            </span>
            <span className="text-xs text-muted-foreground">
              ({formatProductiveTime(activityMinutes)} diklaim)
            </span>
            {discrepancy && (
              <span className="text-xs text-muted-foreground">
                |{" "}
                <span className={hasFlaggedDiscrepancy ? "text-orange-400 font-medium" : "text-emerald-400"}>
                  {formatProductiveTime(discrepancy.activePresenceMinutes)} terdeteksi aktif
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Status badge & expand toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {localStatus ? (
            <Badge
              variant={
                localStatus === "APPROVED" ? "approved" : "rejected"
              }
            >
              {localStatus === "APPROVED" ? "Disetujui" : "Ditolak"}
            </Badge>
          ) : (
            <Badge variant="outline">Menunggu</Badge>
          )}
          {!localStatus && (
            <button
              id={`expand-row-${log.id}`}
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && !localStatus && (
        <div className="border-t border-border p-4 space-y-4 bg-secondary/30">
          {/* Comparison table */}
          <div className="grid grid-cols-2 gap-4">
            {/* Logsheet side */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                📋 Logsheet (Klaim Intern)
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground">Tugas</span>
                  <p className="text-sm font-medium text-foreground">{log.taskTitle}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Deskripsi</span>
                  <p className="text-sm text-foreground">{log.description}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Durasi Diklaim</span>
                  <p className="text-sm font-bold text-foreground">
                    {formatProductiveTime(activityMinutes)}
                  </p>
                </div>
              </div>
            </div>

            {/* Presence side */}
            <div className={`rounded-lg border p-4 ${hasFlaggedDiscrepancy ? "border-orange-500/30 bg-orange-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                📡 Deteksi Fisik (AI Face Recognition)
              </h4>
              {discrepancy ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Waktu Aktif Terdeteksi</span>
                    <p className={`text-sm font-bold ${hasFlaggedDiscrepancy ? "text-orange-400" : "text-emerald-400"}`}>
                      {formatProductiveTime(discrepancy.activePresenceMinutes)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Selisih</span>
                    <p className={`text-sm font-bold ${hasFlaggedDiscrepancy ? "text-orange-400" : "text-foreground"}`}>
                      {discrepancy.discrepancyMinutes > 0 ? "+" : ""}
                      {formatProductiveTime(discrepancy.discrepancyMinutes)}
                    </p>
                  </div>
                  {hasFlaggedDiscrepancy && (
                    <div className="mt-2 p-2 rounded bg-orange-500/10 border border-orange-500/20">
                      <p className="text-xs text-orange-400">
                        ⚠ Intern mengklaim{" "}
                        <strong>{formatProductiveTime(activityMinutes)}</strong>{" "}
                        namun hanya terdeteksi aktif{" "}
                        <strong>
                          {formatProductiveTime(discrepancy.activePresenceMinutes)}
                        </strong>{" "}
                        ({Math.round((discrepancy.activePresenceMinutes / activityMinutes) * 100)}% kehadiran fisik).
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tidak ada data kehadiran untuk periode ini.
                </p>
              )}
            </div>
          </div>

          {/* Admin note input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Catatan Admin (opsional)
            </label>
            <textarea
              id={`validation-note-${log.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tambahkan catatan untuk peserta magang..."
              className="w-full h-20 px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              id={`reject-btn-${log.id}`}
              variant="danger"
              size="sm"
              disabled={isLoading}
              onClick={() => handleValidate("REJECTED")}
            >
              <XCircle className="w-4 h-4" />
              Tolak Logsheet
            </Button>
            <Button
              id={`approve-btn-${log.id}`}
              variant="success"
              size="sm"
              disabled={isLoading}
              onClick={() => handleValidate("APPROVED")}
            >
              <CheckCircle2 className="w-4 h-4" />
              Setujui Logsheet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Validation Page ──────────────────────────────────────────────────────
export default function ValidationPage() {
  const { data, isLoading, error } = useSWR<{ data: ActivityLog[] }>(
    "/api/activity-logs",
    fetcher,
    { refreshInterval: 300_000, revalidateOnFocus: false }
  );

  const logs = data?.data ?? [];
  const pendingLogs = logs.filter((l) => !l.isValidated);
  const validatedLogs = logs.filter((l) => l.isValidated);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Validasi Logsheet</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Perbandingan logsheet aktivitas vs kehadiran fisik terdeteksi AI
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-muted-foreground">Ketidaksesuaian terdeteksi — perlu perhatian admin</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-muted-foreground">Logsheet disetujui</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-muted-foreground">Logsheet ditolak</span>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          Gagal memuat data. Coba refresh halaman.
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Pending validation */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Menunggu Validasi ({pendingLogs.length})
            </h2>
            {pendingLogs.length === 0 ? (
              <div className="text-center py-10 bg-card border border-border rounded-xl text-muted-foreground">
                Tidak ada logsheet yang menunggu validasi. 🎉
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLogs.map((log) => (
                  <ValidationRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </section>

          {/* Validated */}
          {validatedLogs.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Sudah Divalidasi ({validatedLogs.length})
              </h2>
              <div className="space-y-3">
                {validatedLogs.map((log) => (
                  <ValidationRow key={log.id} log={log} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
