import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.activityLog.deleteMany();
  await prisma.presenceLog.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("password123", 12);

  // ── Create ADMIN user ──────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      name: "Admin HR",
      email: "admin@company.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  // ── Create INTERN users ────────────────────────────────────────────────────
  const intern1 = await prisma.user.create({
    data: {
      name: "Budi Santoso",
      email: "budi@intern.com",
      password: hashedPassword,
      role: "INTERN",
    },
  });

  const intern2 = await prisma.user.create({
    data: {
      name: "Sari Dewi",
      email: "sari@intern.com",
      password: hashedPassword,
      role: "INTERN",
    },
  });

  // ── Seed sample presence logs for today ───────────────────────────────────
  const today = new Date();

  await prisma.presenceLog.createMany({
    data: [
      {
        userId: intern1.id,
        status: "ACTIVE",
        timestamp: new Date(today.setHours(8, 0, 0, 0)),
      },
      {
        userId: intern1.id,
        status: "IDLE",
        timestamp: new Date(today.setHours(10, 30, 0, 0)),
      },
      {
        userId: intern1.id,
        status: "ACTIVE",
        timestamp: new Date(today.setHours(10, 45, 0, 0)),
      },
      {
        userId: intern2.id,
        status: "ACTIVE",
        timestamp: new Date(today.setHours(8, 15, 0, 0)),
      },
      {
        userId: intern2.id,
        status: "AWAY",
        timestamp: new Date(today.setHours(12, 0, 0, 0)),
      },
    ],
  });

  // ── Seed sample activity logs ──────────────────────────────────────────────
  await prisma.activityLog.createMany({
    data: [
      {
        userId: intern1.id,
        taskTitle: "Analisis Kebutuhan Sistem",
        description: "Melakukan analisis kebutuhan fungsional dan non-fungsional sistem monitoring.",
        startTime: new Date(new Date().setHours(8, 0, 0, 0)),
        endTime: new Date(new Date().setHours(12, 0, 0, 0)),
        isValidated: false,
      },
      {
        userId: intern2.id,
        taskTitle: "Desain UI Dashboard",
        description: "Membuat mockup dan wireframe untuk halaman dashboard admin.",
        startTime: new Date(new Date().setHours(8, 30, 0, 0)),
        endTime: new Date(new Date().setHours(17, 0, 0, 0)),
        isValidated: false,
      },
    ],
  });

  console.log("✅ Seed complete!");
  console.log("─────────────────────────────────");
  console.log(`ADMIN  → admin@company.com / password123`);
  console.log(`INTERN → budi@intern.com   / password123`);
  console.log(`INTERN → sari@intern.com   / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
