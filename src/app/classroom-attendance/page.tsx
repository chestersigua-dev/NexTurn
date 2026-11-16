'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  UserCheck,
  Table as TableIcon,
  ClipboardList,
  Search,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Users,
  Calendar,
  Sparkles,
  RefreshCw,
  Plus,
  Clock,
  XCircle,
  Check,
  ChevronRight,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Lock,
  Layers,
  ListFilter,
  Eye,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

interface StudentItem {
  id: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  suffix?: string | null;
  sex?: string | null;
  gradeLevel: string;
  section: string;
  trackStrand?: string | null;
  photoUrl?: string | null;
}

interface TeacherItem {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  assignedSubject?: string | null;
  advisoryGrade?: string | null;
  advisorySection?: string | null;
}

interface AttendanceRecordItem {
  id: string;
  studentId: string;
  teacherId?: string | null;
  subject: string;
  gradeLevel: string;
  section: string;
  date: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  remarks?: string | null;
  student?: StudentItem;
  teacher?: TeacherItem;
}

interface RosterInputItem extends StudentItem {
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  remarks: string;
}

interface UserScopeState {
  role: string;
  isLeadership: boolean;
  assignedSubject?: string | null;
  advisoryGrade?: string | null;
  advisorySection?: string | null;
  scopeAccessDenied?: boolean;
  message?: string;
}

