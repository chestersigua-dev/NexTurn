import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from './auth';
import { isModuleAllowedForRole, canRoleMutateTeachers, SystemModuleKey } from './permissions';
import { Role } from '@prisma/client';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAuth(req?: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  return user;
}

export async function requireModuleAccess(moduleKey: SystemModuleKey, req?: NextRequest) {
  const user = await requireAuth(req);

  const allowed = await isModuleAllowedForRole(user.role, moduleKey);
  if (!allowed) {
    throw new AuthError(`Access Denied: Your role (${user.role}) is blocked from accessing the ${moduleKey} module.`, 403);
  }

  return user;
}

export async function requireTeacherWriteAccess(req?: NextRequest) {
  const user = await requireModuleAccess('teachers', req);

  if (!canRoleMutateTeachers(user.role)) {
    throw new AuthError('Head Teachers are strictly restricted to Read-Only access on teacher records.', 403);
  }

  return user;
}

export async function requireSuperAdmin(req?: NextRequest) {
  const user = await requireAuth(req);
  if (user.role !== Role.SUPERADMIN) {
    throw new AuthError('Access Restricted: Only Superadmin can perform this operation.', 403);
  }
  return user;
}

export function handleApiError(error: any) {
  if (error?.digest === 'DYNAMIC_SERVER_USAGE') {
    throw error;
  }
  console.error('API Error:', error);
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { error: error.message || 'An internal server error occurred' },
    { status: 500 }
  );
}
