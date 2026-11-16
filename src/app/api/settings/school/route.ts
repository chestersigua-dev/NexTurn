import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { schoolSettingsSchema } from '@/lib/validations';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    // Any authenticated staff user can view the current school profile
    await requireAuth(req);

    const school =
      (await prisma.schoolProfile.findUnique({
        where: { id: 'default' },
      })) || (await prisma.schoolProfile.findFirst());

    return NextResponse.json({
      school: school || {
        id: 'default',
        schoolName: 'Speaker Eugenio Perez National Agricultural School',
        schoolAddress: 'Roxas Blvd, San Carlos City, Pangasinan',
        contactInfo: '(075) 955 5258 | 300388@deped.gov.ph',
        principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
        logoUrl: '/sepnas.png',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await requireModuleAccess('school_settings', req);

    const body = await req.json();
    const parsed = schoolSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid school profile data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const updatedSchool = await prisma.schoolProfile.upsert({
      where: { id: 'default' },
      update: {
        schoolName: data.schoolName,
        schoolAddress: data.schoolAddress,
        contactInfo: data.contactInfo,
        principalName: data.principalName,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : undefined,
      },
      create: {
        id: 'default',
        schoolName: data.schoolName,
        schoolAddress: data.schoolAddress,
        contactInfo: data.contactInfo,
        principalName: data.principalName,
        logoUrl: data.logoUrl || null,
      },
    });

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.SETTINGS_CHANGE,
      entityType: 'SchoolProfile',
      entityId: 'default',
      details: {
        schoolName: updatedSchool.schoolName,
        principalName: updatedSchool.principalName,
        contactInfo: updatedSchool.contactInfo,
      },
    });

    return NextResponse.json({ success: true, school: updatedSchool });
  } catch (error) {
    return handleApiError(error);
  }
}
