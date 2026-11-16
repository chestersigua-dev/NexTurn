import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

export interface DepEdStudentItem {
  id: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  suffix?: string | null;
  sex?: string | null;
  gradeLevel: string;
  section: string;
  trackStrand?: string | null;
}

export interface DepEdAttendanceRecord {
  id: string;
  studentId: string;
  date: string | Date;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  remarks?: string | null;
}

export interface DepEdAttendanceExportData {
  school: {
    schoolName: string;
    schoolAddress: string;
    contactInfo?: string | null;
    principalName: string;
    logoUrl?: string | null;
  };
  gradeLevel: string;
  section: string;
  subject: string;
  teacher: {
    firstName: string;
    lastName: string;
    position?: string | null;
    department?: string | null;
  };
  students: DepEdStudentItem[];
  records: DepEdAttendanceRecord[];
  distinctDates: string[];
  schoolYear?: string;
  reportPeriod?: string;
}

/**
 * Helper to build matrix lookup: studentId -> dateKey -> { status, remarks }
 */
export function buildAttendanceMatrix(records: DepEdAttendanceRecord[]) {
  const map: Record<string, Record<string, { status: string; remarks?: string | null }>> = {};
  records.forEach((r) => {
    const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : r.date.toISOString().split('T')[0];
    if (!map[r.studentId]) map[r.studentId] = {};
    map[r.studentId][dStr] = {
      status: r.status,
      remarks: r.remarks,
    };
  });
  return map;
}

/**
 * Computes per-student statistics
 */
export function computeStudentStats(
  studentId: string,
  distinctDates: string[],
  matrix: Record<string, Record<string, { status: string; remarks?: string | null }>>
) {
  let present = 0;
  let late = 0;
  let absent = 0;
  let excused = 0;
  let total = 0;

  distinctDates.forEach((d) => {
    const cell = matrix[studentId]?.[d];
    if (cell) {
      total++;
      if (cell.status === 'PRESENT') present++;
      else if (cell.status === 'LATE') late++;
      else if (cell.status === 'ABSENT') absent++;
      else if (cell.status === 'EXCUSED') excused++;
    }
  });

  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
  return { present, late, absent, excused, total, rate };
}

/**
 * GENERATE DEPED ATTENDANCE EXCEL WORKBOOK (8.5 x 13 in Landscape - Folio)
 */
