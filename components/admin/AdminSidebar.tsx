"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CheckSquare,
  LogOut,
  ShieldCheck,
  UserCog,
  FileDown,
  History,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileDrawer } from "@/components/ui/mobile-drawer";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    description: "Monitor real-time",
    icon: LayoutDashboard,
    id: "nav-admin-dashboard",
  },
  {
    href: "/admin/validation",
    label: "Validasi",
    description: "Logsheet & presence",
    icon: CheckSquare,
    id: "nav-admin-validation",
  },
  {
    href: "/admin/interns",
    label: "Kelola Intern",
    description: "CRUD peserta",
    icon: UserCog,
    id: "nav-admin-interns",
  },
  {
    href: "/admin/presence",
    label: "Riwayat Kehadiran",
    description: "Presence per peserta",
    icon: History,
    id: "nav-admin-presence",
  },
  {
    href: "/admin/export",
    label: "Ekspor",
    description: "Unduh laporan CSV",
    icon: FileDown,
    id: "nav-admin-export",
  },
];

interface AdminSidebarProps {
  adminName: string;
}

function SidebarContent({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Sistem Monitoring</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
      </div>

      <div className="mx-4 my-4 px-4 py-3 rounded bg-secondary border border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-primary">{adminName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{adminName}</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              id={item.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors group",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <ThemeToggle />
        <Button
          id="admin-logout-btn"
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground h-9 text-sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </Button>
      </div>
    </>
  );
}

export function AdminSidebar({ adminName }: AdminSidebarProps) {
  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-card/50 border-r border-border/50 shrink-0">
        <SidebarContent adminName={adminName} />
      </aside>

      <MobileDrawer brandName="Monitoring Magang">
        <SidebarContent adminName={adminName} />
      </MobileDrawer>
    </>
  );
}
