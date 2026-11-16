'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId =
  | 'fb-classic'
  | 'fb-messenger'
  | 'fb-modern'
  | 'fb-dark'
  | 'fb-midnight'
  | 'fb-obsidian';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  category: 'light' | 'dark';
  description: string;
  accent: string;
  secondaryAccent: string;
  bgPreview: string;
  cardPreview: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'fb-classic',
    name: 'Facebook Classic',
    category: 'light',
    description: 'Clean light gray canvas with iconic royal Facebook Blue',
    accent: '#1877F2',
    secondaryAccent: '#0866FF',
    bgPreview: '#F0F2F5',
    cardPreview: '#FFFFFF',
  },
  {
    id: 'fb-messenger',
    name: 'Messenger Cyan',
    category: 'light',
    description: 'Vibrant electric cyan and energetic blue gradient',
    accent: '#0084FF',
    secondaryAccent: '#00B2FF',
    bgPreview: '#F5F7FA',
    cardPreview: '#FFFFFF',
  },
  {
    id: 'fb-modern',
    name: 'Meta Modern',
    category: 'light',
    description: 'Crisp ice-tinted surface with deep Meta indigo accents',
    accent: '#0866FF',
    secondaryAccent: '#4267B2',
    bgPreview: '#FAFBFD',
    cardPreview: '#FFFFFF',
  },
  {
    id: 'fb-dark',
    name: 'Facebook Dark Slate',
    category: 'dark',
    description: 'Official Facebook web dark mode with elevated graphite cards',
    accent: '#2D88FF',
    secondaryAccent: '#1877F2',
    bgPreview: '#18191A',
    cardPreview: '#242526',
  },
  {
    id: 'fb-midnight',
    name: 'Midnight Navy',
    category: 'dark',
    description: 'Deep navy night canvas with luminous electric accents',
    accent: '#3897F0',
    secondaryAccent: '#00B2FF',
    bgPreview: '#0B1426',
    cardPreview: '#111E38',
  },
  {
    id: 'fb-obsidian',
    name: 'Meta AMOLED Black',
    category: 'dark',
    description: 'True pitch black with high-contrast neon highlights',
    accent: '#00B2FF',
    secondaryAccent: '#2D88FF',
    bgPreview: '#000000',
    cardPreview: '#121214',
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  isDark: boolean;
  activeOption: ThemeOption;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('fb-classic');

  useEffect(() => {
    // Load persisted theme from localStorage
    const saved = localStorage.getItem('nexturn_theme') as ThemeId;
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      applyTheme('fb-classic');
    }
  }, []);

  const applyTheme = (t: ThemeId) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', t);

    const option = THEME_OPTIONS.find((item) => item.id === t) || THEME_OPTIONS[0];
    if (option.category === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  };

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem('nexturn_theme', newTheme);
    applyTheme(newTheme);
  };

  const activeOption = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];
  const isDark = activeOption.category === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, activeOption }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
