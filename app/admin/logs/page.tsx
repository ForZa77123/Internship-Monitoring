"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  ScrollText,
  Search,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LogIn,
  ClipboardList,
  CheckSquare,
  UserCog,
  FileDown,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserLogEntry {
  id: string;
  userId: string;
  action: string;
  description: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "INTERN";
    department?: string | null;
  };
}

interface UserLogResponse {
  data: UserLogEntry[];
  stats?: {
    total: number;
    todayCount: number;
    loginCount: number;
    validationCount: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getActionBadge(action: string) {
  switch (action) {
    case "LOGIN":
      return { label: "Login", variant: "secondary" as const };
    case "CREATE_LOGSHEET":
      return { label: "Input Logsheet", variant: "active" as const };
    case "UPDATE_LOGSHEET":
      return { label: "Revisi Logsheet", variant: "idle" as const };
    case "DELETE_LOGSHEET":
      return { label: "Hapus Logsheet", variant: "away" as const };
    case "VALIDATE_LOGSHEET":
      return { label: "Validasi Admin", variant: "approved" as const };
    case "UPDATE_PROFILE":
      return { label: "Update Profil", variant: "outline" as const };
    case "MANAGE_INTERN":
      return { label: "Kelola Akun", variant: "outline" as const };
    case "EXPORT_REPORT":
      return { label: "Ekspor Laporan", variant: "secondary" as const };
    default:
      return { label: action, variant: "outline" as const };
  }
}

export default function AdminUserLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const queryParams = new URLSearchParams();
  queryParams.set("page", currentPage.toString());
  queryParams.set("limit", "15");
  if (actionFilter !== "ALL") queryParams.set("action", actionFilter);
  if (dateFilter) queryParams.set("date", dateFilter);
  if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());

  const { data, isLoading, isValidating, mutate } = useSWR<UserLogResponse>(
    `/api/user-logs?${queryParams.toString()}`,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const logs = data?.data ?? [];
  const stats = data?.stats;
  const pagination = data?.pagination;

  const filterButtons = [
    { key: "ALL", label: "Semua Aktivitas" },
    { key: "LOGIN", label: "Login" },
    { key: "LOGSHEET", label: "Input / Edit Logsheet" },
    { key: "VALIDATE_LOGSHEET", label: "Validasi Admin" },
    { key: "UPDATE_PROFILE", label: "Profil" },
    { key: "MANAGE_INTERN", label: "Kelola Akun" },
    { key: "EXPORT_REPORT", label: "Ekspor" },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ScrollText className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-primary uppercase tracking-widest font-semibold">
              Audit Trail & User Log
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Log Aktivitas Pengguna
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rekam jejak riwayat penggunaan sistem oleh Administrator dan Peserta Magang
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isValidating}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isValidating ? "animate-spin" : ""}`} />
          Perbarui Log
        </Button>
      </div>

      {/* Statistik Ringkasan User Log */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4 border border-border bg-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Total Log Tercatat</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.total ?? logs.length}</p>
        </div>
        <div className="rounded-xl p-4 border border-border bg-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Aktivitas Hari Ini</span>
            <ClipboardList className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.todayCount ?? 0}</p>
        </div>
        <div className="rounded-xl p-4 border border-border bg-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Total Sesi Login</span>
            <LogIn className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.loginCount ?? 0}</p>
        </div>
        <div className="rounded-xl p-4 border border-border bg-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Validasi Logsheet</span>
            <CheckSquare className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.validationCount ?? 0}</p>
        </div>
      </div>

      {/* Filter & Pencarian */}
      <div className="bg-card border border-border/60 rounded-xl p-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search-user-logs"
              placeholder="Cari nama pengguna, email, atau deskripsi aktivitas..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              id="date-user-logs"
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 bg-secondary border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {dateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFilter("");
                  setCurrentPage(1);
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filterButtons.map((btn) => (
            <Button
              key={btn.key}
              variant={actionFilter === btn.key ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setActionFilter(btn.key);
                setCurrentPage(1);
              }}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabel User Log */}
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-4 space-y-2.5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-secondary/40 border border-border/40 rounded-lg shimmer-line"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ScrollText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Belum ada log aktivitas ditemukan</p>
            <p className="text-muted-foreground text-sm mt-1">
              Coba ubah filter kategori, tanggal, atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Waktu (WIB)</TableHead>
                  <TableHead className="w-[230px]">Nama Pengguna</TableHead>
                  <TableHead className="w-[160px]">Kategori Aksi</TableHead>
                  <TableHead>Deskripsi Aktivitas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((item) => {
                  const badge = getActionBadge(item.action);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <div className="font-medium text-foreground">
                          {format(new Date(item.createdAt), "dd MMM yyyy", {
                            locale: localeId,
                          })}
                        </div>
                        <div>{format(new Date(item.createdAt), "HH:mm:ss")} WIB</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {item.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-foreground truncate">
                                {item.user.name}
                              </span>
                              <Badge
                                variant={item.user.role === "ADMIN" ? "default" : "outline"}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {item.user.role}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.user.department
                                ? `${item.user.department} • ${item.user.email}`
                                : item.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {item.description}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border/50 text-xs text-muted-foreground">
                <span>
                  Halaman <strong>{pagination.page}</strong> dari{" "}
                  <strong>{pagination.totalPages}</strong> (Total {pagination.total} log)
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
          </>
        )}
      </div>
    </div>
  );
}
