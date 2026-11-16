'use client';

import React from 'react';

interface NexturnLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
  variant?: 'blue' | 'white' | 'currentColor';
}

export default function NexturnLogo({
  className = '',
  size = 36,
  showText = false,
  textColor = 'text-slate-900',
}: NexturnLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.svg"
        alt="NexTurn Logo"
        width={size}
        height={size}
        className="shrink-0 transition-transform duration-300 hover:scale-105 object-contain"
        style={{ width: size, height: size }}
      />
      {showText && (
        <span className={`font-black tracking-tight text-lg ${textColor}`}>
          Nex<span className="text-blue-600">Turn</span>
        </span>
      )}
    </div>
  );
}
