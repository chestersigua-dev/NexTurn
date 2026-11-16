import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function applyDatabaseTriggers() {
  console.log('Applying PostgreSQL immutability triggers...');

  // 1. AuditLog trigger
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Audit ledger is immutable';
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_audit_log_immutable ON "AuditLog";
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_audit_log_immutable
    BEFORE UPDATE OR DELETE ON "AuditLog"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();
  `);

  // 2. AttendanceRecord trigger
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION prevent_attendance_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Attendance records are immutable';
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_attendance_immutable ON "AttendanceRecord";
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_attendance_immutable
    BEFORE UPDATE OR DELETE ON "AttendanceRecord"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_attendance_modification();
  `);

  console.log('PostgreSQL immutability triggers applied successfully.');
}

if (require.main === module) {
  applyDatabaseTriggers()
    .catch((err) => {
      console.error('Failed to apply triggers:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
