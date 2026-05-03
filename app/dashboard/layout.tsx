import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InternSidebar } from "@/components/intern/InternSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== "INTERN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <InternSidebar internName={session.user.name ?? "Peserta Magang"} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
