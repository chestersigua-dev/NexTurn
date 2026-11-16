import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { userUpdateSchema } from '@/lib/validations';
import { hashPassword } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction, Role } from '@prisma/client';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await requireModuleAccess('users', req);
    const { id } = params;

    const body = await req.json();
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid user update data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, email, role, password, rfidNumber } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check unique email
    if (email.toLowerCase().trim() !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: 'A user with this email address already exists.' },
          { status: 400 }
        );
      }
    }

    // Check unique RFID
    if (rfidNumber && rfidNumber !== existingUser.rfidNumber) {
      const rfidTaken = await prisma.user.findFirst({
        where: { rfidNumber, id: { not: id } },
      });
      if (rfidTaken) {
        return NextResponse.json(
          { error: 'This RFID number is already assigned to another user.' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      name,
      email: email.toLowerCase().trim(),
      role,
      rfidNumber: rfidNumber || null,
    };

    if (password && password.trim().length >= 8) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
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

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      details: { email: updatedUser.email, role: updatedUser.role },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await requireModuleAccess('users', req);
    const { id } = params;

    if (sessionUser.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own active session user account.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if target is the last superadmin
    if (targetUser.role === Role.SUPERADMIN) {
      const superadminCount = await prisma.user.count({
        where: { role: Role.SUPERADMIN },
      });
      if (superadminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the system primary Superadministrator account.' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.DELETE,
      entityType: 'User',
      entityId: id,
      details: { email: targetUser.email, role: targetUser.role },
    });

    return NextResponse.json({ success: true, message: 'User account removed successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