export default function ClassroomAttendancePage() {
  const { user } = useAuth();

  // Navigation: 'history' (View Attendance Records) or 'record' (Take Period Attendance)
  const [activeTab, setActiveTab] = useState<'history' | 'record'>('history');

  // Sub-view in history: 'matrix' (Class Register Matrix) or 'ledger' (Sortable All Attendance History Log)
  const [historySubTab, setHistorySubTab] = useState<'matrix' | 'ledger'>('matrix');

  // Hierarchy Selection on Top: Grade & Section -> Subject -> Teacher
  const [gradeLevel, setGradeLevel] = useState('Grade 11');
  const [section, setSection] = useState('STEM-A');
  const [subject, setSubject] = useState('General Chemistry 1');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Role Scoping & Dynamic metadata from server
  const [userScope, setUserScope] = useState<UserScopeState | null>(null);
  const [allClassSections, setAllClassSections] = useState<{ gradeLevel: string; section: string }[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([
    'General Chemistry 1',
    'General Biology 1',
    'Pre-Calculus',
    'Basic Calculus',
    'English for Academic & Professional Purposes',
    'Komunikasyon at Pananaliksik',
    'Physical Education and Health',
    'Science 10',
    'Mathematics 10',
  ]);

  // Sorting state (Sortable by grade, section, subject, student name, and date)
  const [sortBy, setSortBy] = useState<'gradeLevel' | 'section' | 'subject' | 'student' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [matrixStudentSort, setMatrixStudentSort] = useState<'name-asc' | 'name-desc' | 'rate-desc' | 'rate-asc'>('name-asc');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_30'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'>('ALL');

  // Attendance Data State
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Take Attendance Form State
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState<RosterInputItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Determine leadership vs teacher
  const isLeadershipUser = useMemo(() => {
    if (userScope) return userScope.isLeadership;
    if (user) {
      return (
        user.role === 'SUPERADMIN' ||
        user.role === 'PRINCIPAL' ||
        user.role === 'ADMIN_AIDE' ||
        user.role === 'HEAD_TEACHER'
      );
    }
    return false;
  }, [userScope, user]);

  const teacherAssignedSubject = userScope?.assignedSubject || user?.assignedSubject || 'General Chemistry 1';
  const teacherAdvisoryGrade = userScope?.advisoryGrade || user?.advisoryGrade || 'Grade 11';
  const teacherAdvisorySection = userScope?.advisorySection || user?.advisorySection || 'STEM-A';

  // 1. Fetch Class Data with server-enforced scoping and sorting
  const loadClassData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const queryParams = new URLSearchParams({
        gradeLevel,
        section,
        subject,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/classroom-attendance?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTeachers(data.teachers || []);

        if (data.allClassSections && Array.isArray(data.allClassSections)) {
          setAllClassSections(data.allClassSections);
        }
        if (data.allSubjects && Array.isArray(data.allSubjects)) {
          setAllSubjects(data.allSubjects);
        }

        if (data.userScope) {
          setUserScope(data.userScope);
          if (data.userScope.scopeAccessDenied) {
            setMessage({
              type: 'warning',
              text: data.userScope.message || 'Access restricted: Teachers can only view their assigned subject or advisory section.',
            });
          }
        }

        const loadedStudents: StudentItem[] = data.students || [];
        setStudents(loadedStudents);

        // Pre-fill roster for the Take Attendance tab
        setRoster(
          loadedStudents.map((s) => ({
            ...s,
            status: 'PRESENT',
            remarks: '',
          }))
        );

        // Auto-select assigned teacher if one exists in records and none explicitly chosen
        if (!selectedTeacherId && data.records?.length > 0) {
          const recWithTeacher = data.records.find((r: any) => r.teacherId);
          if (recWithTeacher?.teacherId) {
            setSelectedTeacherId(recWithTeacher.teacherId);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load class attendance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gradeLevel, section, subject, sortBy, sortOrder, selectedTeacherId]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  // Set default teacher when teachers load
  useEffect(() => {
    if (teachers.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [teachers, selectedTeacherId]);

  // 2. Computed Distinct Dates for Matrix (Chronological)
  const distinctDates = useMemo(() => {
    const datesSet = new Set<string>();
    records.forEach((r) => {
      if (r.date) {
        datesSet.add(r.date.split('T')[0]);
      }
    });

    let dates = Array.from(datesSet).sort();

    if (dateFilter === 'THIS_MONTH') {
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      dates = dates.filter((d) => d.startsWith(currentYearMonth));
    } else if (dateFilter === 'LAST_30') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      dates = dates.filter((d) => d >= cutoffStr);
    }

    return dates;
  }, [records, dateFilter]);

  // 3. Computed Attendance Matrix Lookup: Map[studentId][dateKey] -> { status, remarks }
  const matrixLookup = useMemo(() => {
    const map: Record<string, Record<string, { status: string; remarks?: string | null }>> = {};
    records.forEach((r) => {
      const dateKey = r.date.split('T')[0];
      if (!map[r.studentId]) {
        map[r.studentId] = {};
      }
      map[r.studentId][dateKey] = {
        status: r.status,
        remarks: r.remarks,
      };
    });
    return map;
  }, [records]);

  // 4. Per-Student Attendance Statistics
  const getStudentStats = useCallback(
    (studentId: string) => {
      let present = 0;
      let late = 0;
      let absent = 0;
      let excused = 0;
      let totalRecorded = 0;

      distinctDates.forEach((d) => {
        const cell = matrixLookup[studentId]?.[d];
        if (cell) {
          totalRecorded++;
          if (cell.status === 'PRESENT') present++;
          else if (cell.status === 'LATE') late++;
          else if (cell.status === 'ABSENT') absent++;
          else if (cell.status === 'EXCUSED') excused++;
        }
      });

      const rate = totalRecorded > 0 ? Math.round(((present + late) / totalRecorded) * 100) : 0;
      return { present, late, absent, excused, totalRecorded, rate };
    },
    [distinctDates, matrixLookup]
  );

  // 5. Filtered & Sorted Students for Matrix View
  const filteredStudents = useMemo(() => {
    let list = [...students];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          (s.middleName && s.middleName.toLowerCase().includes(q)) ||
          s.lrn.includes(q)
      );
    }

    if (matrixStudentSort === 'name-desc') {
      list.sort((a, b) => b.lastName.localeCompare(a.lastName) || b.firstName.localeCompare(a.firstName));
    } else if (matrixStudentSort === 'rate-desc') {
      list.sort((a, b) => getStudentStats(b.id).rate - getStudentStats(a.id).rate);
    } else if (matrixStudentSort === 'rate-asc') {
      list.sort((a, b) => getStudentStats(a.id).rate - getStudentStats(b.id).rate);
    } else {
      list.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
    }
    return list;
  }, [students, searchQuery, matrixStudentSort, getStudentStats]);

  // Demographic breakdown (DepEd School Form 2 standard: Male and Female groupings)
  const maleStudents = useMemo(
    () => filteredStudents.filter((s) => (s.sex || '').toUpperCase().startsWith('M')),
    [filteredStudents]
  );
  const femaleStudents = useMemo(
    () => filteredStudents.filter((s) => (s.sex || '').toUpperCase().startsWith('F')),
    [filteredStudents]
  );

  // 6. Filtered & Sorted Attendance Records for Master History Ledger View
  const filteredRecords = useMemo(() => {
    let list = [...records];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.student?.firstName.toLowerCase().includes(q) ||
          r.student?.lastName.toLowerCase().includes(q) ||
          r.student?.lrn.includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          r.gradeLevel.toLowerCase().includes(q) ||
          r.section.toLowerCase().includes(q) ||
          (r.remarks && r.remarks.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((r) => r.status === statusFilter);
    }

    // Client-side sort guarantee
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'gradeLevel') {
        cmp = a.gradeLevel.localeCompare(b.gradeLevel) || a.section.localeCompare(b.section);
      } else if (sortBy === 'section') {
        cmp = a.section.localeCompare(b.section) || a.gradeLevel.localeCompare(b.gradeLevel);
      } else if (sortBy === 'subject') {
        cmp = a.subject.localeCompare(b.subject);
      } else if (sortBy === 'student') {
        const nameA = `${a.student?.lastName || ''} ${a.student?.firstName || ''}`;
        const nameB = `${b.student?.lastName || ''} ${b.student?.firstName || ''}`;
        cmp = nameA.localeCompare(nameB);
      } else if (sortBy === 'date') {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [records, searchQuery, statusFilter, sortBy, sortOrder]);

  // 7. Active Teacher Display String (for top hierarchy)
  const activeTeacherDisplay = useMemo(() => {
    if (selectedTeacherId) {
      const t = teachers.find((item) => item.id === selectedTeacherId);
      if (t) return `${t.firstName} ${t.lastName} • ${t.position} (${t.department})`;
    }
    const recWithTeacher = records.find((r) => r.teacher);
    if (recWithTeacher?.teacher) {
      const t = recWithTeacher.teacher;
      return `${t.firstName} ${t.lastName} • ${t.position}`;
    }
    return teachers.length > 0
      ? `${teachers[0].firstName} ${teachers[0].lastName} • ${teachers[0].position}`
      : 'Faculty Instructor Assigned';
  }, [selectedTeacherId, teachers, records]);

  // 8. Per-Date Column Statistics
  const getDateColumnSummary = (dateStr: string) => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    let total = 0;

    students.forEach((s) => {
      const cell = matrixLookup[s.id]?.[dateStr];
      if (cell) {
        total++;
        if (cell.status === 'PRESENT') present++;
        else if (cell.status === 'LATE') late++;
        else if (cell.status === 'ABSENT') absent++;
        else if (cell.status === 'EXCUSED') excused++;
      }
    });

    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, late, absent, excused, total, rate };
  };

  // 9. Overall Class Turnout
  const overallTurnoutRate = useMemo(() => {
    let present = 0;
    let total = 0;
    records.forEach((r) => {
      total++;
      if (r.status === 'PRESENT' || r.status === 'LATE') {
        present++;
      }
    });
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }, [records]);

  // 10. Status Badge Component
  const renderStatusBadge = (status?: string, remarks?: string | null) => {
    if (!status) {
      return <span className="text-slate-300 font-bold text-xs select-none">-</span>;
    }

    switch (status) {
      case 'PRESENT':
        return (
          <span
            title={remarks ? `Present • ${remarks}` : 'Present'}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black text-xs border border-emerald-300 shadow-xs transition cursor-default"
          >
            P
          </span>
        );
      case 'LATE':
        return (
          <span
            title={remarks ? `Late • ${remarks}` : 'Late'}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-black text-xs border border-amber-300 shadow-xs transition cursor-default"
          >
            L
          </span>
        );
      case 'ABSENT':
        return (
          <span
            title={remarks ? `Absent • ${remarks}` : 'Absent'}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-black text-xs border border-red-300 shadow-xs transition cursor-default"
          >
            A
          </span>
        );
      case 'EXCUSED':
        return (
          <span
            title={remarks ? `Excused • ${remarks}` : 'Excused'}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 font-black text-xs border border-blue-300 shadow-xs transition cursor-default"
          >
            E
          </span>
        );
      default:
        return <span className="text-slate-300 font-bold text-xs select-none">-</span>;
    }
  };

  // 11. Handle Column Sort Header Click (Ledger View)
  const handleSortClick = (column: 'gradeLevel' | 'section' | 'subject' | 'student' | 'date') => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // 12. Save Active Daily Attendance Record
  const handleSaveAttendance = async () => {
    if (roster.length === 0) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const payload = {
        gradeLevel,
        section,
        subject,
        teacherId: selectedTeacherId || undefined,
        date: recordDate,
        items: roster.map((s) => ({
          studentId: s.id,
          status: s.status,
          remarks: s.remarks,
        })),
      };

      const res = await fetch('/api/classroom-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save attendance record');
      }

      setMessage({
        type: 'success',
        text: `Successfully recorded attendance for ${data.count} students on ${recordDate}!`,
      });

      // Reload class matrix
      await loadClassData();

      // Switch to history tab to see newly created column
      setActiveTab('history');
      setHistorySubTab('matrix');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // 13. Quick Set All Statuses in Roster Form
  const handleQuickSetAll = (st: 'PRESENT' | 'LATE' | 'ABSENT') => {
    setRoster((prev) => prev.map((item) => ({ ...item, status: st })));
  };

  // 14. Export to CSV
  const handleExportCSV = () => {
    if (historySubTab === 'matrix') {
      if (students.length === 0) return;

      const headers = [
        'No.',
        'Learner Name',
        'LRN',
        'Grade Level',
        'Section',
        ...distinctDates.map((d) => d),
        'Total Present',
        'Total Late',
        'Total Absent',
        'Total Excused',
        'Attendance Rate (%)',
      ];

      const rows = filteredStudents.map((s, idx) => {
        const stats = getStudentStats(s.id);
        const dateCols = distinctDates.map((d) => {
          const cell = matrixLookup[s.id]?.[d];
          return cell ? cell.status : '-';
        });

        return [
          idx + 1,
          `"${s.lastName}, ${s.firstName}${s.middleName ? ' ' + s.middleName : ''}"`,
          `"${s.lrn}"`,
          `"${s.gradeLevel}"`,
          `"${s.section}"`,
          ...dateCols,
          stats.present,
          stats.late,
          stats.absent,
          stats.excused,
          `${stats.rate}%`,
        ];
      });

      const csvContent = [
        `"NexTurn School RFID Attendance Management System"`,
        `"CLASS ATTENDANCE REGISTER (HISTORY MATRIX)"`,
        `"Grade & Section:","${gradeLevel} - ${section}"`,
        `"Subject:","${subject}"`,
        `"Teacher:","${activeTeacherDisplay}"`,
        `"Export Date:","${new Date().toLocaleString()}"`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Class_Matrix_${gradeLevel}_${section}_${subject.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Ledger CSV export
      if (records.length === 0) return;

      const headers = [
        'No.',
        'Grade Level',
        'Section',
        'Subject',
        'Learner Name',
        'LRN',
        'Date',
        'Status',
        'Remarks',
        'Teacher',
      ];

      const rows = filteredRecords.map((r, idx) => [
        idx + 1,
        `"${r.gradeLevel}"`,
        `"${r.section}"`,
        `"${r.subject}"`,
        `"${r.student ? `${r.student.lastName}, ${r.student.firstName}` : ''}"`,
        `"${r.student?.lrn || ''}"`,
        `"${r.date.split('T')[0]}"`,
        `"${r.status}"`,
        `"${r.remarks || ''}"`,
        `"${r.teacher ? `${r.teacher.lastName}, ${r.teacher.firstName}` : ''}"`,
      ]);

      const csvContent = [
        `"NexTurn School RFID Attendance Management System"`,
        `"ALL ATTENDANCE RECORDS LEDGER"`,
        `"Filter Scope:","${gradeLevel} - ${section} (${subject})"`,
        `"Export Date:","${new Date().toLocaleString()}"`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Attendance_Ledger_Sorted_By_${sortBy}_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 14B. Export Class Register Matrix to PDF (DepEd School Form 2 - 8.5x13 Landscape / Folio)
  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      const params = new URLSearchParams({
        format: 'pdf',
        gradeLevel: gradeLevel || 'ALL',
        section: section || 'ALL',
        subject: subject || 'ALL',
      });

      const res = await fetch(`/api/classroom-attendance/export?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanGrade = (gradeLevel || 'Class').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const cleanSection = (section || 'All').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const cleanSubject = (subject || 'Subject').replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.download = `DepEd_SF2_${cleanGrade}_${cleanSection}_${cleanSubject}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export PDF error:', err);
      alert(`Export PDF failed: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 14C. Export Class Register Matrix to Excel (DepEd School Form 2 - 8.5x13 Landscape / Folio)
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const params = new URLSearchParams({
        format: 'excel',
        gradeLevel: gradeLevel || 'ALL',
        section: section || 'ALL',
        subject: subject || 'ALL',
      });

      const res = await fetch(`/api/classroom-attendance/export?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanGrade = (gradeLevel || 'Class').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const cleanSection = (section || 'All').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const cleanSubject = (subject || 'Subject').replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.download = `DepEd_SF2_${cleanGrade}_${cleanSection}_${cleanSubject}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export Excel error:', err);
      alert(`Export Excel failed: ${err.message}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // 15. Print Function
  const handlePrint = () => {
    window.print();
  };

  // Quick switch for teacher between advisory section and assigned subject
  const handleTeacherSwitchToAdvisory = () => {
    setGradeLevel(teacherAdvisoryGrade);
    setSection(teacherAdvisorySection);
  };

  const handleTeacherSwitchToAssignedSubject = () => {
    setSubject(teacherAssignedSubject);
  };

  return (
    <AppShell requiredModule="classroom_attendance">
      <div className="space-y-6">
        {/* Navigation Tabs (History Matrix vs Take Period Attendance) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <ClipboardList className="w-7 h-7 text-blue-600 shrink-0" />
              <span>Class Attendance</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Official DepEd class register matrix, period attendance tracking, and attendance history logs
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs border ${activeTab === 'history'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Attendance History Sheet</span>
              {distinctDates.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'history' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  {distinctDates.length} Days
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('record')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs border ${activeTab === 'record'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
            >
              <Plus className="w-4 h-4" />
              <span>Take Period Attendance</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* HIERARCHY BANNER ON TOP: GRADE SECTION -> SUBJECT -> TEACHER  */}
        {/* ============================================================== */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          {/* Role-based Scoping Notification Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2.5">
              {isLeadershipUser ? (
                <>
                  <div className="w-7 h-7 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-purple-900 flex items-center gap-2">
                      <span>Full Leadership Access (Admin, Principal & Head Teacher)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-200/80 text-purple-800">
                        All Classes Unlocked
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      You can view and analyze attendance history across all grade levels, sections, and subjects sortable by any field.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-xl bg-teal-100 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-teal-900 flex items-center gap-2">
                      <span>Teacher Scoped View</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-200/80 text-teal-800">
                        Assigned Subject & Advisory Only
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Assigned Subject: <span className="font-bold text-teal-950">{teacherAssignedSubject}</span> • Advisory Section:{' '}
                      <span className="font-bold text-teal-950">
                        {teacherAdvisoryGrade} - {teacherAdvisorySection}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick action buttons for Teacher */}
            {!isLeadershipUser && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTeacherSwitchToAdvisory}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-300 transition"
                  title="Switch to your homeroom advisory section"
                >
                  My Advisory ({teacherAdvisorySection})
                </button>
                <button
                  type="button"
                  onClick={handleTeacherSwitchToAssignedSubject}
                  className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[11px] border border-teal-300 transition"
                  title="Switch to your assigned teaching subject"
                >
                  My Subject ({teacherAssignedSubject})
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  DepEd Class Record Sheet
                </span>
                <span className="text-xs text-slate-400 font-semibold">• Official Attendance Matrix</span>
              </div>

              {/* 1. GRADE SECTION ON TOP */}
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <GraduationCap className="w-6 h-6 text-blue-600 shrink-0" />
                <span>
                  {gradeLevel} — {section}
                </span>
              </div>

              {/* 2. THEN SUBJECT */}
              <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Subject: <span className="text-slate-900 font-black">{subject}</span>
                </span>
              </div>

              {/* 3. THEN TEACHER */}
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  Teacher / Instructor:{' '}
                  <span className="font-bold text-slate-900">{activeTeacherDisplay}</span>
                </span>
              </div>
            </div>

            {/* Quick Metrics & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center min-w-[90px]">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Students</div>
                <div className="text-lg font-black text-slate-900">{students.length}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center min-w-[90px]">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class Days</div>
                <div className="text-lg font-black text-blue-600">{distinctDates.length}</div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center min-w-[90px]">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Turnout</div>
                <div className="text-lg font-black text-emerald-700">{overallTurnoutRate}%</div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    disabled={isExportingPdf || records.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                    title="Export Class Register Matrix to PDF in DepEd Form 2 style (8.5x13 landscape)"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    <span>DepEd PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={isExportingExcel || records.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-300 disabled:opacity-50"
                    title="Export Class Register Matrix to Excel (8.5x13 landscape)"
                  >
                    {isExportingExcel ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>Excel</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={records.length === 0 && students.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-300 disabled:opacity-50"
                    title="Export attendance data to CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-300"
                    title="Print attendance report (8.5x13 landscape)"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration & Filter Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs pt-1">
            {/* Grade Level Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Grade Level</span>
                {!isLeadershipUser && (
                  <span className="text-[10px] text-teal-600 font-bold">Scoped</span>
                )}
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              >
                {isLeadershipUser ? (
                  <>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </>
                ) : (
                  <>
                    <option value={teacherAdvisoryGrade}>{teacherAdvisoryGrade} (Advisory)</option>
                    <option value="Grade 10">Grade 10 (Subject)</option>
                    <option value="Grade 11">Grade 11 (Subject)</option>
                    <option value="Grade 12">Grade 12 (Subject)</option>
                  </>
                )}
              </select>
            </div>

            {/* Section Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Section</span>
                {!isLeadershipUser && (
                  <span className="text-[10px] text-teal-600 font-bold">Scoped</span>
                )}
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              >
                {isLeadershipUser ? (
                  <>
                    <option value="STEM-A">STEM-A</option>
                    <option value="Bonifacio">Bonifacio</option>
                    <option value="Rizal">Rizal</option>
                    <option value="Diamond">Diamond</option>
                    <option value="Section 1">Section 1</option>
                  </>
                ) : (
                  <>
                    <option value={teacherAdvisorySection}>{teacherAdvisorySection} (Advisory Homeroom)</option>
                    <option value="Bonifacio">Bonifacio</option>
                    <option value="Rizal">Rizal</option>
                  </>
                )}
              </select>
            </div>

            {/* Subject Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Subject</span>
                {!isLeadershipUser && (
                  <span className="text-[10px] text-teal-600 font-bold">Scoped</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="subjects-list"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. General Chemistry 1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <datalist id="subjects-list">
                  {allSubjects.map((sub) => (
                    <option key={sub} value={sub} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Assigned Teacher Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Teacher</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.lastName}, {t.firstName} ({t.position})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Scope Filter */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date History Scope</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Recorded Dates ({distinctDates.length})</option>
                <option value="THIS_MONTH">Current Month</option>
                <option value="LAST_30">Past 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Global Feedback Message */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : message.type === 'warning'
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-red-50 border border-red-200 text-red-800'
              }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : message.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: ATTENDANCE HISTORY (MATRIX OR SORTABLE MASTER LEDGER)   */}
        {/* ============================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* View Sub-Tab Switcher & Sort Controls Bar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs">
              {/* View Switcher: Class Register Matrix vs Master Attendance Ledger */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setHistorySubTab('matrix')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${historySubTab === 'matrix'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Class Register Matrix</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistorySubTab('ledger')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${historySubTab === 'ledger'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Attendance Records Ledger</span>
                  {records.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                      {records.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Sorting & Search Controls */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student, LRN, remarks..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs font-medium"
                  />
                </div>

                {/* Sort By Selector (Key User Requirement: sortable by grade, section, subject) */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-600">Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="gradeLevel">Grade Level</option>
                    <option value="section">Section</option>
                    <option value="subject">Subject</option>
                    <option value="student">Student Name</option>
                    <option value="date">Date</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 transition"
                    title={`Toggle Order: currently ${sortOrder.toUpperCase()}`}
                  >
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </button>
                </div>

                {/* Matrix Student Order Selector */}
                {historySubTab === 'matrix' && (
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                    <ListFilter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <select
                      value={matrixStudentSort}
                      onChange={(e) => setMatrixStudentSort(e.target.value as any)}
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="name-asc">Learner: A to Z</option>
                      <option value="name-desc">Learner: Z to A</option>
                      <option value="rate-desc">Turnout: Highest First</option>
                      <option value="rate-asc">Turnout: Lowest First</option>
                    </select>
                  </div>
                )}

                {/* Direct Matrix PDF Export Button */}
                {historySubTab === 'matrix' && (
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    disabled={isExportingPdf || records.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 shrink-0"
                    title="Export Class Register Matrix to PDF in DepEd Form 2 style (8.5x13 landscape)"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    <span>Export Matrix to PDF (DepEd Style)</span>
                  </button>
                )}

                {/* Status Filter for Ledger */}
                {historySubTab === 'ledger' && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PRESENT">Present Only</option>
                    <option value="LATE">Late Only</option>
                    <option value="ABSENT">Absent Only</option>
                    <option value="EXCUSED">Excused Only</option>
                  </select>
                )}

                {/* Refresh button */}
                <button
                  type="button"
                  onClick={loadClassData}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
                  title="Refresh Attendance Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* ========================================================== */}
            {/* SUB-VIEW A: CLASS REGISTER MATRIX (TABLED FORM)            */}
            {/* ========================================================== */}
            {historySubTab === 'matrix' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* DepEd Matrix Header Strip */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-slate-800">
                      DepEd Class Register Matrix (School Form 2)
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-semibold">
                      {filteredStudents.length} Learners ({maleStudents.length} Male, {femaleStudents.length} Female)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                      8.5&quot; × 13&quot; Landscape
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      disabled={isExportingPdf || records.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50"
                      title="Download DepEd Form 2 PDF formatted for 8.5x13 landscape paper"
                    >
                      {isExportingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      <span>Export Matrix to PDF (DepEd Style)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportExcel}
                      disabled={isExportingExcel || records.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition disabled:opacity-50"
                      title="Download DepEd Form 2 Excel (.xlsx) formatted for 8.5x13 landscape paper"
                    >
                      {isExportingExcel ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>Export Excel</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      {/* Top Table Header: Columns */}
                      <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                        {/* Left-most Sticky Column: Index and Learner Name */}
                        <th className="py-3 px-3 w-10 text-center sticky left-0 z-30 bg-slate-100 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                          #
                        </th>
                        <th
                          onClick={() =>
                            setMatrixStudentSort((prev) => (prev === 'name-asc' ? 'name-desc' : 'name-asc'))
                          }
                          className="py-3 px-4 min-w-[220px] sticky left-10 z-30 bg-slate-100 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)] cursor-pointer hover:bg-slate-200 transition"
                          title="Click to sort by learner name"
                        >
                          <div className="flex items-center justify-between">
                            <span>Learner Full Name</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>

                        {/* Succeeding Columns: One Column per Date */}
                        {distinctDates.length > 0 ? (
                          distinctDates.map((dateStr) => {
                            const dateObj = new Date(dateStr + 'T00:00:00');
                            const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                            const formattedMonthDay = dateObj.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            });

                            return (
                              <th
                                key={dateStr}
                                className="py-2.5 px-3 min-w-[68px] text-center border-r border-slate-200 bg-slate-100"
                              >
                                <div className="text-[10px] font-bold text-slate-400">{weekday}</div>
                                <div className="text-xs font-black text-slate-800">{formattedMonthDay}</div>
                              </th>
                            );
                          })
                        ) : (
                          <th className="py-3 px-6 text-center text-slate-400 font-medium">
                            No dates recorded yet
                          </th>
                        )}

                        {/* Summary Columns on the Right */}
                        <th className="py-3 px-3 w-16 text-center bg-emerald-50 text-emerald-900 border-l border-emerald-200">
                          Present
                        </th>
                        <th className="py-3 px-3 w-14 text-center bg-amber-50 text-amber-900 border-l border-amber-200">
                          Late
                        </th>
                        <th className="py-3 px-3 w-14 text-center bg-red-50 text-red-900 border-l border-red-200">
                          Absent
                        </th>
                        <th
                          onClick={() =>
                            setMatrixStudentSort((prev) => (prev === 'rate-desc' ? 'rate-asc' : 'rate-desc'))
                          }
                          className="py-3 px-3 w-16 text-center bg-blue-50 text-blue-900 border-l border-blue-200 cursor-pointer hover:bg-blue-100 transition"
                          title="Click to sort by attendance rate"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Rate</span>
                            <ArrowUpDown className="w-2.5 h-2.5 text-blue-500" />
                          </div>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr>
                          <td
                            colSpan={distinctDates.length + 6}
                            className="py-16 text-center text-slate-400 font-medium"
                          >
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                              <span>Loading Class Attendance History Matrix...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredStudents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={distinctDates.length + 6}
                            className="py-16 text-center text-slate-400 font-medium"
                          >
                            <div className="max-w-md mx-auto space-y-2">
                              <Users className="w-8 h-8 text-slate-300 mx-auto" />
                              <div className="text-slate-700 font-bold">No Students Found</div>
                              <div className="text-xs">
                                No learners found enrolled in {gradeLevel} - {section}.
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : distinctDates.length === 0 ? (
                        <tr>
                          <td
                            colSpan={filteredStudents.length + 6}
                            className="py-14 text-center text-slate-400 font-medium"
                          >
                            <div className="max-w-md mx-auto space-y-3">
                              <Calendar className="w-9 h-9 text-blue-400 mx-auto" />
                              <div className="text-base font-bold text-slate-800">
                                No Historical Attendance Sessions Found
                              </div>
                              <p className="text-xs text-slate-500">
                                Attendance has not yet been recorded for{' '}
                                <span className="font-semibold text-slate-700">
                                  {gradeLevel} - {section} ({subject})
                                </span>
                                .
                              </p>
                              <button
                                type="button"
                                onClick={() => setActiveTab('record')}
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Record First Class Session Now</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student, idx) => {
                          const stats = getStudentStats(student.id);

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/70 transition group">
                              {/* Sticky Index Column */}
                              <td className="py-2.5 px-3 text-center font-bold text-slate-400 sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                                {idx + 1}
                              </td>

                              {/* Left-most Sticky Column: Learner Name */}
                              <td className="py-2.5 px-4 sticky left-10 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden border border-slate-300">
                                    {student.photoUrl ? (
                                      <img
                                        src={student.photoUrl}
                                        alt={student.firstName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      student.firstName[0]
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate leading-snug">
                                      {student.lastName}, {student.firstName}
                                      {student.middleName ? ` ${student.middleName[0]}.` : ''}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 leading-tight">
                                      LRN: {student.lrn}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Succeeding Columns: Attendance Status on Each Date */}
                              {distinctDates.map((dateStr) => {
                                const cell = matrixLookup[student.id]?.[dateStr];
                                return (
                                  <td
                                    key={dateStr}
                                    className="py-2.5 px-2 text-center border-r border-slate-100/80"
                                  >
                                    {renderStatusBadge(cell?.status, cell?.remarks)}
                                  </td>
                                );
                              })}

                              {/* Summary Columns */}
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/40 border-l border-emerald-100">
                                {stats.present}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-amber-700 bg-amber-50/40 border-l border-amber-100">
                                {stats.late}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-red-700 bg-red-50/40 border-l border-red-100">
                                {stats.absent}
                              </td>
                              <td className="py-2.5 px-3 text-center font-black bg-blue-50/40 border-l border-blue-100">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-black ${stats.rate >= 90
                                    ? 'text-emerald-700 bg-emerald-100'
                                    : stats.rate >= 75
                                      ? 'text-blue-700 bg-blue-100'
                                      : 'text-red-700 bg-red-100'
                                    }`}
                                >
                                  {stats.rate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* Bottom Summary Row: Daily Class Turnout Per Date Column */}
                    {distinctDates.length > 0 && filteredStudents.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100/90 text-slate-800 font-extrabold border-t-2 border-slate-300">
                          <td
                            colSpan={2}
                            className="py-3 px-4 text-right sticky left-0 z-20 bg-slate-100 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)]"
                          >
                            Daily Class Turnout (Present & Late):
                          </td>

                          {distinctDates.map((dateStr) => {
                            const summary = getDateColumnSummary(dateStr);
                            return (
                              <td
                                key={`summary-${dateStr}`}
                                className="py-3 px-1 text-center border-r border-slate-200"
                              >
                                <div className="text-xs font-black text-slate-900 leading-tight">
                                  {summary.present + summary.late}/{summary.total}
                                </div>
                                <div className="text-[10px] font-bold text-emerald-600 leading-tight">
                                  {summary.rate}%
                                </div>
                              </td>
                            );
                          })}

                          <td
                            colSpan={4}
                            className="py-3 px-3 text-center bg-blue-100/60 text-blue-900 border-l border-blue-200 font-black"
                          >
                            Term Turnout: {overallTurnoutRate}%
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Status Legend Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-4 text-slate-600">
                    <span className="font-bold text-slate-800">Legend:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300">
                        P
                      </span>
                      <span>Present</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-100 text-amber-800 font-black text-[10px] border border-amber-300">
                        L
                      </span>
                      <span>Late</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-100 text-red-800 font-black text-[10px] border border-red-300">
                        A
                      </span>
                      <span>Absent</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-800 font-black text-[10px] border border-blue-300">
                        E
                      </span>
                      <span>Excused</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="font-bold">-</span>
                      <span>No Session / Unrecorded</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Showing <span className="font-bold text-slate-700">{filteredStudents.length}</span> learners •{' '}
                    <span className="font-bold text-slate-700">{records.length}</span> total session marks
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================== */}
            {/* SUB-VIEW B: ALL ATTENDANCE RECORDS LEDGER (SORTABLE TABLE)  */}
            {/* ========================================================== */}
            {historySubTab === 'ledger' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-800">
                      Master Attendance History Ledger
                    </span>
                    <span className="text-slate-500 ml-2">
                      ({filteredRecords.length} records matching current filters • Click any column header to sort)
                    </span>
                  </div>

                  <div className="text-slate-500 font-semibold flex items-center gap-2">
                    <span>Sorted by:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-bold uppercase text-[10px]">
                      {sortBy} ({sortOrder})
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">#</th>

                        {/* Grade Level Sortable Header */}
                        <th
                          onClick={() => handleSortClick('gradeLevel')}
                          className="py-3 px-3 cursor-pointer hover:bg-slate-200 transition"
                          title="Sort by Grade Level"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Grade Level</span>
                            {sortBy === 'gradeLevel' ? (
                              sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </th>

                        {/* Section Sortable Header */}
                        <th
                          onClick={() => handleSortClick('section')}
                          className="py-3 px-3 cursor-pointer hover:bg-slate-200 transition"
                          title="Sort by Section"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Section</span>
                            {sortBy === 'section' ? (
                              sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </th>

                        {/* Subject Sortable Header */}
                        <th
                          onClick={() => handleSortClick('subject')}
                          className="py-3 px-3 min-w-[150px] cursor-pointer hover:bg-slate-200 transition"
                          title="Sort by Subject"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Subject</span>
                            {sortBy === 'subject' ? (
                              sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </th>

                        {/* Learner Name Sortable Header */}
                        <th
                          onClick={() => handleSortClick('student')}
                          className="py-3 px-3 min-w-[180px] cursor-pointer hover:bg-slate-200 transition"
                          title="Sort by Learner Name"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Learner Name</span>
                            {sortBy === 'student' ? (
                              sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </th>

                        {/* Date Sortable Header */}
                        <th
                          onClick={() => handleSortClick('date')}
                          className="py-3 px-3 w-28 cursor-pointer hover:bg-slate-200 transition"
                          title="Sort by Date"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Date</span>
                            {sortBy === 'date' ? (
                              sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </th>

                        {/* Attendance Status */}
                        <th className="py-3 px-3 w-24 text-center">Status</th>

                        {/* Faculty Teacher */}
                        <th className="py-3 px-3 min-w-[140px]">Teacher</th>

                        {/* Remarks */}
                        <th className="py-3 px-3 min-w-[150px]">Remarks / Note</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                              <span>Loading Master Attendance Records Ledger...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                            <div className="max-w-md mx-auto space-y-2">
                              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                              <div className="text-slate-700 font-bold">No Attendance Records Found</div>
                              <div className="text-xs">
                                No attendance records found matching the active grade, section, and subject scope.
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((r, idx) => {
                          const dateObj = new Date(r.date);
                          const dateFormatted = dateObj.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          });

                          return (
                            <tr key={r.id} className="hover:bg-slate-50 transition">
                              <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{r.gradeLevel}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{r.section}</td>
                              <td className="py-2.5 px-3 font-semibold text-emerald-800">{r.subject}</td>
                              <td className="py-2.5 px-3">
                                {r.student ? (
                                  <div>
                                    <div className="font-bold text-slate-900">
                                      {r.student.lastName}, {r.student.firstName}
                                      {r.student.middleName ? ` ${r.student.middleName[0]}.` : ''}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400">
                                      LRN: {r.student.lrn}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">Student ID: {r.studentId}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                                {dateFormatted}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {renderStatusBadge(r.status, r.remarks)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {r.teacher ? (
                                  <div className="font-medium">
                                    {r.teacher.lastName}, {r.teacher.firstName}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 italic">
                                {r.remarks || <span className="text-slate-300 not-italic">-</span>}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Showing <span className="font-bold text-slate-800">{filteredRecords.length}</span> of{' '}
                    <span className="font-bold text-slate-800">{records.length}</span> recorded attendance marks
                  </div>
                  <div className="font-semibold">
                    Current Scope: {gradeLevel} - {section} ({subject})
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: RECORD PERIOD ATTENDANCE (ENTRY FORM)                   */}
        {/* ============================================================== */}
        {activeTab === 'record' && (
          <div className="space-y-4">
            {/* Session Date & Quick Marks Bar */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Session Date to Record
                  </div>
                  <input
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Quick Set All Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Quick Set:</span>
                <button
                  type="button"
                  onClick={() => handleQuickSetAll('PRESENT')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition"
                >
                  All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSetAll('LATE')}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold border border-amber-200 transition"
                >
                  All Late
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSetAll('ABSENT')}
                  className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold border border-red-200 transition"
                >
                  All Absent
                </button>
              </div>

              {/* Submit Save Button */}
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSaving || roster.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Class Record ({roster.length} Learners)</span>
              </button>
            </div>

            {/* Roster Marking Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 min-w-[200px]">Learner Full Name</th>
                      <th className="py-3 px-4 w-36">12-Digit LRN</th>
                      <th className="py-3 px-4 text-center min-w-[260px]">Attendance Status</th>
                      <th className="py-3 px-4">Remarks / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          No students enrolled in {gradeLevel} - {section}.
                        </td>
                      </tr>
                    ) : (
                      roster.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden border border-slate-300">
                                {student.photoUrl ? (
                                  <img
                                    src={student.photoUrl}
                                    alt={student.firstName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  student.firstName[0]
                                )}
                              </div>
                              <span className="font-bold text-slate-900">
                                {student.lastName}, {student.firstName}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-medium text-slate-700">{student.lrn}</td>

                          {/* Status Selector Buttons */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() =>
                                    setRoster((prev) =>
                                      prev.map((item) =>
                                        item.id === student.id ? { ...item, status: st } : item
                                      )
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition ${student.status === st
                                    ? st === 'PRESENT'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : st === 'LATE'
                                        ? 'bg-amber-600 text-white shadow-sm'
                                        : st === 'ABSENT'
                                          ? 'bg-red-600 text-white shadow-sm'
                                          : 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={student.remarks}
                              onChange={(e) =>
                                setRoster((prev) =>
                                  prev.map((item) =>
                                    item.id === student.id ? { ...item, remarks: e.target.value } : item
                                  )
                                )
                              }
                              placeholder="Optional remarks (e.g. clinic, field trip)..."
                              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 font-medium"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
