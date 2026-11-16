'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  requiredModule?: string;
}

export default function AppShell({ children, requiredModule }: AppShellProps) {
  const { user, isLoading, isModuleAllowed } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
      router.push(`/login?from=${encodeURIComponent(currentPath)}`);
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <div className="text-sm font-semibold tracking-wide text-slate-300">
          {isLoading ? 'Loading NexTurn Attendance System...' : 'Redirecting to login portal...'}
        </div>
      </div>
    );
  }

  // Check module permission if requiredModule is specified
  if (requiredModule && !isModuleAllowed(requiredModule)) {
    return (
      <div className="nexturn-app-shell flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Topbar />
          <main className="flex-1 p-8 flex items-center justify-center">
            <div className="max-w-md w-full p-6 bg-white rounded-xl shadow-sm border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold">✕</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Access Restricted</h2>
              <p className="text-sm text-slate-600 mb-4">
                Your role (<span className="font-semibold text-slate-800">{user.role}</span>) has been blocked from accessing the{' '}
                <span className="font-semibold text-slate-800">{requiredModule}</span> module by the school administrator.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
              >
                Return to Dashboard
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="nexturn-app-shell flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
