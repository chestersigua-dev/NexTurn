'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import {
  UserCheck,
  Save,
  Upload,
  Lock,
  Mail,
  User,
  Radio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
} from 'lucide-react';

export default function UserProfilePage() {
  const { user, refreshAuth } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    rfidNumber: '',
    photoUrl: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setFormData((prev) => ({
              ...prev,
              name: data.user.name,
              email: data.user.email,
              rfidNumber: data.user.rfidNumber || '',
              photoUrl: data.user.photoUrl || '',
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setMessage(null);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('category', 'user-profile');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Photo upload failed');
      }

      setFormData((prev) => ({ ...prev, photoUrl: data.url }));
      setMessage({
        type: 'success',
        text: 'Profile photo uploaded successfully! Click Save Changes to update your account.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
        return;
      }
      if (!formData.currentPassword) {
        setMessage({ type: 'error', text: 'Current password is required to change password.' });
        return;
      }
    }

    setIsSaving(true);

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        rfidNumber: formData.rfidNumber || null,
        photoUrl: formData.photoUrl || null,
      };

      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      await refreshAuth();
      setMessage({
        type: 'success',
        text: 'Your user profile, credentials, and RFID card have been updated successfully!',
      });

      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Universal User Profile & Credentials
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal staff account, security password, profile picture, and 10-digit hardware RFID
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

        <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          {/* Profile Photo Upload */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-2xl overflow-hidden border-2 border-slate-300 shrink-0 shadow-inner">
              {formData.photoUrl ? (
                <img src={formData.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                formData.name[0] || 'U'
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-sm font-bold text-slate-900">User Profile Photo</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">
                Displayed in the Topbar, navigation sidebar, and on turnstile scan logs.
              </p>

              <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer shadow-sm transition">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>{isUploadingPhoto ? 'Uploading Photo...' : 'Upload Profile Photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Account Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 10-Digit RFID Registration (Requirement 3.3) */}
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-blue-600" />
              <label className="text-xs font-bold text-blue-900">
                Personal 10-Digit Hardware RFID Tag
              </label>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Record or update your own 10-digit RFID card number to log attendance at any turnstile kiosk.
            </p>
            <input
              type="text"
              maxLength={10}
              value={formData.rfidNumber}
              onChange={(e) =>
                setFormData({ ...formData, rfidNumber: e.target.value.replace(/\D/g, '') })
              }
              placeholder="e.g. 1000000001"
              className="w-full sm:w-72 px-4 py-2 rounded-xl bg-white border border-blue-300 text-sm font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Password Change Section */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Change Account Password (Optional)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Min 8 chars"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save & Update Profile</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
