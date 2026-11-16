'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  GraduationCap,
  Calendar,
  FileSpreadsheet,
  Download,
  Clock,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  Radio,
  Building,
  CheckCircle2,
  FileText,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface TeacherDetail {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  position: string;
  department: string;
  email?: string | null;
  contactNumber: string;
  dateHired: string;
  rfidNumber: string;
  photoUrl?: string | null;
  employmentStatus: string;
}

interface AttendanceHistoryItem {
  id: string;
  direction: 'CLOCK_IN' | 'CLOCK_OUT';
  rfidNumber: string;
  scannedAt: string;
  deviceSource: string;
}

export default function TeacherDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const teacherId = params.id as string;

  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'timecard'>(
    searchParams.get('tab') === 'timecard' ? 'timecard' : 'attendance'
  );

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Timecard Generator State
  const now = new Date();
  const [timecardYear, setTimecardYear] = useState<number>(now.getFullYear());
  const [timecardMonth, setTimecardMonth] = useState<number>(now.getMonth() + 1);
  const [timecardSummary, setTimecardSummary] = useState<any>(null);
  const [isLoadingTimecard, setIsLoadingTimecard] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/teachers/${teacherId}`);
        if (res.ok) {
          const data = await res.json();
          setTeacher(data.teacher);
          setAttendance(data.attendanceHistory);
        }
      } catch (err) {
        console.error('Failed to load teacher:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [teacherId]);

  const loadTimecard = async () => {
    setIsLoadingTimecard(true);
    try {
      const res = await fetch(
        `/api/teachers/${teacherId}/timecard?year=${timecardYear}&month=${timecardMonth}&format=json`
      );
      if (res.ok) {
        const data = await res.json();
        setTimecardSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load timecard preview:', err);
    } finally {
      setIsLoadingTimecard(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'timecard') {
      loadTimecard();
    }
  }, [activeTab, timecardYear, timecardMonth]);

  if (isLoading) {
    return (
      <AppShell requiredModule="teachers">
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-semibold">Loading teacher profile & attendance...</span>
        </div>
      </AppShell>
    );
  }

  if (!teacher) {
    return (
      <AppShell requiredModule="teachers">
        <div className="py-12 text-center">
          <h2 className="text-lg font-bold text-slate-900">Teacher not found</h2>
          <Link href="/teachers" className="text-xs text-blue-600 font-semibold mt-2 inline-block">
            ← Return to Faculty Masterlist
          </Link>
        </div>
      </AppShell>
    );
  }

  const fullName = `${teacher.lastName}, ${teacher.firstName}${teacher.middleName ? ` ${teacher.middleName[0]}.` : ''}${teacher.suffix ? ` ${teacher.suffix}` : ''}`;

  return (
    <AppShell requiredModule="teachers">
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/teachers" className="hover:text-blue-600 transition">
            Faculty Masterlist
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">{fullName}</span>
        </div>

        {/* Teacher Hero Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden border-2 border-blue-200 shadow-md">
              {teacher.photoUrl ? (
                <img src={teacher.photoUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                teacher.firstName[0]
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {fullName}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  {teacher.employmentStatus}
                </span>
              </div>

              <div className="text-sm font-semibold text-blue-600 mt-0.5">
                {teacher.position} • {teacher.department}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2 font-mono">
                <span>Employee No: <strong className="text-slate-800">{teacher.employeeNumber}</strong></span>
                <span>•</span>
                <span>10-Digit RFID: <strong className="text-blue-700 font-bold">{teacher.rfidNumber}</strong></span>
                <span>•</span>
                <span>Hired: <strong className="text-slate-800">{teacher.dateHired.split('T')[0]}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Button to DepEd Form 48 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('timecard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Generate DepEd Form 48</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Personal Immutable Attendance ({attendance.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('timecard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'timecard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>DepEd Civil Service Form No. 48</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Employment Credentials</span>
          </button>
        </div>

        {/* TAB 1: DEDICATED IMMUTABLE ATTENDANCE HISTORY (Requirement 5.D) */}
        {activeTab === 'attendance' && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Individual Attendance Stream (Millisecond-Precision)
                </h3>
                <p className="text-xs text-slate-500">
                  Exact hardware timestamps recorded directly by PostgreSQL trigger-protected ledger
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                Total Scans: {attendance.length}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Direction</th>
                    <th className="py-2.5 px-4">10-Digit RFID</th>
                    <th className="py-2.5 px-4">Exact Timestamp (ms precision)</th>
                    <th className="py-2.5 px-4">Device Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400">
                        No turnstile scans recorded for this teacher yet.
                      </td>
                    </tr>
                  ) : (
                    attendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              rec.direction === 'CLOCK_IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {rec.direction === 'CLOCK_IN' ? (
                              <>
                                <ArrowRight className="w-3 h-3" />
                                <span>CLOCK IN</span>
                              </>
                            ) : (
                              <>
                                <ArrowLeft className="w-3 h-3" />
                                <span>CLOCK OUT</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                          {rec.rfidNumber}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                          {rec.scannedAt.replace('T', ' ').replace('Z', '')}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                          {rec.deviceSource}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DEPED FORM 48 TIMECARD GENERATOR (Requirement 5.B) */}
        {activeTab === 'timecard' && (
          <div className="space-y-6">
            {/* Filter / Export Controls */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Select Month
                  </label>
                  <select
                    value={timecardMonth}
                    onChange={(e) => setTimecardMonth(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December',
                    ].map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Select Year
                  </label>
                  <select
                    value={timecardYear}
                    onChange={(e) => setTimecardYear(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={loadTimecard}
                  disabled={isLoadingTimecard}
                  className="mt-5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
                >
                  {isLoadingTimecard ? 'Compiling...' : 'Recalculate DTR'}
                </button>
              </div>

              {/* One-Click Clean Exports (PDF & CSV) */}
              <div className="flex items-center gap-2">
                <a
                  href={`/api/teachers/${teacherId}/timecard?year=${timecardYear}&month=${timecardMonth}&format=pdf`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download DepEd Form 48 (PDF)</span>
                </a>

                <a
                  href={`/api/teachers/${teacherId}/timecard?year=${timecardYear}&month=${timecardMonth}&format=csv`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </a>
              </div>
            </div>

            {/* Official Civil Service Form No. 48 Formatted Layout Preview */}
            <div className="p-8 rounded-3xl bg-white border border-slate-300 shadow-md max-w-3xl mx-auto text-slate-900 font-sans">
              {/* Header block */}
              <div className="text-center pb-4 border-b border-slate-200">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">
                  Civil Service Form No. 48
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight mt-0.5">
                  DAILY TIME RECORD
                </h2>
                <div className="text-xs text-slate-400">----- o 0 o -----</div>

                <div className="mt-4 inline-block pb-1 border-b-2 border-slate-800 text-base font-extrabold uppercase px-6">
                  {timecardSummary?.teacherName || fullName}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">(Name)</div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 px-4">
                  <span>
                    For the month of:{' '}
                    <strong className="text-slate-900">
                      {timecardSummary?.monthName} {timecardSummary?.year}
                    </strong>
                  </span>
                  <span>Official hours: 8:00 AM - 5:00 PM</span>
                </div>
              </div>

              {/* DTR Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-center text-xs border border-slate-400 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-400">
                      <th rowSpan={2} className="border-r border-slate-400 py-1 px-2 w-12">
                        Day
                      </th>
                      <th colSpan={2} className="border-r border-slate-400 py-1 px-2">
                        A.M.
                      </th>
                      <th colSpan={2} className="border-r border-slate-400 py-1 px-2">
                        P.M.
                      </th>
                      <th colSpan={2} className="py-1 px-2">
                        Under Time
                      </th>
                    </tr>
                    <tr className="bg-slate-50 font-semibold border-b border-slate-400 text-[11px]">
                      <th className="border-r border-slate-400 py-1 w-20">Arrival</th>
                      <th className="border-r border-slate-400 py-1 w-20">Departure</th>
                      <th className="border-r border-slate-400 py-1 w-20">Arrival</th>
                      <th className="border-r border-slate-400 py-1 w-20">Departure</th>
                      <th className="border-r border-slate-400 py-1 w-16">Hours</th>
                      <th className="py-1 w-16">Minutes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px] font-mono">
                    {timecardSummary?.records.map((r: any) => (
                      <tr key={r.day} className="hover:bg-slate-50">
                        <td className="border-r border-slate-400 py-1 font-bold text-slate-700">
                          {r.day}
                        </td>
                        <td className="border-r border-slate-400 py-1">{r.amArrival || ''}</td>
                        <td className="border-r border-slate-400 py-1">{r.amDeparture || ''}</td>
                        <td className="border-r border-slate-400 py-1">{r.pmArrival || ''}</td>
                        <td className="border-r border-slate-400 py-1">{r.pmDeparture || ''}</td>
                        <td className="border-r border-slate-400 py-1 text-slate-500">
                          {r.undertimeHours > 0 ? r.undertimeHours : ''}
                        </td>
                        <td className="py-1 text-slate-500">
                          {r.undertimeMinutes > 0 ? r.undertimeMinutes : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Undertime */}
              <div className="mt-3 text-right text-xs font-bold text-slate-700">
                Total Undertime:{' '}
                <span className="text-blue-700">
                  {Math.floor((timecardSummary?.totalUndertimeMinutes || 0) / 60)} hours{' '}
                  {(timecardSummary?.totalUndertimeMinutes || 0) % 60} minutes
                </span>
              </div>

              {/* Certification & Signatures */}
              <div className="mt-6 pt-4 border-t border-slate-200 text-xs space-y-6">
                <p className="italic text-slate-600 text-center leading-relaxed max-w-lg mx-auto">
                  "I certify on my honor that the above is a true and correct report of the hours of work
                  performed, record of which was made daily at the time of arrival and departure from office."
                </p>

                <div className="flex items-end justify-between pt-8 px-6">
                  <div className="text-center w-52">
                    <div className="border-b border-slate-800 pb-1 font-bold">
                      {timecardSummary?.teacherName || fullName}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Teacher's Signature</div>
                  </div>

                  <div className="text-center w-64">
                    <div className="text-[10px] text-slate-500 mb-6">Verified as to prescribed office hours:</div>
                    <div className="border-b border-slate-800 pb-1 font-bold">
                      {timecardSummary?.principalName || 'Dr. Alejandro V. Ramos, CESO IV'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">School Principal / In-Charge</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EMPLOYMENT CREDENTIALS */}
        {activeTab === 'profile' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Official DepEd Faculty Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Employee Number
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                  {teacher.employeeNumber}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  10-Digit Hardware RFID
                </span>
                <span className="text-sm font-bold text-blue-600 font-mono mt-0.5 block">
                  {teacher.rfidNumber}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Position / Plantilla Item
                </span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {teacher.position}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Department
                </span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {teacher.department}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Date Hired
                </span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {teacher.dateHired.split('T')[0]}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Employment Status
                </span>
                <span className="text-sm font-bold text-emerald-700 mt-0.5 block">
                  {teacher.employmentStatus}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Official Email
                </span>
                <span className="text-sm font-medium text-slate-900 mt-0.5 block">
                  {teacher.email || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Contact Number
                </span>
                <span className="text-sm font-medium text-slate-900 mt-0.5 block">
                  {teacher.contactNumber}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
