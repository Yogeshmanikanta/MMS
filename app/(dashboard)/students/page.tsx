'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { localDb, getTodayString } from '@/lib/db';
import { Student, StudentStatus, BulkImportRow } from '@/lib/types';
import { EmptyState } from '@/components/empty-state';
import { parseAndValidateCSV } from '@/lib/csv-parser';
import { 
  Users, 
  UserPlus, 
  Upload, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  UserX, 
  UserCheck,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
  X
} from 'lucide-react';

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>(() => localDb.getStudents());
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Add/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    roll_number: '',
    name: '',
    department: 'Computer Science',
    year: '1st Year',
    course: 'B.Tech',
    contact: '',
    status: 'active' as StudentStatus,
    joined_at: getTodayString()
  });
  const [formError, setFormError] = useState('');

  // Bulk Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<BulkImportRow[]>([]);
  const [importValidCount, setImportValidCount] = useState(0);
  const [importInvalidCount, setImportInvalidCount] = useState(0);
  const [importFileName, setImportFileName] = useState('');

  const refreshStudents = () => {
    setStudents(localDb.getStudents());
  };

  // Filtered & Paginated list
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = search === '' || 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.roll_number.toLowerCase().includes(search.toLowerCase());
      
      const matchesDept = deptFilter === 'all' || s.department === deptFilter;
      const matchesYear = yearFilter === 'all' || s.year === yearFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

      return matchesSearch && matchesDept && matchesYear && matchesStatus;
    });
  }, [students, search, deptFilter, yearFilter, statusFilter]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Handle Add / Edit Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.roll_number.trim()) {
      setFormError('Roll number is strictly required.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Student name is strictly required.');
      return;
    }

    try {
      if (editingStudent) {
        localDb.updateStudent(editingStudent.id, formData);
      } else {
        localDb.addStudent(formData);
      }
      refreshStudents();
      setIsModalOpen(false);
      setEditingStudent(null);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Error saving student');
    }
  };

  const resetForm = () => {
    setFormData({
      roll_number: '',
      name: '',
      department: 'Computer Science',
      year: '1st Year',
      course: 'B.Tech',
      contact: '',
      status: 'active',
      joined_at: getTodayString()
    });
    setFormError('');
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      roll_number: student.roll_number,
      name: student.name,
      department: student.department,
      year: student.year,
      course: student.course,
      contact: student.contact || '',
      status: student.status,
      joined_at: student.joined_at || getTodayString()
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleToggleStatus = (student: Student) => {
    const newStatus: StudentStatus = student.status === 'active' ? 'inactive' : 'active';
    localDb.toggleStudentStatus(student.id, newStatus);
    refreshStudents();
  };

  // CSV File Upload Handler for Preview Validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { rows, validCount, invalidCount } = parseAndValidateCSV(text, students);
      setImportRows(rows);
      setImportValidCount(validCount);
      setImportInvalidCount(invalidCount);
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCommitImport = () => {
    const validRowsToImport = importRows.filter(r => r.isValid).map(r => ({
      roll_number: r.roll_number,
      name: r.name,
      department: r.department,
      year: r.year,
      course: r.course,
      contact: r.contact,
      status: 'active' as StudentStatus,
      joined_at: r.joined_at || getTodayString()
    }));

    localDb.bulkImportStudents(validRowsToImport);
    refreshStudents();
    setIsImportModalOpen(false);
    setImportRows([]);
  };

  return (
    <div className="space-y-6">
      <Header title="Student Directory & Registration" />

      {/* Action Header & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search by Roll No or Name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="input-base input-with-icon text-xs"
            />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
            className="input-base w-auto text-xs"
          >
            <option value="all">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electronics & Comm.">Electronics & Comm.</option>
            <option value="Mechanical Engg.">Mechanical Engg.</option>
            <option value="Civil Engg.">Civil Engg.</option>
            <option value="Information Tech.">Information Tech.</option>
            <option value="Electrical Engg.">Electrical Engg.</option>
            <option value="Computer Applications">Computer Applications</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="input-base w-auto text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Action Buttons: Add Student, Import JSON & Bulk CSV */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/students/import')}
            className="btn-secondary text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-semibold flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Import Student Data (JSON)</span>
          </button>

          <button
            onClick={() => { resetForm(); setEditingStudent(null); setIsModalOpen(true); }}
            className="btn-primary text-xs"
          >
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Main Student Data Table */}
      {paginatedStudents.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Try adjusting your search query or department filters, or add a new student."
          actionLabel="Clear Filters"
          onAction={() => { setSearch(''); setDeptFilter('all'); setYearFilter('all'); setStatusFilter('all'); }}
          iconType="search"
        />
      ) : (
        <div className="space-y-3">
          <div className="table-container">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header">Roll Number</th>
                  <th className="table-header">Student Name</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Year & Course</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Joining Date</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedStudents.map((st) => (
                  <tr key={st.id} className="table-row">
                    <td className="table-cell font-mono font-semibold text-zinc-900 text-xs">
                      {st.roll_number}
                    </td>
                    <td className="table-cell font-medium text-zinc-900">
                      {st.name}
                    </td>
                    <td className="table-cell text-zinc-600 text-xs">
                      {st.department}
                    </td>
                    <td className="table-cell text-zinc-600 text-xs">
                      {st.year} ({st.course})
                    </td>
                    <td className="table-cell text-zinc-500 text-xs">
                      {st.contact || '—'}
                    </td>
                    <td className="table-cell text-zinc-500 text-xs font-mono">
                      {st.joined_at}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`badge ${st.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {st.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(st)}
                          title="Edit Student"
                          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(st)}
                          title={st.status === 'active' ? 'Deactivate Student (Soft Delete)' : 'Reactivate Student'}
                          className={`p-1.5 rounded transition-colors ${
                            st.status === 'active'
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {st.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
            <span>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="btn-secondary text-xs px-2 py-1 h-7"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-2 font-medium text-zinc-700">Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="btn-secondary text-xs px-2 py-1 h-7"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-900">
                {editingStudent ? 'Edit Student Details' : 'Register New Student'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 mb-1 block">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24CSE010"
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value.toUpperCase() })}
                    className="input-base font-mono uppercase text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Student Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-base text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 mb-1 block">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="input-base text-xs"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics & Comm.">Electronics & Comm.</option>
                    <option value="Mechanical Engg.">Mechanical Engg.</option>
                    <option value="Civil Engg.">Civil Engg.</option>
                    <option value="Information Tech.">Information Tech.</option>
                    <option value="Electrical Engg.">Electrical Engg.</option>
                    <option value="Computer Applications">Computer Applications</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 mb-1 block">Academic Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="input-base text-xs"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 mb-1 block">Course</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech / MCA"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="input-base text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 mb-1 block">Contact Mobile (Optional)</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="input-base text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 mb-1 block">Activation Date (Joined)</label>
                  <input
                    type="date"
                    value={formData.joined_at}
                    onChange={(e) => setFormData({ ...formData, joined_at: e.target.value })}
                    className="input-base text-xs font-mono"
                  />
                  <p className="text-[10px] text-zinc-400 mt-0.5">Used for mid-month joining billing</p>
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 mb-1 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                    className="input-base text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200">
                  {formError}
                </p>
              )}

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  {editingStudent ? 'Save Changes' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Validation Preview Screen */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-lg max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Bulk Import Validation Preview</h3>
                <p className="text-xs text-zinc-500">File: {importFileName}</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Import Summary Pill */}
            <div className="flex items-center gap-4 text-xs p-3 bg-zinc-50 rounded-md border border-zinc-200">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{importValidCount} Valid Rows Ready to Import</span>
              </div>
              {importInvalidCount > 0 && (
                <div className="flex items-center gap-1.5 text-red-700 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{importInvalidCount} Rows Flagged with Errors (Will be Skipped)</span>
                </div>
              )}
            </div>

            {/* Validation Table */}
            <div className="flex-1 overflow-y-auto border border-zinc-200 rounded-md">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="py-2.5 px-3 font-semibold text-zinc-600">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-zinc-600">Roll Number</th>
                    <th className="py-2.5 px-3 font-semibold text-zinc-600">Name</th>
                    <th className="py-2.5 px-3 font-semibold text-zinc-600">Department</th>
                    <th className="py-2.5 px-3 font-semibold text-zinc-600">Validation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {importRows.map((row, idx) => (
                    <tr key={idx} className={row.isValid ? 'bg-white' : 'bg-red-50/50'}>
                      <td className="py-2 px-3">
                        {row.isValid ? (
                          <span className="badge badge-success">Valid</span>
                        ) : (
                          <span className="badge badge-danger">Error</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold">{row.roll_number}</td>
                      <td className="py-2 px-3">{row.name}</td>
                      <td className="py-2 px-3 text-zinc-600">{row.department}</td>
                      <td className="py-2 px-3">
                        {row.isValid ? (
                          <span className="text-zinc-500">Ready for commit</span>
                        ) : (
                          <span className="text-red-600 font-medium">{row.errors.join(' | ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Only valid rows will be committed to the database.</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsImportModalOpen(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button
                  onClick={handleCommitImport}
                  disabled={importValidCount === 0}
                  className="btn-primary text-xs"
                >
                  Confirm & Commit {importValidCount} Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
