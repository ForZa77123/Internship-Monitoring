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
  TrendingUp,
  UserCheck,
  UserX,
  Pause,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatProductiveTime } from "@/lib/utils";

interface InternStatus {
  id: string;
  name: string;
  email: string;
  currentStatus: "ACTIVE" | "IDLE" | "AWAY" | "UNKNOWN";
  lastSeen: string | null;
  productiveMinutesToday: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

function InternStatusCard({ intern, index }: { intern: InternStatus; index: number }) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center text-white font-semibold text-sm">
              {intern.name.charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${getStatusDotClass(intern.currentStatus)}`}
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

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Produktif Hari Ini</span>
          </div>
          <p className="text-base font-bold text-foreground">
            {formatProductiveTime(intern.productiveMinutesToday)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Terakhir Terdeteksi</span>
          </div>
          <p className="text-xs font-medium text-foreground">
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

function SummaryStats({ interns }: { interns: InternStatus[] }) {
  const active = interns.filter((i) => i.currentStatus === "ACTIVE").length;
  const idle = interns.filter((i) => i.currentStatus === "IDLE").length;
  const away = interns.filter((i) => i.currentStatus === "AWAY").length;

  const stats = [
    { label: "Total Peserta", value: interns.length, icon: Users, color: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100", muted: "text-blue-700 dark:text-blue-300" },
    { label: "Aktif", value: active, icon: UserCheck, color: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100", muted: "text-emerald-700 dark:text-emerald-300" },
    { label: "Idle", value: idle, icon: Pause, color: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100", muted: "text-amber-700 dark:text-amber-300" },
    { label: "Tidak di Tempat", value: away, icon: UserX, color: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100", muted: "text-rose-700 dark:text-rose-300" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`rounded-lg p-4 border ${stat.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${stat.muted}`}>{stat.label}</span>
              <Icon className={`w-4 h-4 ${stat.muted}`} />
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<{ data: InternStatus[] }>("/api/interns", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const interns = data?.data ?? [];

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dashboard Monitoring
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Status kehadiran fisik peserta magang secara real-time
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded border border-border bg-card text-xs text-muted-foreground">
            {error ? (
              <>
                <WifiOff className="w-4 h-4 text-rose-500" />
                <span className="text-rose-500 font-medium">Terputus</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span>Auto-refresh 1 menit</span>
              </>
            )}
          </div>
          <button
            id="refresh-dashboard-btn"
            onClick={() => mutate()}
            disabled={isValidating}
            className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-card text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? "animate-spin" : ""}`} />
            Perbarui
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded shimmer-line" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 shimmer-line rounded w-3/4" />
                  <div className="h-2 shimmer-line rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-8 shimmer-line rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-8 text-center">
          <div className="w-14 h-14 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
            <WifiOff className="w-6 h-6 text-rose-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Gagal Memuat Data
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Tidak dapat terhubung ke server. Coba perbarui halaman.
          </p>
          <button
            onClick={() => mutate()}
            className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <SummaryStats interns={interns} />

          {interns.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                Belum Ada Peserta Magang
              </h3>
              <p className="text-muted-foreground text-sm">
                Tambahkan peserta magang melalui menu Kelola Intern.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {interns.map((intern, i) => (
                <InternStatusCard key={intern.id} intern={intern} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
