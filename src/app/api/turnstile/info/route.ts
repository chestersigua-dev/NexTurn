import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [school, turnstileSettings, systemSetting] = await Promise.all([
      (await prisma.schoolProfile.findUnique({
        where: { id: 'default' },
      })) || (await prisma.schoolProfile.findFirst()),
      (await prisma.turnstileSetting.findUnique({
        where: { id: 'default' },
      })) || (await prisma.turnstileSetting.findFirst()),
      (await prisma.systemSetting.findUnique({
        where: { id: 'default' },
      })) || (await prisma.systemSetting.findFirst()),
    ]);

    return NextResponse.json({
      school: school || {
        schoolName: 'Speaker Eugenio Perez National Agricultural School',
        schoolAddress: 'Roxas Blvd, San Carlos City, Pangasinan',
        contactInfo: '(075) 955 5258 | 300388@deped.gov.ph',
        principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
        logoUrl: '/sepnas.png',
      },
      settings: turnstileSettings || {
        autoToggleDirection: true,
        soundFeedback: true,
        displayDurationSeconds: 4,
        announcementText: 'Welcome! Please tap your RFID card to log attendance.',
      },
      system: systemSetting || {
        isLiveDeployment: false,
        showDemoAccounts: true,
        showTapSimulator: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve turnstile kiosk information' },
      { status: 500 }
    );
  }
}
