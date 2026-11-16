'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { School, Save, Upload, CheckCircle2, AlertCircle, Loader2, RotateCcw, Palette } from 'lucide-react';
import NexturnLogo from '@/components/NexturnLogo';
import ThemeSelector from '@/components/ThemeSelector';

export default function SchoolSettingsPage() {
  const { school: authSchool, refreshAuth } = useAuth();

  const [formData, setFormData] = useState({
    schoolName: authSchool?.schoolName || '',
    schoolAddress: authSchool?.schoolAddress || '',
    contactInfo: authSchool?.contactInfo || '',
    principalName: authSchool?.principalName || '',
    logoUrl: authSchool?.logoUrl || '',
  });

  const [savedData, setSavedData] = useState({
    schoolName: authSchool?.schoolName || '',
    schoolAddress: authSchool?.schoolAddress || '',
    contactInfo: authSchool?.contactInfo || '',
    principalName: authSchool?.principalName || '',
    logoUrl: authSchool?.logoUrl || '',
  });

  const [isLoading, setIsLoading] = useState(!authSchool?.schoolName);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with auth context when school branding arrives
  useEffect(() => {
    if (authSchool && authSchool.schoolName) {
      const current = {
        schoolName: authSchool.schoolName || '',
        schoolAddress: authSchool.schoolAddress || '',
        contactInfo: authSchool.contactInfo || '',
        principalName: authSchool.principalName || '',
        logoUrl: authSchool.logoUrl || '',
      };
      setSavedData(current);
      setFormData((prev) => {
        // If form fields haven't been modified yet, populate immediately
        if (!prev.schoolName) {
          return current;
        }
        return prev;
      });
    }
  }, [authSchool]);

  // Load the current saved school profile from database
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings/school', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.school && isMounted) {
            const loaded = {
              schoolName: data.school.schoolName || '',
              schoolAddress: data.school.schoolAddress || '',
              contactInfo: data.school.contactInfo || '',
              principalName: data.school.principalName || '',
              logoUrl: data.school.logoUrl || '',
            };
            setFormData(loaded);
            setSavedData(loaded);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleResetToSaved = () => {
    setFormData(savedData);
    setMessage({
      type: 'success',
      text: 'Form reset to currently saved institutional profile.',
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('category', 'school-logo');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload logo');
      }

      setFormData((prev) => ({ ...prev, logoUrl: data.url }));
      setMessage({ type: 'success', text: 'School logo uploaded successfully! Click Save Changes to apply.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/school', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update school settings');
      }

      setSavedData(formData);
      await refreshAuth();
      setMessage({
        type: 'success',
        text: 'School Profile updated successfully! Changes are now displayed across the system and public turnstile.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell requiredModule="school_settings">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              School Profile & Branding Settings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure institutional profile, DepEd Division branding, official logo, and principal details
            </p>
          </div>

          {savedData.schoolName && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold self-start sm:self-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Saved Profile Loaded</span>
            </div>
          )}
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

        {/* System Theme & Appearance Customizer */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">System Color Scheme & Facebook Themes</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose from 6 curated themes (3 Light, 3 Dark: Classic, Messenger, Meta Modern, Dark Slate, Midnight, Obsidian).
              </p>
            </div>
          </div>
          <ThemeSelector />
        </div>

        <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          {/* Logo Upload Section (Completely Transparent Background) */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
            <div className="w-24 h-24 rounded-2xl bg-transparent border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="School Logo"
                  className="w-full h-full object-contain p-2 bg-transparent"
                />
              ) : (
                <NexturnLogo size={48} variant="blue" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-sm font-bold text-slate-900">Official School Seal / Logo</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">
                Transparent PNG or SVG recommended. Used in Topbar branding, DepEd Form 48 headers, and as the watermark on the Public Turnstile Kiosk.
              </p>

              <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer shadow-sm transition">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>{isUploading ? 'Uploading Logo...' : 'Upload School Seal (PNG, JPG, WebP)'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* School Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official School Name *
              </label>
              <input
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                placeholder="e.g. NexTurn Comprehensive Academy"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                School Address / DepEd Division Location *
              </label>
              <input
                type="text"
                required
                value={formData.schoolAddress}
                onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                placeholder="e.g. DepEd Division of Schools, Educational Complex, Metro Manila, Philippines"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Information (Phone & Official Email) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                  placeholder="+63 (02) 8888-0000 | info@nexturn.edu.ph"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  School Principal / Head of School *
                </label>
                <input
                  type="text"
                  required
                  value={formData.principalName}
                  onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                  placeholder="Dr. Tomas Garcia Ferrer Jr., Principal IV"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetToSaved}
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset to Current Saved Profile</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save & Update School Profile</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
