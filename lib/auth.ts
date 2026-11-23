import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { recordUserLog } from "@/lib/user-log";
import {
  DEMO_VIEWER_ADMIN_EMAIL,
  DEMO_VIEWER_ADMIN_ID,
  DEMO_VIEWER_INTERN_EMAIL,
  DEMO_VIEWER_PASSWORD,
} from "@/lib/demo-viewer";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password harus diisi.");
        }

        const emailKey = String(credentials.email).trim().toLowerCase();

        // ── Mode Viewer (Read-Only Demo) ─────────────────────────────────────
        if (
          emailKey === DEMO_VIEWER_ADMIN_EMAIL &&
          credentials.password === DEMO_VIEWER_PASSWORD
        ) {
          return {
            id: DEMO_VIEWER_ADMIN_ID,
            name: "Viewer Admin (Demo)",
            email: DEMO_VIEWER_ADMIN_EMAIL,
            role: "ADMIN" as Role,
            isDemoViewer: true,
          };
        }

        if (
          emailKey === DEMO_VIEWER_INTERN_EMAIL &&
          credentials.password === DEMO_VIEWER_PASSWORD
        ) {
          const sampleIntern =
            (await prisma.user.findUnique({
              where: { email: "budi@intern.com" },
              select: { id: true, name: true },
            })) ??
            (await prisma.user.findFirst({
              where: { role: "INTERN" },
              select: { id: true, name: true },
              orderBy: { createdAt: "asc" },
            }));

          if (!sampleIntern) {
            throw new Error("Belum ada data peserta magang untuk pratinjau demo.");
          }

          return {
            id: sampleIntern.id,
            name: `${sampleIntern.name} (Viewer)`,
            email: DEMO_VIEWER_INTERN_EMAIL,
            role: "INTERN" as Role,
            isDemoViewer: true,
          };
        }

        if (!checkRateLimit(`login:${emailKey}`, 10, 5 * 60_000)) {
          throw new Error("Terlalu banyak percobaan login. Silakan tunggu 5 menit.");
        }

        const user = await prisma.user.findUnique({
          where: { email: emailKey },
        });

        if (!user) {
          throw new Error("Email atau password salah.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Email atau password salah.");
        }

        clearRateLimit(`login:${emailKey}`);

        await recordUserLog({
          userId: user.id,
          action: "LOGIN",
          description: `Login ke dalam sistem sebagai ${user.role === "ADMIN" ? "Administrator" : "Peserta Magang"}`,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, user object is available; persist role, id & viewer flag into token
      if (user) {
        token.id = user.id;
        token.role = (user as { id: string; role: Role; isDemoViewer?: boolean }).role;
        token.isDemoViewer = Boolean(
          (user as { id: string; role: Role; isDemoViewer?: boolean }).isDemoViewer
        );
      }
      return token;
    },
    async session({ session, token }) {
      // Expose id, role & viewer flag to the client session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.isDemoViewer = Boolean(token.isDemoViewer);
      }
      return session;
    },
  },
});
