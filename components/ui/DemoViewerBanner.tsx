import { Eye } from "lucide-react";

export function DemoViewerBanner({ roleLabel }: { roleLabel: "Admin" | "Peserta Magang" }) {
  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-200 px-4 py-2 text-xs sm:text-sm flex items-center justify-center gap-2 text-center">
      <Eye className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>
        <strong>Mode Viewer {roleLabel} (Read-Only)</strong> — Anda sedang melihat pratinjau sistem.
        Aksi tambah, ubah, validasi, dan hapus data dinonaktifkan.
      </span>
    </div>
  );
}
