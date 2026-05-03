import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const role = session?.user?.role;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isInternRoute = nextUrl.pathname.startsWith("/dashboard");
  const isAuthRoute = nextUrl.pathname.startsWith("/login");

  // Redirect authenticated users away from login page
  if (isAuthRoute && isLoggedIn) {
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Protect admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl));
    if (role !== "ADMIN") return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Protect intern routes
  if (isInternRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl));
    if (role !== "INTERN") return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Match all routes except static files and API auth routes
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
