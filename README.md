# NexTurn: School RFID Attendance Management System

**NexTurn** is an enterprise-grade, high-security School RFID Attendance Management System engineered specifically for Philippine educational institutions adhering to Department of Education (DepEd) standards, Civil Service Commission regulations, and strict anti-tampering specifications.

---

## 🚀 Key System Features

1. **Unified Full-Stack Architecture:**
   - Next.js 14 (App Router, Server Components & Route Handlers, TypeScript).
   - Tailwind CSS & Lucide Icons for responsive styling.
   - Native PostgreSQL database as the single source of truth (zero Docker/containerization requirement).
   - Single-command execution: `npm run dev` boots the system, verifies PostgreSQL, enforces triggers, and serves the entire platform.

2. **Defense-in-Depth Security & Zero-Bypass Route Guard:**
   - Password hashing with `bcryptjs`.
   - Signed, encrypted HTTP-only session cookies (`SameSite=Strict`, `Secure`).
   - Server-side route & API guards protecting every authenticated endpoint, with an explicit exception for the public `/turnstile` kiosk.
   - Strict `Zod` validation on all incoming payloads.
   - Magic bytes image upload verification (validating actual binary headers for JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`, max 5MB, UUID filenames, path traversal protection).
   - Sliding-window rate limiting on login and RFID scan endpoints.

3. **Dynamic Role-Based Access Control (RBAC):**
   - 4 built-in system user roles: `superadmin`, `principal`, `admin_aide`, and `head_teacher`.
   - Granular dynamic module allow/blocklist matrix stored in PostgreSQL covering 9 core system modules (`dashboard`, `teachers`, `students`, `classroom_attendance`, `turnstile_settings`, `school_settings`, `audit_logs`, `rbac_manager`, `users`).
   - Interactive Role Permissions Editor UI (`/rbac`) with immediate real-time enforcement across both UI navigation and backend API guards.
   - Universal user profile editing (`/profile`): Every logged-in user can update their personal information, profile photo, and 10-digit RFID tag.

4. **Immutable Blockchain Audit System:**
   - Cryptographic SHA-256 hash chaining of all logins, logouts, failed attempts, and data mutations (`CREATE`, `UPDATE`, `DELETE`, `SETTINGS_CHANGE`, `RBAC_CHANGE`).
   - Deterministic RFC 8785 canonical JSON formatting to guarantee hash consistency across PostgreSQL `jsonb` storage.
   - PostgreSQL database-level immutability trigger (`BEFORE UPDATE OR DELETE ON "AuditLog"`) that raises a database exception (`'Audit ledger is immutable'`), preventing ledger tampering even by database administrators.
   - Blockchain Integrity Verifier UI with real-time sequential hash verification.

5. **Teacher Management & DepEd Form 48 Timecard Generator:**
   - Full masterlist with 10-digit RFID, employee number, department, and photo upload.
   - Role-based mutation protection: `head_teacher` is strictly Read-Only (mutation buttons hidden in UI, API rejects mutations with 403 Forbidden).
   - Official DepEd Civil Service Form No. 48 (Daily Time Record / Timecard) generator exporting compliant PDF and CSV formats.

6. **Student Management & DepEd SF1 / LIS CSV Importer:**
   - Complete DepEd demographics: 12-digit Learner Reference Number (LRN), track/strand, guardian contact, 10-digit RFID, and photo.
   - DepEd School Form 1 (SF1) / LIS CSV Importer with pre-import column mapping preview, row validation, and bulk upsert.

7. **Immutable Millisecond Attendance & Analytics:**
   - Turnstile scans recorded down to millisecond precision (`TIMESTAMPTZ(3)`).
   - PostgreSQL database-level immutability trigger (`BEFORE UPDATE OR DELETE ON "AttendanceRecord"`) preventing modification or deletion.
   - Interactive attendance dashboard: 7-day trend charts, status breakdowns, master attendance history table with filters, and dedicated individual attendance logs for teachers and students.

8. **Public RFID Turnstile Kiosk (`/turnstile`):**
   - Publicly accessible without authentication.
   - Configured school name header and centered school logo watermark at 30% opacity (`opacity: 0.3`).
   - Centered real-time live clock formatted strictly as:
     ```text
     November 15, 2026
     11:43:45 PM
     ```
   - Hidden auto-focused RFID reader input supporting 10-digit keystrokes and enter key triggers.
   - Web Audio API synthesizer for positive chime and rejection buzz.
   - Visual scan result card showing person photo, name, type, direction, and millisecond timestamp.
   - Quick-tap demo scan simulator for instant evaluation without physical hardware.

---

## 📋 Default Credentials

The following demo accounts are seeded automatically:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Superadmin** | `superadmin@nexturn.edu.ph` | `SuperAdmin2026!` | Full unrestricted system access |
| **Principal** | `principal@nexturn.edu.ph` | `Password2026!` | Management access (all modules except RBAC matrix) |
| **Admin Aide** | `adminaide@nexturn.edu.ph` | `Password2026!` | Operational staff (Teachers, Students, Attendance) |
| **Head Teacher** | `headteacher@nexturn.edu.ph` | `Password2026!` | Academic staff (Read-only on Teachers, Classroom Attendance) |

> On the login page (`/login`), click any of the **Quick Demo Login** buttons to sign in with one click.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js 20)
- Native PostgreSQL 16+ running on `localhost:5432` with database `school_attendance`

### Environment Configuration
The database connection string is configured in `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/school_attendance?schema=public"
SESSION_SECRET="nexturn_secure_jwt_session_hmac_sha256_super_secret_key_2026"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Running the Application
To run the complete application:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & CLI Scripts

### Automated Test Suite (35 Specification Checks)
Run the end-to-end verification suite verifying all 6 Master Specification sections:
```bash
npm test
```

### Tenant Reset / Reseed Script (Requirement 1.4)
Reset the system for a brand-new tenant school by wiping all students, teachers, attendance records, classroom logs, audit logs, and non-superadmin users—leaving **only** the primary `superadmin` and default role structures intact:
```bash
npm run db:reseed
```

### Repopulate Demo Dataset
Repopulate sample teachers, students, monthly attendance records, and cryptographic audit blocks:
```bash
npm run db:seed
```

---

## 📁 System Architecture

```text
NexTurn/
├── prisma/
│   ├── schema.prisma              # PostgreSQL schema with models & relations
│   ├── seed.ts                    # Demo database populator with blockchain audit ledger
│   └── reseed.ts                  # Multi-tenant reset CLI script (npm run db:reseed)
├── scripts/
│   ├── start-dev.js               # Single-command startup wrapper (npm run dev)
│   ├── apply-triggers.ts          # PostgreSQL immutability triggers generator
│   └── test-all-requirements.ts   # Automated 35-check test suite (npm test)
├── src/
│   ├── app/
│   │   ├── turnstile/page.tsx     # Public RFID Turnstile Kiosk (no login required)
│   │   ├── login/page.tsx         # Secure login portal with quick demo buttons
│   │   ├── dashboard/page.tsx     # Real-time attendance dashboard & master logs
│   │   ├── teachers/              # Teacher masterlist & Form 48 timecard export
│   │   ├── students/              # Student masterlist & DepEd SF1 CSV importer
│   │   ├── classroom-attendance/  # Section & subject period attendance logging
│   │   ├── settings/              # School profile & logo upload
│   │   ├── turnstile-settings/    # Kiosk duration, chime, announcement settings
│   │   ├── rbac/                  # Dynamic Role Permissions Editor UI
│   │   ├── users/                 # System user account administration
│   │   ├── profile/               # Universal personal profile & 10-digit RFID editor
│   │   ├── audit-logs/            # Immutable blockchain audit trail & verifier UI
│   │   └── api/                   # Zero-bypass backend REST API endpoints
│   ├── components/
│   │   ├── Topbar.tsx             # School profile topbar display
│   │   ├── Sidebar.tsx            # Dynamic permission-based navigation
│   │   └── AppShell.tsx           # Authentication & layout wrapper
│   └── lib/
│       ├── audit.ts               # Cryptographic SHA-256 blockchain hashing & verifier
│       ├── auth.ts                # Session management & password hashing
│       ├── session-edge.ts        # Web Crypto API session verification for Edge middleware
│       ├── deped-dtr.ts           # DepEd Civil Service Form No. 48 PDF & CSV engine
│       ├── file-security.ts       # Magic bytes image validation & path security
│       ├── permissions.ts         # Module permissions matrix helpers
│       ├── rate-limit.ts          # Sliding window rate limiter
│       ├── server-guard.ts        # Zero-bypass API authentication & RBAC guards
│       └── validations.ts         # Zod schemas for all models & mutations
└── src/middleware.ts              # Next.js Edge zero-bypass route guard
```
