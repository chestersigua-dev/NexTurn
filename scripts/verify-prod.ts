import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function verify() {
  console.log('🧪 VERIFYING PRODUCTION STATUS 🧪\n');

  const [
    studentCount,
    teacherCount,
    attendanceCount,
    classAttendanceCount,
    userCount,
    users,
    systemSetting,
    schoolProfile,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.attendanceRecord.count(),
    prisma.classroomAttendance.count(),
    prisma.user.count(),
    prisma.user.findMany({ select: { email: true, name: true, photoUrl: true, role: true } }),
    prisma.systemSetting.findFirst(),
    prisma.schoolProfile.findFirst(),
  ]);

  console.log(`• Student count: ${studentCount} (Expected: 0)`);
  if (studentCount !== 0) throw new Error('Students table is not blank!');

  console.log(`• Teacher count: ${teacherCount} (Expected: 0)`);
  if (teacherCount !== 0) throw new Error('Teachers table is not blank!');

  console.log(`• Turnstile Attendance records count: ${attendanceCount} (Expected: 0)`);
  if (attendanceCount !== 0) throw new Error('Attendance records table is not blank!');

  console.log(`• Classroom Attendance records count: ${classAttendanceCount} (Expected: 0)`);
  if (classAttendanceCount !== 0) throw new Error('Classroom attendance records table is not blank!');

  console.log(`• User count: ${userCount} (Expected: 1 - only admin)`);
  if (userCount !== 1) throw new Error(`Users table should have only 1 admin, found: ${userCount}`);

  console.log(`• Admin User: ${users[0].name} <${users[0].email}> (${users[0].role})`);
  console.log(`• Admin Photo: ${users[0].photoUrl}`);
  if (users[0].role !== 'SUPERADMIN') throw new Error('User is not SUPERADMIN!');
  if (users[0].email !== 'chestersigua@gmail.com') throw new Error(`Admin email is not chestersigua@gmail.com, got: ${users[0].email}`);
  if (users[0].name !== 'Chester Sigua') throw new Error(`Admin name is not Chester Sigua, got: ${users[0].name}`);
  if (users[0].photoUrl !== '/superadmin.jpg') throw new Error(`Admin photoUrl is not /superadmin.jpg, got: ${users[0].photoUrl}`);

  console.log(`• System isLiveDeployment: ${systemSetting?.isLiveDeployment} (Expected: true)`);
  if (systemSetting?.isLiveDeployment !== true) throw new Error('isLiveDeployment is not true!');

  console.log(`• System showDemoAccounts: ${systemSetting?.showDemoAccounts} (Expected: false)`);
  if (systemSetting?.showDemoAccounts !== false) throw new Error('showDemoAccounts is not false!');

  console.log(`• System showTapSimulator: ${systemSetting?.showTapSimulator} (Expected: false)`);
  if (systemSetting?.showTapSimulator !== false) throw new Error('showTapSimulator is not false!');

  console.log(`• School Name: ${schoolProfile?.schoolName}`);
  console.log(`• School Logo: ${schoolProfile?.logoUrl} (Expected: /sepnas.png)`);
  if (schoolProfile?.logoUrl !== '/sepnas.png') throw new Error(`School logoUrl is not /sepnas.png! Got: ${schoolProfile?.logoUrl}`);

  // Check file assets
  const logoSvg = path.join(process.cwd(), 'public', 'logo.svg');
  const sepnasPng = path.join(process.cwd(), 'public', 'sepnas.png');
  if (!fs.existsSync(logoSvg)) throw new Error('logo.svg is missing!');
  if (!fs.existsSync(sepnasPng)) throw new Error('sepnas.png is missing!');

  console.log('• Assets: public/logo.svg and public/sepnas.png both exist.');

  console.log('\n🎉 ALL PRODUCTION CHECKS VERIFIED SUCCESSFULLY! 🎉\n');
  await prisma.$disconnect();
}

verify().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
