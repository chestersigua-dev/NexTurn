import { prisma } from '../src/lib/prisma';

async function run() {
  console.log('🚀 Verifying Role-Based Classroom Attendance Scoping & Sorting...');

  const BASE_URL = 'http://localhost:3000';

  // 1. Helper to log in and get cookie
  async function loginAs(email: string, pass: string) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const setCookie = res.headers.get('set-cookie');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
    }
    return setCookie;
  }

  // Test 1: Teacher (teacher@nexturn.edu.ph)
  console.log('\n--- 1. Testing Teacher (teacher@nexturn.edu.ph) ---');
  const teacherCookie = await loginAs('teacher@nexturn.edu.ph', 'Password2026!');

  // 1A. Fetch Advisory Section (Grade 11 - STEM-A)
  const p1 = new URLSearchParams({ gradeLevel: 'Grade 11', section: 'STEM-A', subject: 'General Chemistry 1' });
  const teacherAdvRes = await fetch(`${BASE_URL}/api/classroom-attendance?${p1.toString()}`, {
    headers: { Cookie: teacherCookie! },
  });
  const teacherAdvData = await teacherAdvRes.json();
  console.log(`Teacher Advisory Section Query: status=${teacherAdvRes.status}, records=${teacherAdvData.records?.length}, isLeadership=${teacherAdvData.userScope?.isLeadership}`);
  if (teacherAdvData.userScope?.isLeadership !== false) {
    throw new Error('Expected teacher userScope.isLeadership to be false');
  }

  // 1B. Attempt to query an unassigned class and subject (Grade 10 - Bonifacio / Pre-Calculus)
  const p2 = new URLSearchParams({ gradeLevel: 'Grade 10', section: 'Bonifacio', subject: 'Pre-Calculus' });
  const teacherForbiddenRes = await fetch(`${BASE_URL}/api/classroom-attendance?${p2.toString()}`, {
    headers: { Cookie: teacherCookie! },
  });
  const teacherForbiddenData = await teacherForbiddenRes.json();
  console.log(`Teacher Unauthorized Query: status=${teacherForbiddenRes.status}, records=${teacherForbiddenData.records?.length}, scopeAccessDenied=${teacherForbiddenData.userScope?.scopeAccessDenied}`);
  if (!teacherForbiddenData.userScope?.scopeAccessDenied) {
    throw new Error('Expected scopeAccessDenied to be true for teacher requesting unauthorized class');
  }
  if (teacherForbiddenData.records?.length !== 0) {
    throw new Error('Expected 0 records returned for unauthorized teacher query');
  }

  // Test 2: Principal (principal@nexturn.edu.ph)
  console.log('\n--- 2. Testing Principal (principal@nexturn.edu.ph) ---');
  const principalCookie = await loginAs('principal@nexturn.edu.ph', 'Password2026!');

  // 2A. Principal can view Grade 10 - Bonifacio / Pre-Calculus
  const p3 = new URLSearchParams({ gradeLevel: 'Grade 10', section: 'Bonifacio', subject: 'Pre-Calculus' });
  const princRes1 = await fetch(`${BASE_URL}/api/classroom-attendance?${p3.toString()}`, {
    headers: { Cookie: principalCookie! },
  });
  const princData1 = await princRes1.json();
  console.log(`Principal Query Grade 10 Bonifacio: status=${princRes1.status}, isLeadership=${princData1.userScope?.isLeadership}, records=${princData1.records?.length}`);
  if (!princData1.userScope?.isLeadership) {
    throw new Error('Expected principal userScope.isLeadership to be true');
  }

  // 2B. Principal can view Grade 11 - STEM-A / General Chemistry 1
  const p4 = new URLSearchParams({ gradeLevel: 'Grade 11', section: 'STEM-A', subject: 'General Chemistry 1' });
  const princRes2 = await fetch(`${BASE_URL}/api/classroom-attendance?${p4.toString()}`, {
    headers: { Cookie: principalCookie! },
  });
  const princData2 = await princRes2.json();
  console.log(`Principal Query Grade 11 STEM-A: status=${princRes2.status}, records=${princData2.records?.length}`);

  // Test 3: Head Teacher (headteacher@nexturn.edu.ph)
  console.log('\n--- 3. Testing Head Teacher (headteacher@nexturn.edu.ph) ---');
  const headTeacherCookie = await loginAs('headteacher@nexturn.edu.ph', 'Password2026!');

  // 3A. Head Teacher can view all classes
  const htRes = await fetch(
    `${BASE_URL}/api/classroom-attendance?gradeLevel=ALL&section=ALL&subject=ALL&sortBy=gradeLevel&sortOrder=asc`,
    { headers: { Cookie: headTeacherCookie! } }
  );
  const htData = await htRes.json();
  console.log(`Head Teacher All Classes Query: status=${htRes.status}, isLeadership=${htData.userScope?.isLeadership}, totalRecords=${htData.records?.length}`);
  if (!htData.userScope?.isLeadership) {
    throw new Error('Expected head teacher userScope.isLeadership to be true');
  }

  // Test 4: Sorting by Grade, Section, Subject
  console.log('\n--- 4. Testing Sorting by Grade, Section, Subject ---');
  const sortColumns = ['gradeLevel', 'section', 'subject', 'student', 'date'];
  for (const col of sortColumns) {
    const res = await fetch(
      `${BASE_URL}/api/classroom-attendance?gradeLevel=ALL&section=ALL&subject=ALL&sortBy=${col}&sortOrder=asc`,
      { headers: { Cookie: principalCookie! } }
    );
    const data = await res.json();
    console.log(`Sort by ${col.padEnd(10)}: status=${res.status}, recordsCount=${data.records?.length}`);
    if (!res.ok) {
      throw new Error(`Failed to sort by ${col}`);
    }
  }

  // Test 5: Teacher POST Attendance Permissions
  console.log('\n--- 5. Testing Teacher POST Attendance Permissions ---');
  // 5A: Teacher recording for assigned subject / advisory
  const validPostRes = await fetch(`${BASE_URL}/api/classroom-attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: teacherCookie! },
    body: JSON.stringify({
      gradeLevel: 'Grade 11',
      section: 'STEM-A',
      subject: 'General Chemistry 1',
      date: '2026-11-16',
      items: [
        { studentId: teacherAdvData.students?.[0]?.id || 'test-id', status: 'PRESENT', remarks: 'On time' }
      ]
    }),
  });
  console.log(`Teacher Valid POST: status=${validPostRes.status}`);
  if (!validPostRes.ok) {
    throw new Error(`Expected teacher valid POST to succeed, got ${validPostRes.status}`);
  }

  // 5B: Teacher attempting to record for unauthorized class
  const invalidPostRes = await fetch(`${BASE_URL}/api/classroom-attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: teacherCookie! },
    body: JSON.stringify({
      gradeLevel: 'Grade 10',
      section: 'Bonifacio',
      subject: 'Pre-Calculus',
      date: '2026-11-16',
      items: [
        { studentId: 'student-id-123', status: 'PRESENT', remarks: 'Attempt' }
      ]
    }),
  });
  console.log(`Teacher Unauthorized POST: status=${invalidPostRes.status}`);
  if (invalidPostRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for teacher recording unauthorized class, got ${invalidPostRes.status}`);
  }

  console.log('\n✅ ALL ROLE-BASED ACCESS CONTROL & SORTING CHECKS PASSED!');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
