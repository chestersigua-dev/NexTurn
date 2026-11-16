import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction, Role } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const importSchema = z.object({
  version: z.string().optional(),
  school: z.object({
    schoolName: z.string(),
    schoolAddress: z.string(),
    contactInfo: z.string(),
    principalName: z.string(),
    logoUrl: z.string().nullable().optional(),
  }),
  turnstile: z.object({
    autoToggleDirection: z.boolean(),
    soundFeedback: z.boolean(),
    displayDurationSeconds: z.number().int(),
    announcementText: z.string().nullable().optional(),
  }),
  system: z
    .object({
      isLiveDeployment: z.boolean().optional(),
      showDemoAccounts: z.boolean().optional(),
      showTapSimulator: z.boolean().optional(),
      theme: z.string().optional(),
    })
    .optional(),
  permissions: z
    .record(z.record(z.boolean()))
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireSuperAdmin(req);

    const [school, turnstile, system, permissions] = await Promise.all([
      prisma.schoolProfile.findUnique({ where: { id: 'default' } }),
      prisma.turnstileSetting.findUnique({ where: { id: 'default' } }),
      prisma.systemSetting.findUnique({ where: { id: 'default' } }),
      prisma.rolePermission.findMany(),
    ]);

    // Build permissions map
    const permMap: Record<string, Record<string, boolean>> = {};
    for (const p of permissions) {
      if (!permMap[p.role]) permMap[p.role] = {};
      permMap[p.role][p.module] = p.isAllowed;
    }

    const backupBundle = {
      app: 'NexTurn School RFID Attendance',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: sessionUser.email,
      school: school || {
        schoolName: 'NexTurn Comprehensive Academy',
        schoolAddress: 'DepEd Division of Schools, Educational Complex, Metro Manila, Philippines',
        contactInfo: '+63 (02) 8888-0000 | info@nexturn.edu.ph',
        principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
        logoUrl: '/sepnas.png',
      },
      turnstile: turnstile || {
        autoToggleDirection: true,
        soundFeedback: true,
        displayDurationSeconds: 4,
        announcementText: 'Please tap your ID card to log attendance.',
      },
      system: system || {
        isLiveDeployment: false,
        showDemoAccounts: true,
        showTapSimulator: true,
        theme: 'fb-classic',
      },
      permissions: permMap,
    };

    return NextResponse.json(backupBundle);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireSuperAdmin(req);
    const body = await req.json();

    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid settings file structure', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { school, turnstile, system, permissions } = parsed.data;

    // Apply school settings
    await prisma.schoolProfile.upsert({
      where: { id: 'default' },
      update: {
        schoolName: school.schoolName,
        schoolAddress: school.schoolAddress,
        contactInfo: school.contactInfo,
        principalName: school.principalName,
        logoUrl: school.logoUrl || null,
      },
      create: {
        id: 'default',
        schoolName: school.schoolName,
        schoolAddress: school.schoolAddress,
        contactInfo: school.contactInfo,
        principalName: school.principalName,
        logoUrl: school.logoUrl || null,
      },
    });

    // Apply turnstile settings
    await prisma.turnstileSetting.upsert({
      where: { id: 'default' },
      update: {
        autoToggleDirection: turnstile.autoToggleDirection,
        soundFeedback: turnstile.soundFeedback,
        displayDurationSeconds: turnstile.displayDurationSeconds,
        announcementText: turnstile.announcementText || null,
      },
      create: {
        id: 'default',
        autoToggleDirection: turnstile.autoToggleDirection,
        soundFeedback: turnstile.soundFeedback,
        displayDurationSeconds: turnstile.displayDurationSeconds,
        announcementText: turnstile.announcementText || null,
      },
    });

    // Apply system settings if provided
    if (system) {
      await prisma.systemSetting.upsert({
        where: { id: 'default' },
        update: {
          isLiveDeployment: system.isLiveDeployment ?? false,
          showDemoAccounts: system.showDemoAccounts ?? true,
          showTapSimulator: system.showTapSimulator ?? true,
          theme: system.theme ?? 'fb-classic',
        },
        create: {
          id: 'default',
          isLiveDeployment: system.isLiveDeployment ?? false,
          showDemoAccounts: system.showDemoAccounts ?? true,
          showTapSimulator: system.showTapSimulator ?? true,
          theme: system.theme ?? 'fb-classic',
        },
      });
    }

    // Apply permissions if provided
    if (permissions) {
      for (const [roleStr, modules] of Object.entries(permissions)) {
        const role = roleStr as Role;
        if (Object.values(Role).includes(role)) {
          for (const [moduleKey, isAllowed] of Object.entries(modules)) {
            await prisma.rolePermission.upsert({
              where: { role_module: { role, module: moduleKey } },
              update: { isAllowed },
              create: { role, module: moduleKey, isAllowed },
            });
          }
        }
      }
    }

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.SETTINGS_CHANGE,
      entityType: 'SystemSettingsImport',
      entityId: 'default',
      details: {
        importedBy: sessionUser.email,
        schoolName: school.schoolName,
        importedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'System settings successfully imported and applied live.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
