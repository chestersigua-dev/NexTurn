import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const systemSettingsSchema = z.object({
  isLiveDeployment: z.boolean(),
  showDemoAccounts: z.boolean(),
  showTapSimulator: z.boolean(),
  theme: z.string().optional(),
});

export async function GET() {
  try {
    const setting =
      (await prisma.systemSetting.findUnique({
        where: { id: 'default' },
      })) ||
      (await prisma.systemSetting.findFirst());

    return NextResponse.json({
      settings: setting || {
        id: 'default',
        isLiveDeployment: false,
        showDemoAccounts: true,
        showTapSimulator: true,
        theme: 'fb-classic',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await requireSuperAdmin(req);
    const body = await req.json();

    const parsed = systemSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid system deployment settings', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { isLiveDeployment, showDemoAccounts, showTapSimulator, theme } = parsed.data;

    const updated = await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {
        isLiveDeployment,
        showDemoAccounts,
        showTapSimulator,
        theme: theme || 'fb-classic',
      },
      create: {
        id: 'default',
        isLiveDeployment,
        showDemoAccounts,
        showTapSimulator,
        theme: theme || 'fb-classic',
      },
    });

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.SETTINGS_CHANGE,
      entityType: 'SystemSetting',
      entityId: 'default',
      details: {
        isLiveDeployment: updated.isLiveDeployment,
        showDemoAccounts: updated.showDemoAccounts,
        showTapSimulator: updated.showTapSimulator,
        theme: updated.theme,
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
