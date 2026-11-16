import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
  console.log('====================================================');
  console.log('🚀 INITIALIZING PRODUCTION READY ENVIRONMENT 🚀');
  console.log('====================================================\n');

  // 1. Verify static assets (Nexturn logo SVG & SEPNAS school logo PNG)
  const publicDir = path.join(process.cwd(), 'public');
  const nexturnLogoPath = path.join(publicDir, 'logo.svg');
  const schoolLogoPath = path.join(publicDir, 'sepnas.png');

  if (!fs.existsSync(nexturnLogoPath)) {
    throw new Error(`NexTurn logo SVG not found at ${nexturnLogoPath}`);
  }
  if (!fs.existsSync(schoolLogoPath)) {
    throw new Error(`School logo sepnas.png not found at ${schoolLogoPath}`);
  }

  // Ensure nexturn-icon.svg matches logo.svg
  fs.copyFileSync(nexturnLogoPath, path.join(publicDir, 'nexturn-icon.svg'));
  console.log('✅ [1/7] Verified NexTurn logo.svg and SEPNAS school logo (sepnas.png)');

  // 2. Disable PostgreSQL triggers temporarily for database wipe
  console.log('⚡ [2/7] Temporarily disabling database triggers for clean purge...');
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

  // 3. Purge all operational data to completely blank state
  console.log('🧹 [3/7] Purging all operational data (blank slate)...');
  await prisma.classroomAttendance.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // 4. Ensure admin account is the only user account in the system
  console.log('👤 [4/7] Ensuring single Administrator account exists (Chester Sigua <chestersigua@gmail.com>)...');
  const superadminEmail = 'chestersigua@gmail.com';
  const superadminPass = await bcrypt.hash('N4suaKDS@$&!', 10);

  // Wipe any existing users before initializing the sole production administrator
  await prisma.user.deleteMany({});

  const superadmin = await prisma.user.create({
    data: {
      email: superadminEmail,
      passwordHash: superadminPass,
      name: 'Chester Sigua',
      role: Role.SUPERADMIN,
      photoUrl: '/superadmin.jpg',
      rfidNumber: '1000000001',
    },
  });

  // 5. Configure Production Live Deployment System Settings
  console.log('🔒 [5/7] Applying strict production settings (No demo accounts, No fake tap simulators)...');
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {
      isLiveDeployment: true,    // Production live mode ACTIVE
      showDemoAccounts: false,   // Remove demo accounts on login screen
      showTapSimulator: false,   // Remove fake tap simulator
      theme: 'fb-classic',
    },
    create: {
      id: 'default',
      isLiveDeployment: true,
      showDemoAccounts: false,
      showTapSimulator: false,
      theme: 'fb-classic',
    },
  });

  // 6. Configure School Profile with SEPNAS and sepnas.png
  console.log('🏫 [6/7] Configuring School Profile with Speaker Eugenio Perez Nat. Ag. School & sepnas.png...');
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

  // Turnstile Settings for live kiosk deployment
  await prisma.turnstileSetting.upsert({
    where: { id: 'default' },
    update: {
      autoToggleDirection: true,
      soundFeedback: true,
      displayDurationSeconds: 4,
      announcementText: 'Welcome to Speaker Eugenio Perez National Agricultural School! Please tap your RFID card to log attendance.',
    },
    create: {
      id: 'default',
      autoToggleDirection: true,
      soundFeedback: true,
      displayDurationSeconds: 4,
      announcementText: 'Welcome to Speaker Eugenio Perez National Agricultural School! Please tap your RFID card to log attendance.',
    },
  });

  // Ensure default RolePermissions
  for (const role of Object.values(Role)) {
    const allowedList = DEFAULT_ROLE_PERMISSIONS[role] || [];
    for (const mod of ALL_MODULES) {
      await prisma.rolePermission.upsert({
        where: { role_module: { role, module: mod } },
        update: { isAllowed: allowedList.includes(mod) },
        create: { role, module: mod, isAllowed: allowedList.includes(mod) },
      });
    }
  }

  // 7. Re-enable PostgreSQL triggers and write Production Genesis Audit Block
  console.log('⛓️  [7/7] Re-enabling PostgreSQL immutability triggers and creating Production Genesis Ledger Block...');
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

  const genesisTimestamp = new Date();
  const genesisPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const genesisDetails = {
    event: 'PRODUCTION_DEPLOYMENT_INITIALIZED',
    message: 'Production genesis audit block created. Database purged for live deployment.',
    superadminId: superadmin.id,
    school: 'Speaker Eugenio Perez National Agricultural School',
    schoolLogo: '/sepnas.png',
    nexturnLogo: '/logo.svg',
    liveDeployment: true,
    showDemoAccounts: false,
    showTapSimulator: false,
  };
  const genesisRaw = `${genesisTimestamp.toISOString()}|${superadmin.id}|SUPERADMIN|SETTINGS_CHANGE|SYSTEM|production-genesis|${JSON.stringify(genesisDetails)}|${genesisPrevHash}`;
  const genesisHash = crypto.createHash('sha256').update(genesisRaw).digest('hex');

  await prisma.auditLog.create({
    data: {
      timestamp: genesisTimestamp,
      actorId: superadmin.id,
      actorRole: 'SUPERADMIN',
      action: 'SETTINGS_CHANGE',
      entityType: 'SYSTEM',
      entityId: 'production-genesis',
      details: genesisDetails,
      previousHash: genesisPrevHash,
      currentHash: genesisHash,
    },
  });

  console.log('\n====================================================');
  console.log('✨ PRODUCTION READY DEPLOYMENT CONFIGURED ✨');
  console.log('====================================================');
  console.log('• Students in Database:       0 (Blank)');
  console.log('• Teachers in Database:       0 (Blank)');
  console.log('• Attendance Records:         0 (Blank)');
  console.log('• Non-Admin Accounts:         0 (Blank - all removed)');
  console.log(`• Admin Account:              Chester Sigua <${superadminEmail}> (Photo: /superadmin.jpg)`);
  console.log('• Login Screen Demo Accounts: DISABLED (Clean staff login)');
  console.log('• Turnstile Tap Simulator:    DISABLED (Live RFID deployment ready)');
  console.log('• NexTurn Logo:               /logo.svg (SVG vector logo)');
  console.log('• School Logo:                /sepnas.png (SEPNAS official seal)');
  console.log('• School Profile:             Speaker Eugenio Perez National Agricultural School');
  console.log('• Cryptographic Ledger:       Verified Genesis Block #1');
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Production setup error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
