"use client";

import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Users,
  Activity,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatProductiveTime } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface InternStatus {
  id: string;
  name: string;
  email: string;
  currentStatus: "ACTIVE" | "IDLE" | "AWAY" | "UNKNOWN";
  lastSeen: string | null;
  productiveMinutesToday: number;
}

// ── Fetcher ───────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ── Status helpers ────────────────────────────────────────────────────────────
function getStatusBadgeVariant(status: InternStatus["currentStatus"]) {
  const map = {
    ACTIVE: "active",
    IDLE: "idle",
    AWAY: "away",
    UNKNOWN: "unknown",
  } as const;
  return map[status] ?? "unknown";
}

function getStatusLabel(status: InternStatus["currentStatus"]) {
  const map = {
    ACTIVE: "Aktif",
    IDLE: "Idle",
    AWAY: "Tidak di Tempat",
    UNKNOWN: "Tidak Diketahui",
  };
  return map[status] ?? "Tidak Diketahui";
}

function getStatusDotClass(status: InternStatus["currentStatus"]) {
  const map = {
    ACTIVE: "bg-emerald-400 status-dot-active",
    IDLE: "bg-amber-400",
    AWAY: "bg-red-400",
    UNKNOWN: "bg-slate-400",
  };
  return map[status] ?? "bg-slate-400";
}

// ── InternStatusCard Component ────────────────────────────────────────────────
function InternStatusCard({ intern }: { intern: InternStatus }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 card-hover">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar with status dot */}
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base">
              {intern.name.charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${getStatusDotClass(intern.currentStatus)}`}
            />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{intern.name}</p>
            <p className="text-xs text-muted-foreground">{intern.email}</p>
          </div>
        </div>
        <Badge variant={getStatusBadgeVariant(intern.currentStatus)}>
          {getStatusLabel(intern.currentStatus)}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Produktif Hari Ini</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {formatProductiveTime(intern.productiveMinutesToday)}
          </p>
        </div>

        <div className="bg-secondary rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Terakhir Terdeteksi</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            {intern.lastSeen
              ? formatDistanceToNow(new Date(intern.lastSeen), {
                  addSuffix: true,
                  locale: localeId,
                })
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Summary Stats ─────────────────────────────────────────────────────────────
function SummaryStats({ interns }: { interns: InternStatus[] }) {
  const active = interns.filter((i) => i.currentStatus === "ACTIVE").length;
  const idle = interns.filter((i) => i.currentStatus === "IDLE").length;
  const away = interns.filter((i) => i.currentStatus === "AWAY").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {[
        { label: "Total Peserta", value: interns.length, color: "text-foreground", bg: "bg-secondary" },
        { label: "Aktif", value: active, color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/20" },
        { label: "Idle", value: idle, color: "text-amber-400", bg: "bg-amber-500/10 border border-amber-500/20" },
        { label: "Tidak di Tempat", value: away, color: "text-red-400", bg: "bg-red-500/10 border border-red-500/20" },
      ].map((stat) => (
        <div key={stat.label} className={`rounded-xl p-4 ${stat.bg}`}>
          <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
          <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<{ data: InternStatus[] }>("/api/interns", fetcher, {
    // Poll every 5 minutes (300 000 ms) as per requirements
    refreshInterval: 300_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const interns = data?.data ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dashboard Monitor
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Status kehadiran fisik peserta magang secara real-time
          </p>
        </div>

        {/* Connection & Refresh indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground">
            {error ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400">Koneksi Terputus</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Polling setiap 5 menit</span>
              </>
            )}
          </div>
          <button
            id="refresh-dashboard-btn"
            onClick={() => mutate()}
            disabled={isValidating}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isValidating ? "animate-spin" : ""}`}
            />
            Perbarui
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-secondary rounded w-3/4" />
                  <div className="h-2.5 bg-secondary rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 bg-secondary rounded-lg" />
                <div className="h-16 bg-secondary rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <WifiOff className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Gagal Memuat Data
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Tidak dapat terhubung ke server. Periksa koneksi Anda.
          </p>
          <button
            onClick={() => mutate()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Data loaded */}
      {!isLoading && !error && (
        <>
          {/* Summary stats */}
          <SummaryStats interns={interns} />

          {/* Intern grid */}
          {interns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Belum Ada Peserta Magang
              </h3>
              <p className="text-muted-foreground text-sm">
                Tambahkan peserta magang melalui database atau seed script.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {interns.map((intern) => (
                <InternStatusCard key={intern.id} intern={intern} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
