"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Loader2,
  CalendarDays,
  Users,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Intern {
  id: string;
  name: string;
  email: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ReportTypeCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
}

function ReportTypeCard({ id, title, description, icon, isSelected, onClick }: ReportTypeCardProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? "border-primary/40 bg-primary/8 shadow-sm"
          : "border-border/60 bg-card hover:border-primary/25 hover:bg-secondary/50"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="font-semibold text-sm text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

export default function ExportPage() {
  const { data: internData } = useSWR<{ data: Intern[] }>(
    "/api/interns/manage/list",
    fetcher,
    { revalidateOnFocus: false }
  );

  const interns = internData?.data ?? [];

  const [reportType, setReportType] = useState<"summary" | "logsheet" | "presence">("summary");
  const [selectedInternId, setSelectedInternId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      params.set("type", reportType);
      if (selectedInternId) params.set("internId", selectedInternId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/export?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const filename =
        res.headers
          .get("Content-Disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") ?? `laporan_${reportType}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setSuccessMessage(`Laporan ${reportTypeLabel(reportType)} berhasil diunduh!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      alert("Gagal mengekspor laporan. Coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  const reportTypeLabel = (type: string) => {
    switch (type) {
      case "summary": return "Ringkasan";
      case "logsheet": return "Logsheet";
      case "presence": return "Kehadiran";
      default: return type;
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ekspor Laporan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Unduh rekapitulasi data dalam format CSV
        </p>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jenis Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ReportTypeCard
              id="report-type-summary"
              title="Ringkasan"
              description="Rekap total kehadiran, logsheet, dan jam kerja per peserta."
              icon={<BarChart3 className="w-5 h-5 text-primary" />}
              isSelected={reportType === "summary"}
              onClick={() => setReportType("summary")}
            />
            <ReportTypeCard
              id="report-type-logsheet"
              title="Logsheet"
              description="Detail tugas, durasi, dan status validasi."
              icon={<FileText className="w-5 h-5 text-primary" />}
              isSelected={reportType === "logsheet"}
              onClick={() => setReportType("logsheet")}
            />
            <ReportTypeCard
              id="report-type-presence"
              title="Kehadiran"
              description="Log mentah status presensi dari AI per timestamp."
              icon={<FileSpreadsheet className="w-5 h-5 text-primary" />}
              isSelected={reportType === "presence"}
              onClick={() => setReportType("presence")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter (Opsional)</CardTitle>
          <CardDescription>
            Kosongkan untuk mengekspor seluruh data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="filter-intern" className="text-xs font-semibold text-foreground">
                Peserta
              </label>
              <select
                id="filter-intern"
                value={selectedInternId}
                onChange={(e) => setSelectedInternId(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Semua Peserta</option>
                {interns.map((intern) => (
                  <option key={intern.id} value={intern.id}>
                    {intern.name} — {intern.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="filter-start-date" className="text-xs font-semibold text-foreground">
                Tanggal Mulai
              </label>
              <Input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="filter-end-date" className="text-xs font-semibold text-foreground">
                Tanggal Selesai
              </label>
              <Input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground font-medium">
                Unduh Laporan: <span className="font-semibold text-primary">{reportTypeLabel(reportType)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Format CSV — kompatibel dengan Microsoft Excel, Google Sheets
              </p>
            </div>
            <Button
              id="export-btn"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengekspor...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Unduh CSV
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
