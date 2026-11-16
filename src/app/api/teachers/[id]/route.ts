import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, requireTeacherWriteAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { teacherSchema } from '@/lib/validations';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction, PersonType } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireModuleAccess('teachers', req);
    const { id } = params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Fetch personal immutable attendance history with millisecond timestamps
    const attendanceHistory = await prisma.attendanceRecord.findMany({
      where: {
        personId: teacher.id,
        personType: PersonType.TEACHER,
      },
      orderBy: { scannedAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({
      teacher,
      attendanceHistory: attendanceHistory.map((rec) => ({
        id: rec.id,
        direction: rec.direction,
        rfidNumber: rec.rfidNumber,
        scannedAt: rec.scannedAt.toISOString(),
        deviceSource: rec.deviceSource,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Strictly blocks head_teacher mutation per Requirement 5.B
    const sessionUser = await requireTeacherWriteAccess(req);
    const { id } = params;

    const body = await req.json();
    const parsed = teacherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid teacher data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.teacher.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Check unique employeeNumber
    if (data.employeeNumber !== existing.employeeNumber) {
      const duplicateEmp = await prisma.teacher.findUnique({
        where: { employeeNumber: data.employeeNumber },
      });
      if (duplicateEmp) {
        return NextResponse.json(
          { error: `Employee Number ${data.employeeNumber} is already in use.` },
          { status: 400 }
        );
      }
    }

    // Check unique RFID
    if (data.rfidNumber !== existing.rfidNumber) {
      const duplicateRfid = await prisma.teacher.findUnique({
        where: { rfidNumber: data.rfidNumber },
      });
      if (duplicateRfid) {
        return NextResponse.json(
          { error: `RFID Number ${data.rfidNumber} is already registered to another teacher.` },
          { status: 400 }
        );
      }
      const studentWithRfid = await prisma.student.findUnique({
        where: { rfidNumber: data.rfidNumber },
      });
      if (studentWithRfid) {
        return NextResponse.json(
          { error: `RFID Number ${data.rfidNumber} is already registered to a student.` },
          { status: 400 }
        );
      }
    }

    const updatedTeacher = await prisma.teacher.update({
      where: { id },
      data: {
        employeeNumber: data.employeeNumber,
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        suffix: data.suffix || null,
        position: data.position,
        department: data.department,
        email: data.email || null,
        contactNumber: data.contactNumber,
        dateHired: new Date(data.dateHired),
        rfidNumber: data.rfidNumber,
        photoUrl: data.photoUrl !== undefined ? data.photoUrl : existing.photoUrl,
        employmentStatus: data.employmentStatus,
      },
    });

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.UPDATE,
      entityType: 'Teacher',
      entityId: updatedTeacher.id,
      details: {
        employeeNumber: updatedTeacher.employeeNumber,
        name: `${updatedTeacher.firstName} ${updatedTeacher.lastName}`,
      },
    });

    return NextResponse.json({ success: true, teacher: updatedTeacher });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Strictly blocks head_teacher mutation per Requirement 5.B
    const sessionUser = await requireTeacherWriteAccess(req);
    const { id } = params;

    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    await prisma.teacher.delete({ where: { id } });

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.DELETE,
      entityType: 'Teacher',
      entityId: id,
      details: {
        employeeNumber: teacher.employeeNumber,
        name: `${teacher.firstName} ${teacher.lastName}`,
      },
    });

    return NextResponse.json({ success: true, message: 'Teacher record deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
