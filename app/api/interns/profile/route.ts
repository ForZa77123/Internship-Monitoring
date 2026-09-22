import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "INTERN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil profil." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "INTERN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { department?: string; name?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const cleanName = String(body.name).trim();
      if (!cleanName || cleanName.length > 100) {
        return NextResponse.json({ error: "Nama tidak valid." }, { status: 400 });
      }
      updateData.name = cleanName;
    }

    if (body.department !== undefined) {
      const cleanDept = String(body.department).trim();
      if (cleanDept.length > 100) {
        return NextResponse.json({ error: "Departemen terlalu panjang." }, { status: 400 });
      }
      updateData.department = cleanDept || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
    });

    return NextResponse.json({
      message: "Profil berhasil diperbarui.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui profil." },
      { status: 500 }
    );
  }
}
