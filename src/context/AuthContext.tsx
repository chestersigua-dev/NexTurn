'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'PRINCIPAL' | 'ADMIN_AIDE' | 'HEAD_TEACHER' | 'TEACHER';
  photoUrl?: string | null;
  rfidNumber?: string | null;
  assignedSubject?: string | null;
  advisoryGrade?: string | null;
  advisorySection?: string | null;
  teacherId?: string | null;
}

export interface SchoolInfo {
  schoolName: string;
  schoolAddress: string;
  contactInfo: string;
  principalName: string;
  logoUrl?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  permissions: Record<string, boolean>;
  school: SchoolInfo;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  isModuleAllowed: (moduleKey: string) => boolean;
}

const defaultSchool: SchoolInfo = {
  schoolName: 'Speaker Eugenio Perez National Agricultural School',
  schoolAddress: 'Roxas Blvd, San Carlos City, Pangasinan',
  contactInfo: '(075) 955 5258 | 300388@deped.gov.ph',
  principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
  logoUrl: '/sepnas.png',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [school, setSchool] = useState<SchoolInfo>(defaultSchool);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setPermissions(data.permissions || {});
          if (data.school) {
            setSchool(data.school);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Login failed. Please check your credentials.' };
      }
      if (data.user) {
        setUser(data.user);
        if (data.permissions) setPermissions(data.permissions);
        if (data.school) setSchool(data.school);
        setIsLoading(false);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: 'A connection error occurred. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignored
    }
    setUser(null);
    router.push('/login');
  };

  const isModuleAllowed = (moduleKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPERADMIN') return true;
    if (permissions[moduleKey] !== undefined) {
      return permissions[moduleKey];
    }
    // Dashboard is the primary workspace and is always accessible to authenticated staff
    if (moduleKey === 'dashboard') return true;
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        school,
        isLoading,
        refreshAuth,
        login,
        logout,
        isModuleAllowed,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
