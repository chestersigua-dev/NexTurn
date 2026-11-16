'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { School, User, LogOut, ExternalLink, Shield } from 'lucide-react';
import ThemeSelector from './ThemeSelector';
import NexturnLogo from './NexturnLogo';

export default function Topbar() {
  const { user, school, logout } = useAuth();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'PRINCIPAL':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ADMIN_AIDE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'HEAD_TEACHER':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'TEACHER':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const formatRole = (role?: string) => {
    if (!role) return '';
    return role.replace('_', ' ');
  };

  return (
    <header className="nexturn-topbar bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm transition-colors duration-200">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* School Profile Branding Section (Zero Background for School Logo) */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 flex items-center justify-center shrink-0 overflow-hidden bg-transparent">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={school.schoolName}
                className="w-full h-full object-contain bg-transparent"
              />
            ) : (
              <NexturnLogo size={38} />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate leading-snug">
                {school.schoolName}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
              <span className="truncate">{school.schoolAddress}</span>
              <span className="hidden md:inline text-slate-300">•</span>
              <span className="hidden md:inline truncate">{school.contactInfo}</span>
              <span className="hidden lg:inline text-slate-300">•</span>
              <span className="hidden lg:inline font-medium text-slate-700">
                Principal: {school.principalName}
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Theme Switcher (6 Facebook-style themes: 3 light, 3 dark) */}
          <ThemeSelector />

          {/* Turnstile Public Kiosk Button */}
          <Link
            href="/turnstile"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition"
            title="Launch Public RFID Turnstile Kiosk in new tab"
          >
            <span>Public Turnstile Kiosk</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* User Profile Pill */}
          <Link
            href="/profile"
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
            title="Click to view and edit personal profile"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center overflow-hidden font-bold text-xs shrink-0 border border-slate-300">
              {user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-slate-600" />
              )}
            </div>
            <div className="hidden md:block text-left text-xs">
              <div className="font-semibold text-slate-900 truncate max-w-[140px] leading-tight">
                {user?.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block px-1.5 py-0.2 text-[10px] font-bold rounded border leading-tight ${getRoleBadgeColor(
                    user?.role
                  )}`}
                >
                  {formatRole(user?.role)}
                </span>
              </div>
            </div>
          </Link>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
            title="Sign out of system"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
