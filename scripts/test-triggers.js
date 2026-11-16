const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const log = await prisma.auditLog.findFirst();
    console.log('Testing AuditLog deletion on id:', log.id);
    await prisma.auditLog.delete({ where: { id: log.id } });
    console.error('FAILED: Deletion was permitted!');
  } catch (e) {
    console.log('PASSED: AuditLog immutability trigger intercepted deletion:');
    console.log('   ->', e.message.split('\n').filter(l => l.includes('Audit ledger is immutable'))[0] || e.message);
  }

  try {
    const att = await prisma.attendanceRecord.findFirst();
    console.log('Testing AttendanceRecord deletion on id:', att.id);
    await prisma.attendanceRecord.delete({ where: { id: att.id } });
    console.error('FAILED: Deletion was permitted!');
  } catch (e) {
    console.log('PASSED: AttendanceRecord immutability trigger intercepted deletion:');
    console.log('   ->', e.message.split('\n').filter(l => l.includes('Attendance records are immutable'))[0] || e.message);
  }

  await prisma.$disconnect();
}

test();
