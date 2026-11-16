'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  Users,
  Clock,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Building,
  UserCheck,
  ShieldCheck,
  Radio,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface StudentDetail {
  id: string;
  lrn: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  sex: 'MALE' | 'FEMALE';
  birthdate: string;
  age: number;
  gradeLevel: string;
  section: string;
  trackStrand?: string | null;
  guardianName: string;
  guardianContact: string;
  address: string;
  rfidNumber: string;
  photoUrl?: string | null;
  status: string;
}

interface AttendanceHistoryItem {
  id: string;
  direction: 'CLOCK_IN' | 'CLOCK_OUT';
  rfidNumber: string;
  scannedAt: string;
  deviceSource: string;
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'details'>('attendance');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/students/${studentId}`);
        if (res.ok) {
          const data = await res.json();
          setStudent(data.student);
          setAttendance(data.attendanceHistory);
        }
      } catch (err) {
        console.error('Failed to load student:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [studentId]);

  if (isLoading) {
    return (
      <AppShell requiredModule="students">
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-semibold">Loading student profile & attendance...</span>
        </div>
      </AppShell>
    );
  }

  if (!student) {
    return (
      <AppShell requiredModule="students">
        <div className="py-12 text-center">
          <h2 className="text-lg font-bold text-slate-900">Student record not found</h2>
          <Link href="/students" className="text-xs text-blue-600 font-semibold mt-2 inline-block">
            ← Return to Student Masterlist
          </Link>
        </div>
      </AppShell>
    );
  }

  const fullName = `${student.lastName}, ${student.firstName}${student.middleName ? ` ${student.middleName[0]}.` : ''}${student.suffix ? ` ${student.suffix}` : ''}`;

  return (
    <AppShell requiredModule="students">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/students" className="hover:text-blue-600 transition">
            Student Masterlist
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">{fullName}</span>
        </div>

        {/* Student Hero Header */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden border-2 border-indigo-200 shadow-md">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                student.firstName[0]
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {fullName}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  {student.status}
                </span>
              </div>

              <div className="text-sm font-semibold text-blue-600 mt-0.5">
                {student.gradeLevel} - {student.section}
                {student.trackStrand && ` (${student.trackStrand})`}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2 font-mono">
                <span>12-Digit LRN: <strong className="text-slate-900">{student.lrn}</strong></span>
                <span>•</span>
                <span>10-Digit RFID: <strong className="text-blue-600 font-bold">{student.rfidNumber}</strong></span>
                <span>•</span>
                <span>Sex/Age: <strong className="text-slate-800">{student.sex} ({student.age} y/o)</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
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
            <span>Personal Attendance Stream ({attendance.length} Scans)</span>
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'details'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>DepEd LIS Demographics & Guardian</span>
          </button>
        </div>

        {/* TAB 1: INDIVIDUAL IMMUTABLE ATTENDANCE HISTORY (Requirement 5.D) */}
        {activeTab === 'attendance' && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Individual Attendance Ledger (Millisecond-Precision)
                </h3>
                <p className="text-xs text-slate-500">
                  Hardware-recorded turnstile scans stored permanently in PostgreSQL immutable table
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                Total Logs: {attendance.length}
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
                        No turnstile scans recorded for this student yet.
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

        {/* TAB 2: DEMOGRAPHICS & GUARDIAN */}
        {activeTab === 'details' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Official DepEd Learner Information System (LIS) Master Data
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  12-Digit DepEd LRN
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                  {student.lrn}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  10-Digit Hardware RFID
                </span>
                <span className="text-sm font-bold text-blue-600 font-mono mt-0.5 block">
                  {student.rfidNumber}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Grade & Section
                </span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {student.gradeLevel} - {student.section}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Track / Strand
                </span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {student.trackStrand || 'Junior High School'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Date of Birth & Age
                </span>
                <span className="text-sm font-medium text-slate-900 mt-0.5 block">
                  {student.birthdate.split('T')[0]} ({student.age} years old)
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Sex
                </span>
                <span className="text-sm font-medium text-slate-900 mt-0.5 block">
                  {student.sex}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Parent / Guardian Name
                </span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {student.guardianName}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Guardian Contact
                </span>
                <span className="text-sm font-medium text-slate-900 mt-0.5 block">
                  {student.guardianContact}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                  Residential Address
                </span>
                <span className="text-sm font-medium text-slate-900 mt-0.5 block">
                  {student.address}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
