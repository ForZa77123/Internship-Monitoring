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
  RotateCcw,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatProductiveTime } from "@/lib/utils";
import { differenceInMinutes } from "date-fns";

interface ActivityLog {
  id: string;
  taskTitle: string;
  description: string;
  startTime: string;
  endTime: string;
  isValidated: boolean;
  validationStatus: "APPROVED" | "REJECTED" | null;
  validationNote: string | null;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function ValidationBadge({ log }: { log: ActivityLog }) {
  if (!log.isValidated) {
    return <Badge variant="outline">Menunggu</Badge>;
  }
  if (log.validationStatus === "APPROVED") {
    return <Badge variant="approved">Disetujui</Badge>;
  }
  return <Badge variant="rejected">Ditolak</Badge>;
}

export default function InternDashboardPage() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data, mutate, isLoading } = useSWR<{
    data: ActivityLog[];
    pagination?: PaginationMeta;
  }>(
    `/api/activity-logs?page=${currentPage}&limit=10`,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const nowString = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  const resetForm = () => {
    setTaskTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setFormError("");
    setIsFormOpen(false);
    setEditingLogId(null);
  };

  const openRevisionForm = (log: ActivityLog) => {
    setTaskTitle(log.taskTitle);
    setDescription(log.description);
    setStartTime(format(new Date(log.startTime), "yyyy-MM-dd'T'HH:mm"));
    setEndTime(format(new Date(log.endTime), "yyyy-MM-dd'T'HH:mm"));
    setEditingLogId(log.id);
    setFormError("");
    setIsFormOpen(true);
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

    if (new Date(endTime) > new Date()) {
      setFormError("Waktu aktivitas tidak boleh di masa depan.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingLogId) {
        const res = await fetch("/api/activity-logs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingLogId,
            taskTitle,
            description,
            startTime,
            endTime,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error ?? "Terjadi kesalahan.");
          return;
        }

        setSuccessMessage("Logsheet berhasil direvisi dan dikirim ulang!");
      } else {
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

        setSuccessMessage("Aktivitas berhasil dicatat!");
      }

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
    <div className="p-5 sm:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-primary uppercase tracking-widest font-semibold">Logsheet</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Catat Aktivitas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Isi logsheet aktivitas magang Anda
          </p>
        </div>
        <Button
          id="open-activity-form-btn"
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          disabled={isFormOpen}
        >
          <Plus className="w-4 h-4" />
          Tambah Aktivitas
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-4 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-up">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {isFormOpen && (
        <Card className={`mb-6 ${editingLogId ? "border-orange-500/25" : "border-primary/20"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {editingLogId ? (
                <>
                  <RotateCcw className="w-4 h-4 text-orange-400" />
                  Revisi Logsheet
                </>
              ) : (
                <>
                  <PenSquare className="w-4 h-4 text-primary" />
                  Form Logsheet
                </>
              )}
            </CardTitle>
            <CardDescription>
              {editingLogId
                ? "Perbaiki data logsheet Anda dan kirim ulang."
                : "Catat aktivitas yang Anda kerjakan secara akurat."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="task-title" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Judul Tugas <span className="text-destructive">*</span>
                </label>
                <Input
                  id="task-title"
                  placeholder="Analisis Kebutuhan Sistem"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="description" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Deskripsi <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="description"
                  placeholder="Jelaskan singkat apa yang Anda kerjakan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-24"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="start-time" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Waktu Mulai <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    max={nowString}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="end-time" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Waktu Selesai <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="end-time"
                    type="datetime-local"
                    max={nowString}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {startTime && endTime && new Date(endTime) > new Date(startTime) && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/15 text-sm text-primary">
                  <Clock className="w-4 h-4" />
                  Durasi:{" "}
                  <strong>
                    {formatProductiveTime(
                      differenceInMinutes(new Date(endTime), new Date(startTime))
                    )}
                  </strong>
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <Button type="button" variant="secondary" onClick={resetForm} disabled={isSubmitting}>
                  Batal
                </Button>
                <Button id="submit-activity-btn" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : editingLogId ? (
                    "Kirim Ulang"
                  ) : (
                    "Simpan"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Riwayat Logsheet {pagination ? `(${pagination.total})` : `(${logs.length})`}
        </h2>

        {isLoading ? (
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-card border border-border/60 rounded-xl shimmer-line" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border/60 rounded-xl">
            <PenSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Belum ada logsheet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Klik &quot;Tambah Aktivitas&quot; untuk memulai.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {logs.map((log, i) => {
              const duration = differenceInMinutes(
                new Date(log.endTime),
                new Date(log.startTime)
              );
              const isRejected = log.validationStatus === "REJECTED";
              return (
                <div
                  key={log.id}
                  className={`bg-card border rounded-xl p-4 flex items-start gap-4 animate-fade-up ${
                    isRejected ? "border-red-500/25" : "border-border/60"
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
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
                      <span className="text-border">|</span>
                      <span className="font-medium text-foreground">
                        {formatProductiveTime(duration)}
                      </span>
                    </div>
                    {log.validationNote && (
                      <div className={`mt-2.5 px-3 py-2 rounded-lg text-xs ${
                        isRejected
                          ? "bg-red-500/8 border border-red-500/15 text-red-300"
                          : "bg-secondary/60 text-muted-foreground"
                      }`}>
                        <span className="font-medium text-foreground">Catatan:</span>{" "}
                        {log.validationNote}
                      </div>
                    )}
                  </div>

                  {isRejected && (
                    <Button
                      id={`revise-log-${log.id}`}
                      variant="secondary"
                      size="sm"
                      className="shrink-0 border-orange-500/25 text-orange-400 hover:bg-orange-500/10"
                      onClick={() => openRevisionForm(log)}
                      disabled={isFormOpen}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Revisi
                    </Button>
                  )}
                </div>
              );
            })}

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
    </div>
  );
}
