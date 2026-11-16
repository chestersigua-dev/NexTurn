import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireSuperAdmin(req);
    const body = await req.json();

    if (body.confirmation !== 'CONFIRM PURGE') {
      return NextResponse.json(
        { error: 'Confirmation string mismatch. Please type "CONFIRM PURGE" exactly.' },
        { status: 400 }
      );
    }

    const newSchoolName = body.newSchoolName?.trim() || 'NexTurn Comprehensive Academy';
    const newPrincipalName = body.newPrincipalName?.trim() || 'Dr. Tomas Garcia Ferrer Jr., Principal IV';

    // 1. Disable immutability triggers for clean administrative purge
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

    // 2. Wipe transactional & masterlist data
    await prisma.classroomAttendance.deleteMany({});
    await prisma.attendanceRecord.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.teacher.deleteMany({});
    await prisma.auditLog.deleteMany({});

    // 3. Remove non-superadmin accounts, keep current Superadmin active
    await prisma.user.deleteMany({
      where: {
        id: { not: sessionUser.id },
      },
    });

    // 4. Reset School Profile to new clean institution
    await prisma.schoolProfile.upsert({
      where: { id: 'default' },
      update: {
        schoolName: newSchoolName,
        schoolAddress: 'DepEd Division of Schools, Educational Complex, Metro Manila, Philippines',
        contactInfo: '+63 (02) 8888-0000 | info@nexturn.edu.ph',
        principalName: newPrincipalName,
        logoUrl: '/sepnas.png',
      },
      create: {
        id: 'default',
        schoolName: newSchoolName,
        schoolAddress: 'DepEd Division of Schools, Educational Complex, Metro Manila, Philippines',
        contactInfo: '+63 (02) 8888-0000 | info@nexturn.edu.ph',
        principalName: newPrincipalName,
        logoUrl: '/sepnas.png',
      },
    });

    // 5. Reset Turnstile Settings to defaults
    await prisma.turnstileSetting.upsert({
      where: { id: 'default' },
      update: {
        autoToggleDirection: true,
        soundFeedback: true,
        displayDurationSeconds: 4,
        announcementText: `Welcome to ${newSchoolName}! Please tap your RFID card to log attendance.`,
      },
      create: {
        id: 'default',
        autoToggleDirection: true,
        soundFeedback: true,
        displayDurationSeconds: 4,
        announcementText: `Welcome to ${newSchoolName}! Please tap your RFID card to log attendance.`,
      },
    });

    // 6. Reset System Settings to live deployment mode by default
    await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {
        isLiveDeployment: true,
        showDemoAccounts: false,
        showTapSimulator: false,
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

    // 7. Re-enable PostgreSQL immutability triggers
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

    // 8. Mint pristine Genesis block in the new blockchain ledger
    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.DELETE,
      entityType: 'DATABASE_PURGE',
      entityId: 'system',
      details: {
        purgedBy: sessionUser.email,
        newSchoolName,
        newPrincipalName,
        message: 'Database cleanly purged and initialized for new institutional deployment.',
        genesisTimestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Database successfully purged. NexTurn is ready for the new school deployment.',
      schoolName: newSchoolName,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
