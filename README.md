# Sistem Monitoring Peserta Magang

A full-stack **Internship Monitoring System** built for enterprise use, featuring real-time presence tracking via face recognition, activity logging, and cross-validation dashboard.

> 🎓 Built as part of a thesis research project on automated internship monitoring with AI-based physical presence detection.

---

## ✨ Features

- **Role-Based Authentication** — ADMIN (HR/Supervisor) and INTERN roles via NextAuth.js
- **Real-Time Presence Monitoring** — Admin dashboard polls every 5 minutes via SWR; displays Active/Idle/Away status with color coding
- **Face Recognition Webhook** — Secure `POST /api/presence` endpoint for external Python AI module
- **Activity Logger (Logsheet)** — Interns submit task title, description, start/end time
- **Cross-Validation Dashboard** — Auto-flags discrepancies when claimed work time > 2× detected active presence; Admin approves/rejects with notes
- **Presence History** — Interns can view their own AI-detected presence logs for transparency
- **Light/Dark Theme** — Toggle persisted to localStorage

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL (via Supabase) |
| ORM | Prisma |
| Auth | NextAuth.js v5 (Credentials + JWT) |
| Data Fetching | SWR (HTTP Polling) |
| UI Components | Radix UI + Lucide Icons |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ForZa77123/Internship-Monitoring.git
cd Internship-Monitoring
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://..."      # Supabase or local PostgreSQL URI
NEXTAUTH_SECRET="..."                # Generate: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
PRESENCE_API_SECRET="..."           # Shared secret for the face recognition webhook
```

### 4. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 Demo Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin (HR) | admin@company.com | password123 |
| Intern | budi@intern.com | password123 |
| Intern | sari@intern.com | password123 |

---

## 📡 Face Recognition Webhook

The external Python AI module sends presence data to:

```
POST /api/presence
```

**Headers:**
```
Content-Type: application/json
X-API-Secret: <your PRESENCE_API_SECRET>
```

**Payload:**
```json
{
  "internId": "clxxxxxxxxxxxxxxx",
  "status": "ACTIVE",
  "timestamp": "2024-01-15T09:30:00.000Z"
}
```

**Status values:** `ACTIVE` | `IDLE` | `AWAY`

---

## 📁 Project Structure

```
├── app/
│   ├── (auth)/login/          ← Login page
│   ├── admin/
│   │   ├── dashboard/         ← Real-time monitoring grid (SWR)
│   │   └── validation/        ← Cross-validation with auto-flagging
│   ├── dashboard/
│   │   ├── page.tsx           ← Activity logger form
│   │   └── riwayat/           ← Presence history
│   └── api/
│       ├── presence/          ← Face recognition webhook
│       ├── interns/           ← Intern status & history
│       └── activity-logs/     ← Logsheet CRUD + validation
├── components/
│   ├── admin/                 ← Admin sidebar
│   ├── intern/                ← Intern sidebar
│   └── ui/                   ← shadcn/ui base components
├── lib/
│   ├── auth.ts               ← NextAuth configuration
│   ├── prisma.ts             ← Prisma singleton client
│   └── utils.ts              ← Discrepancy calculation logic
├── prisma/
│   ├── schema.prisma         ← Database schema
│   └── seed.ts               ← Test data seeder
└── middleware.ts             ← Role-based route protection
```

---

## 📊 Database Schema

```
User          → id, name, email, password, role (ADMIN|INTERN)
PresenceLog   → id, userId, status (ACTIVE|IDLE|AWAY), timestamp
ActivityLog   → id, userId, taskTitle, description, startTime, endTime,
                isValidated, validationStatus, validationNote, validatedAt
```

---

## 📜 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npx prisma studio    # Open Prisma database GUI
npx prisma db seed   # Re-seed the database
```

---

## 🔬 Research Context

This system is the implementation artifact of a thesis investigating the gap between **self-reported internship activity** and **physically verified presence** using computer vision. The cross-validation engine automatically flags statistical discrepancies for supervisor review, enabling data-driven assessment of intern productivity.

---

## 📄 License

MIT — Free to use for academic and commercial purposes.
