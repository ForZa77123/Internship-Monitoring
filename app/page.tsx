import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Root page — redirects users to the appropriate dashboard based on their role.
 * Unauthenticated users are sent to /login.
 */
export default async function RootPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  redirect("/dashboard");
}
