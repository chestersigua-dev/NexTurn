import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DTRDayRecord {
  day: number;
  amArrival: string;
  amDeparture: string;
  pmArrival: string;
  pmDeparture: string;
  undertimeHours: number;
  undertimeMinutes: number;
}

export interface DTRMonthSummary {
  teacherName: string;
  employeeNumber: string;
  position: string;
  department: string;
  monthName: string;
  year: number;
  principalName: string;
  schoolName: string;
  records: DTRDayRecord[];
  totalUndertimeMinutes: number;
}

export function compileMonthlyDTR(
  teacher: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    suffix?: string | null;
    employeeNumber: string;
    position: string;
    department: string;
  },
  school: {
    schoolName: string;
    principalName: string;
  },
  year: number,
  month: number, // 1-12
  rawAttendance: Array<{
    scannedAt: Date;
    direction: 'CLOCK_IN' | 'CLOCK_OUT';
  }>
): DTRMonthSummary {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthName = monthNames[month - 1];

  const middleInitial = teacher.middleName ? ` ${teacher.middleName[0]}.` : '';
  const suffix = teacher.suffix ? ` ${teacher.suffix}` : '';
  const teacherName = `${teacher.lastName.toUpperCase()}, ${teacher.firstName.toUpperCase()}${middleInitial.toUpperCase()}${suffix.toUpperCase()}`;

  const records: DTRDayRecord[] = [];
  let totalUndertimeMinutes = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayDate = new Date(year, month - 1, d);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

    // Filter scans on this calendar day
    const dayScans = rawAttendance.filter((rec) => {
      const sDate = new Date(rec.scannedAt);
      return (
        sDate.getFullYear() === year &&
        sDate.getMonth() === month - 1 &&
        sDate.getDate() === d
      );
    });

    // Sort by scannedAt ascending
    dayScans.sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime());

    let amArrival = '';
    let amDeparture = '';
    let pmArrival = '';
    let pmDeparture = '';

    for (const scan of dayScans) {
      const time = new Date(scan.scannedAt);
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      // Morning is before 12:00 PM
      if (hours < 12) {
        if (scan.direction === 'CLOCK_IN' && !amArrival) {
          amArrival = timeStr;
        } else if (scan.direction === 'CLOCK_OUT') {
          amDeparture = timeStr;
        }
      } else {
        // Afternoon is 12:00 PM and after
        if (scan.direction === 'CLOCK_IN' && !pmArrival) {
          pmArrival = timeStr;
        } else if (scan.direction === 'CLOCK_OUT') {
          pmDeparture = timeStr;
        }
      }
    }

    // Default weekday arrival/departure fill if only in/out exists
    if (!amDeparture && pmDeparture && amArrival) {
      amDeparture = '12:00';
      if (!pmArrival) pmArrival = '13:00';
    }

    let utH = 0;
    let utM = 0;

    // Standard school work hours: 8:00 AM - 5:00 PM (480 mins required)
    if (!isWeekend && (amArrival || pmDeparture)) {
      if (amArrival) {
        const [h, m] = amArrival.split(':').map(Number);
        const arrivalMin = h * 60 + m;
        const standardMin = 8 * 60; // 8:00 AM
        if (arrivalMin > standardMin) {
          utM += arrivalMin - standardMin;
        }
      }
      if (pmDeparture) {
        const [h, m] = pmDeparture.split(':').map(Number);
        const depMin = h * 60 + m;
        const standardDepMin = 17 * 60; // 5:00 PM
        if (depMin < standardDepMin) {
          utM += standardDepMin - depMin;
        }
      }
      utH = Math.floor(utM / 60);
      utM = utM % 60;
      totalUndertimeMinutes += utH * 60 + utM;
    }

    records.push({
      day: d,
      amArrival: amArrival || (isWeekend ? 'SAT/SUN' : ''),
      amDeparture: amDeparture || (isWeekend ? 'SAT/SUN' : ''),
      pmArrival: pmArrival || (isWeekend ? 'SAT/SUN' : ''),
      pmDeparture: pmDeparture || (isWeekend ? 'SAT/SUN' : ''),
      undertimeHours: utH,
      undertimeMinutes: utM,
    });
  }

  return {
    teacherName,
    employeeNumber: teacher.employeeNumber,
    position: teacher.position,
    department: teacher.department,
    monthName,
    year,
    principalName: school.principalName,
    schoolName: school.schoolName,
    records,
    totalUndertimeMinutes,
  };
}

