import { PrismaClient, Direction } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('🧪 Testing 30-Minute Turnstile Smart Direction Logic...\n');

  // Use teacher Dr. Tomas Garcia Ferrer Jr. (RFID: 0008479776)
  const rfid = '0008479776';
  const teacher = await prisma.teacher.findFirst({ where: { rfidNumber: rfid } });
  if (!teacher) {
    throw new Error('Teacher not found with RFID ' + rfid);
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Clear today's attendance for this person to simulate a brand new day
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" DISABLE TRIGGER trg_attendance_immutable;');
  await prisma.attendanceRecord.deleteMany({
    where: { personId: teacher.id, scannedAt: { gte: startOfToday } },
  });
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ENABLE TRIGGER trg_attendance_immutable;');

  // Step 1: First tap of the day -> CLOCK_IN
  console.log('1. Tapping first time on a new day...');
  const res1 = await fetch(`${BASE_URL}/api/turnstile/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rfidNumber: rfid }),
  });
  const d1 = await res1.json();
  console.log(`   -> Direction: ${d1.attendance?.direction} (Expected: CLOCK_IN)`);
  if (d1.attendance?.direction !== 'CLOCK_IN') throw new Error('Step 1 failed');

  // Step 2: Second tap within 30 minutes -> CLOCK_IN
  console.log('2. Tapping 2nd time within 30 minutes on new day...');
  const res2 = await fetch(`${BASE_URL}/api/turnstile/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rfidNumber: rfid }),
  });
  const d2 = await res2.json();
  console.log(`   -> Direction: ${d2.attendance?.direction} (Expected: CLOCK_IN)`);
  if (d2.attendance?.direction !== 'CLOCK_IN') throw new Error('Step 2 failed');

  // Step 3: Third tap within 30 minutes -> CLOCK_IN
  console.log('3. Tapping 3rd time within 30 minutes on new day...');
  const res3 = await fetch(`${BASE_URL}/api/turnstile/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rfidNumber: rfid }),
  });
  const d3 = await res3.json();
  console.log(`   -> Direction: ${d3.attendance?.direction} (Expected: CLOCK_IN)`);
  if (d3.attendance?.direction !== 'CLOCK_IN') throw new Error('Step 3 failed');

  // Step 4: Advance the clock: simulate that the first tap occurred 45 minutes ago
  console.log('4. Simulating that first tap was 45 minutes ago (> 30 mins elapsed)...');
  const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000);
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" DISABLE TRIGGER trg_attendance_immutable;');
  const firstRec = await prisma.attendanceRecord.findFirst({
    where: { personId: teacher.id, scannedAt: { gte: startOfToday } },
    orderBy: { scannedAt: 'asc' },
  });
  if (firstRec) {
    await prisma.attendanceRecord.update({
      where: { id: firstRec.id },
      data: { scannedAt: fortyFiveMinsAgo },
    });
  }
  await prisma.$executeRawUnsafe('ALTER TABLE "AttendanceRecord" ENABLE TRIGGER trg_attendance_immutable;');

  // Now tap after 30 minutes -> CLOCK_OUT
  console.log('   Tapping after 30 minutes...');
  const res4 = await fetch(`${BASE_URL}/api/turnstile/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rfidNumber: rfid }),
  });
  const d4 = await res4.json();
  console.log(`   -> Direction: ${d4.attendance?.direction} (Expected: CLOCK_OUT)`);
  if (d4.attendance?.direction !== 'CLOCK_OUT') throw new Error('Step 4 failed');

  // Step 5: Tapping in again in the same day -> CLOCK_IN
  console.log('5. Tapping in again in the same day...');
  const res5 = await fetch(`${BASE_URL}/api/turnstile/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rfidNumber: rfid }),
  });
  const d5 = await res5.json();
  console.log(`   -> Direction: ${d5.attendance?.direction} (Expected: CLOCK_IN)`);
  if (d5.attendance?.direction !== 'CLOCK_IN') throw new Error('Step 5 failed');

  // Step 6: Tapping again (out) -> CLOCK_OUT
  console.log('6. Tapping out again...');
  const res6 = await fetch(`${BASE_URL}/api/turnstile/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rfidNumber: rfid }),
  });
  const d6 = await res6.json();
  console.log(`   -> Direction: ${d6.attendance?.direction} (Expected: CLOCK_OUT)`);
  if (d6.attendance?.direction !== 'CLOCK_OUT') throw new Error('Step 6 failed');

  console.log('\n✅ ALL 6 SMART DIRECTION VERIFICATION SCENARIOS PASSED 100%!');
}

main()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