export async function generateDepEdAttendanceExcel(data: DepEdAttendanceExportData): Promise<Buffer> {
  const matrix = buildAttendanceMatrix(data.records);
  const distinctDates = [...data.distinctDates].sort();
  const schoolYear = data.schoolYear || '2025 - 2026';
  const reportPeriod =
    data.reportPeriod ||
    (distinctDates.length > 0
      ? `${distinctDates[0]} to ${distinctDates[distinctDates.length - 1]}`
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NexTurn DepEd RFID Attendance System';
  workbook.created = new Date();

  // Create sheet with 8.5x13 landscape (Paper size 14 = Folio / 8.5x13 in)
  const ws = workbook.addWorksheet('SF2 - Attendance Register', {
    pageSetup: {
      paperSize: 14 as any, // 14 = Folio / Long Bond Paper (8.5 x 13 in / 215.9 mm x 330.2 mm)
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.35,
        bottom: 0.35,
        header: 0.2,
        footer: 0.2,
      },
      showGridLines: true,
    },
  });

  const totalCols = Math.max(9 + distinctDates.length, 14);

  // Set column widths
  ws.getColumn(1).width = 5; // No.
  ws.getColumn(2).width = 30; // Learner Name
  ws.getColumn(3).width = 16; // LRN
  ws.getColumn(4).width = 6; // Sex

  // Date columns
  for (let i = 0; i < distinctDates.length; i++) {
    ws.getColumn(5 + i).width = 5.5;
  }

  // Summary columns
  const sumStartCol = 5 + distinctDates.length;
  ws.getColumn(sumStartCol).width = 7; // Present
  ws.getColumn(sumStartCol + 1).width = 7; // Late
  ws.getColumn(sumStartCol + 2).width = 7; // Absent
  ws.getColumn(sumStartCol + 3).width = 9; // Rate %
  ws.getColumn(sumStartCol + 4).width = 16; // Remarks

  // Row 1: Republic of the Philippines
  ws.mergeCells(1, 1, 1, totalCols);
  const r1 = ws.getCell(1, 1);
  r1.value = 'Republic of the Philippines • Department of Education';
  r1.font = { name: 'Calibri', size: 10, italic: true };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 2: School Division / School Name
  ws.mergeCells(2, 1, 2, totalCols);
  const r2 = ws.getCell(2, 1);
  r2.value = data.school.schoolName.toUpperCase();
  r2.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  r2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 3: School Form 2 Title
  ws.mergeCells(3, 1, 3, totalCols);
  const r3 = ws.getCell(3, 1);
  r3.value = 'DEPED SCHOOL FORM 2 (SF2): CLASS ATTENDANCE REGISTER / DAILY ATTENDANCE REPORT';
  r3.font = { name: 'Calibri', size: 11, bold: true };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 4: Blank separator
  ws.getRow(4).height = 4;

  // Rows 5-6: Class Metadata Banner (DepEd Standard Grid)
  ws.mergeCells(5, 1, 5, 4);
  ws.getCell(5, 1).value = `School Year: ${schoolYear}`;
  ws.getCell(5, 1).font = { name: 'Calibri', size: 9, bold: true };

  ws.mergeCells(5, 5, 5, Math.floor(totalCols / 2));
  ws.getCell(5, 5).value = `Grade & Section: ${data.gradeLevel} - ${data.section}`;
  ws.getCell(5, 5).font = { name: 'Calibri', size: 9, bold: true };

  ws.mergeCells(5, Math.floor(totalCols / 2) + 1, 5, totalCols);
  ws.getCell(5, Math.floor(totalCols / 2) + 1).value = `Subject: ${data.subject}`;
  ws.getCell(5, Math.floor(totalCols / 2) + 1).font = { name: 'Calibri', size: 9, bold: true };

  ws.mergeCells(6, 1, 6, 4);
  ws.getCell(6, 1).value = `Period: ${reportPeriod}`;
  ws.getCell(6, 1).font = { name: 'Calibri', size: 9 };

  ws.mergeCells(6, 5, 6, Math.floor(totalCols / 2));
  ws.getCell(6, 5).value = `Teacher/Adviser: ${data.teacher.lastName}, ${data.teacher.firstName} (${data.teacher.position || 'Faculty'})`;
  ws.getCell(6, 5).font = { name: 'Calibri', size: 9 };

  const trackStrand =
    data.students.find((s) => s.trackStrand)?.trackStrand ||
    (data.gradeLevel.toLowerCase().includes('11') || data.gradeLevel.toLowerCase().includes('12')
      ? 'Academic Track - STEM'
      : '');

  if (trackStrand) {
    ws.mergeCells(6, Math.floor(totalCols / 2) + 1, 6, totalCols);
    ws.getCell(6, Math.floor(totalCols / 2) + 1).value = `Track & Strand: ${trackStrand}`;
    ws.getCell(6, Math.floor(totalCols / 2) + 1).font = { name: 'Calibri', size: 9 };
  }

  // Row 7: Blank separator
  ws.getRow(7).height = 6;

  // Header Rows: Row 8 & 9 (2-tier DepEd table header)
  const headerRow1 = ws.getRow(8);
  const headerRow2 = ws.getRow(9);
  headerRow1.height = 18;
  headerRow2.height = 18;

  // Merge static columns
  ws.mergeCells(8, 1, 9, 1);
  ws.getCell(8, 1).value = 'No.';

  ws.mergeCells(8, 2, 9, 2);
  ws.getCell(8, 2).value = 'Learner Full Name (Last Name, First Name)';

  ws.mergeCells(8, 3, 9, 3);
  ws.getCell(8, 3).value = '12-Digit LRN';

  ws.mergeCells(8, 4, 9, 4);
  ws.getCell(8, 4).value = 'Sex';

  // Date column headers (2-tier: Weekday top, Date bottom)
  distinctDates.forEach((dStr, idx) => {
    const colIdx = 5 + idx;
    const dateObj = new Date(dStr + 'T00:00:00');
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' }).toUpperCase();
    const dayNum = dateObj.getDate().toString();

    ws.getCell(8, colIdx).value = weekday;
    ws.getCell(9, colIdx).value = dayNum;
  });

  // Summary headers
  ws.mergeCells(8, sumStartCol, 9, sumStartCol);
  ws.getCell(8, sumStartCol).value = 'Present';

  ws.mergeCells(8, sumStartCol + 1, 9, sumStartCol + 1);
  ws.getCell(8, sumStartCol + 1).value = 'Late';

  ws.mergeCells(8, sumStartCol + 2, 9, sumStartCol + 2);
  ws.getCell(8, sumStartCol + 2).value = 'Absent';

  ws.mergeCells(8, sumStartCol + 3, 9, sumStartCol + 3);
  ws.getCell(8, sumStartCol + 3).value = 'Rate %';

  ws.mergeCells(8, sumStartCol + 4, 9, sumStartCol + 4);
  ws.getCell(8, sumStartCol + 4).value = 'Remarks';

  // Apply styling to table headers (Rows 8 and 9)
  for (let c = 1; c <= totalCols; c++) {
    const c1 = ws.getCell(8, c);
    const c2 = ws.getCell(9, c);
    [c1, c2].forEach((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    });
  }

  // DepEd SF2 Grouping: Males first, then Females
  const males = data.students.filter((s) => (s.sex || '').toUpperCase().startsWith('M'));
  const females = data.students.filter((s) => (s.sex || '').toUpperCase().startsWith('F'));
  const others = data.students.filter(
    (s) => !(s.sex || '').toUpperCase().startsWith('M') && !(s.sex || '').toUpperCase().startsWith('F')
  );

  let currentRow = 10;

  const renderStudentSection = (list: DepEdStudentItem[], sectionLabel?: string) => {
    if (sectionLabel && list.length > 0) {
      ws.mergeCells(currentRow, 1, currentRow, totalCols);
      const secCell = ws.getCell(currentRow, 1);
      secCell.value = sectionLabel;
      secCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E3A8A' } };
      secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      secCell.alignment = { vertical: 'middle' };
      secCell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
      currentRow++;
    }

    list.forEach((student, idx) => {
      const stats = computeStudentStats(student.id, distinctDates, matrix);
      const row = ws.getRow(currentRow);
      row.height = 16;

      const formattedName = `${student.lastName}, ${student.firstName}${
        student.middleName ? ' ' + student.middleName[0] + '.' : ''
      }${student.suffix ? ' ' + student.suffix : ''}`;

      row.getCell(1).value = idx + 1;
      row.getCell(2).value = formattedName;
      row.getCell(3).value = student.lrn;
      row.getCell(4).value = (student.sex || '').toUpperCase().startsWith('F') ? 'F' : 'M';

      // Dates
      distinctDates.forEach((dStr, dIdx) => {
        const cell = matrix[student.id]?.[dStr];
        const val = cell?.status === 'PRESENT' ? 'P' : cell?.status === 'LATE' ? 'L' : cell?.status === 'ABSENT' ? 'A' : cell?.status === 'EXCUSED' ? 'E' : '-';
        row.getCell(5 + dIdx).value = val;
      });

      // Totals
      row.getCell(sumStartCol).value = stats.present;
      row.getCell(sumStartCol + 1).value = stats.late;
      row.getCell(sumStartCol + 2).value = stats.absent;
      row.getCell(sumStartCol + 3).value = `${stats.rate}%`;
      row.getCell(sumStartCol + 4).value = '';

      // Formatting
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 8 };
        cell.alignment = c === 2 ? { horizontal: 'left', vertical: 'middle' } : { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }

      currentRow++;
    });
  };

  if (males.length > 0 || females.length > 0) {
    if (males.length > 0) renderStudentSection(males, `MALE LEARNERS (${males.length})`);
    if (females.length > 0) renderStudentSection(females, `FEMALE LEARNERS (${females.length})`);
    if (others.length > 0) renderStudentSection(others, `OTHER LEARNERS (${others.length})`);
  } else {
    renderStudentSection(data.students);
  }

  // Daily Turnout Summary Row
  const summaryRow = ws.getRow(currentRow);
  summaryRow.height = 18;
  ws.mergeCells(currentRow, 1, currentRow, 4);
  summaryRow.getCell(1).value = 'DAILY CLASS ATTENDANCE (Present + Late):';
  summaryRow.getCell(1).font = { name: 'Calibri', size: 8.5, bold: true };
  summaryRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

  distinctDates.forEach((dStr, dIdx) => {
    let dayCount = 0;
    data.students.forEach((s) => {
      const cell = matrix[s.id]?.[dStr];
      if (cell && (cell.status === 'PRESENT' || cell.status === 'LATE')) {
        dayCount++;
      }
    });
    summaryRow.getCell(5 + dIdx).value = dayCount;
  });

  // Calculate Overall Turnout
  let overallP = 0;
  let overallTotal = 0;
  data.records.forEach((r) => {
    overallTotal++;
    if (r.status === 'PRESENT' || r.status === 'LATE') overallP++;
  });
  const overallRate = overallTotal > 0 ? Math.round((overallP / overallTotal) * 100) : 0;

  summaryRow.getCell(sumStartCol + 3).value = `${overallRate}%`;

  for (let c = 1; c <= totalCols; c++) {
    const cell = summaryRow.getCell(c);
    cell.font = { name: 'Calibri', size: 8, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
    if (c > 4) cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  currentRow += 2;

  // DepEd Summary Box & Indicators
  ws.mergeCells(currentRow, 2, currentRow + 3, 6);
  const indCell = ws.getCell(currentRow, 2);
  indCell.value = [
    'SUMMARY INDICATORS (DepEd Standard):',
    `• Registered Learners: ${data.students.length} (Male: ${males.length}, Female: ${females.length})`,
    `• Total Class Days Recorded: ${distinctDates.length}`,
    `• Overall Attendance Rate: ${overallRate}%`,
  ].join('\r\n');
  indCell.font = { name: 'Calibri', size: 8.5 };
  indCell.alignment = { vertical: 'top', wrapText: true };
  indCell.border = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
    right: { style: 'thin', color: { argb: 'FF94A3B8' } },
  };

  // Official DepEd Certification & Signature Block
  const sigRow = currentRow + 5;

  // Teacher signature (Left)
  ws.mergeCells(sigRow, 2, sigRow, 6);
  ws.getCell(sigRow, 2).value = 'I certify on my honor that the daily attendance records herein are true and correct:';
  ws.getCell(sigRow, 2).font = { name: 'Calibri', size: 8, italic: true };

  ws.mergeCells(sigRow + 2, 2, sigRow + 2, 6);
  const teacherSigCell = ws.getCell(sigRow + 2, 2);
  teacherSigCell.value = `${data.teacher.firstName} ${data.teacher.lastName}`.toUpperCase();
  teacherSigCell.font = { name: 'Calibri', size: 10, bold: true };
  teacherSigCell.alignment = { horizontal: 'center' };
  teacherSigCell.border = { bottom: { style: 'thin', color: { argb: 'FF000000' } } };

  ws.mergeCells(sigRow + 3, 2, sigRow + 3, 6);
  ws.getCell(sigRow + 3, 2).value = `${data.teacher.position || 'Faculty Teacher'} / Subject Teacher`;
  ws.getCell(sigRow + 3, 2).font = { name: 'Calibri', size: 8 };
  ws.getCell(sigRow + 3, 2).alignment = { horizontal: 'center' };

  // Principal signature (Right)
  const princColStart = Math.max(sumStartCol - 3, 8);
  const princColEnd = totalCols;

  ws.mergeCells(sigRow, princColStart, sigRow, princColEnd);
  ws.getCell(sigRow, princColStart).value = 'Inspected, certified correct and verified by:';
  ws.getCell(sigRow, princColStart).font = { name: 'Calibri', size: 8, italic: true };

  ws.mergeCells(sigRow + 2, princColStart, sigRow + 2, princColEnd);
  const princSigCell = ws.getCell(sigRow + 2, princColStart);
  princSigCell.value = (data.school.principalName || 'Dr. Tomas Garcia Ferrer Jr., Principal IV').toUpperCase();
  princSigCell.font = { name: 'Calibri', size: 10, bold: true };
  princSigCell.alignment = { horizontal: 'center' };
  princSigCell.border = { bottom: { style: 'thin', color: { argb: 'FF000000' } } };

  ws.mergeCells(sigRow + 3, princColStart, sigRow + 3, princColEnd);
  ws.getCell(sigRow + 3, princColStart).value = 'School Principal IV / School Head';
  ws.getCell(sigRow + 3, princColStart).font = { name: 'Calibri', size: 8 };
  ws.getCell(sigRow + 3, princColStart).alignment = { horizontal: 'center' };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * GENERATE DEPED ATTENDANCE PDF (8.5 x 13 in Landscape - Folio)
 */
export function generateDepEdAttendancePdf(data: DepEdAttendanceExportData): Buffer {
  const matrix = buildAttendanceMatrix(data.records);
  const distinctDates = [...data.distinctDates].sort();
  const schoolYear = data.schoolYear || '2025 - 2026';
  const reportPeriod =
    data.reportPeriod ||
    (distinctDates.length > 0
      ? `${distinctDates[0]} to ${distinctDates[distinctDates.length - 1]}`
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

  // Dimensions: 330.2 mm wide by 215.9 mm high (DepEd Folio / 8.5 x 13 in Landscape)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [215.9, 330.2],
  });

  const pageWidth = 330.2;
  const pageHeight = 215.9;
  const marginX = 10.0;

  // Header 1: Republic of the Philippines • Department of Education
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Republic of the Philippines • Department of Education', pageWidth / 2, 10, { align: 'center' });

  // Header 2: School Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138);
  doc.text(data.school.schoolName.toUpperCase(), pageWidth / 2, 15.5, { align: 'center' });

  // Header 3: DepEd SF2 Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'DEPED SCHOOL FORM 2 (SF2): CLASS ATTENDANCE REGISTER / MONTHLY ATTENDANCE RECORD',
    pageWidth / 2,
    20.5,
    { align: 'center' }
  );

  // Metadata Grid Bar
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, 23, pageWidth - marginX * 2, 12, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  // Left col
  doc.setFont('helvetica', 'bold');
  doc.text('School Year:', marginX + 3, 27);
  doc.setFont('helvetica', 'normal');
  doc.text(schoolYear, marginX + 22, 27);

  doc.setFont('helvetica', 'bold');
  doc.text('Period:', marginX + 3, 32);
  doc.setFont('helvetica', 'normal');
  doc.text(reportPeriod, marginX + 22, 32);

  // Mid col
  doc.setFont('helvetica', 'bold');
  doc.text('Grade & Section:', marginX + 90, 27);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.gradeLevel} - ${data.section}`, marginX + 115, 27);

  doc.setFont('helvetica', 'bold');
  doc.text('Subject:', marginX + 90, 32);
  doc.setFont('helvetica', 'normal');
  doc.text(data.subject, marginX + 115, 32);

  // Right col
  doc.setFont('helvetica', 'bold');
  doc.text('Teacher / Adviser:', marginX + 195, 27);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${data.teacher.lastName}, ${data.teacher.firstName} (${data.teacher.position || 'Faculty'})`,
    marginX + 225,
    27
  );

  const pdfTrackStrand =
    data.students.find((s) => s.trackStrand)?.trackStrand ||
    (data.gradeLevel.toLowerCase().includes('11') || data.gradeLevel.toLowerCase().includes('12')
      ? 'Academic Track - STEM'
      : null);

  if (pdfTrackStrand) {
    doc.setFont('helvetica', 'bold');
    doc.text('Track & Strand:', marginX + 195, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(pdfTrackStrand, marginX + 225, 32);
  }

  // Table Column Definition (2-tier header)
  const headTier1 = ['No.', 'Learner Full Name', '12-Digit LRN', 'Sex'];
  const headTier2 = ['', '', '', ''];

  distinctDates.forEach((dStr) => {
    const dObj = new Date(dStr + 'T00:00:00');
    const weekday = dObj.toLocaleDateString('en-US', { weekday: 'narrow' }).toUpperCase();
    const dayNum = dObj.getDate().toString();
    headTier1.push(weekday);
    headTier2.push(dayNum);
  });

  headTier1.push('Pres', 'Late', 'Abs', 'Rate', 'Remarks');
  headTier2.push('', '', '', '', '');

  // Group Students: Males first, then Females
  const males = data.students.filter((s) => (s.sex || '').toUpperCase().startsWith('M'));
  const females = data.students.filter((s) => (s.sex || '').toUpperCase().startsWith('F'));
  const others = data.students.filter(
    (s) => !(s.sex || '').toUpperCase().startsWith('M') && !(s.sex || '').toUpperCase().startsWith('F')
  );

  const tableBody: any[] = [];

  const addStudentRows = (list: DepEdStudentItem[], groupLabel?: string) => {
    if (groupLabel && list.length > 0) {
      tableBody.push([
        {
          content: groupLabel,
          colSpan: headTier1.length,
          styles: { fontStyle: 'bold', fillColor: [226, 232, 240], textColor: [30, 58, 138] },
        },
      ]);
    }

    list.forEach((student, idx) => {
      const stats = computeStudentStats(student.id, distinctDates, matrix);
      const nameStr = `${student.lastName}, ${student.firstName}${
        student.middleName ? ' ' + student.middleName[0] + '.' : ''
      }${student.suffix ? ' ' + student.suffix : ''}`;

      const dateMarks = distinctDates.map((dStr) => {
        const cell = matrix[student.id]?.[dStr];
        return cell?.status === 'PRESENT'
          ? 'P'
          : cell?.status === 'LATE'
          ? 'L'
          : cell?.status === 'ABSENT'
          ? 'A'
          : cell?.status === 'EXCUSED'
          ? 'E'
          : '-';
      });

      tableBody.push([
        (idx + 1).toString(),
        nameStr,
        student.lrn,
        (student.sex || '').toUpperCase().startsWith('F') ? 'F' : 'M',
        ...dateMarks,
        stats.present.toString(),
        stats.late.toString(),
        stats.absent.toString(),
        `${stats.rate}%`,
        '',
      ]);
    });
  };

  // Render Male group with Male subtotal
  if (males.length > 0) {
    addStudentRows(males, `MALE LEARNERS (${males.length})`);
    let mP = 0, mL = 0, mA = 0;
    const mDateTurnout = distinctDates.map((dStr) => {
      let cnt = 0;
      males.forEach((m) => {
        const c = matrix[m.id]?.[dStr];
        if (c && (c.status === 'PRESENT' || c.status === 'LATE')) cnt++;
      });
      return cnt.toString();
    });
    males.forEach((m) => {
      const st = computeStudentStats(m.id, distinctDates, matrix);
      mP += st.present;
      mL += st.late;
      mA += st.absent;
    });
    const mRate = mP + mL + mA > 0 ? Math.round(((mP + mL) / (mP + mL + mA)) * 100) : 0;
    tableBody.push([
      {
        content: `SUBTOTAL MALE (${males.length} learners):`,
        colSpan: 4,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [30, 58, 138] },
      },
      ...mDateTurnout,
      mP.toString(),
      mL.toString(),
      mA.toString(),
      `${mRate}%`,
      '',
    ]);
  }

  // Render Female group with Female subtotal
  if (females.length > 0) {
    addStudentRows(females, `FEMALE LEARNERS (${females.length})`);
    let fP = 0, fL = 0, fA = 0;
    const fDateTurnout = distinctDates.map((dStr) => {
      let cnt = 0;
      females.forEach((f) => {
        const c = matrix[f.id]?.[dStr];
        if (c && (c.status === 'PRESENT' || c.status === 'LATE')) cnt++;
      });
      return cnt.toString();
    });
    females.forEach((f) => {
      const st = computeStudentStats(f.id, distinctDates, matrix);
      fP += st.present;
      fL += st.late;
      fA += st.absent;
    });
    const fRate = fP + fL + fA > 0 ? Math.round(((fP + fL) / (fP + fL + fA)) * 100) : 0;
    tableBody.push([
      {
        content: `SUBTOTAL FEMALE (${females.length} learners):`,
        colSpan: 4,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [157, 23, 77] },
      },
      ...fDateTurnout,
      fP.toString(),
      fL.toString(),
      fA.toString(),
      `${fRate}%`,
      '',
    ]);
  }

  if (others.length > 0) {
    addStudentRows(others, `OTHER LEARNERS (${others.length})`);
  }

  // If no gender classification, render all students directly
  if (males.length === 0 && females.length === 0) {
    addStudentRows(data.students);
  }

  // Daily Turnout Row
  const turnoutCells = distinctDates.map((dStr) => {
    let dayCount = 0;
    data.students.forEach((s) => {
      const cell = matrix[s.id]?.[dStr];
      if (cell && (cell.status === 'PRESENT' || cell.status === 'LATE')) {
        dayCount++;
      }
    });
    return dayCount.toString();
  });

  let overallP = 0;
  let overallL = 0;
  let overallA = 0;
  data.students.forEach((s) => {
    const st = computeStudentStats(s.id, distinctDates, matrix);
    overallP += st.present;
    overallL += st.late;
    overallA += st.absent;
  });
  const overallTotal = overallP + overallL + overallA;
  const overallRate = overallTotal > 0 ? Math.round(((overallP + overallL) / overallTotal) * 100) : 0;

  tableBody.push([
    {
      content: `COMBINED TOTAL (${data.students.length} registered learners):`,
      colSpan: 4,
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [226, 232, 240], textColor: [15, 23, 42] },
    },
    ...turnoutCells,
    overallP.toString(),
    overallL.toString(),
    overallA.toString(),
    `${overallRate}%`,
    '',
  ]);

  // DepEd SF2 Statistical Indicators
  const totalDays = distinctDates.length;
  const totalAttendanceDays = overallP + overallL;
  const ada = totalDays > 0 ? (totalAttendanceDays / totalDays).toFixed(1) : '0';
  const pa = data.students.length > 0 && totalDays > 0 ? Math.round((Number(ada) / data.students.length) * 100) : 0;

  // Dynamic Column Width Calculation for 330.2 mm width (8.5x13 in)
  const baseColWidths: Record<number, { cellWidth?: number; halign?: 'left' | 'center' | 'right' }> = {
    0: { cellWidth: 8, halign: 'center' }, // No.
    1: { halign: 'left' }, // Name (auto expands to fill width)
    2: { cellWidth: 26, halign: 'center' }, // LRN
    3: { cellWidth: 8, halign: 'center' }, // Sex
  };

  const dateColWidth = distinctDates.length > 25 ? 6.5 : distinctDates.length > 15 ? 7.5 : 8.5;

  distinctDates.forEach((_, idx) => {
    baseColWidths[4 + idx] = { cellWidth: dateColWidth, halign: 'center' };
  });

  const sumColStart = 4 + distinctDates.length;
  baseColWidths[sumColStart] = { cellWidth: 10, halign: 'center' }; // Present
  baseColWidths[sumColStart + 1] = { cellWidth: 9, halign: 'center' }; // Late
  baseColWidths[sumColStart + 2] = { cellWidth: 9, halign: 'center' }; // Absent
  baseColWidths[sumColStart + 3] = { cellWidth: 13, halign: 'center' }; // Rate %
  baseColWidths[sumColStart + 4] = { halign: 'left' }; // Remarks (auto expands)

  autoTable(doc, {
    startY: 37,
    margin: { left: marginX, right: marginX, bottom: 35 },
    head: [headTier1, headTier2],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 0.8,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: baseColWidths,
    tableWidth: 'auto',
    didDrawPage: (dataHook) => {
      // Bottom DepEd Certification and Signature Block
      const currentY = pageHeight - 30;

      // DepEd Summary Indicators Box (Center Box)
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(marginX + 80, currentY - 2, 75, 21, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 58, 138);
      doc.text('DEPED SF2 SUMMARY INDICATORS:', marginX + 83, currentY + 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Registered: ${data.students.length} (Male: ${males.length}, Female: ${females.length})`, marginX + 83, currentY + 7.5);
      doc.text(`• Total Class Days Recorded: ${totalDays}`, marginX + 83, currentY + 11.5);
      doc.text(`• Average Daily Attendance (ADA): ${ada}`, marginX + 83, currentY + 15.5);
      doc.text(`• Monthly Attendance Rate (PA): ${pa}%`, marginX + 83, currentY + 19.5);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(71, 85, 105);

      // Left Signature: Teacher
      doc.text(
        'I certify on my honor that the daily attendance records herein are true, complete, and correct:',
        marginX,
        currentY
      );
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const teacherNameUpper = `${data.teacher.firstName} ${data.teacher.lastName}`.toUpperCase();
      doc.text(teacherNameUpper, marginX + 8, currentY + 10);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.2);
      doc.line(marginX + 8, currentY + 11, marginX + 75, currentY + 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`${data.teacher.position || 'Faculty Teacher'} / Subject Teacher`, marginX + 16, currentY + 15);

      // Right Signature: Principal
      const princX = pageWidth - marginX - 85;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Inspected, certified correct and verified by:', princX, currentY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const princNameUpper = (data.school.principalName || 'Dr. Tomas Garcia Ferrer Jr., Principal IV').toUpperCase();
      doc.text(princNameUpper, princX + 8, currentY + 10);
      doc.line(princX + 8, currentY + 11, princX + 75, currentY + 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('School Principal IV / School Head', princX + 18, currentY + 15);

      // Footer note
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `NexTurn School RFID Attendance • DepEd Form 2 Standard • Page ${dataHook.pageNumber}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    },
  });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
