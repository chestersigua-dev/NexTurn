import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction, Role } from '@prisma/client';
import {
  generateDepEdAttendancePdf,
  generateDepEdAttendanceExcel,
  DepEdAttendanceExportData,
} from '@/lib/deped-attendance-export';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireModuleAccess('classroom_attendance', req);

    const isLeadership =
      sessionUser.role === Role.SUPERADMIN ||
      sessionUser.role === Role.PRINCIPAL ||
      sessionUser.role === Role.ADMIN_AIDE ||
      sessionUser.role === Role.HEAD_TEACHER;

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'pdf').toLowerCase();
    const gradeLevel = searchParams.get('gradeLevel') || '';
    const section = searchParams.get('section') || '';
    const subject = searchParams.get('subject') || '';
    const dateStr = searchParams.get('date') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    // Lookup teacher profile if teacher account
    let teacherProfile: any = null;
    if (sessionUser.teacherId) {
      teacherProfile = await prisma.teacher.findUnique({ where: { id: sessionUser.teacherId } });
    } else if (sessionUser.email) {
      teacherProfile = await prisma.teacher.findFirst({ where: { email: sessionUser.email } });
    } else if (sessionUser.rfidNumber) {
      teacherProfile = await prisma.teacher.findFirst({ where: { rfidNumber: sessionUser.rfidNumber } });
    }

    const assignedSubject = sessionUser.assignedSubject || teacherProfile?.assignedSubject || 'General Chemistry 1';
    const advisoryGrade = sessionUser.advisoryGrade || teacherProfile?.advisoryGrade || 'Grade 11';
    const advisorySection = sessionUser.advisorySection || teacherProfile?.advisorySection || 'STEM-A';

    // Role-based export access control:
    // Teachers are restricted to their assigned subject or advisory section
    if (!isLeadership) {
      if (gradeLevel && section && subject && gradeLevel !== 'ALL' && section !== 'ALL' && subject !== 'ALL') {
        const matchesSubject = assignedSubject && subject.toLowerCase().includes(assignedSubject.toLowerCase());
        const matchesAdvisory = gradeLevel === advisoryGrade && section === advisorySection;
        if (!matchesSubject && !matchesAdvisory) {
          return NextResponse.json(
            { error: 'Forbidden. Teachers can only export attendance for their assigned subject or advisory section.' },
            { status: 403 }
          );
        }
      }
    }

    // Build filter
    const where: any = {};
    if (!isLeadership) {
      const scopeOr: any[] = [];
      if (assignedSubject) {
        scopeOr.push({ subject: { contains: assignedSubject, mode: 'insensitive' } });
      }
      if (advisoryGrade && advisorySection) {
        scopeOr.push({
          AND: [{ gradeLevel: advisoryGrade }, { section: advisorySection }],
        });
      }
      if (scopeOr.length > 0) {
        where.AND = [...(where.AND || []), { OR: scopeOr }];
      }
    }

    if (gradeLevel && gradeLevel !== 'ALL') where.gradeLevel = gradeLevel;
    if (section && section !== 'ALL') where.section = section;
    if (subject && subject !== 'ALL') where.subject = { contains: subject, mode: 'insensitive' };

    if (dateStr) {
      const d = new Date(dateStr);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const s = new Date(startDate);
        where.date.gte = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
      }
      if (endDate) {
        const e = new Date(endDate);
        where.date.lte = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
      }
    }

    // Query active learners for this grade & section
    let studentWhere: any = { status: 'ACTIVE' };
    if (!isLeadership) {
      const targetGrade = gradeLevel && gradeLevel !== 'ALL' ? gradeLevel : advisoryGrade;
      const targetSection = section && section !== 'ALL' ? section : advisorySection;
      studentWhere.gradeLevel = targetGrade;
      studentWhere.section = targetSection;
    } else {
      if (gradeLevel && gradeLevel !== 'ALL') studentWhere.gradeLevel = gradeLevel;
      if (section && section !== 'ALL') studentWhere.section = section;
    }

    const [schoolProfile, records, students] = await Promise.all([
      prisma.schoolProfile.findFirst(),
      prisma.classroomAttendance.findMany({
        where,
        include: {
          student: true,
          teacher: true,
        },
        orderBy: [{ date: 'asc' }],
        take: 3000,
      }),
      prisma.student.findMany({
        where: studentWhere,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ]);

    // Compute distinct dates
    const distinctDates = Array.from(
      new Set(
        records.map((r) =>
          typeof r.date === 'string'
            ? (r.date as string).split('T')[0]
            : r.date.toISOString().split('T')[0]
        )
      )
    ).sort();

    // Determine representative teacher
    const repTeacher = records.find((r) => r.teacher)?.teacher || teacherProfile;
    const teacherData = {
      firstName: repTeacher?.firstName || 'August Philippe',
      lastName: repTeacher?.lastName || 'Sigua',
      position: repTeacher?.position || 'Special Science Teacher I',
      department: repTeacher?.department || 'Science Department',
    };

    const effectiveGrade = gradeLevel && gradeLevel !== 'ALL' ? gradeLevel : (students[0]?.gradeLevel || advisoryGrade || 'Grade 11');
    const effectiveSection = section && section !== 'ALL' ? section : (students[0]?.section || advisorySection || 'STEM-A');
    const effectiveSubject = subject && subject !== 'ALL' ? subject : (records[0]?.subject || assignedSubject || 'General Chemistry 1');

    const exportData: DepEdAttendanceExportData = {
      school: {
        schoolName: schoolProfile?.schoolName || 'Speaker Eugenio Perez National Agricultural School',
        schoolAddress: schoolProfile?.schoolAddress || 'Roxas Blvd, San Carlos City, Pangasinan',
        contactInfo: schoolProfile?.contactInfo || '+63 (075) 532-2345 | info@sepnas.edu.ph',
        principalName: schoolProfile?.principalName || 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
        logoUrl: schoolProfile?.logoUrl || null,
      },
      gradeLevel: effectiveGrade,
      section: effectiveSection,
      subject: effectiveSubject,
      teacher: teacherData,
      students: students.map((s) => ({
        id: s.id,
        lrn: s.lrn,
        firstName: s.firstName,
        lastName: s.lastName,
        middleName: s.middleName,
        suffix: s.suffix,
        sex: s.sex,
        gradeLevel: s.gradeLevel,
        section: s.section,
        trackStrand: s.trackStrand,
      })),
      records: records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        date: r.date,
        status: r.status as any,
        remarks: r.remarks,
      })),
      distinctDates,
      schoolYear: 'SY 2025 - 2026',
    };

    // Log export audit
    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.EXPORT,
      entityType: 'ClassroomAttendance',
      entityId: `${effectiveGrade}-${effectiveSection}`,
      details: {
        format,
        gradeLevel: effectiveGrade,
        section: effectiveSection,
        subject: effectiveSubject,
        recordsCount: records.length,
        studentsCount: students.length,
        paperSize: '8.5x13 Landscape (Folio)',
      },
    });

    const timestampStr = new Date().toISOString().split('T')[0];
    const baseCleanFilename = `DepEd_SF2_${effectiveGrade}_${effectiveSection}_${effectiveSubject}_${timestampStr}`.replace(
      /[^a-zA-Z0-9_\-]/g,
      '_'
    );

    if (format === 'excel' || format === 'xlsx') {
      const excelBuffer = await generateDepEdAttendanceExcel(exportData);
      return new NextResponse(new Uint8Array(excelBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${baseCleanFilename}.xlsx"`,
        },
      });
    }

    // Default to PDF
    const pdfBuffer = generateDepEdAttendancePdf(exportData);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${baseCleanFilename}.pdf"`,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

