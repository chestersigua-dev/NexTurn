import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { studentSchema } from '@/lib/validations';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction, PersonType } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireModuleAccess('students', req);
    const { id } = params;

    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch personal immutable attendance history with millisecond timestamps
    const attendanceHistory = await prisma.attendanceRecord.findMany({
      where: {
        personId: student.id,
        personType: PersonType.STUDENT,
      },
      orderBy: { scannedAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({
      student,
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
    const sessionUser = await requireModuleAccess('students', req);
    const { id } = params;

    const body = await req.json();
    const parsed = studentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid student data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check unique 12-digit LRN
    if (data.lrn !== existing.lrn) {
      const duplicateLrn = await prisma.student.findUnique({
        where: { lrn: data.lrn },
      });
      if (duplicateLrn) {
        return NextResponse.json(
          { error: `LRN ${data.lrn} is already assigned to another student.` },
          { status: 400 }
        );
      }
    }

    // Check unique 10-digit RFID
    if (data.rfidNumber !== existing.rfidNumber) {
      const duplicateRfid = await prisma.student.findUnique({
        where: { rfidNumber: data.rfidNumber },
      });
      if (duplicateRfid) {
        return NextResponse.json(
          { error: `RFID Number ${data.rfidNumber} is already registered to another student.` },
          { status: 400 }
        );
      }
      const teacherWithRfid = await prisma.teacher.findUnique({
        where: { rfidNumber: data.rfidNumber },
      });
      if (teacherWithRfid) {
        return NextResponse.json(
          { error: `RFID Number ${data.rfidNumber} is already registered to a teacher.` },
          { status: 400 }
        );
      }
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        lrn: data.lrn,
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        suffix: data.suffix || null,
        sex: data.sex,
        birthdate: new Date(data.birthdate),
        age: data.age,
        gradeLevel: data.gradeLevel,
        section: data.section,
        trackStrand: data.trackStrand || null,
        guardianName: data.guardianName,
        guardianContact: data.guardianContact,
        address: data.address,
        rfidNumber: data.rfidNumber,
        photoUrl: data.photoUrl !== undefined ? data.photoUrl : existing.photoUrl,
        status: data.status,
      },
    });

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.UPDATE,
      entityType: 'Student',
      entityId: updatedStudent.id,
      details: {
        lrn: updatedStudent.lrn,
        name: `${updatedStudent.firstName} ${updatedStudent.lastName}`,
      },
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await requireModuleAccess('students', req);
    const { id } = params;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await prisma.student.delete({ where: { id } });

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.DELETE,
      entityType: 'Student',
      entityId: id,
      details: {
        lrn: student.lrn,
        name: `${student.firstName} ${student.lastName}`,
      },
    });

    return NextResponse.json({ success: true, message: 'Student record deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
