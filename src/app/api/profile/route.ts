import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { profileUpdateSchema } from '@/lib/validations';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rfidNumber: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await requireAuth(req);
    const body = await req.json();

    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, email, currentPassword, newPassword, rfidNumber, photoUrl } = parsed.data;

    // Check if email already used by another user
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        id: { not: sessionUser.id },
      },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already in use by another account' },
        { status: 400 }
      );
    }

    // Check if RFID number already used by another user or student/teacher
    if (rfidNumber) {
      const existingRfid = await prisma.user.findFirst({
        where: {
          rfidNumber,
          id: { not: sessionUser.id },
        },
      });
      if (existingRfid) {
        return NextResponse.json(
          { error: 'This RFID number is already assigned to another user account' },
          { status: 400 }
        );
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });
    if (!currentUser) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const updateData: any = {
      name,
      email: email.toLowerCase().trim(),
      rfidNumber: rfidNumber || null,
      photoUrl: photoUrl !== undefined ? photoUrl : currentUser.photoUrl,
    };

    // If changing password, verify current password
    if (newPassword && newPassword.trim().length > 0) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password' },
          { status: 400 }
        );
      }
      const isCurrentValid = await verifyPassword(currentPassword, currentUser.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: 'Incorrect current password' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rfidNumber: true,
        photoUrl: true,
        updatedAt: true,
      },
    });

    // Record in immutable audit log
    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: sessionUser.id,
      details: {
        updatedFields: Object.keys(updateData).filter((k) => k !== 'passwordHash'),
        passwordChanged: !!newPassword,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return handleApiError(error);
  }
}
