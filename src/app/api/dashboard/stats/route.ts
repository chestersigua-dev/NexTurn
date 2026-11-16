import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { PersonType, Direction } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Counts
    const [totalStudents, totalTeachers, totalUsers, todayScansCount] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.teacher.count({ where: { employmentStatus: { not: 'INACTIVE' } } }),
      prisma.user.count(),
      prisma.attendanceRecord.count({
        where: {
          scannedAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
    ]);

    // Distinct students and teachers scanned today
    const [todayStudentScans, todayTeacherScans] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: {
          personType: PersonType.STUDENT,
          scannedAt: { gte: startOfToday, lte: endOfToday },
        },
        select: { personId: true, direction: true },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          personType: PersonType.TEACHER,
          scannedAt: { gte: startOfToday, lte: endOfToday },
        },
        select: { personId: true, direction: true },
      }),
    ]);

    const uniqueStudentsToday = new Set(todayStudentScans.map((s) => s.personId)).size;
    const uniqueTeachersToday = new Set(todayTeacherScans.map((t) => t.personId)).size;

    const studentRate = totalStudents > 0 ? Math.round((uniqueStudentsToday / totalStudents) * 100) : 0;
    const teacherRate = totalTeachers > 0 ? Math.round((uniqueTeachersToday / totalTeachers) * 100) : 0;

    // 7-Day Trend
    const past7Days: Array<{ date: string; dayLabel: string; students: number; teachers: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const dayScans = await prisma.attendanceRecord.findMany({
        where: {
          scannedAt: { gte: dStart, lte: dEnd },
          direction: Direction.CLOCK_IN,
        },
        select: { personId: true, personType: true },
      });

      const stCount = new Set(
        dayScans.filter((s) => s.personType === PersonType.STUDENT).map((s) => s.personId)
      ).size;
      const tcCount = new Set(
        dayScans.filter((s) => s.personType === PersonType.TEACHER).map((s) => s.personId)
      ).size;

      past7Days.push({
        date: d.toISOString().split('T')[0],
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        students: stCount,
        teachers: tcCount,
      });
    }

    // Direction breakdown today
    const clockInToday = todayStudentScans.filter((s) => s.direction === Direction.CLOCK_IN).length +
      todayTeacherScans.filter((t) => t.direction === Direction.CLOCK_IN).length;
    const clockOutToday = todayStudentScans.filter((s) => s.direction === Direction.CLOCK_OUT).length +
      todayTeacherScans.filter((t) => t.direction === Direction.CLOCK_OUT).length;

    // 5 Most recent scans
    const recentScansRaw = await prisma.attendanceRecord.findMany({
      orderBy: { scannedAt: 'desc' },
      take: 6,
    });

    const recentTeacherIds = recentScansRaw
      .filter((r) => r.personType === PersonType.TEACHER)
      .map((r) => r.personId);
    const recentStudentIds = recentScansRaw
      .filter((r) => r.personType === PersonType.STUDENT)
      .map((r) => r.personId);

    const [recTeachers, recStudents] = await Promise.all([
      prisma.teacher.findMany({
        where: { id: { in: recentTeacherIds } },
        select: { id: true, firstName: true, lastName: true, position: true, photoUrl: true },
      }),
      prisma.student.findMany({
        where: { id: { in: recentStudentIds } },
        select: { id: true, firstName: true, lastName: true, gradeLevel: true, section: true, photoUrl: true },
      }),
    ]);

    const recTMap = new Map(recTeachers.map((t) => [t.id, t]));
    const recSMap = new Map(recStudents.map((s) => [s.id, s]));

    const recentScans = recentScansRaw.map((r) => {
      let name = 'Card Tap';
      let sub = '';
      let photoUrl: string | null = null;
      if (r.personType === PersonType.TEACHER) {
        const t = recTMap.get(r.personId);
        if (t) {
          name = `${t.firstName} ${t.lastName}`;
          sub = t.position;
          photoUrl = t.photoUrl;
        }
      } else {
        const s = recSMap.get(r.personId);
        if (s) {
          name = `${s.firstName} ${s.lastName}`;
          sub = `${s.gradeLevel} - ${s.section}`;
          photoUrl = s.photoUrl;
        }
      }
      return {
        id: r.id,
        name,
        sub,
        photoUrl,
        personType: r.personType,
        direction: r.direction,
        scannedAt: r.scannedAt.toISOString(),
        millisecondTimestamp: r.scannedAt.toISOString().replace('T', ' ').replace('Z', ''),
      };
    });

    return NextResponse.json({
      totalStudents,
      totalTeachers,
      totalUsers,
      todayScansCount,
      uniqueStudentsToday,
      uniqueTeachersToday,
      studentRate,
      teacherRate,
      past7Days,
      directionBreakdown: {
        clockIn: clockInToday,
        clockOut: clockOutToday,
      },
      recentScans,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
