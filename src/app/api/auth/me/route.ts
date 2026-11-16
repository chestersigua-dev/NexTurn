import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getPermissionsForRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const hasCookie = Boolean(req.cookies.get('nexturn_session')?.value);
    const user = await getSessionUser(req);
    if (!user) {
      const res = NextResponse.json({ authenticated: false }, { status: 401 });
      if (hasCookie) {
        res.cookies.set('nexturn_session', '', { maxAge: 0, path: '/' });
      }
      return res;
    }

    // Fetch dynamic permissions for this role
    const permissions = await getPermissionsForRole(user.role);

    // Fetch school profile for topbar display
    const school =
      (await prisma.schoolProfile.findUnique({
        where: { id: 'default' },
      })) || (await prisma.schoolProfile.findFirst());

    return NextResponse.json({
      authenticated: true,
      user,
      permissions,
      school: school || {
        schoolName: 'Speaker Eugenio Perez National Agricultural School',
        schoolAddress: 'Roxas Blvd, San Carlos City, Pangasinan',
        contactInfo: '(075) 955 5258 | 300388@deped.gov.ph',
        principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
        logoUrl: '/sepnas.png',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
