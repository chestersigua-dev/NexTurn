'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Unlock,
  Info,
} from 'lucide-react';

interface ModuleDef {
  key: string;
  label: string;
  description: string;
}

export default function RbacManagerPage() {
  const { user, refreshAuth } = useAuth();
  const [modules, setModules] = useState<ModuleDef[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/rbac');
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules);
        setRoles(data.roles);
        setMatrix(data.matrix);
      }
    } catch (err) {
      console.error('Failed to load RBAC matrix:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const togglePermission = (role: string, moduleKey: string) => {
    // Superadmin is always allowed on rbac_manager to prevent lockout
    if (role === 'SUPERADMIN' && moduleKey === 'rbac_manager') {
      return;
    }

    setMatrix((prev) => {
      const current = prev[role]?.[moduleKey] ?? false;
      return {
        ...prev,
        [role]: {
          ...prev[role],
          [moduleKey]: !current,
        },
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    const permissionsList: Array<{ role: string; module: string; isAllowed: boolean }> = [];
    for (const role of roles) {
      for (const mod of modules) {
        permissionsList.push({
          role,
          module: mod.key,
          isAllowed: matrix[role]?.[mod.key] ?? false,
        });
      }
    }

    try {
      const res = await fetch('/api/rbac', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionsList }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update permissions');
      }

      await refreshAuth();
      setMessage({
        type: 'success',
        text: 'Role permissions matrix updated successfully! All navigation menus and backend API authorization routes are now dynamically enforcing the new allow/block rules.',
      });
      if (data.matrix) {
        setMatrix(data.matrix);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'Superadmin';
      case 'PRINCIPAL':
        return 'Principal';
      case 'ADMIN_AIDE':
        return 'Admin Aide';
      case 'HEAD_TEACHER':
        return 'Head Teacher';
      default:
        return role;
    }
  };

  const getRoleHeaderBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'PRINCIPAL':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ADMIN_AIDE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'HEAD_TEACHER':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <AppShell requiredModule="rbac_manager">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Role Permissions Editor (RBAC Manager)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure dynamic allow/block access lists per user role across all 9 system modules
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save & Enforce Permissions</span>
          </button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Dynamic Enforcement Protocol:</span> Toggling any module to <strong>BLOCKED</strong> will immediately remove the item from that role's navigation menu and will reject any corresponding backend API requests with a <strong>403 Forbidden</strong> response upon save.
          </div>
        </div>

        {/* Dynamic RBAC Matrix Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 w-80">System Module</th>
                  {roles.map((role) => (
                    <th key={role} className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${getRoleHeaderBadge(
                          role
                        )}`}
                      >
                        {formatRoleLabel(role)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={roles.length + 1} className="text-center py-12 text-slate-400">
                      Loading permissions matrix...
                    </td>
                  </tr>
                ) : (
                  modules.map((mod) => (
                    <tr key={mod.key} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{mod.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{mod.description}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          module: <code className="text-blue-600 font-bold">{mod.key}</code>
                        </div>
                      </td>

                      {roles.map((role) => {
                        const isAllowed = matrix[role]?.[mod.key] ?? false;
                        const isLocked = role === 'SUPERADMIN' && mod.key === 'rbac_manager';

                        return (
                          <td key={role} className="py-4 px-6 text-center">
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => togglePermission(role, mod.key)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition shadow-sm ${
                                isAllowed
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                              } ${isLocked ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                              {isAllowed ? (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  <span>ALLOWED</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>BLOCKED</span>
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
