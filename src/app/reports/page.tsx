'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  BarChart3,
  Clock,
  Users,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  FileDown,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType =
  | 'USAGE_STATISTICS'
  | 'TEACHER_DTR_SUMMARY'
  | 'STUDENT_ATTENDANCE_SUMMARY'
  | 'BLOCKCHAIN_AUDIT_SUMMARY';

type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export default function ReportsPage() {
  const { user, school } = useAuth();

  const [reportType, setReportType] = useState<ReportType>('USAGE_STATISTICS');
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Fetch report data whenever filters change
  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        preset,
      });
      if (preset === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportType, preset]);

  // Handle CSV Export
  const handleExportCSV = () => {
    if (!data) return;
    setIsExporting('csv');

    try {
      let csvContent = '';
      const schoolTitle = school?.schoolName || 'NexTurn Comprehensive Academy';
      const rangeText = `${data.dateRange?.start.split('T')[0]} to ${data.dateRange?.end.split('T')[0]}`;

      // Header block
      csvContent += `"${schoolTitle}"\n`;
      csvContent += `"SUPERADMIN SYSTEM REPORT: ${reportType.replace(/_/g, ' ')}"\n`;
      csvContent += `"Date Range: ${rangeText}"\n`;
      csvContent += `"Generated At: ${new Date().toLocaleString()} by ${user?.name || 'Superadmin'}"\n\n`;

      if (reportType === 'USAGE_STATISTICS') {
        csvContent += `"METRIC","VALUE"\n`;
        csvContent += `"Total Kiosk Scans","${data.metrics?.totalScans || 0}"\n`;
        csvContent += `"Clock-In Scans","${data.metrics?.clockInCount || 0}"\n`;
        csvContent += `"Clock-Out Scans","${data.metrics?.clockOutCount || 0}"\n`;
        csvContent += `"Student Scans","${data.metrics?.studentScans || 0}"\n`;
        csvContent += `"Teacher Scans","${data.metrics?.teacherScans || 0}"\n`;
        csvContent += `"Unique Attendees","${data.metrics?.uniqueAttendees || 0}"\n`;
        csvContent += `"Peak Traffic Hour","${data.metrics?.peakHourFormatted || 'N/A'}"\n\n`;

        csvContent += `"DATE","TOTAL SCANS","STUDENTS","TEACHERS","CLOCK IN","CLOCK OUT"\n`;
        data.dailyBreakdown?.forEach((d: any) => {
          csvContent += `"${d.date}","${d.total}","${d.students}","${d.teachers}","${d.in}","${d.out}"\n`;
        });
      } else if (reportType === 'TEACHER_DTR_SUMMARY') {
        csvContent += `"EMPLOYEE ID","NAME","DEPARTMENT","POSITION","DAYS PRESENT","CLOCK INS","CLOCK OUTS","TOTAL SCANS"\n`;
        data.rows?.forEach((r: any) => {
          csvContent += `"${r.employeeNumber}","${r.name}","${r.department}","${r.position}","${r.daysPresent}","${r.clockIns}","${r.clockOuts}","${r.totalScans}"\n`;
        });
      } else if (reportType === 'STUDENT_ATTENDANCE_SUMMARY') {
        csvContent += `"SECTION","GRADE LEVEL","TRACK/STRAND","ENROLLED","ATTENDEES","TOTAL SCANS","TURNOUT %"\n`;
        data.rows?.forEach((r: any) => {
          csvContent += `"${r.section}","${r.gradeLevel}","${r.trackStrand}","${r.enrolled}","${r.activeAttendees}","${r.totalScans}","${r.turnoutRate}%"\n`;
        });
      } else if (reportType === 'BLOCKCHAIN_AUDIT_SUMMARY') {
        csvContent += `"ACTION","COUNT"\n`;
        Object.entries(data.actionCounts || {}).forEach(([act, count]) => {
          csvContent += `"${act}","${count}"\n`;
        });
        csvContent += `\n"BLOCK ID","TIMESTAMP","ACTOR ROLE","ACTION","ENTITY","HASH SNIPPET"\n`;
        data.sampleBlocks?.forEach((b: any) => {
          csvContent += `"${b.id}","${b.timestamp}","${b.actorRole}","${b.action}","${b.entityType}","${b.hashSnippet}"\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexturn-report-${reportType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(null);
    }
  };

  // Handle XLS (Excel) Export
  const handleExportXLS = () => {
    if (!data) return;
    setIsExporting('xls');

    try {
      const schoolTitle = school?.schoolName || 'NexTurn Comprehensive Academy';
      const rangeText = `${data.dateRange?.start.split('T')[0]} to ${data.dateRange?.end.split('T')[0]}`;

      let tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8" /></head>
        <body>
          <h2>${schoolTitle}</h2>
          <h3>SUPERADMIN SYSTEM REPORT: ${reportType.replace(/_/g, ' ')}</h3>
          <p>Date Range: ${rangeText} | Generated on: ${new Date().toLocaleString()}</p>
          <table border="1" style="border-collapse: collapse;">
      `;

      if (reportType === 'USAGE_STATISTICS') {
        tableHtml += `
          <tr style="background:#1877F2;color:#fff;font-weight:bold;">
            <th>Date</th><th>Total Scans</th><th>Students</th><th>Teachers</th><th>Clock In</th><th>Clock Out</th>
          </tr>
        `;
        data.dailyBreakdown?.forEach((d: any) => {
          tableHtml += `<tr><td>${d.date}</td><td>${d.total}</td><td>${d.students}</td><td>${d.teachers}</td><td>${d.in}</td><td>${d.out}</td></tr>`;
        });
      } else if (reportType === 'TEACHER_DTR_SUMMARY') {
        tableHtml += `
          <tr style="background:#1877F2;color:#fff;font-weight:bold;">
            <th>Emp No.</th><th>Full Name</th><th>Department</th><th>Position</th><th>Days Present</th><th>Total Scans</th>
          </tr>
        `;
        data.rows?.forEach((r: any) => {
          tableHtml += `<tr><td>${r.employeeNumber}</td><td>${r.name}</td><td>${r.department}</td><td>${r.position}</td><td>${r.daysPresent}</td><td>${r.totalScans}</td></tr>`;
        });
      } else if (reportType === 'STUDENT_ATTENDANCE_SUMMARY') {
        tableHtml += `
          <tr style="background:#1877F2;color:#fff;font-weight:bold;">
            <th>Grade Level</th><th>Section</th><th>Track/Strand</th><th>Enrolled</th><th>Present Attendees</th><th>Turnout Rate</th>
          </tr>
        `;
        data.rows?.forEach((r: any) => {
          tableHtml += `<tr><td>${r.gradeLevel}</td><td>${r.section}</td><td>${r.trackStrand}</td><td>${r.enrolled}</td><td>${r.activeAttendees}</td><td>${r.turnoutRate}%</td></tr>`;
        });
      } else if (reportType === 'BLOCKCHAIN_AUDIT_SUMMARY') {
        tableHtml += `
          <tr style="background:#1877F2;color:#fff;font-weight:bold;">
            <th>Timestamp</th><th>Actor Role</th><th>Action</th><th>Entity</th><th>Hash Snippet</th>
          </tr>
        `;
        data.sampleBlocks?.forEach((b: any) => {
          tableHtml += `<tr><td>${b.timestamp}</td><td>${b.actorRole}</td><td>${b.action}</td><td>${b.entityType}</td><td>${b.hashSnippet}</td></tr>`;
        });
      }

      tableHtml += `</table></body></html>`;

      const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexturn-report-${reportType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(null);
    }
  };

  // Handle PDF Export
  const handleExportPDF = () => {
    if (!data) return;
    setIsExporting('pdf');

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const schoolTitle = school?.schoolName || 'NexTurn Comprehensive Academy';
      const rangeText = `${data.dateRange?.start.split('T')[0]} to ${data.dateRange?.end.split('T')[0]}`;

      // Header Branding
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 119, 242);
      doc.text(schoolTitle, 14, 15);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(school?.schoolAddress || 'DepEd Division of Schools, Educational Complex', 14, 20);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`SUPERADMIN REPORT: ${reportType.replace(/_/g, ' ')}`, 14, 28);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date Range: ${rangeText}  |  Generated: ${new Date().toLocaleString()} by Super Administrator`, 14, 33);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 36, 196, 36);

      let tableBody: any[] = [];
      let tableHead: string[][] = [];

      if (reportType === 'USAGE_STATISTICS') {
        tableHead = [['Date', 'Total Scans', 'Students', 'Teachers', 'Clock In', 'Clock Out']];
        tableBody = (data.dailyBreakdown || []).map((d: any) => [
          d.date,
          d.total.toString(),
          d.students.toString(),
          d.teachers.toString(),
          d.in.toString(),
          d.out.toString(),
        ]);
      } else if (reportType === 'TEACHER_DTR_SUMMARY') {
        tableHead = [['Emp No.', 'Full Name', 'Department', 'Position', 'Days Present', 'Total Scans']];
        tableBody = (data.rows || []).map((r: any) => [
          r.employeeNumber,
          r.name,
          r.department,
          r.position,
          r.daysPresent.toString(),
          r.totalScans.toString(),
        ]);
      } else if (reportType === 'STUDENT_ATTENDANCE_SUMMARY') {
        tableHead = [['Grade Level', 'Section', 'Track / Strand', 'Enrolled', 'Present Attendees', 'Turnout']];
        tableBody = (data.rows || []).map((r: any) => [
          r.gradeLevel,
          r.section,
          r.trackStrand,
          r.enrolled.toString(),
          r.activeAttendees.toString(),
          `${r.turnoutRate}%`,
        ]);
      } else if (reportType === 'BLOCKCHAIN_AUDIT_SUMMARY') {
        tableHead = [['Timestamp', 'Actor', 'Action', 'Entity', 'Cryptographic Hash Snippet']];
        tableBody = (data.sampleBlocks || []).map((b: any) => [
          b.timestamp.split('T')[0] + ' ' + b.timestamp.split('T')[1].substring(0, 8),
          b.actorRole,
          b.action,
          b.entityType,
          b.hashSnippet,
        ]);
      }

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [24, 119, 242], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      // Signature block
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY < 260) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Prepared by:', 14, finalY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('SUPER ADMINISTRATOR', 14, finalY + 8);
        doc.text('NexTurn Central Office', 14, finalY + 12);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Certified Correct:', 140, finalY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(school?.principalName || 'Dr. Tomas Garcia Ferrer Jr., Principal IV', 140, finalY + 8);
        doc.text('Head of School / Institutional Head', 140, finalY + 12);
      }

      doc.save(`nexturn-report-${reportType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setIsExporting(null);
    }
  };

  // If not superadmin, display restricted access view
  if (user && user.role !== 'SUPERADMIN') {
    return (
      <AppShell>
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-red-200 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500">
            The Report Creation Module is strictly reserved for the Super Administrator account.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell requiredModule="rbac_manager">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Export Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider mb-1">
              Superadmin Executive Intelligence
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Report Creation & Analytics Studio
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate institutional usage statistics, DTR summaries, student turnout, and cryptographic blockchain audit reports
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isLoading || isExporting !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
              title="Export active report dataset to comma-separated values (CSV)"
            >
              {isExporting === 'csv' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-emerald-400" />}
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportXLS}
              disabled={isLoading || isExporting !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
              title="Export active report dataset to Microsoft Excel XML spreadsheet"
            >
              {isExporting === 'xls' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              <span>Export XLS</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isLoading || isExporting !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
              title="Export formal printable PDF document with signatures"
            >
              {isExporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <button
            onClick={() => setReportType('USAGE_STATISTICS')}
            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
              reportType === 'USAGE_STATISTICS'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <BarChart3 className={`w-4 h-4 ${reportType === 'USAGE_STATISTICS' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Traffic</span>
            </div>
            <div className="font-bold text-xs text-slate-900 leading-snug">Usage Statistics</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Scans, peak hours & device sources</div>
          </button>

          <button
            onClick={() => setReportType('TEACHER_DTR_SUMMARY')}
            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
              reportType === 'TEACHER_DTR_SUMMARY'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <GraduationCap className={`w-4 h-4 ${reportType === 'TEACHER_DTR_SUMMARY' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Faculty</span>
            </div>
            <div className="font-bold text-xs text-slate-900 leading-snug">Teacher DTR Summary</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Attendance rates, days present & scans</div>
          </button>

          <button
            onClick={() => setReportType('STUDENT_ATTENDANCE_SUMMARY')}
            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
              reportType === 'STUDENT_ATTENDANCE_SUMMARY'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <Users className={`w-4 h-4 ${reportType === 'STUDENT_ATTENDANCE_SUMMARY' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Learners</span>
            </div>
            <div className="font-bold text-xs text-slate-900 leading-snug">Student Turnout</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Section breakdown & presence rate</div>
          </button>

          <button
            onClick={() => setReportType('BLOCKCHAIN_AUDIT_SUMMARY')}
            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
              reportType === 'BLOCKCHAIN_AUDIT_SUMMARY'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <ShieldCheck className={`w-4 h-4 ${reportType === 'BLOCKCHAIN_AUDIT_SUMMARY' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Security</span>
            </div>
            <div className="font-bold text-xs text-slate-900 leading-snug">Blockchain Audit Ledger</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Cryptographic trail & action distribution</div>
          </button>
        </div>

        {/* Date Filter Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Range:</span>
            </span>

            {(['today', 'this_week', 'this_month', 'last_month', 'custom'] as DatePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition ${
                  preset === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300"
              />
              <button
                onClick={fetchReportData}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Report Content Body */}
        {isLoading ? (
          <div className="p-16 rounded-3xl bg-white border border-slate-200 text-center text-xs text-slate-500 shadow-sm space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <div className="font-semibold text-slate-700">Compiling Superadmin Intelligence Report...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. USAGE STATISTICS VIEW */}
            {reportType === 'USAGE_STATISTICS' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Total Kiosk Scans</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{data?.metrics?.totalScans || 0}</div>
                    <div className="text-[10px] text-blue-600 font-semibold mt-0.5">Recorded in period</div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Unique Attendees</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{data?.metrics?.uniqueAttendees || 0}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Active cards detected</div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Peak Traffic Hour</div>
                    <div className="text-xl font-black text-blue-600 mt-1 truncate">{data?.metrics?.peakHourFormatted || 'N/A'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{data?.metrics?.peakHourScans || 0} scans at peak</div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Clock In / Out Split</div>
                    <div className="text-2xl font-black text-indigo-600 mt-1">
                      {data?.metrics?.clockInCount || 0} <span className="text-xs font-normal text-slate-400">/</span> {data?.metrics?.clockOutCount || 0}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Entries vs departures</div>
                  </div>
                </div>

                {/* Hourly Scan Distribution */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Hourly Kiosk Scan Traffic</span>
                    </h3>
                    <span className="text-[10px] text-slate-400">24-hour distribution</span>
                  </div>

                  <div className="grid grid-cols-12 gap-1 pt-2 items-end h-28">
                    {data?.hourlyBreakdown?.slice(6, 18).map((h: any) => {
                      const maxVal = Math.max(...data.hourlyBreakdown.map((x: any) => x.scans), 1);
                      const heightPercent = Math.max(Math.round((h.scans / maxVal) * 100), 6);
                      return (
                        <div key={h.hour} className="flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="text-[10px] font-bold text-slate-700">{h.scans}</span>
                          <div
                            className="w-full rounded-t-lg bg-blue-600 hover:bg-blue-500 transition-all"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className="text-[9px] font-semibold text-slate-400">{h.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Breakdown Table */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Daily Attendance Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Total Scans</th>
                          <th className="py-2.5 px-3">Student Scans</th>
                          <th className="py-2.5 px-3">Teacher Scans</th>
                          <th className="py-2.5 px-3">Clock-In</th>
                          <th className="py-2.5 px-3">Clock-Out</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data?.dailyBreakdown?.map((d: any) => (
                          <tr key={d.date} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{d.date}</td>
                            <td className="py-2.5 px-3 font-semibold text-blue-600">{d.total}</td>
                            <td className="py-2.5 px-3 text-slate-700">{d.students}</td>
                            <td className="py-2.5 px-3 text-slate-700">{d.teachers}</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-semibold">{d.in}</td>
                            <td className="py-2.5 px-3 text-indigo-600 font-semibold">{d.out}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* 2. TEACHER DTR SUMMARY VIEW */}
            {reportType === 'TEACHER_DTR_SUMMARY' && (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Faculty Masterlist & DTR Attendance</h3>
                  <span className="text-xs text-slate-500">{data?.rows?.length || 0} Faculty Members</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Emp No.</th>
                        <th className="py-2.5 px-3">Teacher Name</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Position</th>
                        <th className="py-2.5 px-3">RFID Card</th>
                        <th className="py-2.5 px-3">Days Present</th>
                        <th className="py-2.5 px-3">Total Scans</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data?.rows?.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{r.employeeNumber}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{r.department}</td>
                          <td className="py-2.5 px-3 text-slate-600">{r.position}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{r.rfidNumber}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-600">{r.daysPresent} days</td>
                          <td className="py-2.5 px-3 text-slate-700">{r.totalScans}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. STUDENT ATTENDANCE VIEW */}
            {reportType === 'STUDENT_ATTENDANCE_SUMMARY' && (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Student Attendance by Grade & Section</h3>
                  <span className="text-xs text-slate-500">{data?.totalStudents || 0} Total Enrolled Learners</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Grade Level</th>
                        <th className="py-2.5 px-3">Section</th>
                        <th className="py-2.5 px-3">Track / Strand</th>
                        <th className="py-2.5 px-3">Enrolled</th>
                        <th className="py-2.5 px-3">Active Attendees</th>
                        <th className="py-2.5 px-3">Total Scans</th>
                        <th className="py-2.5 px-3">Turnout Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data?.rows?.map((s: any) => (
                        <tr key={s.sectionKey} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{s.gradeLevel}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{s.section}</td>
                          <td className="py-2.5 px-3 text-slate-500">{s.trackStrand}</td>
                          <td className="py-2.5 px-3 text-slate-700">{s.enrolled}</td>
                          <td className="py-2.5 px-3 font-semibold text-blue-600">{s.activeAttendees}</td>
                          <td className="py-2.5 px-3 text-slate-700">{s.totalScans}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              {s.turnoutRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. BLOCKCHAIN AUDIT VIEW */}
            {reportType === 'BLOCKCHAIN_AUDIT_SUMMARY' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Blocks in Period</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{data?.metrics?.totalBlocksInPeriod || 0}</div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Total Lifetime Ledger</div>
                    <div className="text-2xl font-black text-indigo-600 mt-1">{data?.metrics?.totalBlocksOverall || 0}</div>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
                    <div className="text-[11px] font-bold text-emerald-800 uppercase">Integrity Status</div>
                    <div className="text-sm font-black text-emerald-700 mt-1">{data?.metrics?.tamperStatus}</div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Recent Cryptographic Blocks</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Actor Role</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Target Entity</th>
                          <th className="py-2.5 px-3">SHA-256 Snippet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data?.sampleBlocks?.map((b: any) => (
                          <tr key={b.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{b.timestamp}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{b.actorRole}</td>
                            <td className="py-2.5 px-3 text-blue-600 font-semibold">{b.action}</td>
                            <td className="py-2.5 px-3 text-slate-700">{b.entityType}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{b.hashSnippet}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
