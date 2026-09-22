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
  ChevronLeft,
  ChevronRight,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatProductiveTime, calculateDiscrepancy } from "@/lib/utils";

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
  validationStatus: "APPROVED" | "REJECTED" | null;
  validationNote: string | null;
  validatedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function ValidationRow({ log }: { log: ActivityLog }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(log.validationStatus);

  const { data: presenceData } = useSWR<{ data: PresenceLog[] }>(
    `/api/interns/${log.userId}/presence?date=${format(new Date(log.startTime), "yyyy-MM-dd")}`,
    fetcher
  );

  const presenceLogs: PresenceLog[] = presenceData?.data ?? [];

  const activityMinutes = differenceInMinutes(
    new Date(log.endTime),
    new Date(log.startTime)
  );

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
          ? "border-orange-500/30 bg-orange-500/[0.03]"
          : localStatus === "APPROVED"
          ? "border-emerald-500/25 bg-emerald-500/[0.03]"
          : localStatus === "REJECTED"
          ? "border-red-500/25 bg-red-500/[0.03]"
          : "border-border/60 bg-card"
      }`}
    >
      <div className="flex items-center gap-4 p-4">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {log.user.name}
            </span>
            <span className="text-muted-foreground/50 text-xs">|</span>
            <span className="text-sm text-foreground truncate">
              {log.taskTitle}
            </span>
            {hasFlaggedDiscrepancy && !localStatus && (
              <Badge variant="flagged">Ketidaksesuaian</Badge>
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
                  {formatProductiveTime(discrepancy.activePresenceMinutes)} aktif
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {localStatus ? (
            <Badge variant={localStatus === "APPROVED" ? "approved" : "rejected"}>
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
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {expanded && !localStatus && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-secondary/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Logsheet (Klaim)
              </h4>
              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tugas</span>
                  <p className="text-sm font-medium text-foreground">{log.taskTitle}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Deskripsi</span>
                  <p className="text-sm text-foreground">{log.description}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Durasi</span>
                  <p className="text-sm font-bold text-foreground">{formatProductiveTime(activityMinutes)}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg border p-4 ${hasFlaggedDiscrepancy ? "border-orange-500/25 bg-orange-500/[0.04]" : "border-emerald-500/25 bg-emerald-500/[0.04]"}`}>
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Deteksi AI
              </h4>
              {discrepancy ? (
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Aktif Terdeteksi</span>
                    <p className={`text-sm font-bold ${hasFlaggedDiscrepancy ? "text-orange-400" : "text-emerald-400"}`}>
                      {formatProductiveTime(discrepancy.activePresenceMinutes)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Selisih</span>
                    <p className={`text-sm font-bold ${hasFlaggedDiscrepancy ? "text-orange-400" : "text-foreground"}`}>
                      {discrepancy.discrepancyMinutes > 0 ? "+" : ""}
                      {formatProductiveTime(discrepancy.discrepancyMinutes)}
                    </p>
                  </div>
                  {hasFlaggedDiscrepancy && (
                    <div className="mt-2 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <p className="text-xs text-orange-400 leading-relaxed">
                        Intern mengklaim{" "}
                        <strong>{formatProductiveTime(activityMinutes)}</strong>{" "}
                        namun hanya terdeteksi aktif{" "}
                        <strong>{formatProductiveTime(discrepancy.activePresenceMinutes)}</strong>{" "}
                        ({Math.round((discrepancy.activePresenceMinutes / activityMinutes) * 100)}%).
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

          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest block mb-1.5">
              Catatan Admin
            </label>
            <textarea
              id={`validation-note-${log.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tambahkan catatan (opsional)..."
              className="w-full h-20 px-3 py-2 text-sm bg-card border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          <div className="flex gap-2.5 justify-end">
            <Button
              id={`reject-btn-${log.id}`}
              variant="danger"
              size="sm"
              disabled={isLoading}
              onClick={() => handleValidate("REJECTED")}
            >
              <XCircle className="w-4 h-4" />
              Tolak
            </Button>
            <Button
              id={`approve-btn-${log.id}`}
              variant="success"
              size="sm"
              disabled={isLoading}
              onClick={() => handleValidate("APPROVED")}
            >
              <CheckCircle2 className="w-4 h-4" />
              Setujui
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ValidationPage() {
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [currentPage, setCurrentPage] = useState(1);

  const queryParams = new URLSearchParams();
  queryParams.set("page", currentPage.toString());
  queryParams.set("limit", "15");
  if (filterTab !== "all") {
    queryParams.set("status", filterTab);
  }

  const { data, isLoading, error, mutate } = useSWR<{
    data: ActivityLog[];
    pagination?: PaginationMeta;
  }>(
    `/api/activity-logs?${queryParams.toString()}`,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  const handleTabChange = (tab: "all" | "pending" | "approved" | "rejected") => {
    setFilterTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Scale className="w-4 h-4 text-primary" />
          <span className="text-[10px] text-primary uppercase tracking-widest font-semibold">Cross-validation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Validasi Logsheet</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Perbandingan logsheet vs kehadiran fisik
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={filterTab === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => handleTabChange("pending")}
        >
          Menunggu Validasi
        </Button>
        <Button
          variant={filterTab === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => handleTabChange("approved")}
        >
          Disetujui
        </Button>
        <Button
          variant={filterTab === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => handleTabChange("rejected")}
        >
          Ditolak
        </Button>
        <Button
          variant={filterTab === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleTabChange("all")}
        >
          Semua
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-card border border-border/60 rounded-xl">
        <div className="flex items-center gap-2 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-muted-foreground">Ketidaksesuaian</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-muted-foreground">Disetujui</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-muted-foreground">Ditolak</span>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-card border border-border/60 rounded-xl shimmer-line" />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-16 text-muted-foreground">
          Gagal memuat data. Coba refresh halaman.
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Daftar Logsheet {pagination ? `(${pagination.total})` : `(${logs.length})`}
              </h2>
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border/60 rounded-xl text-muted-foreground text-sm">
                Tidak ada logsheet pada kategori ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {logs.map((log) => (
                  <ValidationRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </section>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs text-muted-foreground">
              <span>
                Halaman <strong>{pagination.page}</strong> dari{" "}
                <strong>{pagination.totalPages}</strong> (Total {pagination.total} data)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Berikutnya
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
