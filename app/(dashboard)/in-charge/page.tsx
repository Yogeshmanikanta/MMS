'use client';

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/header';
import { localDb, getTodayString } from '@/lib/db';
import { Student, MealType } from '@/lib/types';
import { Search, CheckCircle2, AlertCircle, ArrowRight, UserCheck, Sparkles } from 'lucide-react';

export default function InChargePage() {
  const todayStr = getTodayString();
  const [queryRoll, setQueryRoll] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [mealStatus, setMealStatus] = useState<Record<MealType, 'present' | 'absent' | 'unmarked'>>({
    breakfast: 'unmarked',
    lunch: 'unmarked',
    dinner: 'unmarked'
  });

  // Partial Roll Number & Name live search
  const matchingStudents = useMemo(() => {
    if (!queryRoll.trim()) return [];
    return localDb.searchStudentsByPartialRoll(queryRoll.trim());
  }, [queryRoll]);

  const selectStudent = (st: Student) => {
    setSelectedStudent(st);
    setSuccessMsg('');
    setErrorMsg('');
    refreshStudentMealState(st.id);
  };

  const refreshStudentMealState = (studentId: string) => {
    const records = localDb.getAttendanceForDate(todayStr).filter(r => r.student_id === studentId);
    const newStatus: Record<MealType, 'present' | 'absent' | 'unmarked'> = {
      breakfast: 'unmarked',
      lunch: 'unmarked',
      dinner: 'unmarked'
    };
    records.forEach(r => {
      newStatus[r.meal_type] = r.status as any;
    });
    setMealStatus(newStatus);
  };

  const handleMarkMeal = (mealType: MealType, status: 'present' | 'absent') => {
    if (!selectedStudent) return;

    // Block re-marking if already marked for today
    if (mealStatus[mealType] !== 'unmarked') {
      setErrorMsg(`Meal ${mealType.toUpperCase()} is already recorded as "${mealStatus[mealType].toUpperCase()}" for today.`);
      return;
    }

    localDb.markAttendance(selectedStudent.id, mealType, todayStr, status, 'admin');
    setSuccessMsg(`Marked ${mealType.toUpperCase()} as ${status.toUpperCase()} for ${selectedStudent.name} (${selectedStudent.roll_number}).`);
    setErrorMsg('');
    refreshStudentMealState(selectedStudent.id);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Header title="Rapid Roll Number Lookup & Attendance" />

      {/* Partial Search Card */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900">Partial Roll Number / Name Search</h3>
          <p className="text-xs text-zinc-500">
            Type a few digits (e.g. <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono font-bold text-zinc-800">001</code>, <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono font-bold text-zinc-800">015</code>, or <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono font-bold text-zinc-800">CSE</code>) to instantly filter students.
          </p>
        </div>

        {/* Input Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Type last digits of Roll Number (e.g. 001, 015) or Name..."
            value={queryRoll}
            onChange={(e) => setQueryRoll(e.target.value.toUpperCase())}
            className="input-base input-with-icon h-11 text-sm font-mono uppercase border-zinc-300 focus:ring-zinc-900"
          />
        </div>

        {/* Live Matching Candidates Dropdown / List */}
        {queryRoll.trim() && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Matching Students ({matchingStudents.length})
            </span>

            {matchingStudents.length === 0 ? (
              <p className="text-xs text-zinc-400 italic p-3 bg-zinc-50 rounded border border-zinc-200 text-center">
                No active students match "{queryRoll}". Try entering different digits.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {matchingStudents.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => selectStudent(st)}
                    className={`p-3 rounded-md border text-left transition-all flex items-center justify-between ${
                      selectedStudent?.id === st.id
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                        : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800'
                    }`}
                  >
                    <div>
                      <span className="font-mono text-xs font-bold block">{st.roll_number}</span>
                      <span className="text-xs truncate block">{st.name}</span>
                      <span className={`text-[10px] ${selectedStudent?.id === st.id ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {st.department}
                      </span>
                    </div>
                    <ArrowRight className={`w-4 h-4 ${selectedStudent?.id === st.id ? 'text-blue-400' : 'text-zinc-400'}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Selected Student Card & Meal Attendance Grid */}
      {selectedStudent && (
        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Selected Student</span>
              <h2 className="text-base font-bold text-zinc-900">{selectedStudent.name}</h2>
              <p className="text-xs text-zinc-500">{selectedStudent.department} • {selectedStudent.year} ({selectedStudent.course})</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-zinc-900 bg-zinc-100 px-3 py-1 rounded border border-zinc-200">
                {selectedStudent.roll_number}
              </span>
              <div className="mt-1">
                <span className={`badge ${selectedStudent.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                  {selectedStudent.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Today's Meals Action Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Today's Meal Status ({todayStr})</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Breakfast Card */}
              <div className="p-4 rounded-md border border-zinc-200 bg-zinc-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-800">Breakfast (₹35)</span>
                  <span className={`badge ${
                    mealStatus.breakfast === 'present' ? 'badge-success' : mealStatus.breakfast === 'absent' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {mealStatus.breakfast.toUpperCase()}
                  </span>
                </div>

                {mealStatus.breakfast === 'unmarked' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkMeal('breakfast', 'present')}
                      className="btn-primary text-xs flex-1 py-1 h-8"
                    >
                      Mark Present
                    </button>
                    <button
                      onClick={() => handleMarkMeal('breakfast', 'absent')}
                      className="btn-secondary text-xs flex-1 py-1 h-8 text-red-600 hover:bg-red-50"
                    >
                      Mark Absent
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic bg-white p-2 rounded border border-zinc-200 text-center">
                    Already Recorded for Today
                  </p>
                )}
              </div>

              {/* Lunch Card */}
              <div className="p-4 rounded-md border border-zinc-200 bg-zinc-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-800">Lunch (₹65)</span>
                  <span className={`badge ${
                    mealStatus.lunch === 'present' ? 'badge-success' : mealStatus.lunch === 'absent' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {mealStatus.lunch.toUpperCase()}
                  </span>
                </div>

                {mealStatus.lunch === 'unmarked' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkMeal('lunch', 'present')}
                      className="btn-primary text-xs flex-1 py-1 h-8"
                    >
                      Mark Present
                    </button>
                    <button
                      onClick={() => handleMarkMeal('lunch', 'absent')}
                      className="btn-secondary text-xs flex-1 py-1 h-8 text-red-600 hover:bg-red-50"
                    >
                      Mark Absent
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic bg-white p-2 rounded border border-zinc-200 text-center">
                    Already Recorded for Today
                  </p>
                )}
              </div>

              {/* Dinner Card */}
              <div className="p-4 rounded-md border border-zinc-200 bg-zinc-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-800">Dinner (₹55)</span>
                  <span className={`badge ${
                    mealStatus.dinner === 'present' ? 'badge-success' : mealStatus.dinner === 'absent' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {mealStatus.dinner.toUpperCase()}
                  </span>
                </div>

                {mealStatus.dinner === 'unmarked' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkMeal('dinner', 'present')}
                      className="btn-primary text-xs flex-1 py-1 h-8"
                    >
                      Mark Present
                    </button>
                    <button
                      onClick={() => handleMarkMeal('dinner', 'absent')}
                      className="btn-secondary text-xs flex-1 py-1 h-8 text-red-600 hover:bg-red-50"
                    >
                      Mark Absent
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic bg-white p-2 rounded border border-zinc-200 text-center">
                    Already Recorded for Today
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
