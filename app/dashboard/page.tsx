"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  PenSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatProductiveTime } from "@/lib/utils";
import { differenceInMinutes } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ActivityLog {
  id: string;
  taskTitle: string;
  description: string;
  startTime: string;
  endTime: string;
  isValidated: boolean;
  validationStatus: string | null;
  validationNote: string | null;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ── Validation status badge ────────────────────────────────────────────────────
function ValidationBadge({ log }: { log: ActivityLog }) {
  if (!log.isValidated) {
    return <Badge variant="outline">Menunggu Validasi</Badge>;
  }
  if (log.validationStatus === "APPROVED") {
    return <Badge variant="approved">✓ Disetujui</Badge>;
  }
  return <Badge variant="rejected">✗ Ditolak</Badge>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InternDashboardPage() {
  const { data, mutate, isLoading } = useSWR<{ data: ActivityLog[] }>(
    "/api/activity-logs",
    fetcher,
    { refreshInterval: 300_000, revalidateOnFocus: false }
  );

  const logs = data?.data ?? [];

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const resetForm = () => {
    setTaskTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setFormError("");
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!taskTitle || !description || !startTime || !endTime) {
      setFormError("Semua kolom wajib diisi.");
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setFormError("Waktu selesai harus setelah waktu mulai.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/activity-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskTitle, description, startTime, endTime }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "Terjadi kesalahan.");
        return;
      }

      setSuccessMessage("Aktivitas berhasil dicatat! 🎉");
      setTimeout(() => setSuccessMessage(""), 3000);
      resetForm();
      mutate();
    } catch {
      setFormError("Gagal mengirim data. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catat Aktivitas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Isi logsheet aktivitas magang Anda hari ini
          </p>
        </div>
        <Button
          id="open-activity-form-btn"
          onClick={() => setIsFormOpen(true)}
          disabled={isFormOpen}
        >
          <Plus className="w-4 h-4" />
          Tambah Aktivitas
        </Button>
      </div>

      {/* Success toast */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Activity Logger Form */}
      {isFormOpen && (
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PenSquare className="w-4 h-4 text-primary" />
              Form Logsheet Aktivitas
            </CardTitle>
            <CardDescription>
              Catat aktivitas yang Anda kerjakan secara jujur dan akurat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Task Title */}
              <div className="space-y-1.5">
                <label htmlFor="task-title" className="text-sm font-medium text-foreground">
                  Judul Tugas <span className="text-destructive">*</span>
                </label>
                <Input
                  id="task-title"
                  placeholder="Contoh: Analisis Kebutuhan Sistem"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="description" className="text-sm font-medium text-foreground">
                  Deskripsi Aktivitas <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="description"
                  placeholder="Jelaskan secara singkat apa yang Anda kerjakan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-24"
                  required
                />
              </div>

              {/* Time range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="start-time" className="text-sm font-medium text-foreground">
                    Waktu Mulai <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="end-time" className="text-sm font-medium text-foreground">
                    Waktu Selesai <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="end-time"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Duration preview */}
              {startTime && endTime && new Date(endTime) > new Date(startTime) && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
                  <Clock className="w-4 h-4" />
                  Durasi:{" "}
                  <strong>
                    {formatProductiveTime(
                      differenceInMinutes(new Date(endTime), new Date(startTime))
                    )}
                  </strong>
                </div>
              )}

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  id="submit-activity-btn"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Aktivitas"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Existing Logs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Riwayat Logsheet ({logs.length})
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <PenSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Belum ada logsheet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Klik "Tambah Aktivitas" untuk mencatat aktivitas pertama Anda.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const duration = differenceInMinutes(
                new Date(log.endTime),
                new Date(log.startTime)
              );
              return (
                <div
                  key={log.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-foreground text-sm">
                        {log.taskTitle}
                      </span>
                      <ValidationBadge log={log} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {log.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.startTime), "d MMM yyyy, HH:mm", {
                          locale: localeId,
                        })}{" "}
                        —{" "}
                        {format(new Date(log.endTime), "HH:mm", {
                          locale: localeId,
                        })}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-foreground">
                        {formatProductiveTime(duration)}
                      </span>
                    </div>
                    {log.validationNote && (
                      <div className="mt-2 px-3 py-2 rounded-lg bg-secondary text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Catatan Admin:</span>{" "}
                        {log.validationNote}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
