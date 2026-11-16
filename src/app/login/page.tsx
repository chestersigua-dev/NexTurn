'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { School, Lock, Mail, Loader2, Radio, ExternalLink, ShieldAlert, Sparkles } from 'lucide-react';
import NexturnLogo from '@/components/NexturnLogo';
import ThemeSelector from '@/components/ThemeSelector';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  useEffect(() => {
    async function loadDeploymentSetting() {
      try {
        const res = await fetch('/api/settings/system', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            const isLive = Boolean(data.settings.isLiveDeployment);
            const allowDemos = Boolean(data.settings.showDemoAccounts);
            setShowDemoAccounts(allowDemos && !isLive);
          }
        } else {
          setShowDemoAccounts(false);
        }
      } catch {
        setShowDemoAccounts(false);
      }
    }
    loadDeploymentSetting();
  }, []);

  const getCleanDestination = () => {
    const rawFrom = searchParams.get('from');
    if (rawFrom && !rawFrom.startsWith('/login') && !rawFrom.startsWith('/api/')) {
      return rawFrom;
    }
    return '/dashboard';
  };

  const executeLogin = async (targetEmail: string, targetPass: string) => {
    setError('');
    setIsLoading(true);

    const result = await login(targetEmail, targetPass);

    if (!result.success) {
      setError(result.error || 'Login failed. Please check your credentials.');
      setIsLoading(false);
      return;
    }

    const destination = getCleanDestination();
    if (typeof window !== 'undefined') {
      window.location.replace(destination);
    } else {
      router.push(destination);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    executeLogin(demoEmail, demoPass);
  };

  const fromParam = searchParams.get('from');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mx-auto mb-3">
          <NexturnLogo size={52} variant="blue" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Staff Authentication</h2>
        <p className="text-xs text-slate-400 mt-1">
          {fromParam
            ? 'Sign in to access the Attendance Dashboard & school modules'
            : 'Sign in with your authorized school role credentials'}
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@school.edu.ph"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <span>Sign In to System</span>
          )}
        </button>
      </form>

      {/* Quick Demo Login Credentials Box (Hidden in Live Deployment Mode) */}
      {showDemoAccounts && (
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click Demo Accounts (5 User Roles):</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              type="button"
              onClick={() => fillDemoAccount('chestersigua@gmail.com', 'N4suaKDS@$&!')}
              className="p-2 rounded-lg bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/40 text-left transition"
            >
              <div className="text-[11px] font-bold text-purple-300">1. Superadmin (Chester Sigua)</div>
              <div className="text-[9px] text-slate-400 truncate">chestersigua@gmail.com</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('principal@nexturn.edu.ph', 'Password2026!')}
              className="p-2 rounded-lg bg-blue-950/30 hover:bg-blue-900/40 border border-blue-800/40 text-left transition"
            >
              <div className="text-[11px] font-bold text-blue-300">2. Principal</div>
              <div className="text-[9px] text-slate-400 truncate">principal@nexturn.edu.ph</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('adminaide@nexturn.edu.ph', 'Password2026!')}
              className="p-2 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/40 text-left transition"
            >
              <div className="text-[11px] font-bold text-emerald-300">3. Admin Aide</div>
              <div className="text-[9px] text-slate-400 truncate">adminaide@nexturn.edu.ph</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('headteacher@nexturn.edu.ph', 'Password2026!')}
              className="p-2 rounded-lg bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 text-left transition"
            >
              <div className="text-[11px] font-bold text-amber-300">4. Head Teacher</div>
              <div className="text-[9px] text-slate-400 truncate">headteacher@nexturn.edu.ph</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('teacher@nexturn.edu.ph', 'Password2026!')}
              className="col-span-2 p-2 rounded-lg bg-teal-950/30 hover:bg-teal-900/40 border border-teal-800/40 text-left transition flex items-center justify-between"
            >
              <div>
                <div className="text-[11px] font-bold text-teal-300">5. Subject & Advisory Teacher</div>
                <div className="text-[9px] text-slate-400">teacher@nexturn.edu.ph • Gen Chem 1 & Gr 11 STEM-A Adviser</div>
              </div>
              <span className="text-[9px] font-bold text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800/50">Scoped View</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Banner */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <NexturnLogo size={36} variant="blue" />
          <div>
            <div className="font-extrabold text-white text-base tracking-tight leading-tight flex items-center">
              <span>Nex</span>
              <span className="text-blue-500">Turn</span>
            </div>
            <div className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
              RFID Attendance Management System
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSelector />
          <a
            href="/turnstile"
            target="_blank"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/40 text-xs font-semibold transition"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Launch Public Turnstile Kiosk</span>
            <ExternalLink className="w-3 h-3 text-blue-300" />
          </a>
        </div>
      </header>

      {/* Main Login Card wrapped in Suspense */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <Suspense
          fallback={
            <div className="p-8 text-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              Loading login portal...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-600 py-3">
        DepEd School RFID Attendance Management System • Powered by PostgreSQL & Immutable Blockchain Ledger
      </footer>
    </div>
  );
}

