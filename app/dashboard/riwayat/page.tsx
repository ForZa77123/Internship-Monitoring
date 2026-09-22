"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { History, Clock, Calendar, ScanFace, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PresenceLog {
  id: string;
  userId: string;
  status: "ACTIVE" | "IDLE" | "AWAY";
  timestamp: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function StatusBadge({ status }: { status: PresenceLog["status"] }) {
  const map = {
    ACTIVE: { variant: "active" as const, label: "Aktif" },
    IDLE: { variant: "idle" as const, label: "Idle" },
    AWAY: { variant: "away" as const, label: "Tidak di Tempat" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export default function PresenceHistoryPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useSWR<{
    data: PresenceLog[];
    pagination?: PaginationMeta;
  }>(
    userId
      ? `/api/interns/${userId}/presence?date=${selectedDate}&page=${currentPage}&limit=20`
      : null,
    fetcher
  );

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setCurrentPage(1);
  };

  return (
    <div className="p-5 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ScanFace className="w-4 h-4 text-primary" />
          <span className="text-[10px] text-primary uppercase tracking-widest font-semibold">Face Recognition</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Riwayat Kehadiran
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Data deteksi kehadiran dari sistem AI
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 p-4 bg-card border border-border/60 rounded-xl">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <label htmlFor="date-filter" className="text-sm text-muted-foreground">
            Tanggal:
          </label>
          <input
            id="date-filter"
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="bg-secondary border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <span className="text-xs text-muted-foreground sm:ml-auto">
          {pagination ? `${pagination.total} catatan` : `${logs.length} catatan`}
        </span>
      </div>

      <div className="flex items-start gap-3 p-4 mb-6 bg-primary/[0.04] border border-primary/15 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Transparansi Data</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Data direkam otomatis oleh sistem face recognition. Data yang sama
            digunakan admin untuk memvalidasi logsheet Anda.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-card border border-border/60 rounded shimmer-line" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border/60 rounded-xl">
          <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">Tidak ada data</p>
          <p className="text-muted-foreground text-sm mt-1">
            Belum ada data untuk{" "}
            {format(new Date(selectedDate + "T00:00:00"), "d MMMM yyyy", {
              locale: localeId,
            })}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(log.timestamp), "HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={log.status} />
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {format(new Date(log.timestamp), "d MMM yyyy", {
                      locale: localeId,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/50 text-xs text-muted-foreground">
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