export function generateDepEdDTRCsv(summary: DTRMonthSummary): string {
  const lines: string[] = [];

  lines.push('CIVIL SERVICE FORM No. 48');
  lines.push('DAILY TIME RECORD');
  lines.push(`School: "${summary.schoolName}"`);
  lines.push(`Name: "${summary.teacherName}"`);
  lines.push(`Employee No: "${summary.employeeNumber}"`);
  lines.push(`Position: "${summary.position}"`);
  lines.push(`Department: "${summary.department}"`);
  lines.push(`For the Month of: "${summary.monthName} ${summary.year}"`);
  lines.push('Official Hours for arrival and departure: Regular days 8:00 AM - 5:00 PM');
  lines.push('');
  lines.push('Day,A.M. Arrival,A.M. Departure,P.M. Arrival,P.M. Departure,Undertime Hours,Undertime Minutes');

  for (const r of summary.records) {
    lines.push(
      `${r.day},"${r.amArrival}","${r.amDeparture}","${r.pmArrival}","${r.pmDeparture}",${r.undertimeHours || ''},${r.undertimeMinutes || ''}`
    );
  }

  const totH = Math.floor(summary.totalUndertimeMinutes / 60);
  const totM = summary.totalUndertimeMinutes % 60;
  lines.push('');
  lines.push(`Total Undertime: ${totH} hours ${totM} minutes`);
  lines.push('');
  lines.push('"I certify on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office."');
  lines.push(`Teacher Signature: ______________________`);
  lines.push(`Verified by Principal: "${summary.principalName}"`);

  return lines.join('\n');
}

export function generateDepEdDTRPdf(summary: DTRMonthSummary): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Civil Service Form No. 48', 105, 12, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DAILY TIME RECORD', 105, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('----- o 0 o -----', 105, 23, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(summary.teacherName, 105, 30, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.line(40, 31, 170, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('(Name)', 105, 34, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`For the month of: ${summary.monthName} ${summary.year}`, 20, 40);
  doc.text(`Official hours for arrival and departure: 8:00 A.M. - 5:00 P.M.`, 20, 45);
  doc.text(`Position: ${summary.position}  |  Dept: ${summary.department}  |  Emp No: ${summary.employeeNumber}`, 20, 50);

  // Table
  const tableData = summary.records.map((r) => [
    r.day.toString(),
    r.amArrival,
    r.amDeparture,
    r.pmArrival,
    r.pmDeparture,
    r.undertimeHours > 0 ? r.undertimeHours.toString() : '',
    r.undertimeMinutes > 0 ? r.undertimeMinutes.toString() : '',
  ]);

  autoTable(doc, {
    startY: 54,
    head: [
      [
        { content: 'Day', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'A.M.', colSpan: 2, styles: { halign: 'center' } },
        { content: 'P.M.', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Under Time', colSpan: 2, styles: { halign: 'center' } },
      ],
      ['Arrival', 'Departure', 'Arrival', 'Departure', 'Hours', 'Mins'],
    ],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1,
      halign: 'center',
      textColor: [0, 0, 0],
      lineColor: [100, 100, 100],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 26 },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { cellWidth: 26 },
      5: { cellWidth: 18 },
      6: { cellWidth: 18 },
    },
    margin: { left: 30, right: 30 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Footer Certification
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  const certText =
    'I certify on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office.';
  doc.text(doc.splitTextToSize(certText, 150), 30, finalY);

  // Signatures
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.line(110, finalY + 16, 175, finalY + 16);
  doc.text('Teacher Signature', 142, finalY + 20, { align: 'center' });

  doc.text('Verified as to prescribed office hours:', 30, finalY + 26);
  doc.setFont('helvetica', 'bold');
  doc.text(summary.principalName, 105, finalY + 36, { align: 'center' });
  doc.line(70, finalY + 37, 140, finalY + 37);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('School Principal / In-Charge', 105, finalY + 41, { align: 'center' });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
