import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { turnstileSettingsSchema } from '@/lib/validations';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireModuleAccess('turnstile_settings', req);

    const settings = await prisma.turnstileSetting.findUnique({
      where: { id: 'default' },
    });

    return NextResponse.json({
      settings: settings || {
        id: 'default',
        autoToggleDirection: true,
        soundFeedback: true,
        displayDurationSeconds: 4,
        announcementText: 'Please tap your ID card to log attendance.',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await requireModuleAccess('turnstile_settings', req);

    const body = await req.json();
    const parsed = turnstileSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid turnstile settings', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const updated = await prisma.turnstileSetting.upsert({
      where: { id: 'default' },
      update: {
        autoToggleDirection: data.autoToggleDirection,
        soundFeedback: data.soundFeedback,
        displayDurationSeconds: data.displayDurationSeconds,
        announcementText: data.announcementText || null,
      },
      create: {
        id: 'default',
        autoToggleDirection: data.autoToggleDirection,
        soundFeedback: data.soundFeedback,
        displayDurationSeconds: data.displayDurationSeconds,
        announcementText: data.announcementText || null,
      },
    });

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.SETTINGS_CHANGE,
      entityType: 'TurnstileSetting',
      entityId: 'default',
      details: data,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
