'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  Users,
  Plus,
  Search,
  Upload,
  Eye,
  Edit2,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  X,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

interface StudentItem {
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

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeLevelFilter, setGradeLevelFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [formData, setFormData] = useState({
    lrn: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    sex: 'MALE' as 'MALE' | 'FEMALE',
    birthdate: '2009-06-15',
    age: 17,
    gradeLevel: 'Grade 11',
    section: 'STEM-A',
    trackStrand: 'STEM',
    guardianName: '',
    guardianContact: '',
    address: '',
    rfidNumber: '',
    photoUrl: '',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // CSV Importer Modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [csvPreview, setCsvPreview] = useState<any>(null);
  const [csvImportResult, setCsvImportResult] = useState<any>(null);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvError, setCsvError] = useState('');

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (gradeLevelFilter !== 'ALL') params.append('gradeLevel', gradeLevelFilter);
      if (sectionFilter !== 'ALL') params.append('section', sectionFilter);

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [gradeLevelFilter, sectionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    setFormData({
      lrn: `10928${Math.floor(1000000 + Math.random() * 9000000)}`,
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      sex: 'MALE',
      birthdate: '2009-06-15',
      age: 17,
      gradeLevel: 'Grade 11',
      section: 'STEM-A',
      trackStrand: 'STEM',
      guardianName: '',
      guardianContact: '',
      address: '',
      rfidNumber: '',
      photoUrl: '',
      status: 'ACTIVE',
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (student: StudentItem) => {
    setEditingStudent(student);
    setFormData({
      lrn: student.lrn,
      firstName: student.firstName,
      middleName: student.middleName || '',
      lastName: student.lastName,
      suffix: student.suffix || '',
      sex: student.sex,
      birthdate: student.birthdate.split('T')[0],
      age: student.age,
      gradeLevel: student.gradeLevel,
      section: student.section,
      trackStrand: student.trackStrand || '',
      guardianName: student.guardianName,
      guardianContact: student.guardianContact,
      address: student.address,
      rfidNumber: student.rfidNumber,
      photoUrl: student.photoUrl || '',
      status: student.status,
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setFormError('');
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('category', 'student');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      setFormData((prev) => ({ ...prev, photoUrl: data.url }));
    } catch (err: any) {
      setFormError(err.message || 'Image upload failed.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save student');
      }

      setFormSuccess(editingStudent ? 'Student updated successfully!' : 'Student created successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        fetchStudents();
      }, 700);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete student "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchStudents();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // CSV Importer logic
  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError('');
    setCsvImportResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setIsParsingCsv(true);

      try {
        const res = await fetch('/api/students/import-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvContent: text, action: 'preview' }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to parse CSV');
        }
        setCsvPreview(data);
      } catch (err: any) {
        setCsvError(err.message);
      } finally {
        setIsParsingCsv(false);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!csvContent) return;
    setIsImportingCsv(true);
    setCsvError('');

    try {
      const res = await fetch('/api/students/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          action: 'import',
          mapping: csvPreview?.autoDetectedMapping,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'CSV import failed');
      }

      setCsvImportResult(data);
      fetchStudents();
    } catch (err: any) {
      setCsvError(err.message);
    } finally {
      setIsImportingCsv(false);
    }
  };

  const downloadSampleCsv = () => {
    const sample = `LRN,Last Name,First Name,Middle Name,Suffix,Sex,Birthdate,Age,Grade Level,Section,Track/Strand,Parent/Guardian,Guardian Contact,Address,RFID Number
109283746520,Reyes,Danilo,Cruz,,MALE,2009-04-12,17,Grade 11,STEM-A,STEM,Manuel Reyes,09171112233,12 Mabini St. Batangas City,8800112233
109283746521,Castro,Aileen,Gomez,,FEMALE,2009-09-18,17,Grade 11,STEM-A,STEM,Corazon Castro,09182223344,45 Rizal Ave. Batangas City,8800223344
109283746522,Navarro,Christian,Tan,Jr.,MALE,2010-02-25,16,Grade 10,Bonifacio,,Rodrigo Navarro,09193334455,88 P. Burgos Batangas City,8800334455`;

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'DepEd_SF1_Sample_Masterlist.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell requiredModule="students">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              DepEd Student Masterlist & Registry
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              12-digit Learner Reference Numbers (LRN), 10-digit RFID tags, section assignments, and SF1 CSV importer
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* DepEd CSV Importer Button */}
            <button
              onClick={() => {
                setIsCsvModalOpen(true);
                setCsvPreview(null);
                setCsvImportResult(null);
                setCsvError('');
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Import DepEd SF1 / LIS CSV</span>
            </button>

            {/* Create Student Button */}
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll New Student</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by 12-digit LRN, Name, Section, or 10-digit RFID..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={gradeLevelFilter}
              onChange={(e) => setGradeLevelFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Grade Levels</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11 (SHS)</option>
              <option value="Grade 12">Grade 12 (SHS)</option>
            </select>

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Sections</option>
              <option value="STEM-A">STEM-A</option>
              <option value="Bonifacio">Bonifacio</option>
              <option value="Rizal">Rizal</option>
              <option value="Diamond">Diamond</option>
            </select>
          </div>
        </div>

        {/* Student Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">12-Digit DepEd LRN</th>
                  <th className="py-3 px-4">Grade & Section</th>
                  <th className="py-3 px-4">Sex / Age</th>
                  <th className="py-3 px-4">10-Digit RFID</th>
                  <th className="py-3 px-4">Parent / Guardian</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      Loading student masterlist...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No student records found. Try enrolling a student or importing a DepEd SF1 CSV.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => {
                    const fullName = `${s.lastName}, ${s.firstName}${s.middleName ? ` ${s.middleName[0]}.` : ''}${s.suffix ? ` ${s.suffix}` : ''}`;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-300">
                              {s.photoUrl ? (
                                <img src={s.photoUrl} alt={fullName} className="w-full h-full object-cover" />
                              ) : (
                                s.firstName[0]
                              )}
                            </div>
                            <div className="font-bold text-slate-900">{fullName}</div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.lrn}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {s.gradeLevel} - {s.section}
                          {s.trackStrand && <span className="text-[10px] text-blue-600 block">({s.trackStrand})</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {s.sex} • {s.age} y/o
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{s.rfidNumber}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{s.guardianName}</div>
                          <div className="text-[10px] text-slate-400">{s.guardianContact}</div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/students/${s.id}`}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
                              title="View Individual Attendance History"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
                              title="Edit Student"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(s.id, fullName)}
                              className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition"
                              title="Delete Student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT STUDENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingStudent ? 'Edit Student Record' : 'Enroll New DepEd Learner'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compliant with DepEd Learner Information System (LIS) specifications
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center overflow-hidden border border-slate-300 font-bold shrink-0">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span>Photo</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Photo (JPEG, PNG, WebP &lt; 5MB)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {isUploadingPhoto && <span className="text-[11px] text-blue-600 ml-2">Uploading securely...</span>}
                </div>
              </div>

              {/* Row 1: LRN (12 digits) & RFID (10 digits) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    12-Digit Learner Reference Number (LRN) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={formData.lrn}
                    onChange={(e) => setFormData({ ...formData, lrn: e.target.value.replace(/\D/g, '') })}
                    placeholder="109283746512"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    10-Digit Hardware RFID Number *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formData.rfidNumber}
                    onChange={(e) => setFormData({ ...formData, rfidNumber: e.target.value.replace(/\D/g, '') })}
                    placeholder="5500660077"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-blue-600 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Name */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Suffix</label>
                  <input
                    type="text"
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                    placeholder="Jr."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Demographics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sex *</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Birthdate *</label>
                  <input
                    type="date"
                    required
                    value={formData.birthdate}
                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    min={4}
                    max={30}
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value, 10) || 16 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 4: Grade Level, Section, Track/Strand */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grade Level *</label>
                  <select
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section *</label>
                  <input
                    type="text"
                    required
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="STEM-A, Bonifacio"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Track / Strand (if SHS)</label>
                  <input
                    type="text"
                    value={formData.trackStrand}
                    onChange={(e) => setFormData({ ...formData, trackStrand: e.target.value })}
                    placeholder="STEM, TVL-ICT, HUMSS, ABM"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 5: Guardian & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="Parent / Guardian Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.guardianContact}
                    onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value })}
                    placeholder="09170000000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Barangay, City, Province"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingPhoto}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStudent ? 'Update Student Record' : 'Enroll Student'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPED SF1 / LIS CSV IMPORTER MODAL (Requirement 5.C) */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    DepEd SF1 / LIS Masterlist CSV Importer
                  </h3>
                  <p className="text-xs text-slate-500">
                    Auto-maps DepEd School Form 1 (SF1) columns, validates rows, and bulk upserts into PostgreSQL
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {csvError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{csvError}</span>
              </div>
            )}

