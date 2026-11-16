import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, requireTeacherWriteAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { teacherSchema } from '@/lib/validations';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireModuleAccess('teachers', req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';
    const position = searchParams.get('position') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
        { rfidNumber: { contains: search } },
      ];
    }

    if (department && department !== 'ALL') {
      where.department = department;
    }

    if (position && position !== 'ALL') {
      where.position = position;
    }

    if (status && status !== 'ALL') {
      where.employmentStatus = status;
    }

    const teachers = await prisma.teacher.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return NextResponse.json({ teachers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Strictly blocks head_teacher mutation per Requirement 5.B
    const sessionUser = await requireTeacherWriteAccess(req);

    const body = await req.json();
    const parsed = teacherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid teacher data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check unique employeeNumber
    const existingEmp = await prisma.teacher.findUnique({
      where: { employeeNumber: data.employeeNumber },
    });
    if (existingEmp) {
      return NextResponse.json(
        { error: `Employee Number ${data.employeeNumber} is already registered.` },
        { status: 400 }
      );
    }

    // Check unique 10-digit RFID
    const existingRfid = await prisma.teacher.findUnique({
      where: { rfidNumber: data.rfidNumber },
    });
    if (existingRfid) {
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
        { error: `RFID Number ${data.rfidNumber} is already assigned to a student.` },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.create({
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
        photoUrl: data.photoUrl || null,
        employmentStatus: data.employmentStatus || 'REGULAR',
      },
    });

    // Record audit log
    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.CREATE,
      entityType: 'Teacher',
      entityId: teacher.id,
      details: {
        employeeNumber: teacher.employeeNumber,
        name: `${teacher.firstName} ${teacher.lastName}`,
        department: teacher.department,
        position: teacher.position,
      },
    });

    return NextResponse.json({ success: true, teacher }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
