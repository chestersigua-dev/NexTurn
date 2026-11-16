'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { ScanLine, Save, CheckCircle2, AlertCircle, Loader2, Radio } from 'lucide-react';
import Link from 'next/link';

export default function TurnstileSettingsPage() {
  const [formData, setFormData] = useState({
    autoToggleDirection: true,
    soundFeedback: true,
    displayDurationSeconds: 4,
    announcementText: 'Please tap your ID card to log attendance.',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/settings/turnstile');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setFormData({
              autoToggleDirection: data.settings.autoToggleDirection,
              soundFeedback: data.settings.soundFeedback,
              displayDurationSeconds: data.settings.displayDurationSeconds,
              announcementText: data.settings.announcementText || '',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/turnstile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update turnstile settings');
      }

      setMessage({
        type: 'success',
        text: 'Turnstile Kiosk settings saved and updated live on the public kiosk.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell requiredModule="turnstile_settings">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Turnstile Kiosk Settings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure scanner direction behavior, sound feedback, card popup timeout, and display banner
            </p>
          </div>

          <Link
            href="/turnstile"
            target="_blank"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
          >
            <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span>Open Public Kiosk</span>
          </Link>
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

        <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          {/* Setting 1: Auto Direction */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Intelligent Auto-Toggle Direction Mode
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically determines if tap is Entry (Clock In) or Exit (Clock Out) based on today's latest scan.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoToggleDirection}
                onChange={(e) => setFormData({ ...formData, autoToggleDirection: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Setting 2: Sound Feedback */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Auditory Chime Feedback
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Plays a pleasant dual-tone audio chime on success, and a distinctive buzz on invalid/unregistered cards.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.soundFeedback}
                onChange={(e) => setFormData({ ...formData, soundFeedback: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Setting 3: Display Duration */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Card Scan Popup Display Duration (Seconds)
            </label>
            <p className="text-xs text-slate-500 mb-2">
              How long the student or teacher photo card remains on screen before automatically returning to idle.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={15}
                value={formData.displayDurationSeconds}
                onChange={(e) =>
                  setFormData({ ...formData, displayDurationSeconds: parseInt(e.target.value, 10) })
                }
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="w-12 text-center text-xs font-mono font-bold text-blue-700 px-2 py-1 bg-blue-50 rounded-md border border-blue-200">
                {formData.displayDurationSeconds}s
              </span>
            </div>
          </div>

          {/* Setting 4: Announcement Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kiosk Announcement Banner
            </label>
            <input
              type="text"
              value={formData.announcementText}
              onChange={(e) => setFormData({ ...formData, announcementText: e.target.value })}
              placeholder="e.g. Welcome to Mabini NCHS! Please tap your RFID card to log attendance."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Turnstile Settings</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