            {/* CSV Results Banner */}
            {csvImportResult && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>DepEd CSV Import Completed!</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-2 bg-white rounded-lg border border-emerald-100 font-bold">
                    <div className="text-lg text-slate-900">{csvImportResult.totalRows}</div>
                    <div className="text-[10px] text-slate-500">Processed</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-emerald-100 font-bold">
                    <div className="text-lg text-emerald-600">{csvImportResult.inserted}</div>
                    <div className="text-[10px] text-slate-500">New Enrollees</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-emerald-100 font-bold">
                    <div className="text-lg text-blue-600">{csvImportResult.updated}</div>
                    <div className="text-[10px] text-slate-500">Updated</div>
                  </div>
                </div>

                {csvImportResult.errors?.length > 0 && (
                  <div className="pt-2 text-[11px] text-red-600">
                    <span className="font-bold">{csvImportResult.errors.length} validation errors occurred:</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {csvImportResult.errors.slice(0, 3).map((err: any, idx: number) => (
                        <li key={idx}>
                          Row {err.row}: {err.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Upload & Download Sample */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Select DepEd Masterlist CSV File
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Supports official DepEd LIS export or custom masterlist formats
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download Sample SF1 CSV</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-400 transition bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <label className="cursor-pointer">
                  <span className="text-xs font-bold text-blue-600 hover:text-blue-500">
                    Click to browse CSV file
                  </span>
                  <span className="text-xs text-slate-500"> or drag and drop here</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFileSelect}
                    className="hidden"
                  />
                </label>
                {csvFile && (
                  <div className="mt-2 text-xs font-semibold text-slate-800">
                    Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* Step 2: Auto-Detected Column Mapping Preview */}
              {csvPreview && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Column Mapping Preview ({csvPreview.totalRows} records detected)
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      ✓ DepEd LIS SF1 Headers Auto-Mapped
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-3 rounded-xl bg-slate-100/70 border border-slate-200">
                    <div>
                      <span className="text-slate-400 block">LRN:</span>
                      <strong className="text-slate-800">{csvPreview.autoDetectedMapping.lrn}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Name:</span>
                      <strong className="text-slate-800">
                        {csvPreview.autoDetectedMapping.lastName}, {csvPreview.autoDetectedMapping.firstName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Grade & Section:</span>
                      <strong className="text-slate-800">
                        {csvPreview.autoDetectedMapping.gradeLevel} - {csvPreview.autoDetectedMapping.section}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">10-Digit RFID:</span>
                      <strong className="text-blue-600">
                        {csvPreview.autoDetectedMapping.rfidNumber || 'Auto-Generate'}
                      </strong>
                    </div>
                  </div>

                  {/* Sample Rows Preview */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-40">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          {csvPreview.headers.slice(0, 6).map((h: string, idx: number) => (
                            <th key={idx} className="py-1.5 px-3">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvPreview.previewRows.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {csvPreview.headers.slice(0, 6).map((h: string, cIdx: number) => (
                              <td key={cIdx} className="py-1.5 px-3 font-mono">
                                {r[h] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={!csvPreview || isImportingCsv}
                  onClick={handleExecuteImport}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs font-bold text-white shadow-sm transition flex items-center gap-2"
                >
                  {isImportingCsv && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Execute Bulk Upsert into PostgreSQL</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
