"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Pencil,
  Trash2,
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  UsersRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Intern {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ManageInternsPage() {
  const { data, mutate, isLoading } = useSWR<{ data: Intern[] }>(
    "/api/interns/manage/list",
    fetcher,
    { revalidateOnFocus: false }
  );

  const interns = data?.data ?? [];

  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIntern, setEditingIntern] = useState<Intern | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredInterns = interns.filter(
    (intern) =>
      intern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intern.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormError("");
    setIsFormOpen(false);
    setEditingIntern(null);
    setShowPassword(false);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (intern: Intern) => {
    setFormName(intern.name);
    setFormEmail(intern.email);
    setFormPassword("");
    setFormError("");
    setEditingIntern(intern);
    setIsFormOpen(true);
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formName || !formEmail) {
      setFormError("Nama dan email wajib diisi.");
      return;
    }

    if (!editingIntern && !formPassword) {
      setFormError("Password wajib diisi untuk akun baru.");
      return;
    }

    if (formPassword && formPassword.length < 6) {
      setFormError("Password minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingIntern) {
        const payload: Record<string, string> = {
          id: editingIntern.id,
          name: formName,
          email: formEmail,
        };
        if (formPassword) payload.password = formPassword;

        const res = await fetch("/api/interns/manage", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error ?? "Terjadi kesalahan.");
          return;
        }

        setSuccessMessage("Data intern berhasil diperbarui!");
      } else {
        const res = await fetch("/api/interns/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            password: formPassword,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error ?? "Terjadi kesalahan.");
          return;
        }

        setSuccessMessage("Akun intern baru berhasil dibuat!");
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

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/interns/manage?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccessMessage("Akun intern berhasil dihapus.");
        setTimeout(() => setSuccessMessage(""), 3000);
        mutate();
      }
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Kelola Peserta Magang
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tambah, edit, atau hapus akun peserta
          </p>
        </div>
        <Button id="open-create-intern-btn" onClick={openCreateForm} disabled={isFormOpen}>
          <UserPlus className="w-4 h-4" />
          Tambah Peserta
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {isFormOpen && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editingIntern ? `Edit Peserta — ${editingIntern.name}` : "Tambah Peserta Baru"}
            </CardTitle>
            <CardDescription>
              {editingIntern
                ? "Perbarui nama, email, atau reset password peserta."
                : "Isi data untuk mendaftarkan peserta magang baru."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="intern-name" className="text-xs font-semibold text-foreground">
                    Nama Lengkap <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="intern-name"
                    placeholder="Ahmad Budi Santoso"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="intern-email" className="text-xs font-semibold text-foreground">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="intern-email"
                    type="email"
                    placeholder="contoh@intern.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="intern-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-3 h-3" />
                  {editingIntern ? "Password Baru (opsional)" : "Password"}
                  {!editingIntern && <span className="text-destructive">*</span>}
                </label>
                <div className="relative">
                  <Input
                    id="intern-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={editingIntern ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required={!editingIntern}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

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
                <Button id="submit-intern-btn" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : editingIntern ? (
                    "Simpan Perubahan"
                  ) : (
                    "Buat Akun"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="search-interns"
          placeholder="Cari nama atau email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Daftar ({filteredInterns.length})
        </h2>

        {isLoading ? (
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-card border border-border/60 rounded-xl shimmer-line" />
            ))}
          </div>
        ) : filteredInterns.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border/60 rounded-xl">
            <UserPlus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">
              {searchQuery ? "Tidak ditemukan" : "Belum ada peserta magang"}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {searchQuery
                ? "Coba ubah kata kunci pencarian."
                : 'Klik "Tambah Intern" untuk memulai.'}
            </p>
          </div>
        ) : (
          filteredInterns.map((intern, i) => (
            <div
              key={intern.id}
              className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 group hover:border-primary/40 transition-all animate-fade-up shadow-sm"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                <span className="text-xs font-bold text-primary">
                  {intern.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-sm truncate">
                    {intern.name}
                  </span>
                  <Badge variant="outline">INTERN</Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{intern.email}</span>
                  <span className="hidden sm:inline text-muted-foreground/50">|</span>
                  <span>
                    {format(new Date(intern.createdAt), "d MMM yyyy", {
                      locale: localeId,
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  id={`edit-intern-${intern.id}`}
                  variant="secondary"
                  size="sm"
                  onClick={() => openEditForm(intern)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>

                {showDeleteConfirm === intern.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      id={`confirm-delete-${intern.id}`}
                      variant="danger"
                      size="sm"
                      disabled={deletingId === intern.id}
                      onClick={() => handleDelete(intern.id)}
                    >
                      {deletingId === intern.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Ya, Hapus"
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(null)}
                    >
                      Batal
                    </Button>
                  </div>
                ) : (
                  <Button
                    id={`delete-intern-${intern.id}`}
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(intern.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
