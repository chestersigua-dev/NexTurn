import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { compileMonthlyDTR, generateDepEdDTRCsv, generateDepEdDTRPdf } from '@/lib/deped-dtr';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction, PersonType } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await requireModuleAccess('teachers', req);
    const { id } = params;

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString(), 10);
    const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString(), 10);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    const teacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const school = (await prisma.schoolProfile.findUnique({ where: { id: 'default' } })) || {
      schoolName: 'NexTurn Comprehensive Academy',
      principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
    };

    // Query immutable attendance records for this month
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const rawRecords = await prisma.attendanceRecord.findMany({
      where: {
        personId: teacher.id,
        personType: PersonType.TEACHER,
        scannedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { scannedAt: 'asc' },
    });

    const summary = compileMonthlyDTR(teacher, school, year, month, rawRecords);

    // Record audit log for export
    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.EXPORT,
      entityType: 'DepEdForm48',
      entityId: teacher.id,
      details: {
        teacherId: teacher.id,
        employeeNumber: teacher.employeeNumber,
        year,
        month,
        format,
      },
    });

    if (format === 'csv') {
      const csv = generateDepEdDTRCsv(summary);
      const filename = `DepEd_Form48_${teacher.lastName}_${year}_${month}.csv`;
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === 'pdf') {
      const pdfBuffer = generateDepEdDTRPdf(summary);
      const filename = `DepEd_Form48_${teacher.lastName}_${year}_${month}.pdf`;
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
        },
      });
    }

    // Default JSON
    return NextResponse.json({ summary });
  } catch (error) {
    return handleApiError(error);
  }
}
