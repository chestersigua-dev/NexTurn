import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionCookie } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { recordAuditLog } from '@/lib/audit';
import { loginSchema } from '@/lib/validations';
import { getPermissionsForRole } from '@/lib/permissions';
import { AuditAction } from '@prisma/client';

export async function POST(req: NextRequest) {
  // 1. Rate limiting (max 30 login attempts per minute per IP)
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`login:${ip}`, 30, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in 1 minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // 2. Query user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Record failed attempt
      await recordAuditLog({
        action: AuditAction.LOGIN_FAILED,
        entityType: 'AUTH',
        details: { email, reason: 'User not found', ip },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 3. Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: AuditAction.LOGIN_FAILED,
        entityType: 'AUTH',
        details: { email, reason: 'Invalid password', ip },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 4. Record successful login in immutable audit log
    await recordAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.LOGIN,
      entityType: 'AUTH',
      entityId: user.id,
      details: { ip, userAgent: req.headers.get('user-agent') },
    });

    // 5. Fetch role permissions and school profile
    const [permissions, school] = await Promise.all([
      getPermissionsForRole(user.role),
      prisma.schoolProfile.findUnique({ where: { id: 'default' } }),
    ]);

    // 6. Create secure session cookie
    const sessionCookie = createSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        photoUrl: user.photoUrl,
        rfidNumber: user.rfidNumber,
      },
      permissions,
      school: school || {
        schoolName: 'Speaker Eugenio Perez National Agricultural School',
        schoolAddress: 'Roxas Blvd, San Carlos City, Pangasinan',
        contactInfo: '(075) 955 5258 | 300388@deped.gov.ph',
        principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
        logoUrl: '/sepnas.png',
      },
    });

    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred during login.' },
      { status: 500 }
    );
  }
}
