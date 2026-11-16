import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { PersonType, Direction } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const { searchParams } = new URL(req.url);
    const personType = searchParams.get('personType') || 'ALL';
    const direction = searchParams.get('direction') || 'ALL';
    const search = searchParams.get('search')?.trim() || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (personType !== 'ALL' && (personType === 'TEACHER' || personType === 'STUDENT')) {
      where.personType = personType as PersonType;
    }

    if (direction !== 'ALL' && (direction === 'CLOCK_IN' || direction === 'CLOCK_OUT')) {
      where.direction = direction as Direction;
    }

    if (startDate || endDate) {
      where.scannedAt = {};
      if (startDate) {
        where.scannedAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.scannedAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { rfidNumber: { contains: search } },
      ];
    }

    const [totalCount, rawRecords] = await Promise.all([
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
        where,
        orderBy: { scannedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Enrich records with teacher and student names
    const teacherIds = Array.from(
      new Set(rawRecords.filter((r) => r.personType === PersonType.TEACHER).map((r) => r.personId))
    );
    const studentIds = Array.from(
      new Set(rawRecords.filter((r) => r.personType === PersonType.STUDENT).map((r) => r.personId))
    );

    const [teachers, students] = await Promise.all([
      prisma.teacher.findMany({
        where: { id: { in: teacherIds } },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
          employeeNumber: true,
          position: true,
          department: true,
          photoUrl: true,
        },
      }),
      prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
          lrn: true,
          gradeLevel: true,
          section: true,
          photoUrl: true,
        },
      }),
    ]);

    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const records = rawRecords.map((r) => {
      let name = 'Unknown';
      let identifier = r.rfidNumber;
      let detail = '';
      let photoUrl: string | null = null;

      if (r.personType === PersonType.TEACHER) {
        const t = teacherMap.get(r.personId);
        if (t) {
          const mi = t.middleName ? ` ${t.middleName[0]}.` : '';
          const sfx = t.suffix ? ` ${t.suffix}` : '';
          name = `${t.firstName}${mi} ${t.lastName}${sfx}`;
          identifier = t.employeeNumber;
          detail = `${t.position} - ${t.department}`;
          photoUrl = t.photoUrl;
        }
      } else {
        const s = studentMap.get(r.personId);
        if (s) {
          const mi = s.middleName ? ` ${s.middleName[0]}.` : '';
          const sfx = s.suffix ? ` ${s.suffix}` : '';
          name = `${s.firstName}${mi} ${s.lastName}${sfx}`;
          identifier = s.lrn;
          detail = `${s.gradeLevel} - ${s.section}`;
          photoUrl = s.photoUrl;
        }
      }

      // Format millisecond timestamp: YYYY-MM-DD HH:mm:ss.SSS
      const date = new Date(r.scannedAt);
      const iso = date.toISOString();
      const formattedTimestamp = iso.replace('T', ' ').replace('Z', '');

      return {
        id: r.id,
        personType: r.personType,
        personId: r.personId,
        rfidNumber: r.rfidNumber,
        direction: r.direction,
        scannedAt: iso,
        millisecondTimestamp: formattedTimestamp,
        deviceSource: r.deviceSource,
        name,
        identifier,
        detail,
        photoUrl,
      };
    });

    return NextResponse.json({
      records,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
