'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import NexturnLogo from './NexturnLogo';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardCheck,
  ScanLine,
  School,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  UserCheck,
  Radio,
  ExternalLink,
  FileSpreadsheet,
  ServerCog,
} from 'lucide-react';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard & Stats',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    key: 'teachers',
    label: 'Teacher Database',
    href: '/teachers',
    icon: GraduationCap,
  },
  {
    key: 'students',
    label: 'Student Database',
    href: '/students',
    icon: Users,
  },
  {
    key: 'classroom_attendance',
    label: 'Class Attendance',
    href: '/classroom-attendance',
    icon: ClipboardCheck,
  },
  {
    key: 'turnstile_settings',
    label: 'Turnstile Settings',
    href: '/turnstile-settings',
    icon: ScanLine,
  },
  {
    key: 'school_settings',
    label: 'School Settings',
    href: '/settings',
    icon: School,
  },
  {
    key: 'audit_logs',
    label: 'Blockchain Audit',
    href: '/audit-logs',
    icon: ShieldCheck,
    badge: 'Immutable',
  },
  {
    key: 'rbac_manager',
    label: 'RBAC Manager',
    href: '/rbac',
    icon: ShieldAlert,
  },
  {
    key: 'users',
    label: 'User Accounts',
    href: '/users',
    icon: UserCog,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isModuleAllowed, user } = useAuth();

  // Dynamically filter navigation items based on PostgreSQL RolePermission allow/blocklist
  const allowedNavItems = NAV_ITEMS.filter((item) => isModuleAllowed(item.key));

  return (
    <aside className="nexturn-sidebar w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800 min-h-screen transition-colors duration-200">
      {/* Brand Header with RFID 'N' Logo */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <NexturnLogo size={34} variant="blue" />
          <div>
            <div className="font-black text-white text-base tracking-tight leading-tight flex items-center">
              <span>Nex</span>
              <span className="text-blue-500">Turn</span>
            </div>
            <div className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
              RFID Attendance
            </div>
          </div>
        </Link>
      </div>

      {/* Public Turnstile Launch Banner */}
      <div className="p-3">
        <Link
          href="/turnstile"
          target="_blank"
          className="group flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-blue-700/80 to-indigo-700/80 text-white text-xs font-semibold shadow hover:from-blue-600 hover:to-indigo-600 transition"
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span>Turnstile Kiosk</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-blue-200 group-hover:translate-x-0.5 transition" />
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          System Modules
        </div>

        {allowedNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Superadmin Dedicated Operations */}
        {user?.role === 'SUPERADMIN' && (
          <>
            <div className="pt-3 pb-1 px-2 text-[11px] font-bold text-purple-400 uppercase tracking-wider border-t border-slate-800/60 mt-2 flex items-center justify-between">
              <span>Superadmin</span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Root
              </span>
            </div>

            <Link
              href="/reports"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/reports'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${pathname === '/reports' ? 'text-white' : 'text-purple-400'}`} />
              <span>Report Generator</span>
            </Link>

            <Link
              href="/admin-settings"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/admin-settings'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <ServerCog className={`w-4 h-4 ${pathname === '/admin-settings' ? 'text-white' : 'text-purple-400'}`} />
              <span>Deployment & Purge</span>
            </Link>
          </>
        )}

        {/* Universal User Profile Link (available to all users) */}
        <div className="pt-4 pb-1 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-800/60 mt-3">
          Account
        </div>

        <Link
          href="/profile"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
            pathname === '/profile'
              ? 'bg-blue-600 text-white font-semibold shadow-sm'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <UserCheck className={`w-4 h-4 ${pathname === '/profile' ? 'text-white' : 'text-slate-400'}`} />
          <span>My User Profile</span>
        </Link>
      </div>

      {/* User Footer Card */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-700 overflow-hidden">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name ? user.name[0] : 'U'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">{user?.name}</div>
            <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
