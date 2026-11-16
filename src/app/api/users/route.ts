import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { userCreateSchema } from '@/lib/validations';
import { hashPassword } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction, Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireModuleAccess('users', req);

    const users = await prisma.user.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireModuleAccess('users', req);

    const body = await req.json();
    const parsed = userCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid user data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, email, role, password, rfidNumber } = parsed.data;

    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'A user with this email address already exists.' },
        { status: 400 }
      );
    }

    if (rfidNumber) {
      const existingRfid = await prisma.user.findFirst({
        where: { rfidNumber },
      });
      if (existingRfid) {
        return NextResponse.json(
          { error: 'This RFID number is already assigned to another user account.' },
          { status: 400 }
        );
      }
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        role,
        passwordHash,
        rfidNumber: rfidNumber || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rfidNumber: true,
        createdAt: true,
      },
    });

    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role, name: newUser.name },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
