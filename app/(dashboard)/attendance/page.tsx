'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { localDb, getTodayString, getPreviousDateString } from '@/lib/db';
import { Student, MealType } from '@/lib/types';
import { useToast } from '@/components/toast';
import { 
  Search, 
  CheckCircle2, 
  Calendar, 
  Copy, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Utensils, 
  Coffee, 
  Moon, 
  Sun,
  AlertCircle
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [search, setSearch] = useState('');
  const [activeStudents, setActiveStudents] = useState<Student[]>([]);
  
  // Attendance draft state for each student: studentId -> { breakfast: boolean, lunch: boolean, dinner: boolean }
  const [attendanceDraft, setAttendanceDraft] = useState<Map<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>>(new Map());
  
  const { showToast } = useToast();
  const [isSaved, setIsSaved] = useState(false);

  // Load active students and attendance state when date changes
  useEffect(() => {
    const students = localDb.getStudents({ status: 'active' });
    setActiveStudents(students);

    const stateMap = localDb.getAttendanceStateForDate(selectedDate);
    setAttendanceDraft(new Map(stateMap));

    const alreadySaved = localDb.hasAttendanceForDate(selectedDate);
    setIsSaved(alreadySaved);
  }, [selectedDate]);


  // Toggle meal selection for a student
  const handleToggleMeal = (studentId: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
    setAttendanceDraft(prev => {
      const next = new Map(prev);
      const current = next.get(studentId) || { breakfast: true, lunch: true, dinner: true };
      next.set(studentId, {
        ...current,
        [meal]: !current[meal]
      });
      return next;
    });
  };

  // Copy previous day's attendance
  const handleCopyPreviousDay = () => {
    const res = localDb.copyAttendanceFromPreviousDay(selectedDate);
    if (res.success) {
      const updatedState = localDb.getAttendanceStateForDate(selectedDate);
      setAttendanceDraft(new Map(updatedState));
      setIsSaved(true);
      showToast('success', 'Attendance Copied', `Successfully copied attendance from previous date (${res.sourceDate}). You can edit and save any changes.`);
    } else {
      showToast('info', 'No Previous Data', 'No previous day attendance records found to copy. Initialized with all meals selected.');
    }
  };

  // Reset current view to default: all 3 meals selected for every student
  const handleResetToAllSelected = () => {
    const newMap = new Map<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>();
    activeStudents.forEach(st => {
      newMap.set(st.id, { breakfast: true, lunch: true, dinner: true });
    });
    setAttendanceDraft(newMap);
    showToast('info', 'Reset Complete', 'Reset all students to default (Breakfast ✓, Lunch ✓, Dinner ✓).');
  };

  // Save attendance for the selected date
  const handleSaveAttendance = () => {
    const records = Array.from(attendanceDraft.entries()).map(([student_id, meals]) => ({
      student_id,
      breakfast: meals.breakfast,
      lunch: meals.lunch,
      dinner: meals.dinner
    }));

    localDb.saveDailyAttendanceRecords(selectedDate, records);
    setIsSaved(true);
    showToast('success', 'Attendance Saved!', `Attendance for ${selectedDate} has been saved with ${records.length} student records.`);
  };

  // Current Meal Prices
  const breakfastPrice = localDb.getEffectiveMealPrice('breakfast', selectedDate);
  const lunchPrice = localDb.getEffectiveMealPrice('lunch', selectedDate);
  const dinnerPrice = localDb.getEffectiveMealPrice('dinner', selectedDate);

  // Filter students
  const filteredStudents = activeStudents.filter(st => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return st.name.toLowerCase().includes(q) || st.roll_number.toLowerCase().includes(q) || st.department.toLowerCase().includes(q);
  });

  // Calculate totals
  let totalBreakfast = 0;
  let totalLunch = 0;
  let totalDinner = 0;

  attendanceDraft.forEach((val) => {
    if (val.breakfast) totalBreakfast++;
    if (val.lunch) totalLunch++;
    if (val.dinner) totalDinner++;
  });

  return (
    <div className="space-y-6">
      <Header title="Daily Attendance Management" />

      {/* Control Panel Header */}
      <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          {/* Date Selector & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                Select Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-blue-600 absolute left-3 top-2.5 pointer-events-none z-10" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-base input-with-icon text-xs font-mono font-bold w-44 border-blue-200 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-5">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                isSaved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                {isSaved ? 'Attendance Saved' : 'Draft / Unsaved Changes'}
              </span>
            </div>

            {/* Rush Student Search */}
            <div className="relative w-64 pt-5">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-7 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search student or roll no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-base input-with-icon text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <button
              onClick={handleCopyPreviousDay}
              className="btn-secondary text-xs flex items-center gap-1.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              title="Copy attendance details from previous day"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              Copy Previous Day
            </button>

            <button
              onClick={handleResetToAllSelected}
              className="btn-secondary text-xs flex items-center gap-1.5"
              title="Reset all students to have Breakfast, Lunch & Dinner selected"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
              Select All Meals
            </button>

            <button
              onClick={handleSaveAttendance}
              className="btn-primary text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Save className="w-4 h-4" />
              Save Attendance
            </button>
          </div>
        </div>

        {/* Quick Stats Summary Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-zinc-800">Breakfast (₹{breakfastPrice})</span>
            </div>
            <span className="font-bold text-amber-900 font-mono text-sm">{totalBreakfast} Students</span>
          </div>

          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-zinc-800">Lunch (₹{lunchPrice})</span>
            </div>
            <span className="font-bold text-blue-900 font-mono text-sm">{totalLunch} Students</span>
          </div>

          <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-zinc-800">Dinner (₹{dinnerPrice})</span>
            </div>
            <span className="font-bold text-indigo-900 font-mono text-sm">{totalDinner} Students</span>
          </div>

          <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-md flex items-center justify-between">
            <span className="font-semibold text-zinc-700">Total Active Students</span>
            <span className="font-bold text-zinc-900 font-mono text-sm">{activeStudents.length}</span>
          </div>
        </div>
      </div>


      {/* Attendance Grid */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Clear search input to view full student daily attendance list."
          iconType="search"
        />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center text-xs">
            <span className="font-bold text-zinc-800">
              Daily Attendance Ledger for Date: <span className="font-mono text-blue-700">{selectedDate}</span>
            </span>
            <span className="text-zinc-500 italic">
              * By default, Breakfast, Lunch, and Dinner are all selected. Click to toggle meal status.
            </span>
          </div>

          <div className="table-container">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header">Roll Number</th>
                  <th className="table-header">Student Name</th>
                  <th className="table-header">Department</th>
                  <th className="table-header text-center w-36">Breakfast (₹{breakfastPrice})</th>
                  <th className="table-header text-center w-36">Lunch (₹{lunchPrice})</th>
                  <th className="table-header text-center w-36">Dinner (₹{dinnerPrice})</th>
                  <th className="table-header text-center w-36">Day Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredStudents.map((st) => {
                  const state = attendanceDraft.get(st.id) || { breakfast: true, lunch: true, dinner: true };
                  const attendedCount = (state.breakfast ? 1 : 0) + (state.lunch ? 1 : 0) + (state.dinner ? 1 : 0);

                  return (
                    <tr key={st.id} className="table-row">
                      <td className="table-cell font-mono font-bold text-zinc-900 text-xs">
                        {st.roll_number}
                      </td>
                      <td className="table-cell font-semibold text-zinc-900">
                        {st.name}
                      </td>
                      <td className="table-cell text-zinc-500 text-xs">
                        {st.department} • {st.year}
                      </td>

                      {/* Breakfast Toggle */}
                      <td className="table-cell text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleMeal(st.id, 'breakfast')}
                          className={`w-full py-1.5 px-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                            state.breakfast
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-zinc-100 text-zinc-400 border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                          }`}
                        >
                          {state.breakfast ? '✓ Included' : '✗ Skipped'}
                        </button>
                      </td>

                      {/* Lunch Toggle */}
                      <td className="table-cell text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleMeal(st.id, 'lunch')}
                          className={`w-full py-1.5 px-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                            state.lunch
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-zinc-100 text-zinc-400 border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                          }`}
                        >
                          {state.lunch ? '✓ Included' : '✗ Skipped'}
                        </button>
                      </td>

                      {/* Dinner Toggle */}
                      <td className="table-cell text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleMeal(st.id, 'dinner')}
                          className={`w-full py-1.5 px-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                            state.dinner
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-zinc-100 text-zinc-400 border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                          }`}
                        >
                          {state.dinner ? '✓ Included' : '✗ Skipped'}
                        </button>
                      </td>

                      {/* Day Status Summary Badge */}
                      <td className="table-cell text-center font-xs">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          attendedCount === 3
                            ? 'bg-emerald-100 text-emerald-800'
                            : attendedCount > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {attendedCount === 3 ? 'Full Day (3/3)' : `${attendedCount}/3 Meals`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">
              Showing {filteredStudents.length} student records for {selectedDate}
            </span>
            <button
              onClick={handleSaveAttendance}
              className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Attendance Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
