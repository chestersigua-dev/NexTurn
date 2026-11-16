import { PrismaClient, Role, PersonType, Direction, AuditAction } from '@prisma/client';
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

import { computeBlockHash } from '../src/lib/audit';

async function main() {
  console.log('🌱 Starting comprehensive database seed...');

  // Disable PostgreSQL triggers temporarily for clean seeding
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

  // Clear existing data
  await prisma.classroomAttendance.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  // School Profile
  await prisma.schoolProfile.upsert({
    where: { id: 'default' },
    update: {
      schoolName: 'Speaker Eugenio Perez National Agricultural School',
      schoolAddress: 'DepEd Division of Schools, San Carlos City, Pangasinan',
      contactInfo: '(075) 955 5258 | 300388@deped.gov.ph',
      principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
      logoUrl: '/sepnas.png',
    },
    create: {
      id: 'default',
      schoolName: 'Speaker Eugenio Perez National Agricultural School',
      schoolAddress: 'DepEd Division of Schools, San Carlos City, Pangasinan',
      contactInfo: '(075) 955 5258 | 300388@deped.gov.ph',
      principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
      logoUrl: '/sepnas.png',
    },
  });

  // Turnstile Settings
  await prisma.turnstileSetting.upsert({
    where: { id: 'default' },
    update: {
      autoToggleDirection: true,
      soundFeedback: true,
      displayDurationSeconds: 4,
      announcementText: 'Welcome! Please tap your ID card to log attendance.',
    },
    create: {
      id: 'default',
      autoToggleDirection: true,
      soundFeedback: true,
      displayDurationSeconds: 4,
      announcementText: 'Welcome! Please tap your ID card to log attendance.',
    },
  });

  // System & Deployment Settings
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {
      isLiveDeployment: false,
      showDemoAccounts: true,
      showTapSimulator: true,
      theme: 'fb-classic',
    },
    create: {
      id: 'default',
      isLiveDeployment: false,
      showDemoAccounts: true,
      showTapSimulator: true,
      theme: 'fb-classic',
    },
  });

  // Role permissions
  for (const role of Object.values(Role)) {
    const allowed = DEFAULT_ROLE_PERMISSIONS[role] || [];
    for (const mod of ALL_MODULES) {
      await prisma.rolePermission.upsert({
        where: { role_module: { role, module: mod } },
        update: { isAllowed: allowed.includes(mod) },
        create: { role, module: mod, isAllowed: allowed.includes(mod) },
      });
    }
  }

  // Users (all 4 user types)
  const passwordHash = await bcrypt.hash('Password2026!', 10);
  const superadminHash = await bcrypt.hash('N4suaKDS@$&!', 10);

  const superadmin = await prisma.user.create({
    data: {
      email: 'chestersigua@gmail.com',
      passwordHash: superadminHash,
      name: 'Chester Sigua',
      photoUrl: '/superadmin.jpg',
      role: Role.SUPERADMIN,
      rfidNumber: '1000000001',
    },
  });

  const principal = await prisma.user.create({
    data: {
      email: 'principal@nexturn.edu.ph',
      passwordHash,
      name: 'Dr. Tomas Garcia Ferrer Jr.',
      role: Role.PRINCIPAL,
      rfidNumber: '0008479776',
    },
  });

  const adminAide = await prisma.user.create({
    data: {
      email: 'adminaide@nexturn.edu.ph',
      passwordHash,
      name: 'Clarissa M. Del Rosario',
      role: Role.ADMIN_AIDE,
      rfidNumber: '1000000003',
    },
  });

  const headTeacher = await prisma.user.create({
    data: {
      email: 'headteacher@nexturn.edu.ph',
      passwordHash,
      name: 'Prof. Ferdinand C. Lopez',
      role: Role.HEAD_TEACHER,
      rfidNumber: '1000000004',
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: 'teacher@nexturn.edu.ph',
      passwordHash,
      name: 'Maria Elena Santos',
      role: Role.TEACHER,
      rfidNumber: '1100220033',
      assignedSubject: 'General Chemistry 1',
      advisoryGrade: 'Grade 11',
      advisorySection: 'STEM-A',
    },
  });

  // Sample Teachers
  const teacherPrincipal = await prisma.teacher.create({
    data: {
      employeeNumber: 'P-2015-0001',
      firstName: 'Tomas',
      middleName: 'Garcia',
      lastName: 'Ferrer',
      suffix: 'Jr.',
      position: 'Principal IV',
      department: 'School Governance & Operations',
      email: 'tomas.ferrer@deped.gov.ph',
      contactNumber: '09170001122',
      dateHired: new Date('2015-05-18'),
      rfidNumber: '0008479776',
      employmentStatus: 'REGULAR',
    },
  });

  const teacher1 = await prisma.teacher.create({
    data: {
      employeeNumber: 'T-2021-0042',
      firstName: 'Maria',
      middleName: 'Elena',
      lastName: 'Santos',
      suffix: null,
      position: 'Master Teacher II',
      department: 'Science & Technology',
      email: 'maria.santos@deped.gov.ph',
      contactNumber: '09171234567',
      dateHired: new Date('2018-06-04'),
      rfidNumber: '1100220033',
      employmentStatus: 'REGULAR',
      assignedSubject: 'General Chemistry 1',
      advisoryGrade: 'Grade 11',
      advisorySection: 'STEM-A',
    },
  });

  // Link user to teacher record
  await prisma.user.update({
    where: { id: teacherUser.id },
    data: { teacherId: teacher1.id },
  });

  const teacher2 = await prisma.teacher.create({
    data: {
      employeeNumber: 'T-2022-0118',
      firstName: 'Juan',
      middleName: 'Carlos',
      lastName: 'Dela Cruz',
      suffix: 'Jr.',
      position: 'Teacher III',
      department: 'Mathematics',
      email: 'juan.delacruz@deped.gov.ph',
      contactNumber: '09189876543',
      dateHired: new Date('2020-08-15'),
      rfidNumber: '2200330044',
      employmentStatus: 'REGULAR',
      assignedSubject: 'Pre-Calculus',
      advisoryGrade: 'Grade 10',
      advisorySection: 'Bonifacio',
    },
  });

  const teacher3 = await prisma.teacher.create({
    data: {
      employeeNumber: 'T-2023-0205',
      firstName: 'Angela',
      middleName: 'Grace',
      lastName: 'Mercado',
      suffix: null,
      position: 'Teacher I',
      department: 'English & Literature',
      email: 'angela.mercado@deped.gov.ph',
      contactNumber: '09191238899',
      dateHired: new Date('2023-01-10'),
      rfidNumber: '3300440055',
      employmentStatus: 'REGULAR',
      assignedSubject: 'English for Academic & Professional Purposes',
      advisoryGrade: 'Grade 11',
      advisorySection: 'Rizal',
    },
  });

  // Sample Students
  const student1 = await prisma.student.create({
    data: {
      lrn: '109283746512',
      firstName: 'Joshua',
      middleName: 'David',
      lastName: 'Bautista',
      suffix: null,
      sex: 'MALE',
      birthdate: new Date('2009-03-14'),
      age: 17,
      gradeLevel: 'Grade 11',
      section: 'STEM-A',
      trackStrand: 'STEM',
      guardianName: 'Roberto Bautista',
      guardianContact: '09228881122',
      address: '142 Rizal St., Poblacion, Batangas City',
      rfidNumber: '5500660077',
      status: 'ACTIVE',
    },
  });

  const student2 = await prisma.student.create({
    data: {
      lrn: '109283746513',
      firstName: 'Samantha',
      middleName: 'Rose',
      lastName: 'Villanueva',
      suffix: null,
      sex: 'FEMALE',
      birthdate: new Date('2009-08-22'),
      age: 17,
      gradeLevel: 'Grade 11',
      section: 'STEM-A',
      trackStrand: 'STEM',
      guardianName: 'Lourdes Villanueva',
      guardianContact: '09237772233',
      address: '88 Mabini Ave., Batangas City',
      rfidNumber: '6600770088',
      status: 'ACTIVE',
    },
  });

  const student3 = await prisma.student.create({
    data: {
      lrn: '109283746514',
      firstName: 'Gabriel',
      middleName: 'Luis',
      lastName: 'Aquino',
      suffix: null,
      sex: 'MALE',
      birthdate: new Date('2010-01-19'),
      age: 16,
      gradeLevel: 'Grade 10',
      section: 'Bonifacio',
      trackStrand: null,
      guardianName: 'Manuel Aquino',
      guardianContact: '09254443322',
      address: '25 Diamond St., Kumintang Ilaya, Batangas City',
      rfidNumber: '7700880099',
      status: 'ACTIVE',
    },
  });

  const student4 = await prisma.student.create({
    data: {
      lrn: '109283746515',
      firstName: 'Katrina',
      middleName: 'Anne',
      lastName: 'Mendoza',
      suffix: null,
      sex: 'FEMALE',
      birthdate: new Date('2010-11-05'),
      age: 16,
      gradeLevel: 'Grade 10',
      section: 'Bonifacio',
      trackStrand: null,
      guardianName: 'Elena Mendoza',
      guardianContact: '09271110099',
      address: '73 P. Burgos St., Batangas City',
      rfidNumber: '8800990011',
      status: 'ACTIVE',
    },
  });

  const studentSigua = await prisma.student.create({
    data: {
      lrn: '109283746520',
      firstName: 'August Philippe',
      middleName: 'De Jesus',
      lastName: 'Sigua',
      suffix: null,
      sex: 'MALE',
      birthdate: new Date('2012-08-08'),
      age: 14,
      gradeLevel: 'Grade 11',
      section: 'STEM-A',
      trackStrand: 'STEM',
      guardianName: 'Chester Sigua',
      guardianContact: '09171234567',
      address: 'San Carlos City, Pangasinan',
      rfidNumber: '0008535346',
      status: 'ACTIVE',
    },
  });

  // Seed sample Attendance records for November 2026 (current month)
  // Let's create past attendance for Teacher 1 and Students
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-based

  // Populate days 1..15 of current month
  for (let day = 1; day <= 15; day++) {
    // Skip weekends (0 = Sunday, 6 = Saturday)
    const scanDate = new Date(currentYear, currentMonth, day);
    const dayOfWeek = scanDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Morning Clock In for Teacher 1 (around 07:15 AM)
    const t1InTime = new Date(currentYear, currentMonth, day, 7, 15, Math.floor(Math.random() * 50), 320);
    await prisma.attendanceRecord.create({
      data: {
        personType: PersonType.TEACHER,
        personId: teacher1.id,
        rfidNumber: teacher1.rfidNumber,
        direction: Direction.CLOCK_IN,
        scannedAt: t1InTime,
      },
    });

    // Afternoon Clock Out for Teacher 1 (around 04:35 PM)
    const t1OutTime = new Date(currentYear, currentMonth, day, 16, 35, Math.floor(Math.random() * 50), 841);
    await prisma.attendanceRecord.create({
      data: {
        personType: PersonType.TEACHER,
        personId: teacher1.id,
        rfidNumber: teacher1.rfidNumber,
        direction: Direction.CLOCK_OUT,
        scannedAt: t1OutTime,
      },
    });

    // Morning Clock In for Student 1 (around 07:22 AM)
    const s1InTime = new Date(currentYear, currentMonth, day, 7, 22, Math.floor(Math.random() * 50), 105);
    await prisma.attendanceRecord.create({
      data: {
        personType: PersonType.STUDENT,
        personId: student1.id,
        rfidNumber: student1.rfidNumber,
        direction: Direction.CLOCK_IN,
        scannedAt: s1InTime,
      },
    });

    // Afternoon Clock Out for Student 1 (around 04:05 PM)
    const s1OutTime = new Date(currentYear, currentMonth, day, 16, 5, Math.floor(Math.random() * 50), 629);
    await prisma.attendanceRecord.create({
      data: {
        personType: PersonType.STUDENT,
        personId: student1.id,
        rfidNumber: student1.rfidNumber,
        direction: Direction.CLOCK_OUT,
        scannedAt: s1OutTime,
      },
    });

    // Student 2 Clock In & Out
    const s2InTime = new Date(currentYear, currentMonth, day, 7, 30, Math.floor(Math.random() * 50), 450);
    await prisma.attendanceRecord.create({
      data: {
        personType: PersonType.STUDENT,
        personId: student2.id,
        rfidNumber: student2.rfidNumber,
        direction: Direction.CLOCK_IN,
        scannedAt: s2InTime,
      },
    });

    const s2OutTime = new Date(currentYear, currentMonth, day, 16, 12, Math.floor(Math.random() * 50), 882);
    await prisma.attendanceRecord.create({
      data: {
        personType: PersonType.STUDENT,
        personId: student2.id,
        rfidNumber: student2.rfidNumber,
        direction: Direction.CLOCK_OUT,
        scannedAt: s2OutTime,
      },
    });
  }

  // Seed sample Classroom Attendance records across multiple dates for history matrix
  const classDates = [
    { d: new Date('2026-11-10T08:30:00Z'), statuses: ['PRESENT', 'PRESENT', 'PRESENT'] },
    { d: new Date('2026-11-11T08:30:00Z'), statuses: ['PRESENT', 'LATE', 'PRESENT'] },
    { d: new Date('2026-11-12T08:30:00Z'), statuses: ['PRESENT', 'PRESENT', 'PRESENT'] },
    { d: new Date('2026-11-13T08:30:00Z'), statuses: ['LATE', 'PRESENT', 'PRESENT'] },
    { d: new Date('2026-11-14T08:30:00Z'), statuses: ['PRESENT', 'ABSENT', 'PRESENT'] },
    { d: new Date(), statuses: ['PRESENT', 'PRESENT', 'PRESENT'] },
  ];

  const classStudents = [student1, student2, studentSigua];

  for (const session of classDates) {
    for (let sIdx = 0; sIdx < classStudents.length; sIdx++) {
      const student = classStudents[sIdx];
      const status = session.statuses[sIdx] || 'PRESENT';
      await prisma.classroomAttendance.create({
        data: {
          studentId: student.id,
          teacherId: teacher1.id,
          subject: 'General Chemistry 1',
          gradeLevel: 'Grade 11',
          section: 'STEM-A',
          date: session.d,
          status,
          remarks: status === 'LATE' ? 'Late 10 mins' : status === 'ABSENT' ? 'Excused medical' : null,
        },
      });
    }
  }

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

  // Build sequential cryptographic hash chain for AuditLog
  console.log('Building cryptographic blockchain ledger...');
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  const auditEvents = [
    {
      actorId: superadmin.id,
      actorRole: 'SUPERADMIN',
      action: AuditAction.LOGIN,
      entityType: 'AUTH',
      entityId: superadmin.id,
      details: { ip: '127.0.0.1', userAgent: 'Initial Setup Seed Agent' },
      timestamp: new Date(Date.now() - 3600000 * 5),
    },
    {
      actorId: superadmin.id,
      actorRole: 'SUPERADMIN',
      action: AuditAction.SETTINGS_CHANGE,
      entityType: 'SchoolProfile',
      entityId: 'default',
      details: { schoolName: 'Speaker Eugenio Perez National Agricultural School', principal: 'Dr. Tomas Garcia Ferrer Jr., Principal IV' },
      timestamp: new Date(Date.now() - 3600000 * 4),
    },
    {
      actorId: superadmin.id,
      actorRole: 'SUPERADMIN',
      action: AuditAction.CREATE,
      entityType: 'Teacher',
      entityId: teacher1.id,
      details: { employeeNumber: teacher1.employeeNumber, name: 'Maria Elena Santos' },
      timestamp: new Date(Date.now() - 3600000 * 3),
    },
    {
      actorId: superadmin.id,
      actorRole: 'SUPERADMIN',
      action: AuditAction.CREATE,
      entityType: 'Student',
      entityId: student1.id,
      details: { lrn: student1.lrn, name: 'Joshua David Bautista' },
      timestamp: new Date(Date.now() - 3600000 * 2),
    },
    {
      actorId: adminAide.id,
      actorRole: 'ADMIN_AIDE',
      action: AuditAction.LOGIN,
      entityType: 'AUTH',
      entityId: adminAide.id,
      details: { ip: '192.168.1.104', userAgent: 'Mozilla/5.0 Turnstile Operator' },
      timestamp: new Date(Date.now() - 3600000 * 1),
    },
  ];

  for (const evt of auditEvents) {
    const currentHash = computeBlockHash(
      evt.timestamp,
      evt.actorId,
      evt.actorRole,
      evt.action,
      evt.entityType,
      evt.entityId,
      evt.details,
      prevHash
    );

    await prisma.auditLog.create({
      data: {
        timestamp: evt.timestamp,
        actorId: evt.actorId,
        actorRole: evt.actorRole,
        action: evt.action,
        entityType: evt.entityType,
        entityId: evt.entityId,
        details: evt.details,
        previousHash: prevHash,
        currentHash,
      },
    });

    prevHash = currentHash;
  }

  console.log('✅ Seed completed successfully with demo school, staff, students, and blockchain audit ledger!');
  console.log('--------------------------------------------------');
  console.log('Available Demo Logins:');
  console.log('1. Superadmin : chestersigua@gmail.com     / N4suaKDS@$&!');
  console.log('2. Principal  : principal@nexturn.edu.ph   / Password2026!');
  console.log('3. Admin Aide : adminaide@nexturn.edu.ph   / Password2026!');
  console.log('4. HeadTeacher: headteacher@nexturn.edu.ph / Password2026!');
  console.log('5. Teacher    : teacher@nexturn.edu.ph     / Password2026!');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
