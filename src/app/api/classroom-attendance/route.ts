import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction, Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireModuleAccess('classroom_attendance', req);

    const isLeadership =
      sessionUser.role === Role.SUPERADMIN ||
      sessionUser.role === Role.PRINCIPAL ||
      sessionUser.role === Role.ADMIN_AIDE ||
      sessionUser.role === Role.HEAD_TEACHER;

    const { searchParams } = new URL(req.url);
    const gradeLevel = searchParams.get('gradeLevel') || '';
    const section = searchParams.get('section') || '';
    const subject = searchParams.get('subject') || '';
    const dateStr = searchParams.get('date') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';

    // Find teacher record if applicable
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

    // 1. Role-based scoping rule:
    // "the admin, principal and head teacher can view all attendance history sortable by grade, section and subject.
    //  the teacher can only view the subject assigned to them and their advisory section"
    if (!isLeadership) {
      if (gradeLevel && section && subject && gradeLevel !== 'ALL' && section !== 'ALL' && subject !== 'ALL') {
        const matchesSubject = assignedSubject && subject.toLowerCase().includes(assignedSubject.toLowerCase());
        const matchesAdvisory = gradeLevel === advisoryGrade && section === advisorySection;
        if (!matchesSubject && !matchesAdvisory) {
          return NextResponse.json({
            records: [],
            teachers: teacherProfile ? [teacherProfile] : [],
            students: [],
            allClassSections: [{ gradeLevel: advisoryGrade, section: advisorySection }],
            allSubjects: [assignedSubject],
            userScope: {
              role: sessionUser.role,
              isLeadership: false,
              assignedSubject,
              advisoryGrade,
              advisorySection,
              scopeAccessDenied: true,
              message: `Teachers can only view their assigned subject (${assignedSubject}) and advisory section (${advisoryGrade} - ${advisorySection}).`,
            },
          });
        }
      }
    }

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
        where.AND = [
          ...(where.AND || []),
          { OR: scopeOr },
        ];
      }
    }

    // Filter by specific grade, section, subject if specified
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

    // Dynamic sort order for leadership & teachers (sortable by grade, section, subject, student, date)
    let orderByClause: any[] = [{ date: 'asc' }, { student: { lastName: 'asc' } }];
    if (sortBy === 'gradeLevel') {
      orderByClause = [{ gradeLevel: sortOrder }, { section: 'asc' }, { student: { lastName: 'asc' } }, { date: 'asc' }];
    } else if (sortBy === 'section') {
      orderByClause = [{ section: sortOrder }, { gradeLevel: 'asc' }, { student: { lastName: 'asc' } }, { date: 'asc' }];
    } else if (sortBy === 'subject') {
      orderByClause = [{ subject: sortOrder }, { gradeLevel: 'asc' }, { section: 'asc' }, { date: 'asc' }];
    } else if (sortBy === 'student') {
      orderByClause = [{ student: { lastName: sortOrder } }, { student: { firstName: sortOrder } }, { date: 'asc' }];
    } else if (sortBy === 'date') {
      orderByClause = [{ date: sortOrder }, { student: { lastName: 'asc' } }];
    }

    // Student roster query
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

    const [records, teachers, students, allSectionsRaw, allSubjectsRaw] = await Promise.all([
      prisma.classroomAttendance.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              lrn: true,
              firstName: true,
              lastName: true,
              middleName: true,
              suffix: true,
              sex: true,
              gradeLevel: true,
              section: true,
              trackStrand: true,
              photoUrl: true,
            },
          },
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: true,
              department: true,
              assignedSubject: true,
              advisoryGrade: true,
              advisorySection: true,
            },
          },
        },
        orderBy: orderByClause,
        take: 2000,
      }),
      prisma.teacher.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          department: true,
          assignedSubject: true,
          advisoryGrade: true,
          advisorySection: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.student.findMany({
        where: studentWhere,
        select: {
          id: true,
          lrn: true,
          firstName: true,
          lastName: true,
          middleName: true,
          suffix: true,
          sex: true,
          gradeLevel: true,
          section: true,
          trackStrand: true,
          photoUrl: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.student.findMany({
        where: { status: 'ACTIVE' },
        select: { gradeLevel: true, section: true },
        distinct: ['gradeLevel', 'section'],
        orderBy: [{ gradeLevel: 'asc' }, { section: 'asc' }],
      }),
      prisma.classroomAttendance.findMany({
        select: { subject: true },
        distinct: ['subject'],
        orderBy: { subject: 'asc' },
      }),
    ]);

    const defaultSubjects = [
      'General Chemistry 1',
      'General Biology 1',
      'Pre-Calculus',
      'Basic Calculus',
      'English for Academic & Professional Purposes',
      'Komunikasyon at Pananaliksik',
      'Physical Education and Health',
      'Science 10',
      'Mathematics 10',
    ];
    const recordedSubjects = allSubjectsRaw.map((s) => s.subject).filter(Boolean);
    const combinedSubjects = Array.from(new Set([...defaultSubjects, ...recordedSubjects])).sort();

    return NextResponse.json({
      records,
      teachers: !isLeadership && teacherProfile ? [teacherProfile] : teachers,
      students,
      allClassSections: allSectionsRaw,
      allSubjects: combinedSubjects,
      userScope: {
        role: sessionUser.role,
        isLeadership,
        assignedSubject: isLeadership ? null : assignedSubject,
        advisoryGrade: isLeadership ? null : advisoryGrade,
        advisorySection: isLeadership ? null : advisorySection,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireModuleAccess('classroom_attendance', req);
    const body = await req.json();

    const { items, subject, gradeLevel, section, date, teacherId } = body;

    const isLeadership =
      sessionUser.role === Role.SUPERADMIN ||
      sessionUser.role === Role.PRINCIPAL ||
      sessionUser.role === Role.ADMIN_AIDE ||
      sessionUser.role === Role.HEAD_TEACHER;

    if (!isLeadership) {
      let teacherProfile: any = null;
      if (sessionUser.teacherId) {
        teacherProfile = await prisma.teacher.findUnique({ where: { id: sessionUser.teacherId } });
      } else if (sessionUser.email) {
        teacherProfile = await prisma.teacher.findFirst({ where: { email: sessionUser.email } });
      }

      const assignedSubject = sessionUser.assignedSubject || teacherProfile?.assignedSubject || 'General Chemistry 1';
      const advisoryGrade = sessionUser.advisoryGrade || teacherProfile?.advisoryGrade || 'Grade 11';
      const advisorySection = sessionUser.advisorySection || teacherProfile?.advisorySection || 'STEM-A';

      const matchesSubject = assignedSubject && subject && subject.toLowerCase().includes(assignedSubject.toLowerCase());
      const matchesAdvisory = gradeLevel === advisoryGrade && section === advisorySection;

      if (!matchesSubject && !matchesAdvisory) {
        return NextResponse.json(
          {
            error: `Access restricted: Teachers can only record attendance for their assigned subject (${assignedSubject}) or advisory section (${advisoryGrade} - ${advisorySection}).`,
          },
          { status: 403 }
        );
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one student attendance record is required.' },
        { status: 400 }
      );
    }

    const recordDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate(), 23, 59, 59, 999);

    // Clean up any existing records for the same students, subject, and day so updating works cleanly
    const studentIds = items.map((i: any) => i.studentId);
    await prisma.classroomAttendance.deleteMany({
      where: {
        studentId: { in: studentIds },
        subject: subject || 'General Attendance',
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    const created = await prisma.$transaction(
      items.map((item: any) =>
        prisma.classroomAttendance.create({
          data: {
            studentId: item.studentId,
            teacherId: item.teacherId || teacherId || null,
            subject: subject || item.subject || 'General Attendance',
            gradeLevel: gradeLevel || item.gradeLevel,
            section: section || item.section,
            date: recordDate,
            status: item.status || 'PRESENT',
            remarks: item.remarks || null,
          },
        })
      )
    );

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.CREATE,
      entityType: 'ClassroomAttendance',
      details: {
        count: created.length,
        subject,
        gradeLevel,
        section,
        date: recordDate.toISOString(),
        teacherId: teacherId || null,
      },
    });

    return NextResponse.json({ success: true, count: created.length });
  } catch (error) {
    return handleApiError(error);
  }
}
