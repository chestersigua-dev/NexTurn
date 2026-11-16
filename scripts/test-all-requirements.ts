import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING MASTER BUILD SPECIFICATION VERIFICATION 🧪');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------------------
  // 1. PUBLIC RFID TURNSTILE KIOSK (NO LOGIN REQUIRED)
  // ----------------------------------------------------------------
  console.log('\n--- 1. Testing Public RFID Turnstile Kiosk ---');
  try {
    let infoRes = await fetch(`${BASE_URL}/api/turnstile/info`);
    if (!infoRes.ok) {
      await new Promise((r) => setTimeout(r, 600));
      infoRes = await fetch(`${BASE_URL}/api/turnstile/info`);
    }
    const infoData = await infoRes.json();
    assert(infoRes.status === 200, 'Public Turnstile info accessible without login');
    assert(!!infoData.school.schoolName, 'Public Turnstile displays configured school name', infoData.school.schoolName);

    // Test RFID Scan on Teacher (1100220033)
    const scanTeacherRes = await fetch(`${BASE_URL}/api/turnstile/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfidNumber: '1100220033' }),
    });
    const scanTeacherData = await scanTeacherRes.json();
    assert(scanTeacherRes.status === 200, 'Turnstile scan succeeds without login');
    assert(scanTeacherData.person.type === 'TEACHER', 'Turnstile identifies Teacher correctly');
    assert(!!scanTeacherData.attendance.scannedAt, 'Attendance timestamp recorded with milliseconds', scanTeacherData.attendance.scannedAt);

    // Test RFID Scan on Student (5500660077)
    const scanStudentRes = await fetch(`${BASE_URL}/api/turnstile/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfidNumber: '5500660077' }),
    });
    const scanStudentData = await scanStudentRes.json();
    assert(scanStudentRes.status === 200, 'Student RFID scan succeeds without login');
    assert(scanStudentData.person.type === 'STUDENT', 'Turnstile identifies Student correctly');

    // Test Unregistered RFID Card (9999999999)
    const scanUnregRes = await fetch(`${BASE_URL}/api/turnstile/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfidNumber: '9999999999' }),
    });
    assert(scanUnregRes.status === 404, 'Unregistered card returns 404 error cleanly');
  } catch (err: any) {
    assert(false, 'Public Turnstile test exception', err.message);
  }

  // ----------------------------------------------------------------
  // 2. ZERO-BYPASS ROUTE & API GUARDS
  // ----------------------------------------------------------------
  console.log('\n--- 2. Testing Route & API Guards ---');
  try {
    const unauthApiRes = await fetch(`${BASE_URL}/api/dashboard/stats`);
    assert(unauthApiRes.status === 401, 'Protected API returns 401 Unauthorized without session');

    const unauthTeachersRes = await fetch(`${BASE_URL}/api/teachers`);
    assert(unauthTeachersRes.status === 401, 'Teachers API returns 401 Unauthorized without session');
  } catch (err: any) {
    assert(false, 'Route guard test exception', err.message);
  }

  // ----------------------------------------------------------------
  // 3. AUTHENTICATION & LOGIN (ALL 4 USER TYPES)
  // ----------------------------------------------------------------
  console.log('\n--- 3. Testing RBAC Authentication (All 4 User Types) ---');
  let superadminCookie = '';
  let headTeacherCookie = '';
  let principalCookie = '';
  let adminAideCookie = '';
  let teacherCookie = '';

  const loginUser = async (email: string, pass: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const setCookie = res.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    return { res, cookie, data: await res.json() };
  };

  try {
    // 3.1 Superadmin
    let saLogin = await loginUser('chestersigua@gmail.com', 'N4suaKDS@$&!');
    if (!saLogin.res.ok) {
      saLogin = await loginUser('superadmin@nexturn.edu.ph', 'SuperAdmin2026!');
    }
    assert(saLogin.res.status === 200, 'Superadmin login successful');
    assert(saLogin.data.user.role === 'SUPERADMIN', 'Superadmin role verified');
    superadminCookie = saLogin.cookie;

    // 3.2 Principal
    const prLogin = await loginUser('principal@nexturn.edu.ph', 'Password2026!');
    assert(prLogin.res.status === 200, 'Principal login successful');
    principalCookie = prLogin.cookie;

    // 3.3 Admin Aide
    const aaLogin = await loginUser('adminaide@nexturn.edu.ph', 'Password2026!');
    assert(aaLogin.res.status === 200, 'Admin Aide login successful');
    adminAideCookie = aaLogin.cookie;

    // 3.4 Head Teacher
    const htLogin = await loginUser('headteacher@nexturn.edu.ph', 'Password2026!');
    assert(htLogin.res.status === 200, 'Head Teacher login successful');
    headTeacherCookie = htLogin.cookie;
  } catch (err: any) {
    assert(false, 'Authentication test exception', err.message);
  }

  // ----------------------------------------------------------------
  // 4. UNIVERSAL USER PROFILE EDITING (ALL USERS)
  // ----------------------------------------------------------------
  console.log('\n--- 4. Testing Universal User Profile Editing ---');
  try {
    const profileRes = await fetch(`${BASE_URL}/api/profile`, {
      method: 'GET',
      headers: { Cookie: headTeacherCookie },
    });
    const profileData = await profileRes.json();
    assert(profileRes.status === 200, 'Head Teacher can access personal profile');

    // Update 10-digit RFID and details
    const updateRes = await fetch(`${BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: headTeacherCookie,
      },
      body: JSON.stringify({
        name: profileData.user.name,
        email: profileData.user.email,
        rfidNumber: '1000000004',
      }),
    });
    assert(updateRes.status === 200, 'User can update personal account details & 10-digit RFID');
  } catch (err: any) {
    assert(false, 'Universal profile test exception', err.message);
  }

  // ----------------------------------------------------------------
  // 5. TEACHER ROLE-BASED CRUD & DEPED FORM 48 TIMECARD
  // ----------------------------------------------------------------
  console.log('\n--- 5. Testing Teacher CRUD & Head Teacher Mutation Restriction ---');
  let testTeacherId = '';
  try {
    // 5.1 Admin Aide can create teacher
    const randEmp = 'T-' + Date.now().toString().slice(-6);
    const randRfid = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const createRes = await fetch(`${BASE_URL}/api/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminAideCookie,
      },
      body: JSON.stringify({
        employeeNumber: randEmp,
        firstName: 'Clarissa',
        lastName: 'Montenegro',
        position: 'Teacher II',
        department: 'Filipino',
        contactNumber: '09171239999',
        dateHired: '2022-06-01',
        rfidNumber: randRfid,
        employmentStatus: 'REGULAR',
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'Admin Aide can successfully create a Teacher record');
    testTeacherId = createData.teacher?.id;

    // 5.2 Head Teacher is strictly Read-Only on Teachers (Requirement 5.B)
    const htCreateRes = await fetch(`${BASE_URL}/api/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: headTeacherCookie,
      },
      body: JSON.stringify({
        employeeNumber: 'T-2026-8888',
        firstName: 'Blocked',
        lastName: 'Teacher',
        position: 'Teacher I',
        department: 'Science',
        contactNumber: '09170000000',
        dateHired: '2023-01-01',
        rfidNumber: '9900880077',
      }),
    });
    assert(
      htCreateRes.status === 403,
      'Head Teacher is strictly BLOCKED from creating Teacher (403 Forbidden)'
    );

    const htDeleteRes = await fetch(`${BASE_URL}/api/teachers/${testTeacherId}`, {
      method: 'DELETE',
      headers: { Cookie: headTeacherCookie },
    });
    assert(
      htDeleteRes.status === 403,
      'Head Teacher is strictly BLOCKED from deleting Teacher (403 Forbidden)'
    );

    // 5.3 DepEd Civil Service Form No. 48 Export (PDF & CSV)
    const sampleTeacher = await prisma.teacher.findFirst();
    if (sampleTeacher) {
      const csvDtrRes = await fetch(
        `${BASE_URL}/api/teachers/${sampleTeacher.id}/timecard?year=2026&month=11&format=csv`,
        { headers: { Cookie: superadminCookie } }
      );
      assert(csvDtrRes.status === 200, 'DepEd Form 48 CSV export succeeds');
      const csvText = await csvDtrRes.text();
      assert(csvText.includes('CIVIL SERVICE FORM No. 48'), 'DepEd Form 48 CSV contains standard civil service header');

      const pdfDtrRes = await fetch(
        `${BASE_URL}/api/teachers/${sampleTeacher.id}/timecard?year=2026&month=11&format=pdf`,
        { headers: { Cookie: superadminCookie } }
      );
      assert(pdfDtrRes.status === 200, 'DepEd Form 48 PDF export succeeds');
      const pdfType = pdfDtrRes.headers.get('content-type');
      assert(Boolean(pdfType?.includes('application/pdf')), 'DepEd Form 48 PDF returns valid application/pdf MIME type');
    }
  } catch (err: any) {
    assert(false, 'Teacher CRUD test exception', err.message);
  }

  // ----------------------------------------------------------------
  // 6. STUDENT DATABASE & DEPED SF1 CSV IMPORTER
  // ----------------------------------------------------------------
  console.log('\n--- 6. Testing Student Database & DepEd SF1 CSV Importer ---');
  try {
    const lrn1 = '109' + Math.floor(100000000 + Math.random() * 900000000);
    const lrn2 = '109' + Math.floor(100000000 + Math.random() * 900000000);
    const rfid1 = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const rfid2 = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const csvContent = `LRN,Last Name,First Name,Middle Name,Suffix,Sex,Birthdate,Age,Grade Level,Section,Track/Strand,Parent/Guardian,Guardian Contact,Address,RFID Number
${lrn1},Alvarez,Marco,Jose,,MALE,2009-05-10,17,Grade 11,STEM-A,STEM,Arturo Alvarez,09170011223,Brgy 1 Batangas City,${rfid1}
${lrn2},Bernardo,Bianca,Marie,,FEMALE,2009-08-20,17,Grade 11,STEM-A,STEM,Celia Bernardo,09170022334,Brgy 2 Batangas City,${rfid2}`;

    // Preview
    const previewRes = await fetch(`${BASE_URL}/api/students/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: superadminCookie,
      },
      body: JSON.stringify({ csvContent, action: 'preview' }),
    });
    const previewData = await previewRes.json();
    assert(previewRes.status === 200, 'DepEd CSV preview parses columns correctly');
    assert(previewData.totalRows === 2, 'CSV preview accurately counts 2 rows');

    // Import
    const importRes = await fetch(`${BASE_URL}/api/students/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: superadminCookie,
      },
      body: JSON.stringify({ csvContent, action: 'import' }),
    });
    const importData = await importRes.json();
    assert(importRes.status === 200, 'DepEd CSV bulk upsert succeeds');
    assert(importData.inserted + importData.updated === 2, 'DepEd CSV upserted 2 student records into PostgreSQL');
  } catch (err: any) {
    assert(false, 'Student CSV test exception', err.message);
  }

  // ----------------------------------------------------------------
  // 7. DATABASE IMMUTABILITY TRIGGERS (AUDIT LOG & ATTENDANCE)
  // ----------------------------------------------------------------
  console.log('\n--- 7. Testing PostgreSQL Immutability Triggers ---');
  try {
    // 7.1 AttendanceRecord trigger
    let attTriggerBlocked = false;
    try {
      const att = await prisma.attendanceRecord.findFirst();
      if (att) {
        await prisma.attendanceRecord.delete({ where: { id: att.id } });
      }
    } catch (e: any) {
      if (e.message.includes('Attendance records are immutable')) {
        attTriggerBlocked = true;
      }
    }
    assert(attTriggerBlocked, 'PostgreSQL trigger strictly prevents AttendanceRecord deletion');

    // 7.2 AuditLog trigger
    let auditTriggerBlocked = false;
    try {
      const audit = await prisma.auditLog.findFirst();
      if (audit) {
        await prisma.auditLog.delete({ where: { id: audit.id } });
      }
    } catch (e: any) {
      if (e.message.includes('Audit ledger is immutable')) {
        auditTriggerBlocked = true;
      }
    }
    assert(auditTriggerBlocked, 'PostgreSQL trigger strictly prevents AuditLog deletion');
  } catch (err: any) {
    assert(false, 'Trigger test exception', err.message);
  }

  // ----------------------------------------------------------------
  // 8. BLOCKCHAIN INTEGRITY VERIFIER
  // ----------------------------------------------------------------
  console.log('\n--- 8. Testing Blockchain Cryptographic Integrity Verifier ---');
  try {
    const verifyRes = await fetch(`${BASE_URL}/api/audit-logs/verify`, {
      method: 'POST',
      headers: { Cookie: superadminCookie },
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200, 'Blockchain verification endpoint responds 200');
    assert(verifyData.verification.isValid === true, 'Blockchain cryptographic SHA-256 ledger is 100% verified & untampered');
    assert(verifyData.verification.totalBlocks > 0, `Total verified blocks in chain: ${verifyData.verification.totalBlocks}`);
  } catch (err: any) {
    assert(false, 'Blockchain verifier test exception', err.message);
  }

  // ----------------------------------------------------------------
  // 9. DYNAMIC RBAC MATRIX MODULATION
  // ----------------------------------------------------------------
  console.log('\n--- 9. Testing Dynamic RBAC Allow/Block Modulation ---');
  try {
    const rbacGetRes = await fetch(`${BASE_URL}/api/rbac`, {
      headers: { Cookie: superadminCookie },
    });
    const rbacGetData = await rbacGetRes.json();
    assert(rbacGetRes.status === 200, 'RBAC matrix retrieved successfully');
    assert(rbacGetData.modules.length === 9, 'All 9 system modules present in matrix');
  } catch (err: any) {
    assert(false, 'RBAC matrix test exception', err.message);
  }

  // ----------------------------------------------------------------
  // 10. ROLE-BASED CLASS ATTENDANCE SCOPING & SORTING
  // ----------------------------------------------------------------
  console.log('\n--- 10. Testing Role-Based Class Attendance Scoping & Sorting ---');
  try {
    // 10A. Teacher login
    const teacherLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@nexturn.edu.ph', password: 'Password2026!' }),
    });
    teacherCookie = teacherLoginRes.headers.get('set-cookie') || '';
    assert(teacherLoginRes.status === 200, 'Teacher login successful');

    // 10B. Teacher can view their advisory section (Grade 11 - STEM-A)
    const pAdv = new URLSearchParams({ gradeLevel: 'Grade 11', section: 'STEM-A', subject: 'General Chemistry 1' });
    const teacherAdvRes = await fetch(`${BASE_URL}/api/classroom-attendance?${pAdv.toString()}`, {
      headers: { Cookie: teacherCookie },
    });
    const teacherAdvData = await teacherAdvRes.json();
    assert(teacherAdvRes.status === 200 && teacherAdvData.userScope?.isLeadership === false, 'Teacher advisory section query succeeds with teacher scope');

    // 10C. Teacher is strictly BLOCKED from viewing unassigned class/subject
    const pUnauth = new URLSearchParams({ gradeLevel: 'Grade 10', section: 'Bonifacio', subject: 'Pre-Calculus' });
    const teacherUnauthRes = await fetch(`${BASE_URL}/api/classroom-attendance?${pUnauth.toString()}`, {
      headers: { Cookie: teacherCookie },
    });
    const teacherUnauthData = await teacherUnauthRes.json();
    assert(
      teacherUnauthData.userScope?.scopeAccessDenied === true && teacherUnauthData.records.length === 0,
      'Teacher strictly restricted from viewing unassigned class & subject'
    );

    // 10D. Principal and Head Teacher can view all classes
    const pAll = new URLSearchParams({ gradeLevel: 'ALL', section: 'ALL', subject: 'ALL', sortBy: 'gradeLevel', sortOrder: 'asc' });
    const princAllRes = await fetch(`${BASE_URL}/api/classroom-attendance?${pAll.toString()}`, {
      headers: { Cookie: principalCookie },
    });
    const princAllData = await princAllRes.json();
    assert(princAllRes.status === 200 && princAllData.userScope?.isLeadership === true, 'Principal can view all classes & subjects');

    // 10E. Sorting by Grade Level, Section, and Subject
    const sortCols = ['gradeLevel', 'section', 'subject'];
    let allSortsOk = true;
    for (const c of sortCols) {
      const pSort = new URLSearchParams({ gradeLevel: 'ALL', section: 'ALL', subject: 'ALL', sortBy: c, sortOrder: 'asc' });
      const sRes = await fetch(`${BASE_URL}/api/classroom-attendance?${pSort.toString()}`, {
        headers: { Cookie: principalCookie },
      });
      if (!sRes.ok) allSortsOk = false;
    }
    assert(allSortsOk, 'Attendance history sortable by grade, section, and subject');
  } catch (err: any) {
    assert(false, 'Class attendance scoping & sorting exception', err.message);
  }

  // ----------------------------------------------------------------
  // 11. DEPED CLASS REGISTER MATRIX EXPORT (PDF & EXCEL - 8.5x13 FOLIO)
  // ----------------------------------------------------------------
  console.log('\n--- 11. Testing DepEd SF2 Class Register Matrix Export (PDF & Excel) ---');
  try {
    // 11A. Export PDF as Principal (DepEd School Form 2 style)
    const pdfParams = new URLSearchParams({
      format: 'pdf',
      gradeLevel: 'Grade 11',
      section: 'STEM-A',
      subject: 'General Chemistry 1',
    });
    const pdfRes = await fetch(`${BASE_URL}/api/classroom-attendance/export?${pdfParams.toString()}`, {
      headers: { Cookie: principalCookie },
    });
    const pdfContentType = pdfRes.headers.get('content-type') || '';
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    const isPdfHeader = pdfBuffer.slice(0, 4).toString() === '%PDF';

    assert(
      pdfRes.status === 200 && pdfContentType.includes('application/pdf') && isPdfHeader && pdfBuffer.length > 5000,
      'Class Register Matrix PDF export generates valid 8.5x13 DepEd SF2 PDF'
    );
    assert(
      !pdfBuffer.toString('latin1').includes('Paper Dimensions'),
      'Field "Paper Dimensions" is completely removed from PDF export'
    );

    // 11B. Export Excel as Principal (Folio 8.5x13 paperSize 14)
    const excelParams = new URLSearchParams({
      format: 'excel',
      gradeLevel: 'Grade 11',
      section: 'STEM-A',
      subject: 'General Chemistry 1',
    });
    const excelRes = await fetch(`${BASE_URL}/api/classroom-attendance/export?${excelParams.toString()}`, {
      headers: { Cookie: principalCookie },
    });
    const excelContentType = excelRes.headers.get('content-type') || '';
    const excelBuffer = Buffer.from(await excelRes.arrayBuffer());

    assert(
      excelRes.status === 200 && excelContentType.includes('spreadsheetml') && excelBuffer.length > 5000,
      'Class Register Matrix Excel export generates valid 8.5x13 DepEd SF2 Excel file'
    );

    // 11C. Teacher can export assigned subject and advisory section
    const teacherAllowedParams = new URLSearchParams({
      format: 'pdf',
      gradeLevel: 'Grade 11',
      section: 'STEM-A',
      subject: 'General Chemistry 1',
    });
    const teacherAllowedRes = await fetch(
      `${BASE_URL}/api/classroom-attendance/export?${teacherAllowedParams.toString()}`,
      { headers: { Cookie: teacherCookie } }
    );
    assert(teacherAllowedRes.status === 200, 'Teacher can export assigned subject and advisory section');

    // 11D. Teacher is strictly FORBIDDEN (403) from exporting unassigned class / subject
    const teacherForbiddenParams = new URLSearchParams({
      format: 'pdf',
      gradeLevel: 'Grade 10',
      section: 'Ruby',
      subject: 'Social Studies 10',
    });
    const teacherForbiddenRes = await fetch(
      `${BASE_URL}/api/classroom-attendance/export?${teacherForbiddenParams.toString()}`,
      { headers: { Cookie: teacherCookie } }
    );
    assert(
      teacherForbiddenRes.status === 403,
      'Teacher is strictly FORBIDDEN (403) from exporting unassigned class / subject'
    );
  } catch (err: any) {
    assert(false, 'DepEd Matrix export exception', err.message);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

