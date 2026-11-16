import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

const SESSION_COOKIE_NAME = 'nexturn_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'nexturn-default-secret-key-at-least-32-chars-long';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  exp: number;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function signPayload(payload: SessionPayload): string {
  const jsonStr = JSON.stringify(payload);
  const data = Buffer.from(jsonStr).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(data)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const jsonStr = Buffer.from(data, 'base64url').toString('utf8');
    const payload: SessionPayload = JSON.parse(jsonStr);

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

export function createSessionCookie(payload: { userId: string; email: string; role: Role }) {
  const sessionPayload: SessionPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    exp: Date.now() + SESSION_EXPIRY_MS,
  };
  const token = signPayload(sessionPayload);
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: Math.floor(SESSION_EXPIRY_MS / 1000),
    },
  };
}

export async function getSessionUser(req?: NextRequest) {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Out of request context
    }
  }

  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      rfidNumber: true,
      photoUrl: true,
      assignedSubject: true,
      advisoryGrade: true,
      advisorySection: true,
      teacherId: true,
      createdAt: true,
    },
  });

  return user;
}

export { SESSION_COOKIE_NAME };
