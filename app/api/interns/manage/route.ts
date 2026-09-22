import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

function sanitizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function validatePassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

/**
 * POST /api/interns/manage
 * ADMIN creates a new intern account.
 *
 * DELETE /api/interns/manage
 * ADMIN deletes an intern account by ID.
 *
 * PATCH /api/interns/manage
 * ADMIN updates an intern's name/email or resets their password.
 */

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { name?: string; email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { name, email, password } = body;

  const cleanName = sanitizeString(name);
  const cleanEmail = sanitizeString(email).toLowerCase();
  const cleanPassword = String(password ?? "");

  if (!cleanName || !cleanEmail || !cleanPassword) {
    return NextResponse.json(
      { error: "name, email, and password are required." },
      { status: 400 }
    );
  }

  if (cleanName.length > 100) {
    return NextResponse.json({ error: "Nama terlalu panjang." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }

  if (!validatePassword(cleanPassword)) {
    return NextResponse.json(
      { error: "Password harus 8-128 karakter." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "Email sudah terdaftar." },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(cleanPassword, 12);

  const user = await prisma.user.create({
    data: {
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: "INTERN",
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(
    { message: "Akun intern berhasil dibuat.", data: user },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { id?: string; name?: string; email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { id, name, email, password } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "INTERN") {
    return NextResponse.json(
      { error: "Intern tidak ditemukan." },
      { status: 404 }
    );
  }

  const updateData: Record<string, unknown> = {};

  if (name !== undefined) {
    const cleanName = sanitizeString(name);
    if (!cleanName || cleanName.length > 100) {
      return NextResponse.json({ error: "Nama tidak valid." }, { status: 400 });
    }
    updateData.name = cleanName;
  }

  if (email !== undefined) {
    const cleanEmail = sanitizeString(email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    if (cleanEmail !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        return NextResponse.json(
          { error: "Email sudah digunakan oleh akun lain." },
          { status: 409 }
        );
      }
    }
    updateData.email = cleanEmail;
  }

  if (password !== undefined) {
    const cleanPassword = String(password);
    if (!validatePassword(cleanPassword)) {
      return NextResponse.json(
        { error: "Password harus 8-128 karakter." },
        { status: 400 }
      );
    }
    updateData.password = await bcrypt.hash(cleanPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({
    message: "Data intern berhasil diperbarui.",
    data: updated,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id query parameter is required." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "INTERN") {
    return NextResponse.json(
      { error: "Intern tidak ditemukan." },
      { status: 404 }
    );
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: "Akun intern berhasil dihapus." });
}
