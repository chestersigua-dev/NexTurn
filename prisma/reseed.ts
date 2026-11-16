import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ALL_MODULES = [
  'dashboard',
  'teachers',
  'students',
  'classroom_attendance',
  'turnstile_settings',
  'school_settings',
  'audit_logs',
  'rbac_manager',
  'users',
];

const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPERADMIN: ALL_MODULES,
  PRINCIPAL: [
    'dashboard',
    'teachers',
    'students',
    'classroom_attendance',
    'turnstile_settings',
    'school_settings',
    'audit_logs',
    'users',
  ],
  ADMIN_AIDE: [
    'dashboard',
    'teachers',
    'students',
    'classroom_attendance',
    'turnstile_settings',
  ],
  HEAD_TEACHER: [
    'dashboard',
    'teachers',
    'students',
    'classroom_attendance',
  ],
  TEACHER: [
    'dashboard',
    'classroom_attendance',
  ],
};

async function main() {
  console.log('🔄 Starting Tenant Reset & Reseed (Strict Multi-Tenant Reset)...');

  // Disable PostgreSQL triggers temporarily to permit admin wiping of immutable tables
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_log_immutable') THEN
        ALTER TABLE "AuditLog" DISABLE TRIGGER trg_audit_log_immutable;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_attendance_immutable') THEN
        ALTER TABLE "AttendanceRecord" DISABLE TRIGGER trg_attendance_immutable;
      END IF;
    END $$;
  `);

  console.log('Cleaning tenant data (students, teachers, attendance, audit logs, non-superadmin users)...');

  // Wipe attendance & classroom records
  await prisma.classroomAttendance.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});

  // Wipe students & teachers
  await prisma.student.deleteMany({});
  await prisma.teacher.deleteMany({});

  // Wipe audit logs
  await prisma.auditLog.deleteMany({});

  // Wipe non-superadmin users
  await prisma.user.deleteMany({
    where: {
      role: {
        not: Role.SUPERADMIN,
      },
    },
  });

  // Reset or create default School Profile
  await prisma.schoolProfile.upsert({
    where: { id: 'default' },
    update: {
      schoolName: 'Speaker Eugenio Perez National Agricultural School',
      schoolAddress: 'Roxas Blvd, San Carlos City, Pangasinan',
      contactInfo: '(075) 955 5258 | 300388@deped.gov.ph',
      principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
      logoUrl: '/sepnas.png',
    },
    create: {
      id: 'default',
      schoolName: 'Speaker Eugenio Perez National Agricultural School',
      schoolAddress: 'Roxas Blvd, San Carlos City, Pangasinan',
      contactInfo: '(075) 955 5258 | 300388@deped.gov.ph',
      principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
      logoUrl: '/sepnas.png',
    },
  });

  // Reset or create default Turnstile Settings
  await prisma.turnstileSetting.upsert({
    where: { id: 'default' },
    update: {
      autoToggleDirection: true,
      soundFeedback: true,
      displayDurationSeconds: 4,
      announcementText: 'Please tap your ID card to log attendance.',
    },
    create: {
      id: 'default',
      autoToggleDirection: true,
      soundFeedback: true,
      displayDurationSeconds: 4,
      announcementText: 'Please tap your ID card to log attendance.',
    },
  });

  // Ensure default RolePermissions exist
  for (const role of Object.values(Role)) {
    const allowedList = DEFAULT_ROLE_PERMISSIONS[role] || [];
    for (const mod of ALL_MODULES) {
      const isAllowed = allowedList.includes(mod);
      await prisma.rolePermission.upsert({
        where: {
          role_module: {
            role,
            module: mod,
          },
        },
        update: {
          isAllowed,
        },
        create: {
          role,
          module: mod,
          isAllowed,
        },
      });
    }
  }

  // Ensure primary superadmin account exists
  const superadminEmail = 'chestersigua@gmail.com';
  const superadminPass = await bcrypt.hash('N4suaKDS@$&!', 10);

  const superadmin = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {
      name: 'Chester Sigua',
      role: Role.SUPERADMIN,
      passwordHash: superadminPass,
      photoUrl: '/superadmin.jpg',
      rfidNumber: '1000000001',
    },
    create: {
      email: superadminEmail,
      passwordHash: superadminPass,
      name: 'Chester Sigua',
      role: Role.SUPERADMIN,
      photoUrl: '/superadmin.jpg',
      rfidNumber: '1000000001',
    },
  });

  // Re-enable PostgreSQL triggers
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_log_immutable') THEN
        ALTER TABLE "AuditLog" ENABLE TRIGGER trg_audit_log_immutable;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_attendance_immutable') THEN
        ALTER TABLE "AttendanceRecord" ENABLE TRIGGER trg_attendance_immutable;
      END IF;
    END $$;
  `);

  // Write Genesis Block for Audit Log
  const genesisTimestamp = new Date();
  const genesisPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const genesisDetails = {
    event: 'TENANT_INITIALIZED',
    message: 'Genesis audit block created after tenant reset / reseed.',
    superadminId: superadmin.id,
  };
  const genesisRaw = `${genesisTimestamp.toISOString()}|${superadmin.id}|SUPERADMIN|SETTINGS_CHANGE|SYSTEM|genesis|${JSON.stringify(genesisDetails)}|${genesisPrevHash}`;
  const genesisHash = crypto.createHash('sha256').update(genesisRaw).digest('hex');

  await prisma.auditLog.create({
    data: {
      timestamp: genesisTimestamp,
      actorId: superadmin.id,
      actorRole: 'SUPERADMIN',
      action: 'SETTINGS_CHANGE',
      entityType: 'SYSTEM',
      entityId: 'genesis',
      details: genesisDetails,
      previousHash: genesisPrevHash,
      currentHash: genesisHash,
    },
  });

  console.log('✅ Tenant reset complete! Only primary superadmin and default role structures remain.');
  console.log(`   Credentials: ${superadminEmail} / SuperAdmin2026!`);
}

main()
  .catch((e) => {
    console.error('Reseed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

