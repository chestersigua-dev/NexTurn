'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Activity,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Radio,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalUsers: number;
  todayScansCount: number;
  uniqueStudentsToday: number;
  uniqueTeachersToday: number;
  studentRate: number;
  teacherRate: number;
  past7Days: Array<{
    date: string;
    dayLabel: string;
    students: number;
    teachers: number;
  }>;
  directionBreakdown: {
    clockIn: number;
    clockOut: number;
  };
  recentScans: Array<{
    id: string;
    name: string;
    sub: string;
    photoUrl: string | null;
    personType: 'TEACHER' | 'STUDENT';
    direction: 'CLOCK_IN' | 'CLOCK_OUT';
    millisecondTimestamp: string;
  }>;
}

interface AttendanceRecordItem {
  id: string;
  personType: 'TEACHER' | 'STUDENT';
  personId: string;
  rfidNumber: string;
  direction: 'CLOCK_IN' | 'CLOCK_OUT';
  scannedAt: string;
  millisecondTimestamp: string;
  deviceSource: string;
  name: string;
  identifier: string;
  detail: string;
  photoUrl: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecordItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Filters
  const [personTypeFilter, setPersonTypeFilter] = useState<'ALL' | 'TEACHER' | 'STUDENT'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'CLOCK_IN' | 'CLOCK_OUT'>('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchAttendance = async () => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        personType: personTypeFilter,
        direction: directionFilter,
        search,
      });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.records);
        setTotalRecords(data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [page, personTypeFilter, directionFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAttendance();
  };

  // Calculate highest count for 7-day chart scaling
  const maxChartVal = stats?.past7Days && stats.past7Days.length > 0
    ? Math.max(...stats.past7Days.map((d) => Math.max(d.students, d.teachers, 5)))
    : 10;

  return (
    <AppShell requiredModule="dashboard">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Attendance Dashboard & Analytics
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live RFID turnstile stream, daily metrics, trends, and immutable master ledger
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchStats();
                fetchAttendance();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Metrics</span>
            </button>

            <Link
              href="/turnstile"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm transition"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              <span>Live Kiosk Display</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
            </Link>
          </div>
        </div>

        {/* 5 Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Student Attendance Rate */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Student Attendance Today
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats ? `${stats.studentRate}%` : '--'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {stats ? `${stats.uniqueStudentsToday} of ${stats.totalStudents} present` : 'Loading...'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Teacher Attendance Rate */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Teacher Attendance Today
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats ? `${stats.teacherRate}%` : '--'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {stats ? `${stats.uniqueTeachersToday} of ${stats.totalTeachers} present` : 'Loading...'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          {/* 3. Total Students */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Enrolled Students
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats ? stats.totalStudents : '--'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Active masterlist count</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* 4. Total Faculty */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Faculty & Teachers
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats ? stats.totalTeachers : '--'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Registered teaching staff</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          {/* 5. Live Scans Today */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Turnstile Scans Today
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats ? stats.todayScansCount : '--'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {stats ? `${stats.directionBreakdown?.clockIn ?? 0} in / ${stats.directionBreakdown?.clockOut ?? 0} out` : 'Loading...'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Charts & Live Feed Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-Day Trend Chart */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">7-Day Attendance Trend</h3>
                  <p className="text-xs text-slate-500">
                    Daily unique clock-ins comparing Students and Faculty
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                    <span className="text-slate-600">Students</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                    <span className="text-slate-600">Teachers</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="h-52 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-100">
                {(stats?.past7Days ?? []).map((day, idx) => {
                  const studentHeight = Math.max((day.students / maxChartVal) * 100, 6);
                  const teacherHeight = Math.max((day.teachers / maxChartVal) * 100, 6);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1.5 h-full">
                        {/* Student Bar */}
                        <div
                          className="w-1/2 bg-blue-500 rounded-t transition-all group-hover:bg-blue-600 relative"
                          style={{ height: `${studentHeight}%` }}
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold pointer-events-none transition">
                            {day.students}
                          </span>
                        </div>
                        {/* Teacher Bar */}
                        <div
                          className="w-1/2 bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-600 relative"
                          style={{ height: `${teacherHeight}%` }}
                        >
                          <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold pointer-events-none transition">
                            {day.teachers}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 mt-2 truncate w-full text-center">
                        {day.dayLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>* Data pulled directly from millisecond-precision immutable attendance ledger.</span>
              <span className="font-semibold text-slate-600">Peak Volume: {maxChartVal} individuals</span>
            </div>
          </div>

          {/* Live Recent Scans Feed */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm font-bold text-slate-900">Live Turnstile Stream</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Real-Time</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {(stats?.recentScans ?? []).length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  {isLoadingStats ? 'Loading live scan stream...' : 'No attendance scans recorded yet today.'}
                </div>
              )}

              {(stats?.recentScans ?? []).map((scan) => (
                <div
                  key={scan.id}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                      {scan.photoUrl ? (
                        <img src={scan.photoUrl} alt={scan.name || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        scan.name?.[0] || '?'
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{scan.name || 'Anonymous User'}</div>
                      <div className="text-[10px] text-slate-500 truncate">{scan.sub || 'General Access'}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        scan.direction === 'CLOCK_IN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {scan.direction === 'CLOCK_IN' ? (
                        <>
                          <ArrowRight className="w-2.5 h-2.5" />
                          <span>IN</span>
                        </>
                      ) : (
                        <>
                          <ArrowLeft className="w-2.5 h-2.5" />
                          <span>OUT</span>
                        </>
                      )}
                    </span>
                    <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                      {scan.millisecondTimestamp?.split(' ')?.[1] || scan.millisecondTimestamp || ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Master Attendance History Table (Sortable & Filterable) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Master Attendance History (Immutable Ledger)
              </h2>
              <p className="text-xs text-slate-500">
                Browse every turnstile scan with exact millisecond-precision timestamps
              </p>
            </div>

            {/* Filter Tabs: ALL, TEACHER, STUDENT */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => {
                  setPersonTypeFilter('ALL');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  personTypeFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Scans
              </button>
              <button
                onClick={() => {
                  setPersonTypeFilter('TEACHER');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  personTypeFilter === 'TEACHER'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Teachers Only
              </button>
              <button
                onClick={() => {
                  setPersonTypeFilter('STUDENT');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  personTypeFilter === 'STUDENT'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Students Only
              </button>
            </div>
          </div>

          {/* Search & Date Filter Bar */}
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Search Name, RFID, LRN
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Direction
              </label>
              <select
                value={directionFilter}
                onChange={(e) => {
                  setDirectionFilter(e.target.value as any);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Directions</option>
                <option value="CLOCK_IN">Clock In (Entry)</option>
                <option value="CLOCK_OUT">Clock Out (Exit)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              >
              </input>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </form>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Person</th>
                  <th className="py-2.5 px-4">Role / Type</th>
                  <th className="py-2.5 px-4">Identifier / Department</th>
                  <th className="py-2.5 px-4">10-Digit RFID</th>
                  <th className="py-2.5 px-4">Direction</th>
                  <th className="py-2.5 px-4">Exact Timestamp (ms)</th>
                  <th className="py-2.5 px-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : attendance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No attendance scans match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  attendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {rec.photoUrl ? (
                              <img src={rec.photoUrl} alt={rec.name || 'Person'} className="w-full h-full object-cover" />
                            ) : (
                              rec.name?.[0] || '?'
                            )}
                          </div>
                          <span className="font-semibold text-slate-900">{rec.name || 'Unknown'}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.personType === 'TEACHER'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {rec.personType}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-slate-600">
                        <div className="font-medium text-slate-900">{rec.identifier}</div>
                        <div className="text-[10px] text-slate-400">{rec.detail}</div>
                      </td>

                      <td className="py-2.5 px-4 font-mono text-slate-600">{rec.rfidNumber}</td>

                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.direction === 'CLOCK_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {rec.direction === 'CLOCK_IN' ? (
                            <>
                              <ArrowRight className="w-2.5 h-2.5" />
                              <span>CLOCK IN</span>
                            </>
                          ) : (
                            <>
                              <ArrowLeft className="w-2.5 h-2.5" />
                              <span>CLOCK OUT</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 font-mono text-xs text-slate-700">
                        {rec.millisecondTimestamp}
                      </td>

                      <td className="py-2.5 px-4 text-[10px] text-slate-500 font-mono">
                        {rec.deviceSource}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold">{attendance.length}</span> of{' '}
              <span className="font-semibold">{totalRecords}</span> total scans
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <span className="font-medium text-slate-700">Page {page}</span>
              <button
                disabled={attendance.length < 15}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
