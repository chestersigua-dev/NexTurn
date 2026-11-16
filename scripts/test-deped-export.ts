import { prisma } from '../src/lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function testDepEdExport() {
  console.log('🧪 TESTING DEPED ATTENDANCE EXPORT (PDF & EXCEL - 8.5x13 FOLIO) 🧪\n');

  // 1. Authenticate Principal
  const princLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'principal@nexturn.edu.ph', password: 'Password2026!' }),
  });
  if (!princLoginRes.ok) {
    throw new Error(`Principal login failed: ${princLoginRes.status}`);
  }
  const princCookie = princLoginRes.headers.get('set-cookie') || '';
  console.log('✅ Principal logged in successfully');

  // 2. Authenticate Teacher
  const teacherLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher@nexturn.edu.ph', password: 'Password2026!' }),
  });
  if (!teacherLoginRes.ok) {
    throw new Error(`Teacher login failed: ${teacherLoginRes.status}`);
  }
  const teacherCookie = teacherLoginRes.headers.get('set-cookie') || '';
  console.log('✅ Teacher logged in successfully');

  // 3. Export PDF as Principal (DepEd School Form 2 style)
  const pdfParams = new URLSearchParams({
    format: 'pdf',
    gradeLevel: 'Grade 11',
    section: 'STEM-A',
    subject: 'General Chemistry 1',
  });
  const pdfRes = await fetch(`${BASE_URL}/api/classroom-attendance/export?${pdfParams.toString()}`, {
    headers: { Cookie: princCookie },
  });
  if (!pdfRes.ok) {
    throw new Error(`PDF export failed with status ${pdfRes.status}`);
  }
  const pdfContentType = pdfRes.headers.get('content-type') || '';
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  const isPdfHeader = pdfBuffer.slice(0, 4).toString() === '%PDF';

  if (!pdfContentType.includes('application/pdf')) {
    throw new Error(`Expected application/pdf, got: ${pdfContentType}`);
  }
  if (!isPdfHeader) {
    throw new Error('PDF output does not have %PDF magic header bytes');
  }
  const pdfString = pdfBuffer.toString('latin1');
  if (pdfString.includes('Paper Dimensions')) {
    throw new Error('PDF output still contains "Paper Dimensions" field!');
  }
  console.log('✅ [PASS] Verified "Paper Dimensions" field is completely removed from PDF export');
  console.log(`✅ [PASS] PDF Export: Status 200, Content-Type: ${pdfContentType}, Size: ${pdfBuffer.length} bytes (starts with %PDF)`);

  // 4. Export Excel as Principal (Folio 8.5x13 paperSize 14)
  const excelParams = new URLSearchParams({
    format: 'excel',
    gradeLevel: 'Grade 11',
    section: 'STEM-A',
    subject: 'General Chemistry 1',
  });
  const excelRes = await fetch(`${BASE_URL}/api/classroom-attendance/export?${excelParams.toString()}`, {
    headers: { Cookie: princCookie },
  });
  if (!excelRes.ok) {
    throw new Error(`Excel export failed with status ${excelRes.status}`);
  }
  const excelContentType = excelRes.headers.get('content-type') || '';
  const excelBuffer = Buffer.from(await excelRes.arrayBuffer());

  if (!excelContentType.includes('spreadsheetml')) {
    throw new Error(`Expected spreadsheetml content-type, got: ${excelContentType}`);
  }
  if (excelBuffer.length < 5000) {
    throw new Error(`Excel buffer unexpectedly small: ${excelBuffer.length} bytes`);
  }
  console.log(`✅ [PASS] Excel Export: Status 200, Content-Type: ${excelContentType}, Size: ${excelBuffer.length} bytes`);

  // 5. Teacher exporting their assigned advisory section & subject (Allowed)
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
  if (!teacherAllowedRes.ok) {
    throw new Error(`Teacher export of assigned class should succeed: ${teacherAllowedRes.status}`);
  }
  console.log('✅ [PASS] Teacher can export assigned subject and advisory section');

  // 6. Teacher attempting to export an unassigned grade/section/subject (Blocked 403 Forbidden)
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
  if (teacherForbiddenRes.status !== 403) {
    throw new Error(`Expected status 403 Forbidden for teacher unassigned export, got: ${teacherForbiddenRes.status}`);
  }
  console.log('✅ [PASS] Teacher is strictly FORBIDDEN (403) from exporting unassigned class / subject');

  console.log('\n🎉 ALL DEPED EXPORT VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  await prisma.$disconnect();
}

testDepEdExport().catch((err) => {
  console.error('❌ DepEd export test failed:', err);
  process.exit(1);
});
