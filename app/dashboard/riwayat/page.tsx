"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { History, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  const { data, isLoading } = useSWR<{ data: PresenceLog[] }>(
    userId ? `/api/interns/${userId}/presence?date=${selectedDate}` : null,
    fetcher
  );

  const logs = data?.data ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          Riwayat Kehadiran Fisik
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Data deteksi kehadiran dari sistem face recognition
        </p>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-card border border-border rounded-xl">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <label htmlFor="date-filter" className="text-sm text-muted-foreground">
          Pilih Tanggal:
        </label>
        <input
          id="date-filter"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-xs text-muted-foreground ml-auto">
          {logs.length} catatan ditemukan
        </span>
      </div>

      {/* Transparency note */}
      <div className="flex items-start gap-3 p-4 mb-6 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Transparansi Data</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Data ini direkam otomatis oleh sistem face recognition. Ini adalah
            data yang sama digunakan admin untuk memvalidasi logsheet aktivitas Anda.
          </p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-card border border-border rounded animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">Tidak ada data kehadiran</p>
          <p className="text-muted-foreground text-sm mt-1">
            Belum ada data yang tercatat untuk tanggal{" "}
            {format(new Date(selectedDate + "T00:00:00"), "d MMMM yyyy", {
              locale: localeId,
            })}
            .
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Status Terdeteksi</TableHead>
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
        </div>
      )}
    </div>
  );
}
