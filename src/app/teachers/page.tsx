'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Eye,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface TeacherItem {
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

export default function TeachersPage() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null);
  const [formData, setFormData] = useState({
    employeeNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    position: 'Teacher I',
    department: 'Science & Technology',
    email: '',
    contactNumber: '',
    dateHired: new Date().toISOString().split('T')[0],
    rfidNumber: '',
    photoUrl: '',
    employmentStatus: 'REGULAR',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Check role mutation restriction (head_teacher is strictly read-only per Section 5.B)
  const canMutate = user?.role === 'SUPERADMIN' || user?.role === 'PRINCIPAL' || user?.role === 'ADMIN_AIDE';

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (departmentFilter !== 'ALL') params.append('department', departmentFilter);
      if (positionFilter !== 'ALL') params.append('position', positionFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await fetch(`/api/teachers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers);
      }
    } catch (err) {
      console.error('Failed to load teachers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [departmentFilter, positionFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeachers();
  };

  const openCreateModal = () => {
    setEditingTeacher(null);
    setFormData({
      employeeNumber: `T-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      position: 'Teacher I',
      department: 'Science & Technology',
      email: '',
      contactNumber: '',
      dateHired: new Date().toISOString().split('T')[0],
      rfidNumber: '',
      photoUrl: '',
      employmentStatus: 'REGULAR',
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: TeacherItem) => {
    setEditingTeacher(teacher);
    setFormData({
      employeeNumber: teacher.employeeNumber,
      firstName: teacher.firstName,
      middleName: teacher.middleName || '',
      lastName: teacher.lastName,
      suffix: teacher.suffix || '',
      position: teacher.position,
      department: teacher.department,
      email: teacher.email || '',
      contactNumber: teacher.contactNumber,
      dateHired: teacher.dateHired.split('T')[0],
      rfidNumber: teacher.rfidNumber,
      photoUrl: teacher.photoUrl || '',
      employmentStatus: teacher.employmentStatus,
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
      uploadFormData.append('category', 'teacher');

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
      setFormError(err.message || 'Image upload failed. Ensure file is JPEG, PNG, or WebP under 5MB.');
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
      const url = editingTeacher ? `/api/teachers/${editingTeacher.id}` : '/api/teachers';
      const method = editingTeacher ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save teacher');
      }

      setFormSuccess(editingTeacher ? 'Teacher updated successfully!' : 'Teacher created successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        fetchTeachers();
      }, 700);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete teacher "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchTeachers();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <AppShell requiredModule="teachers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Faculty & Teacher Masterlist
              </h1>
              {!canMutate && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                  Read-Only Mode (Head Teacher)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Faculty registry, 10-digit RFID cards, attendance history, and DepEd Form 48 timecard generator
            </p>
          </div>

          {/* Create Button (Strictly hidden for head_teacher per spec!) */}
          {canMutate && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Teacher</span>
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Employee Number, Name, or 10-digit RFID..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Departments</option>
              <option value="Science & Technology">Science & Technology</option>
              <option value="Mathematics">Mathematics</option>
              <option value="English & Literature">English & Literature</option>
              <option value="Filipino">Filipino</option>
              <option value="Social Studies">Social Studies</option>
              <option value="MAPEH">MAPEH</option>
              <option value="TLE / TVL">TLE / TVL</option>
              <option value="Senior High School">Senior High School</option>
            </select>

            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Positions</option>
              <optgroup label="School Leadership">
                <option value="Principal IV">Principal IV</option>
                <option value="Principal III">Principal III</option>
                <option value="Principal II">Principal II</option>
                <option value="Principal I">Principal I</option>
              </optgroup>
              <optgroup label="Head Teachers">
                <option value="Head Teacher III">Head Teacher III</option>
                <option value="Head Teacher II">Head Teacher II</option>
                <option value="Head Teacher I">Head Teacher I</option>
              </optgroup>
              <optgroup label="Master Teachers">
                <option value="Master Teacher II">Master Teacher II</option>
                <option value="Master Teacher I">Master Teacher I</option>
              </optgroup>
              <optgroup label="Teaching Faculty">
                <option value="Teacher III">Teacher III</option>
                <option value="Teacher II">Teacher II</option>
                <option value="Teacher I">Teacher I</option>
              </optgroup>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="REGULAR">Regular (Permanent)</option>
              <option value="PROBATIONARY">Probationary</option>
              <option value="CONTRACTUAL">Contractual</option>
            </select>
          </div>
        </div>

        {/* Teachers Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Employee No.</th>
                  <th className="py-3 px-4">Position / Designation</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">10-Digit RFID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      Loading teachers list...
                    </td>
                  </tr>
                ) : teachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No teacher records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  teachers.map((t) => {
                    const fullName = `${t.lastName}, ${t.firstName}${t.middleName ? ` ${t.middleName[0]}.` : ''}${t.suffix ? ` ${t.suffix}` : ''}`;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-300">
                              {t.photoUrl ? (
                                <img src={t.photoUrl} alt={fullName} className="w-full h-full object-cover" />
                              ) : (
                                t.firstName[0]
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{fullName}</div>
                              <div className="text-[11px] text-slate-400">{t.email || t.contactNumber}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-slate-700">{t.employeeNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{t.position}</td>
                        <td className="py-3 px-4 text-slate-600">{t.department}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{t.rfidNumber}</td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.employmentStatus === 'REGULAR'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.employmentStatus}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Individual Profile & Attendance History */}
                            <Link
                              href={`/teachers/${t.id}`}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
                              title="View Personal Attendance History & Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>

                            {/* DepEd Form 48 DTR Generator */}
                            <Link
                              href={`/teachers/${t.id}?tab=timecard`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition"
                              title="Generate DepEd Form 48 (Daily Time Record)"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Form 48</span>
                            </Link>

                            {/* Mutation buttons: strictly hidden for head_teacher */}
                            {canMutate && (
                              <>
                                <button
                                  onClick={() => openEditModal(t)}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
                                  title="Edit Teacher"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTeacher(t.id, fullName)}
                                  className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition"
                                  title="Delete Teacher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
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

      {/* CREATE / EDIT TEACHER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingTeacher ? 'Edit Teacher Record' : 'Register New Faculty Member'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Provide complete official DepEd employee and RFID credentials
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
              {/* Photo Upload & Preview */}
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
                    Teacher Profile Photo (JPEG, PNG, WebP &lt; 5MB)
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

              {/* Row 1: Employee Number & RFID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                    placeholder="T-2026-0001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    10-Digit RFID Number *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formData.rfidNumber}
                    onChange={(e) => setFormData({ ...formData, rfidNumber: e.target.value.replace(/\D/g, '') })}
                    placeholder="1000000001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-blue-600 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Names */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Maria"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    placeholder="Elena"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Santos"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Suffix</label>
                  <input
                    type="text"
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                    placeholder="Jr., III"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Position & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position / Designation *
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  >
                    <optgroup label="School Leadership & Administration">
                      <option value="Principal IV">Principal IV</option>
                      <option value="Principal III">Principal III</option>
                      <option value="Principal II">Principal II</option>
                      <option value="Principal I">Principal I</option>
                      <option value="Assistant Principal II">Assistant Principal II</option>
                      <option value="Assistant Principal I">Assistant Principal I</option>
                    </optgroup>
                    <optgroup label="Head Teachers">
                      <option value="Head Teacher VI">Head Teacher VI</option>
                      <option value="Head Teacher V">Head Teacher V</option>
                      <option value="Head Teacher IV">Head Teacher IV</option>
                      <option value="Head Teacher III">Head Teacher III</option>
                      <option value="Head Teacher II">Head Teacher II</option>
                      <option value="Head Teacher I">Head Teacher I</option>
                    </optgroup>
                    <optgroup label="Master Teachers">
                      <option value="Master Teacher IV">Master Teacher IV</option>
                      <option value="Master Teacher III">Master Teacher III</option>
                      <option value="Master Teacher II">Master Teacher II</option>
                      <option value="Master Teacher I">Master Teacher I</option>
                    </optgroup>
                    <optgroup label="Teaching Faculty">
                      <option value="Teacher III">Teacher III</option>
                      <option value="Teacher II">Teacher II</option>
                      <option value="Teacher I">Teacher I</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department / Specialization *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Science & Technology">Science & Technology</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="English & Literature">English & Literature</option>
                    <option value="Filipino">Filipino</option>
                    <option value="Social Studies">Social Studies</option>
                    <option value="MAPEH">MAPEH</option>
                    <option value="TLE / TVL">TLE / TVL</option>
                    <option value="Senior High School">Senior High School</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Contact & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="maria.santos@deped.gov.ph"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="09171234567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 5: Date Hired & Employment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date Hired *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateHired}
                    onChange={(e) => setFormData({ ...formData, dateHired: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employment Status *
                  </label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="REGULAR">Regular (Permanent)</option>
                    <option value="PROBATIONARY">Probationary</option>
                    <option value="CONTRACTUAL">Contractual</option>
                    <option value="SUBSTITUTE">Substitute</option>
                  </select>
                </div>
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
                  <span>{editingTeacher ? 'Update Teacher Record' : 'Register Faculty Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
