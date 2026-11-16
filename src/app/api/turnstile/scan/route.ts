import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { turnstileScanSchema } from '@/lib/validations';
import { recordAuditLog } from '@/lib/audit';
import { Direction, PersonType, AuditAction } from '@prisma/client';

export async function POST(req: NextRequest) {
  // 1. Rate limiting (e.g. max 120 scans per minute per client)
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`scan:${ip}`, 120, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Turnstile scan rate limit exceeded. Please wait a moment.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = turnstileScanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid RFID scan format. Must be a 10-digit number.',
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { rfidNumber, forcedDirection, deviceSource } = parsed.data;

    // 2. Lookup Teacher or Student by 10-digit RFID
    let personType: PersonType | null = null;
    let personId: string | null = null;
    let personData: {
      name: string;
      identifier: string;
      roleOrGrade: string;
      departmentOrSection: string;
      photoUrl: string | null;
      status: string;
    } | null = null;

    // First search Teacher
    const teacher = await prisma.teacher.findUnique({
      where: { rfidNumber },
    });

    if (teacher) {
      personType = PersonType.TEACHER;
      personId = teacher.id;
      const middleInitial = teacher.middleName ? ` ${teacher.middleName[0]}.` : '';
      const suffix = teacher.suffix ? ` ${teacher.suffix}` : '';
      personData = {
        name: `${teacher.firstName}${middleInitial} ${teacher.lastName}${suffix}`,
        identifier: teacher.employeeNumber,
        roleOrGrade: teacher.position,
        departmentOrSection: teacher.department,
        photoUrl: teacher.photoUrl,
        status: teacher.employmentStatus,
      };
    } else {
      // Second search Student
      const student = await prisma.student.findUnique({
        where: { rfidNumber },
      });

      if (student) {
        personType = PersonType.STUDENT;
        personId = student.id;
        const middleInitial = student.middleName ? ` ${student.middleName[0]}.` : '';
        const suffix = student.suffix ? ` ${student.suffix}` : '';
        personData = {
          name: `${student.firstName}${middleInitial} ${student.lastName}${suffix}`,
          identifier: student.lrn,
          roleOrGrade: student.gradeLevel,
          departmentOrSection: student.trackStrand ? `${student.section} (${student.trackStrand})` : student.section,
          photoUrl: student.photoUrl,
          status: student.status,
        };
      }
    }

    // If person not found in either table
    if (!personType || !personId || !personData) {
      // Record failed scan in audit log
      await recordAuditLog({
        action: AuditAction.CREATE,
        entityType: 'AttendanceScan',
        details: { rfidNumber, result: 'UNREGISTERED_CARD', ip },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Unregistered RFID Card. Please register your ID with the school administrator.',
          rfidNumber,
        },
        { status: 404 }
      );
    }

    // 3. Determine Direction (Smart Turnstile Logic)
    const scanTime = new Date();
    let direction: Direction = Direction.CLOCK_IN;

    if (forcedDirection === 'CLOCK_IN') {
      direction = Direction.CLOCK_IN;
    } else if (forcedDirection === 'CLOCK_OUT') {
      direction = Direction.CLOCK_OUT;
    } else {
      // AUTO Smart Turnstile Direction Rules:
      // - First tap on a new day -> CLOCK_IN
      // - Multiple taps within the next 30 minutes on a new day -> CLOCK_IN
      // - Tapping after 30 minutes -> CLOCK_OUT
      // - Tapping in again in the same day -> CLOCK_IN
      // - Tapping again -> CLOCK_OUT
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const scansToday = await prisma.attendanceRecord.findMany({
        where: {
          personId,
          personType,
          scannedAt: { gte: startOfToday },
        },
        orderBy: { scannedAt: 'asc' },
      });

      if (scansToday.length === 0) {
        direction = Direction.CLOCK_IN;
      } else {
        const firstScanToday = scansToday[0];
        const latestScanToday = scansToday[scansToday.length - 1];
        const minutesSinceFirst = (scanTime.getTime() - firstScanToday.scannedAt.getTime()) / (60 * 1000);

        if (minutesSinceFirst <= 30) {
          direction = Direction.CLOCK_IN;
        } else {
          if (latestScanToday.direction === Direction.CLOCK_IN) {
            direction = Direction.CLOCK_OUT;
          } else {
            direction = Direction.CLOCK_IN;
          }
        }
      }
    }

    // 4. Record millisecond-precision immutable attendance log
    const attendanceRecord = await prisma.attendanceRecord.create({
      data: {
        personType,
        personId,
        rfidNumber,
        direction,
        scannedAt: scanTime,
        deviceSource: deviceSource || 'TURNSTILE_KIOSK',
      },
    });

    // 5. Audit Log
    await recordAuditLog({
      action: AuditAction.CREATE,
      entityType: 'AttendanceRecord',
      entityId: attendanceRecord.id,
      details: {
        personType,
        personId,
        rfidNumber,
        direction,
        scannedAt: scanTime.toISOString(),
      },
    });

    const isClockIn = direction === Direction.CLOCK_IN;
    const greeting = isClockIn
      ? `Welcome, ${personData.name.split(' ')[0]}!`
      : `Goodbye, ${personData.name.split(' ')[0]}!`;
    const message = isClockIn
      ? 'Entry recorded successfully. Have a wonderful day!'
      : 'Exit recorded successfully. Safe travels home!';

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendanceRecord.id,
        direction,
        scannedAt: attendanceRecord.scannedAt.toISOString(),
        scannedAtFormatted: scanTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      },
      person: {
        type: personType,
        ...personData,
        rfidNumber,
      },
      greeting,
      message,
    });
  } catch (error: any) {
    console.error('Turnstile scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process turnstile scan' },
      { status: 500 }
    );
  }
}
