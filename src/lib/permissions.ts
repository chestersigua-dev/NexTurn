import { prisma } from './prisma';
import { Role } from '@prisma/client';

export type SystemModuleKey =
  | 'dashboard'
  | 'teachers'
  | 'students'
  | 'classroom_attendance'
  | 'turnstile_settings'
  | 'school_settings'
  | 'audit_logs'
  | 'rbac_manager'
  | 'users';

export interface ModuleDefinition {
  key: SystemModuleKey;
  label: string;
  href: string;
  description: string;
}

export const SYSTEM_MODULES: ModuleDefinition[] = [
  {
    key: 'dashboard',
    label: 'Dashboard & Analytics',
    href: '/dashboard',
    description: 'Attendance statistics, real-time metrics, charts and master attendance history',
  },
  {
    key: 'teachers',
    label: 'Teacher Database',
    href: '/teachers',
    description: 'Faculty masterlist, individual profiles, DepEd Form 48 timecard generation',
  },
  {
    key: 'students',
    label: 'Student Database',
    href: '/students',
    description: 'Student masterlist, 12-digit LRN, DepEd LIS / SF1 CSV import',
  },
  {
    key: 'classroom_attendance',
    label: 'Classroom Attendance',
    href: '/classroom-attendance',
    description: 'Class-level attendance logs per subject, section, and date',
  },
  {
    key: 'turnstile_settings',
    label: 'Turnstile Kiosk Settings',
    href: '/turnstile-settings',
    description: 'Auto-toggle mode, display duration, sound chime, announcement banner',
  },
  {
    key: 'school_settings',
    label: 'School Profile Settings',
    href: '/settings',
    description: 'School name, address, contact info, principal name, school logo',
  },
  {
    key: 'audit_logs',
    label: 'Blockchain Audit Trail',
    href: '/audit-logs',
    description: 'Cryptographic ledger of all actions with real-time SHA-256 integrity verifier',
  },
  {
    key: 'rbac_manager',
    label: 'Role Permissions Editor',
    href: '/rbac',
    description: 'Configure dynamic module allow/block lists for all four user roles',
  },
  {
    key: 'users',
    label: 'User Accounts',
    href: '/users',
    description: 'Manage staff system accounts, roles, and credentials',
  },
];

export async function isModuleAllowedForRole(role: Role, moduleKey: SystemModuleKey): Promise<boolean> {
  const perm = await prisma.rolePermission.findUnique({
    where: {
      role_module: {
        role,
        module: moduleKey,
      },
    },
  });

  if (!perm) {
    // If not explicitly blocked or missing, default fallback
    return role === Role.SUPERADMIN;
  }

  return perm.isAllowed;
}

export async function getPermissionsForRole(role: Role): Promise<Record<SystemModuleKey, boolean>> {
  const permissions = await prisma.rolePermission.findMany({
    where: { role },
  });

  const result: Partial<Record<SystemModuleKey, boolean>> = {};
  for (const mod of SYSTEM_MODULES) {
    const found = permissions.find((p) => p.module === mod.key);
    result[mod.key] = found ? found.isAllowed : role === Role.SUPERADMIN;
  }

  return result as Record<SystemModuleKey, boolean>;
}

export async function getAllRolePermissionsMatrix(): Promise<Record<Role, Record<SystemModuleKey, boolean>>> {
  const allPerms = await prisma.rolePermission.findMany();
  const matrix: Partial<Record<Role, Record<SystemModuleKey, boolean>>> = {};

  for (const role of Object.values(Role)) {
    matrix[role] = {} as Record<SystemModuleKey, boolean>;
    for (const mod of SYSTEM_MODULES) {
      const found = allPerms.find((p) => p.role === role && p.module === mod.key);
      matrix[role]![mod.key] = found ? found.isAllowed : role === Role.SUPERADMIN;
    }
  }

  return matrix as Record<Role, Record<SystemModuleKey, boolean>>;
}

/**
 * Strict role-based rule from specification (Requirement 5.B):
 * "Full Create, Read, Update, Delete (CRUD) available for superadmin, principal, and admin_aide.
 * head_teacher is strictly Read-Only (cannot create, edit, or delete teacher records;
 * hide mutation buttons and block mutation APIs for head_teacher)."
 */
export function canRoleMutateTeachers(role: Role): boolean {
  return role === Role.SUPERADMIN || role === Role.PRINCIPAL || role === Role.ADMIN_AIDE;
}
