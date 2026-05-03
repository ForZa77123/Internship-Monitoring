import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sistem Monitoring Peserta Magang",
    template: "%s | Monitoring Magang",
  },
  description:
    "Sistem monitoring dan validasi aktivitas peserta magang secara real-time berbasis face recognition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
