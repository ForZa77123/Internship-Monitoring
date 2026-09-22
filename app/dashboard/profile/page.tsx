"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { User, Settings, Save, Loader2, CheckCircle2, XCircle, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PREDEFINED_DEPARTMENTS = [
  "UI/UX",
  "Data Analyst",
  "Front End",
  "Back End",
  "AI",
];

export default function InternProfilePage() {
  const router = useRouter();
  const { data, mutate, isLoading } = useSWR<{ data: ProfileData }>(
    "/api/interns/profile",
    fetcher,
    { revalidateOnFocus: false }
  );

  const profile = data?.data;

  const [formName, setFormName] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (profile) {
      setFormName(profile.name);
      
      const dept = profile.department || "";
      if (PREDEFINED_DEPARTMENTS.includes(dept)) {
        setSelectedDepartment(dept);
        setCustomDepartment("");
      } else if (dept) {
        setSelectedDepartment("Lainnya");
        setCustomDepartment(dept);
      } else {
        setSelectedDepartment("");
        setCustomDepartment("");
      }
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formName.trim()) {
      setErrorMessage("Nama tidak boleh kosong.");
      return;
    }

    let finalDepartment = selectedDepartment;
    if (selectedDepartment === "Lainnya") {
      if (!customDepartment.trim()) {
        setErrorMessage("Silakan isi bagian divisi Anda.");
        return;
      }
      finalDepartment = customDepartment.trim();
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/interns/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          department: finalDepartment,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        setErrorMessage(result.error ?? "Terjadi kesalahan.");
        return;
      }

      setSuccessMessage("Profil berhasil diperbarui!");
      setTimeout(() => setSuccessMessage(""), 3000);
      mutate();
      router.refresh();
    } catch (err) {
      setErrorMessage("Gagal menyimpan perubahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 sm:p-8 max-w-2xl mx-auto flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-primary" />
          <span className="text-[10px] text-primary uppercase tracking-widest font-semibold">Pengaturan</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Profil</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Perbarui data diri dan divisi magang
        </p>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-up">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-4 mb-6 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <XCircle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Dasar</CardTitle>
          <CardDescription>
            Pastikan nama dan email Anda sesuai.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="profile-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email (Tidak dapat diubah)</label>
              <Input
                id="profile-email"
                value={profile?.email || ""}
                readOnly
                disabled
                className="bg-secondary/50 opacity-60 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-department" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Divisi / Bagian</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  id="profile-department"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 py-2 text-sm bg-secondary border border-border/50 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  required
                >
                  <option value="" disabled>Pilih bagian magang...</option>
                  {PREDEFINED_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                  <option value="Lainnya">Lainnya...</option>
                </select>
              </div>
            </div>

            {selectedDepartment === "Lainnya" && (
              <div className="space-y-1.5 animate-fade-up">
                <label htmlFor="profile-custom-dept" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tuliskan Bagian Anda</label>
                <Input
                  id="profile-custom-dept"
                  placeholder="Mobile Developer"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto gap-2">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSubmitting ? "Menyimpan..." : "Simpan Profil"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
