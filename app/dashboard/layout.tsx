import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InternSidebar } from "@/components/intern/InternSidebar";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== "INTERN") {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { department: true },
  });

  return (
    <div className="flex min-h-screen">
      <InternSidebar
        internName={session.user.name ?? "Peserta Magang"}
        department={user?.department ?? "Peserta Magang"}
      />
      {/* pt-14 on mobile for the fixed header bar, lg:pt-0 resets on desktop */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
