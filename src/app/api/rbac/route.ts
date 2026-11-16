import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, handleApiError } from '@/lib/server-guard';
import { prisma } from '@/lib/prisma';
import { getAllRolePermissionsMatrix, SYSTEM_MODULES, SystemModuleKey } from '@/lib/permissions';
import { rbacUpdateSchema } from '@/lib/validations';
import { recordAuditLog } from '@/lib/audit';
import { Role, AuditAction } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireModuleAccess('rbac_manager', req);

    const matrix = await getAllRolePermissionsMatrix();

    return NextResponse.json({
      modules: SYSTEM_MODULES,
      roles: Object.values(Role),
      matrix,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await requireModuleAccess('rbac_manager', req);

    // Only SUPERADMIN can update RBAC permissions
    if (sessionUser.role !== Role.SUPERADMIN) {
      return NextResponse.json(
        { error: 'Forbidden: Only primary Superadministrators can alter role permissions.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = rbacUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid permissions payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { permissions } = parsed.data;

    // Apply updates in transaction
    await prisma.$transaction(
      permissions.map((p) =>
        prisma.rolePermission.upsert({
          where: {
            role_module: {
              role: p.role,
              module: p.module,
            },
          },
          update: {
            isAllowed: p.isAllowed,
          },
          create: {
            role: p.role,
            module: p.module,
            isAllowed: p.isAllowed,
          },
        })
      )
    );

    // Record in immutable audit log
    await recordAuditLog({
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
      action: AuditAction.RBAC_CHANGE,
      entityType: 'RolePermission',
      details: {
        updatedCount: permissions.length,
        summary: permissions.map((p) => `${p.role}:${p.module}=${p.isAllowed}`).join(', '),
      },
    });

    const updatedMatrix = await getAllRolePermissionsMatrix();

    return NextResponse.json({
      success: true,
      message: 'Role permissions updated successfully. Changes are now strictly enforced across the system.',
      matrix: updatedMatrix,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
