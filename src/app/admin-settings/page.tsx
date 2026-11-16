'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useTheme, THEME_OPTIONS } from '@/context/ThemeContext';
import {
  Server,
  Trash2,
  Download,
  Upload,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  Eye,
  EyeOff,
  Palette,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { user, refreshAuth } = useAuth();
  const { theme, setTheme } = useTheme();

  // Deployment flags
  const [isLiveDeployment, setIsLiveDeployment] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);
  const [showTapSimulator, setShowTapSimulator] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingDeployment, setIsSavingDeployment] = useState(false);

  // Purge Modal State
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeConfirmation, setPurgeConfirmation] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('NexTurn Comprehensive Academy');
  const [newPrincipalName, setNewPrincipalName] = useState('Dr. Tomas Garcia Ferrer Jr., Principal IV');
  const [isPurging, setIsPurging] = useState(false);

  // Import / Export State
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Message notifications
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current system settings
  useEffect(() => {
    async function loadSystemSettings() {
      setIsLoadingSettings(true);
      try {
        const res = await fetch('/api/settings/system');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setIsLiveDeployment(Boolean(data.settings.isLiveDeployment));
            setShowDemoAccounts(Boolean(data.settings.showDemoAccounts));
            setShowTapSimulator(Boolean(data.settings.showTapSimulator));
          }
        }
      } catch (err) {
        console.error('Failed to load system settings:', err);
      } finally {
        setIsLoadingSettings(false);
      }
    }
    loadSystemSettings();
  }, []);

  // Save deployment settings
  const handleSaveDeployment = async () => {
    setIsSavingDeployment(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isLiveDeployment,
          showDemoAccounts,
          showTapSimulator,
          theme,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update deployment settings');

      setMessage({
        type: 'success',
        text: 'Live deployment settings successfully updated! Active across login and kiosk screens.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSavingDeployment(false);
    }
  };

  // Toggle live deployment preset
  const handleToggleLiveMaster = (checked: boolean) => {
    setIsLiveDeployment(checked);
    if (checked) {
      setShowDemoAccounts(false);
      setShowTapSimulator(false);
    } else {
      setShowDemoAccounts(true);
      setShowTapSimulator(true);
    }
  };

  // Execute Database Purge
  const handleExecutePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purgeConfirmation !== 'CONFIRM PURGE') {
      setMessage({ type: 'error', text: 'You must type "CONFIRM PURGE" exactly.' });
      return;
    }

    setIsPurging(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/purge-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: purgeConfirmation,
          newSchoolName,
          newPrincipalName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Purge failed');

      await refreshAuth();
      setIsPurgeModalOpen(false);
      setPurgeConfirmation('');
      setMessage({
        type: 'success',
        text: `Database successfully purged! Initialized for "${newSchoolName}". All logs and masterlists cleared with a fresh blockchain genesis block.`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsPurging(false);
    }
  };

  // Export Settings JSON
  const handleExportSettings = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/settings-backup');
      if (!res.ok) throw new Error('Failed to export settings');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexturn-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'System settings bundle exported successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsExporting(false);
    }
  };

  // Import Settings JSON
  const handleImportSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setIsImporting(true);
    setMessage(null);

    try {
      const text = await importFile.text();
      const json = JSON.parse(text);

      const res = await fetch('/api/admin/settings-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import settings');

      await refreshAuth();
      setImportFile(null);
      setMessage({ type: 'success', text: 'System configuration imported and applied successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppShell requiredModule="rbac_manager">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider mb-1">
            Superadmin Root Operations
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            System Deployment & Maintenance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure live production mode, manage database lifecycle, export/import system configuration, and purge for new schools
          </p>
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

        {/* Section 1: Live Deployment & Demo Mode Toggles */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>Live Deployment Mode</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Switch between Demonstration Mode and Production Live Deployment
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveDeployment}
              disabled={isSavingDeployment}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition disabled:opacity-50"
            >
              {isSavingDeployment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Deployment State</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Master Toggle */}
            <div
              onClick={() => handleToggleLiveMaster(!isLiveDeployment)}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                isLiveDeployment
                  ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">Live Production Mode</span>
                <span
                  className={`w-3 h-3 rounded-full ${
                    isLiveDeployment ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-600">
                {isLiveDeployment
                  ? 'Active: Demo helpers & tap simulators hidden system-wide for live security.'
                  : 'Demo Mode: Helper credentials & quick-tap simulator enabled.'}
              </p>
            </div>

            {/* Sub-toggle: Login Demo Accounts */}
            <div
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                showDemoAccounts
                  ? 'bg-blue-50/70 border-blue-300'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">Show Demo Accounts on Login</span>
                {showDemoAccounts ? (
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                Display the 1-click test credential badges on the login screen.
              </p>
            </div>

            {/* Sub-toggle: Kiosk Simulator */}
            <div
              onClick={() => setShowTapSimulator(!showTapSimulator)}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                showTapSimulator
                  ? 'bg-blue-50/70 border-blue-300'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">Show Kiosk Tap Simulator</span>
                {showTapSimulator ? (
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                Display the Quick-Tap RFID drawer on the Public Turnstile Kiosk.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Import & Export Configuration */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Import & Export System Settings</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Backup institutional branding, kiosk behavior, and role permissions as JSON, or restore an existing configuration
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Export Card */}
            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-bold text-indigo-900">Export System Settings</div>
                <p className="text-[11px] text-indigo-700 mt-1">
                  Downloads a structured <code className="bg-indigo-100 px-1 py-0.5 rounded">.json</code> file with school profile, kiosk parameters, deployment flags, and RBAC matrix.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportSettings}
                disabled={isExporting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Download Configuration (.json)</span>
              </button>
            </div>

            {/* Import Card */}
            <form onSubmit={handleImportSettings} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-bold text-slate-900">Import Configuration File</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Restore institutional settings instantly from a previously exported NexTurn JSON backup.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                <button
                  type="submit"
                  disabled={!importFile || isImporting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Apply Imported Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Section 3: Dangerous Zone - Purge Database Ready for a New School */}
        <div className="p-6 rounded-3xl bg-red-50/50 border-2 border-red-200 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-950">
                Purge Entire Database Ready for a New School
              </h2>
              <p className="text-xs text-red-700 mt-0.5">
                Permanently deletes all attendance records, student masterlists, teacher directories, and non-superadmin accounts. Resets institutional profile, turnstile settings, and mints a pristine blockchain genesis block.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsPurgeModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Purge Database for New School...</span>
            </button>
          </div>
        </div>

        {/* Confirmation Purge Modal */}
        {isPurgeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-red-200 shadow-2xl space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Are you absolutely certain?
                </h3>
                <p className="text-xs text-slate-500">
                  This action is irreversible. All student directories, faculty listings, historical clock-ins, and classroom attendance will be permanently deleted.
                </p>
              </div>

              <form onSubmit={handleExecutePurge} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Institutional School Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New School Principal / Head
                  </label>
                  <input
                    type="text"
                    required
                    value={newPrincipalName}
                    onChange={(e) => setNewPrincipalName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-800">
                  To proceed with the complete wipe, type <strong className="font-mono text-red-950">CONFIRM PURGE</strong> below:
                </div>

                <input
                  type="text"
                  required
                  placeholder="CONFIRM PURGE"
                  value={purgeConfirmation}
                  onChange={(e) => setPurgeConfirmation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-red-300 text-xs font-mono font-bold text-red-900 focus:outline-none focus:border-red-500 text-center tracking-wider uppercase"
                />

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPurgeModalOpen(false);
                      setPurgeConfirmation('');
                    }}
                    disabled={isPurging}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={purgeConfirmation !== 'CONFIRM PURGE' || isPurging}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition disabled:opacity-50"
                  >
                    {isPurging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    <span>Confirm & Purge Entire Database</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
