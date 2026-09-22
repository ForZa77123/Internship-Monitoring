"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email atau password salah. Silakan coba lagi.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Kolom Kiri: Corporate Branding Panel */}
      <div className="hidden lg:flex lg:w-[48%] relative flex-col justify-between p-12 bg-slate-900 text-white border-r border-slate-800 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] bg-sky-500/10 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        </div>

        <div className={`relative transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center transition-transform duration-500 hover:rotate-[10deg] hover:scale-110">
              <ShieldCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-white block">Sistem Monitoring Magang</span>
              <span className="text-xs text-slate-400">Verifikasi Presensi & Logsheet</span>
            </div>
          </div>
        </div>

        <div className={`relative max-w-lg my-auto py-12 transition-all delay-150 duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-snug mb-4">
            Pengawasan Terintegrasi Presensi Fisik & Logsheet Peserta
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-8">
            Platform monitoring peserta magang berbasis pengenalan wajah untuk mencocokkan laporan aktivitas harian dengan kehadiran nyata di tempat kerja secara akurat dan transparan.
          </p>

          <div className="border-t border-slate-800 pt-6 grid grid-cols-3 gap-6">
            {[
              ["AI Detection", "Presensi Fisik Kamera"],
              ["Cross-Check", "Validasi Otomatis Jam Kerja"],
              ["Transparan", "Akses Data Dua Arah"],
            ].map(([title, desc], i) => {
              const delays = ["delay-300", "delay-500", "delay-700"];
              return (
                <div key={title} className={`transition-all ${delays[i] || "delay-300"} duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
                  <p className="text-xl font-bold text-white">{title}</p>
                  <p className="text-xs text-slate-400 mt-1">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`relative text-xs text-slate-500 transition-all delay-700 duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
          Program Monitoring Magang &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Kolom Kanan: Form Login */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className={`w-full max-w-[380px] transition-all delay-200 duration-700 ease-out ${mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"}`}>
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-foreground block">Sistem Monitoring Magang</span>
              <span className="text-xs text-muted-foreground">Verifikasi Presensi</span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Masuk ke Sistem</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Gunakan akun resmi untuk mengakses portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`space-y-1.5 transition-all delay-300 duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <label htmlFor="email" className="text-xs font-semibold text-foreground">
                Alamat Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="nama@instansi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10 transition-shadow duration-300 focus:shadow-md focus:shadow-primary/10"
              />
            </div>

            <div className={`space-y-1.5 transition-all delay-500 duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <label htmlFor="password" className="text-xs font-semibold text-foreground">
                Kata Sandi
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 pr-10 transition-shadow duration-300 focus:shadow-md focus:shadow-primary/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-shake">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 text-sm font-semibold mt-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              disabled={isLoading}
              id="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk
                  <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
