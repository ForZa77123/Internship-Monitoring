"use client";

import { useState } from "react";
import { Download, Calendar, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InternExportPage() {
  const [exportType, setExportType] = useState<"summary" | "logsheet" | "presence">("summary");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const params = new URLSearchParams();
      params.set("type", exportType);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal mengunduh laporan.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      let filename = `laporan_${exportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/["']/g, "").trim();
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage("Laporan berhasil diunduh.");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ekspor Laporan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Unduh riwayat kehadiran, logsheet aktivitas, atau ringkasan performa magang Anda dalam format Excel (.xlsx).
        </p>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div>
          <label className="text-sm font-semibold text-foreground block mb-3">
            Pilih Jenis Laporan
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "summary",
                label: "Ringkasan Performa",
                desc: "Total jam kerja, jam aktif, dan tingkat kesesuaian.",
              },
              {
                id: "logsheet",
                label: "Logsheet Aktivitas",
                desc: "Daftar tugas, waktu mulai/selesai, dan status validasi.",
              },
              {
                id: "presence",
                label: "Riwayat Kehadiran",
                desc: "Data log deteksi fisik AI (Aktif, Idle, Away).",
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setExportType(t.id as any)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  exportType === t.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:bg-secondary/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 font-medium text-foreground text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  {t.label}
                </div>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Dari Tanggal (Opsional)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Sampai Tanggal (Opsional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Menyiapkan File..." : "Unduh Excel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
