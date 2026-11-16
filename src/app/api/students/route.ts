import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { studentSchema } from '@/lib/validations';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireModuleAccess('students', req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const gradeLevel = searchParams.get('gradeLevel') || '';
    const section = searchParams.get('section') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { lrn: { contains: search } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { rfidNumber: { contains: search } },
        { guardianName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (gradeLevel && gradeLevel !== 'ALL') {
      where.gradeLevel = gradeLevel;
    }

    if (section && section !== 'ALL') {
      where.section = section;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: [{ gradeLevel: 'asc' }, { section: 'asc' }, { lastName: 'asc' }],
    });

    return NextResponse.json({ students });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireModuleAccess('students', req);

    const body = await req.json();
    const parsed = studentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid student data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check unique 12-digit LRN
    const existingLrn = await prisma.student.findUnique({
      where: { lrn: data.lrn },
    });
    if (existingLrn) {
      return NextResponse.json(
        { error: `LRN ${data.lrn} is already registered to another student.` },
        { status: 400 }
      );
    }

    // Check unique 10-digit RFID
    const existingRfid = await prisma.student.findUnique({
      where: { rfidNumber: data.rfidNumber },
    });
    if (existingRfid) {
      return NextResponse.json(
        { error: `RFID Number ${data.rfidNumber} is already assigned to another student.` },
        { status: 400 }
      );
    }

    const teacherWithRfid = await prisma.teacher.findUnique({
      where: { rfidNumber: data.rfidNumber },
    });
    if (teacherWithRfid) {
      return NextResponse.json(
        { error: `RFID Number ${data.rfidNumber} is already assigned to a teacher.` },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
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
        photoUrl: data.photoUrl || null,
        status: data.status || 'ACTIVE',
      },
    });

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.CREATE,
      entityType: 'Student',
      entityId: student.id,
      details: {
        lrn: student.lrn,
        name: `${student.firstName} ${student.lastName}`,
        gradeLevel: student.gradeLevel,
        section: student.section,
      },
    });

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
