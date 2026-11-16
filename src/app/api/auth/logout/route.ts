import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (user) {
      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: AuditAction.LOGOUT,
        entityType: 'AUTH',
        entityId: user.id,
        details: { ip: req.headers.get('x-forwarded-for') || '127.0.0.1' },
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return response;
  }
}
