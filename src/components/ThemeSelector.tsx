'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEME_OPTIONS, ThemeId } from '@/context/ThemeContext';
import { Palette, Check, Sun, Moon } from 'lucide-react';

interface ThemeSelectorProps {
  compact?: boolean;
}

export default function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { theme, setTheme, isDark, activeOption } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const lightThemes = THEME_OPTIONS.filter((t) => t.category === 'light');
  const darkThemes = THEME_OPTIONS.filter((t) => t.category === 'dark');

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition border"
        style={{
          backgroundColor: isDark ? '#242526' : '#ffffff',
          borderColor: isDark ? '#3a3b3c' : '#e4e6eb',
          color: isDark ? '#e4e6eb' : '#334155',
        }}
        title="Switch color theme (6 Facebook-style themes: 3 light, 3 dark)"
      >
        <div
          className="w-3.5 h-3.5 rounded-full border shadow-inner flex items-center justify-center shrink-0"
          style={{
            backgroundColor: activeOption.accent,
            borderColor: isDark ? '#4e4f50' : '#cbd5e1',
          }}
        />
        {!compact && (
          <span
            className="hidden sm:inline text-xs font-medium"
            style={{ color: isDark ? '#e4e6eb' : '#1e293b' }}
          >
            {activeOption.name}
          </span>
        )}
        <Palette className="w-3.5 h-3.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: isDark ? '#242526' : '#ffffff',
            borderColor: isDark ? '#3a3b3c' : '#e4e6eb',
            borderWidth: 1,
            borderStyle: 'solid',
            color: isDark ? '#e4e6eb' : '#050505',
          }}
        >
          <div
            className="flex items-center justify-between pb-2 border-b"
            style={{ borderColor: isDark ? '#3a3b3c' : '#f1f5f9' }}
          >
            <div
              className="flex items-center gap-1.5 text-xs font-black"
              style={{ color: isDark ? '#ffffff' : '#0f172a' }}
            >
              <Palette className="w-3.5 h-3.5" style={{ color: activeOption.accent }} />
              <span>Facebook System Themes</span>
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: isDark ? '#8a8d91' : '#94a3b8' }}
            >
              6 Themes
            </span>
          </div>

          {/* Light Themes (3) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 px-2 py-0.5">
              <Sun className="w-3 h-3" />
              <span>Light Themes (3)</span>
            </div>
            {lightThemes.map((item) => {
              const isSelected = theme === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTheme(item.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-left transition border"
                  style={{
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(45, 136, 255, 0.18)'
                        : '#eff6ff'
                      : 'transparent',
                    borderColor: isSelected ? item.accent : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-5 h-5 rounded-lg border shadow-sm flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: item.accent,
                        borderColor: isDark ? '#4e4f50' : '#cbd5e1',
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.bgPreview }}
                      />
                    </div>
                    <div>
                      <div
                        className="text-xs font-bold leading-tight"
                        style={{
                          color: isSelected
                            ? isDark
                              ? '#ffffff'
                              : item.accent
                            : isDark
                            ? '#e4e6eb'
                            : '#1e293b',
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        className="text-[10px] truncate max-w-[170px]"
                        style={{ color: isDark ? '#8a8d91' : '#64748b' }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: item.accent }} />}
                </button>
              );
            })}
          </div>

          {/* Dark Themes (3) */}
          <div
            className="space-y-1 pt-1 border-t"
            style={{ borderColor: isDark ? '#3a3b3c' : '#f1f5f9' }}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5">
              <Moon className="w-3 h-3" />
              <span>Dark Themes (3)</span>
            </div>
            {darkThemes.map((item) => {
              const isSelected = theme === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTheme(item.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-left transition border"
                  style={{
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(45, 136, 255, 0.18)'
                        : '#eff6ff'
                      : 'transparent',
                    borderColor: isSelected ? item.accent : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-5 h-5 rounded-lg border shadow-sm flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: item.accent,
                        borderColor: isDark ? '#4e4f50' : '#cbd5e1',
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.bgPreview }}
                      />
                    </div>
                    <div>
                      <div
                        className="text-xs font-bold leading-tight"
                        style={{
                          color: isSelected
                            ? isDark
                              ? '#ffffff'
                              : item.accent
                            : isDark
                            ? '#e4e6eb'
                            : '#1e293b',
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        className="text-[10px] truncate max-w-[170px]"
                        style={{ color: isDark ? '#8a8d91' : '#64748b' }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: item.accent }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
