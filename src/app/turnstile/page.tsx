'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  School,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  Sparkles,
  Wifi,
  CreditCard,
  Scan,
} from 'lucide-react';

interface SchoolData {
  schoolName: string;
  schoolAddress: string;
  contactInfo: string;
  principalName: string;
  logoUrl?: string | null;
}

interface TurnstileSettings {
  autoToggleDirection: boolean;
  soundFeedback: boolean;
  displayDurationSeconds: number;
  announcementText?: string | null;
}

interface ScanResult {
  success: boolean;
  attendance?: {
    id: string;
    direction: 'CLOCK_IN' | 'CLOCK_OUT';
    scannedAt: string;
    scannedAtFormatted: string;
  };
  person?: {
    type: 'TEACHER' | 'STUDENT';
    name: string;
    identifier: string;
    roleOrGrade: string;
    departmentOrSection: string;
    photoUrl: string | null;
    status: string;
    rfidNumber: string;
  };
  greeting?: string;
  message?: string;
  error?: string;
}

export default function TurnstileKioskPage() {
  const [school, setSchool] = useState<SchoolData>({
    schoolName: 'Speaker Eugenio Perez National Agricultural School',
    schoolAddress: 'Roxas Blvd, San Carlos City, Pangasinan',
    contactInfo: '(075) 955 5258 | 300388@deped.gov.ph',
    principalName: 'Dr. Tomas Garcia Ferrer Jr., Principal IV',
    logoUrl: '/sepnas.png',
  });

  const [settings, setSettings] = useState<TurnstileSettings>({
    autoToggleDirection: true,
    soundFeedback: true,
    displayDurationSeconds: 4,
    announcementText: 'Please tap your ID card to log attendance.',
  });

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [rfidInput, setRfidInput] = useState('');
  const [forcedDirection, setForcedDirection] = useState<'AUTO' | 'CLOCK_IN' | 'CLOCK_OUT'>('AUTO');
  const [activeScan, setActiveScan] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [quickTestOpen, setQuickTestOpen] = useState(false);
  const [allowTapSimulator, setAllowTapSimulator] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Computed card delay duration in seconds (defaults to 4s if unset)
  const durationSeconds = Math.max(1, Number(settings?.displayDurationSeconds) || 4);

  // 1. Fetch public school branding and settings (with live periodic sync & focus refresh)
  useEffect(() => {
    let isMounted = true;
    async function loadInfo() {
      try {
        const res = await fetch('/api/turnstile/info', { cache: 'no-store' });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.school) {
            setSchool({
              ...data.school,
              logoUrl: data.school.logoUrl || '/sepnas.png',
            });
          }
          if (data.settings) {
            setSettings(data.settings);
            setSoundEnabled(data.settings.soundFeedback);
          }
          if (data.system) {
            const isLive = Boolean(data.system.isLiveDeployment);
            const allowSim = Boolean(data.system.showTapSimulator);
            setAllowTapSimulator(allowSim && !isLive);
          }
        }
      } catch (err) {
        console.error('Failed to load kiosk settings:', err);
      }
    }
    loadInfo();

    // Poll every 5 seconds so live settings changes immediately take effect on active kiosk displays
    const pollInterval = setInterval(loadInfo, 5000);
    window.addEventListener('focus', loadInfo);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', loadInfo);
    };
  }, []);

  // 2. Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Keep hidden RFID input permanently focused at all times
  useEffect(() => {
    const ensureFocus = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
      }
    };

    ensureFocus();

    // High-frequency polling ensures focus is re-acquired within milliseconds if lost
    const interval = setInterval(ensureFocus, 100);

    const handleWindowBlur = () => {
      setTimeout(ensureFocus, 10);
    };

    const handleGlobalKeyDown = () => {
      ensureFocus();
    };

    window.addEventListener('click', ensureFocus);
    window.addEventListener('mousedown', ensureFocus);
    window.addEventListener('touchstart', ensureFocus);
    window.addEventListener('focus', ensureFocus);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('visibilitychange', ensureFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', ensureFocus);
      window.removeEventListener('mousedown', ensureFocus);
      window.removeEventListener('touchstart', ensureFocus);
      window.removeEventListener('focus', ensureFocus);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('visibilitychange', ensureFocus);
    };
  }, []);

  // 4. Strictly auto-dismiss popup modal after configured card delay (displayDurationSeconds)
  useEffect(() => {
    if (!activeScan) return;

    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    const durationMs = durationSeconds * 1000;

    dismissTimerRef.current = setTimeout(() => {
      setActiveScan(null);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.value = '';
          inputRef.current.focus({ preventScroll: true });
        }
      }, 20);
    }, durationMs);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [activeScan, durationSeconds]);

  // 5. Synthesizer audio feedback via Web Audio API
  const playSound = (isSuccess: boolean) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (isSuccess) {
        // High dual-tone positive chime
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1108.73, now + 0.08); // C#6

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
      } else {
        // Rejection / Error buzzer
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.3);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // AudioContext autoplay policy ignored
    }
  };

  // 5. Submit RFID Scan
  const processScan = async (rfid: string) => {
    const cleanRfid = rfid.trim().replace(/\D/g, '');
    if (cleanRfid.length !== 10) {
      return;
    }

    setIsScanning(true);

    try {
      const res = await fetch('/api/turnstile/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfidNumber: cleanRfid,
          forcedDirection,
          deviceSource: 'MAIN_TURNSTILE_KIOSK',
        }),
      });

      const data: ScanResult = await res.json();

      if (res.ok && data.success) {
        setActiveScan(data);
        playSound(true);
      } else {
        setActiveScan({
          success: false,
          error: data.error || 'Unregistered RFID Card. Please contact school administration.',
        });
        playSound(false);
      }
    } catch (err: any) {
      setActiveScan({
        success: false,
        error: 'Network connection failed. Please try scanning again.',
      });
      playSound(false);
    } finally {
      setIsScanning(false);
      setRfidInput('');
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus({ preventScroll: true });
      }
    }
  };

  const handleDismissModal = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    setActiveScan(null);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus({ preventScroll: true });
      }
    }, 20);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (rfidInput.length === 10) {
        processScan(rfidInput);
      }
    }
  };

  // Date Formatting strictly adhering to Section 6.3:
  // November 15, 2026
  // 11:43:45 PM
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const activeLogo = school.logoUrl || '/sepnas.png';

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-sky-50/80 via-white to-slate-100 text-slate-800 flex flex-col justify-between overflow-hidden select-none">

      {/* 1. BACKGROUND WATERMARK: Enlarged and Full Colored at ~28% Opacity */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden"
        style={{ opacity: 0.28 }}
      >
        <img
          src={activeLogo}
          alt={school.schoolName}
          className="w-[78vw] h-[78vw] max-w-[850px] max-h-[850px] object-contain drop-shadow-sm select-none"
        />
      </div>

      {/* 2. TOP HEADER: Large Bold School Name & Borderless Colored Logo */}
      <header className="relative z-10 w-full pt-5 pb-3 px-4 text-center border-b border-slate-200/80 bg-white/85 backdrop-blur-md shadow-sm">
        <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 flex flex-col items-center text-center overflow-hidden">

          {/* Header Colored Logo (Completely Borderless) & Status Beacon */}
          <div className="relative mb-2">
            <img
              src={activeLogo}
              alt={school.schoolName}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md select-none"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
            </span>
          </div>

          <div className="w-full flex flex-col items-center overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-100/90 text-blue-800 border border-blue-200">
                <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                RFID Turnstile Kiosk
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                ● RFID Reader Active
              </span>
            </div>

            {/* School Name (Strictly Single Line) */}
            <h1 className="w-full text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight uppercase whitespace-nowrap truncate max-w-full">
              {school.schoolName}
            </h1>

            {/* School Address (Single Line) */}
            <p className="w-full text-center text-xs sm:text-sm text-slate-500 font-medium whitespace-nowrap truncate max-w-full mt-0.5">
              {school.schoolAddress}
            </p>
          </div>
        </div>
      </header>

      {/* 3. CENTER CONTENT: Single-Line Clock & Animated Radar Scanner */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center">

          {/* Real-Time Live Clock Display (Strictly Single Line, High Contrast) */}
          <div className="mb-5 p-4 sm:p-6 rounded-3xl bg-white/95 border border-slate-200/90 shadow-xl shadow-slate-200/50 backdrop-blur-md w-full max-w-lg">
            <div className="text-sm sm:text-base font-semibold text-slate-600 tracking-wide">
              {formattedDate}
            </div>

            {/* Time Strictly Guaranteed On One Single Line */}
            <div className="w-full flex items-center justify-center overflow-hidden py-1">
              <span className="text-3xl sm:text-4xl md:text-5xl font-black text-blue-600 font-mono tracking-tight whitespace-nowrap tabular-nums drop-shadow-sm">
                {formattedTime}
              </span>
            </div>

            {/* Tap instruction banner */}
            <div className="mt-2.5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-semibold shadow-sm animate-pulse">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span>{settings.announcementText || 'Please tap your ID card to log attendance.'}</span>
            </div>
          </div>

          {/* 4. RFID PULSATING SENSOR TARGET PAD (Replaces radar with clean RFID pulsation) */}
          <div
            onClick={() => inputRef.current?.focus()}
            className="cursor-pointer relative flex flex-col items-center justify-center my-3 group select-none"
            title="Click to ensure USB RFID reader focus"
          >
            {/* Outer Concentric RFID Expanding Pulse Waves */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              {/* Expanding Ripple Waves */}
              <div className="absolute inset-0 rounded-full border-2 border-blue-400/50 bg-blue-400/10 pointer-events-none animate-rfid-ripple-1" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/40 bg-blue-500/10 pointer-events-none animate-rfid-ripple-2" />
              <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30 bg-indigo-400/5 pointer-events-none animate-rfid-ripple-3" />

              {/* Glowing Pulsating RFID Core Icon Node */}
              <div className="relative z-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white shadow-xl shadow-blue-600/40 flex flex-col items-center justify-center animate-rfid-glow transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                {/* Universal Contactless Wave Symbol */}
                <div className="relative flex items-center justify-center mb-0.5">
                  <Wifi className="w-11 h-11 sm:w-12 sm:h-12 rotate-90 text-white drop-shadow-md" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-blue-100 uppercase">
                  RFID
                </span>
              </div>
            </div>

            {/* Helper Caption */}
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready for Contactless Tap • Automatic In / Out Detection</span>
            </div>
          </div>

          {/* 5. HIDDEN AUTO-FOCUSED INPUT (Permanently focused for USB RFID readers) */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            maxLength={10}
            value={rfidInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setRfidInput(val);
              if (val.length === 10) {
                processScan(val);
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setTimeout(() => {
                inputRef.current?.focus({ preventScroll: true });
              }, 10);
            }}
            className="fixed top-0 left-0 opacity-0 w-1 h-1 pointer-events-none focus:outline-none -z-10"
            autoFocus
          />
        </div>
      </main>

      {/* 7. FOOTER BAR: Clean Light Theme */}
      <footer className="relative z-10 w-full py-4 px-6 border-t border-slate-200/80 bg-white/85 backdrop-blur-md flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium transition"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>Audio Chime: On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>Audio Chime: Muted</span>
              </>
            )}
          </button>

          {allowTapSimulator && (
            <button
              onClick={() => setQuickTestOpen(!quickTestOpen)}
              className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
            >
              {quickTestOpen ? 'Hide Quick-Tap Simulator' : 'Show Quick-Tap Simulator'}
            </button>
          )}
        </div>

        <div>
          <a
            href="/login"
            className="text-blue-600 hover:text-blue-800 font-semibold transition"
          >
            Staff & Admin Login →
          </a>
        </div>
      </footer>

      {/* 8. SCAN RESULT POPUP MODAL (Light Mode, High Contrast with Dynamic Auto-Dismiss) */}
      {activeScan && (
        <div
          onClick={handleDismissModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-2 cursor-default ${activeScan.success
              ? activeScan.attendance?.direction === 'CLOCK_IN'
                ? 'bg-white border-emerald-400 shadow-emerald-500/20'
                : 'bg-white border-blue-400 shadow-blue-500/20'
              : 'bg-white border-red-400 shadow-red-500/20'
              }`}
          >
            {activeScan.success && activeScan.person ? (
              <div className="flex flex-col items-center text-center">
                {/* Direction Badge */}
                <div
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-black tracking-wide uppercase mb-4 border ${activeScan.attendance?.direction === 'CLOCK_IN'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-blue-50 text-blue-700 border-blue-300'
                    }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    {activeScan.attendance?.direction === 'CLOCK_IN'
                      ? 'ENTRY RECORDED (CLOCK IN)'
                      : 'EXIT RECORDED (CLOCK OUT)'}
                  </span>
                </div>

                {/* Profile Photo */}
                <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden shadow-lg mb-4 flex items-center justify-center">
                  {activeScan.person.photoUrl ? (
                    <img
                      src={activeScan.person.photoUrl}
                      alt={activeScan.person.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl font-black text-slate-400 uppercase">
                      {activeScan.person.name[0]}
                    </div>
                  )}
                </div>

                {/* Person Name & Role */}
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {activeScan.person.name}
                </h2>

                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${activeScan.person.type === 'TEACHER'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}
                  >
                    {activeScan.person.type}
                  </span>
                  <span className="text-sm font-semibold text-slate-600">
                    ID: {activeScan.person.identifier}
                  </span>
                </div>

                <div className="mt-1 text-sm font-medium text-slate-500">
                  {activeScan.person.roleOrGrade} • {activeScan.person.departmentOrSection}
                </div>

                {/* Greeting & Timestamp with Millisecond Precision */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 w-full text-center">
                  <div className="text-base font-bold text-emerald-600">{activeScan.greeting}</div>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">{activeScan.message}</div>
                  <div className="text-xs font-mono font-semibold text-slate-700 mt-2 bg-white px-3 py-1 rounded-lg border border-slate-200 inline-block">
                    Exact Timestamp: {activeScan.attendance?.scannedAt.replace('T', ' ').replace('Z', '')}
                  </div>
                </div>

                {/* Auto-Dismiss Countdown Bar Driven by Turnstile Card Delay Settings */}
                <div className="w-full mt-5 pt-3 border-t border-slate-100">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      key={`progress-success-${activeScan.attendance?.id || activeScan.attendance?.scannedAt || Date.now()}`}
                      className="h-full rounded-full bg-emerald-500"
                      style={{ animation: `shrinkWidth ${durationSeconds}s linear forwards` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-medium">
                    <span>Auto-dismissing in {durationSeconds}s...</span>
                    <span>Click outside to close</span>
                  </div>
                </div>

                <button
                  onClick={handleDismissModal}
                  className="mt-3 px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Dismiss Now
                </button>
              </div>
            ) : (
              /* Error Modal */
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 border border-red-300 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Scan Failed</h3>
                <p className="text-sm text-red-600 max-w-sm mb-4 font-medium">
                  {activeScan.error}
                </p>

                {/* Auto-Dismiss Countdown Bar Driven by Turnstile Card Delay Settings */}
                <div className="w-full mt-2 pt-3 border-t border-slate-100">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      key={`progress-error-${activeScan.error || Date.now()}`}
                      className="h-full rounded-full bg-red-500"
                      style={{ animation: `shrinkWidth ${durationSeconds}s linear forwards` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-medium">
                    <span>Auto-dismissing in {durationSeconds}s...</span>
                    <span>Click outside to close</span>
                  </div>
                </div>

                <button
                  onClick={handleDismissModal}
                  className="mt-3 px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-md"
                >
                  Dismiss Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. QUICK-TAP DEMO SIMULATOR (Light Mode Floating Tray - Hidden in Live Deployment) */}
      {allowTapSimulator && quickTestOpen && (
        <div className="fixed bottom-14 right-6 z-40 max-w-xs w-full p-4 rounded-2xl bg-white/95 border border-slate-200 shadow-2xl backdrop-blur-md text-xs">
          <div className="flex items-center justify-between font-bold text-slate-900 mb-2.5 pb-2 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Quick-Tap Simulator
            </span>
            <button
              onClick={() => setQuickTestOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-0.5"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-2.5">
            Click any demo card to test instant RFID card tap:
          </p>
          <div className="space-y-1.5">
            <button
              onClick={() => processScan('0008479776')}
              className="w-full text-left p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 transition flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-blue-700">Dr. Tomas Garcia Ferrer Jr., Principal IV</div>
                <div className="text-[10px] text-blue-700 font-semibold">Principal IV • School Head</div>
              </div>
              <span className="font-mono text-[10px] text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-300 font-bold">0008479776</span>
            </button>

            <button
              onClick={() => processScan('1100220033')}
              className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600">Maria Elena Santos</div>
                <div className="text-[10px] text-amber-600 font-semibold">Master Teacher II • Science</div>
              </div>
              <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">1100220033</span>
            </button>

            <button
              onClick={() => processScan('2200330044')}
              className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600">Juan Carlos Dela Cruz Jr.</div>
                <div className="text-[10px] text-amber-600 font-semibold">Teacher III • Math</div>
              </div>
              <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">2200330044</span>
            </button>

            <button
              onClick={() => processScan('0008535346')}
              className="w-full text-left p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-400 transition flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-emerald-700">August Philippe De Jesus Sigua</div>
                <div className="text-[10px] text-emerald-700 font-semibold">Grade 11 • STEM-A (14 y/o)</div>
              </div>
              <span className="font-mono text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-bold">0008535346</span>
            </button>

            <button
              onClick={() => processScan('5500660077')}
              className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600">Joshua David Bautista</div>
                <div className="text-[10px] text-blue-600 font-semibold">Grade 11 • STEM-A</div>
              </div>
              <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">5500660077</span>
            </button>

            <button
              onClick={() => processScan('6600770088')}
              className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600">Samantha Rose Villanueva</div>
                <div className="text-[10px] text-blue-600 font-semibold">Grade 11 • STEM-A</div>
              </div>
              <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">6600770088</span>
            </button>

            <button
              onClick={() => processScan('9999999999')}
              className="w-full text-left p-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 transition flex items-center justify-between"
            >
              <div className="text-red-700 font-bold">Unregistered Card</div>
              <span className="font-mono text-[10px] text-red-600 bg-white px-1.5 py-0.5 rounded border border-red-200">9999999999</span>
            </button>
          </div>
        </div>
      )
      }
    </div >
  );
}
