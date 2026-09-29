'use client';

import React, { useState } from 'react';
import { localDb, getTodayString } from '@/lib/db';
import { MealType, Student } from '@/lib/types';
import { Footer } from '@/components/footer';
import { Building2, CheckCircle2, AlertCircle, Calendar, ShieldCheck } from 'lucide-react';

export default function StudentSelfAttendancePage() {
  const todayStr = getTodayString();
  const [rollNumber, setRollNumber] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);
  
  const [selectedMeals, setSelectedMeals] = useState<Record<MealType, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false
  });

  const [existingRecorded, setExistingRecorded] = useState<Record<MealType, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Verify Roll Number
  const handleVerifyRollNumber = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setVerifiedStudent(null);

    const roll = rollNumber.trim();
    if (!roll) {
      setErrorMsg('Please enter your assigned Roll Number.');
      return;
    }

    const st = localDb.getStudentByRollNumber(roll);
    if (!st) {
      setErrorMsg(`Roll Number "${roll}" is not registered in the system. Please check for typos.`);
      return;
    }

    if (st.status !== 'active') {
      setErrorMsg(`Student account for ${st.name} is currently inactive. Contact the Mess Warden.`);
      return;
    }

    setVerifiedStudent(st);

    // Check existing recorded attendance for today
    const todayAtt = localDb.getAttendanceForDate(todayStr).filter(a => a.student_id === st.id);
    const recorded = { breakfast: false, lunch: false, dinner: false };
    todayAtt.forEach(a => {
      if (a.status === 'present') {
        recorded[a.meal_type] = true;
      }
    });
    setExistingRecorded(recorded);
  };

  // Step 2: Submit Self Attendance
  const handleSubmitSelfAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!verifiedStudent) return;

    const anySelected = selectedMeals.breakfast || selectedMeals.lunch || selectedMeals.dinner;
    if (!anySelected) {
      setErrorMsg('Please select at least one meal to mark your attendance.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedMeals.breakfast && !existingRecorded.breakfast) {
        localDb.markAttendance(verifiedStudent.id, 'breakfast', todayStr, 'present', 'student_self');
      }
      if (selectedMeals.lunch && !existingRecorded.lunch) {
        localDb.markAttendance(verifiedStudent.id, 'lunch', todayStr, 'present', 'student_self');
      }
      if (selectedMeals.dinner && !existingRecorded.dinner) {
        localDb.markAttendance(verifiedStudent.id, 'dinner', todayStr, 'present', 'student_self');
      }

      setSuccessMsg(`Attendance successfully recorded for ${verifiedStudent.name} on ${todayStr}!`);
      setSelectedMeals({ breakfast: false, lunch: false, dinner: false });
      
      // Update existing
      setExistingRecorded({
        breakfast: existingRecorded.breakfast || selectedMeals.breakfast,
        lunch: existingRecorded.lunch || selectedMeals.lunch,
        dinner: existingRecorded.dinner || selectedMeals.dinner,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-between">
      {/* Mobile-First Header */}
      <header className="bg-zinc-900 text-white p-4 text-center border-b border-zinc-800">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <h1 className="text-sm font-bold tracking-tight">NYTLabs College Mess</h1>
        </div>
        <p className="text-[11px] text-zinc-400 mt-0.5">Student Self-Attendance Portal</p>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center space-y-4">
        {/* Date Lock Card */}
        <div className="bg-white border border-zinc-200 rounded-lg p-3 text-center shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Attendance Date:</span>
          </div>
          <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded border border-zinc-200">
            {todayStr} (Locked to Today)
          </span>
        </div>

        {/* Step 1: Roll Number Entry */}
        {!verifiedStudent ? (
          <form onSubmit={handleVerifyRollNumber} className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-4">
            <div className="space-y-1 text-center">
              <h2 className="text-sm font-bold text-zinc-900">Enter Your College Roll Number</h2>
              <p className="text-xs text-zinc-500">Verify your student identity before submitting meal attendance.</p>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                required
                placeholder="e.g. 21CSE001"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                className="input-base text-center text-lg tracking-widest font-mono uppercase h-12 rounded-md"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full h-11 text-sm font-semibold">
              Verify Roll Number →
            </button>
          </form>
        ) : (
          /* Step 2: Meal Checkbox Selection Form (Large Mobile Tap Targets!) */
          <form onSubmit={handleSubmitSelfAttendance} className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Verified Student</span>
                <h2 className="text-base font-bold text-zinc-900">{verifiedStudent.name}</h2>
                <p className="text-xs text-zinc-500">{verifiedStudent.department} • {verifiedStudent.year}</p>
              </div>
              <button
                type="button"
                onClick={() => setVerifiedStudent(null)}
                className="text-xs text-zinc-400 hover:text-zinc-600 underline"
              >
                Change Roll No
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 block">Select Today's Meals Attended:</label>

              {/* Breakfast Tap Option */}
              <div
                onClick={() => {
                  if (!existingRecorded.breakfast) {
                    setSelectedMeals({ ...selectedMeals, breakfast: !selectedMeals.breakfast });
                  }
                }}
                className={`p-4 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  existingRecorded.breakfast
                    ? 'bg-emerald-50/70 border-emerald-300 opacity-90'
                    : selectedMeals.breakfast
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold">Breakfast</h4>
                  <p className={`text-xs ${selectedMeals.breakfast ? 'text-zinc-300' : 'text-zinc-500'}`}>7:30 AM – 9:30 AM (₹35)</p>
                </div>
                <div>
                  {existingRecorded.breakfast ? (
                    <span className="badge badge-success">✓ Already Recorded</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={selectedMeals.breakfast}
                      onChange={() => {}}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-zinc-900"
                    />
                  )}
                </div>
              </div>

              {/* Lunch Tap Option */}
              <div
                onClick={() => {
                  if (!existingRecorded.lunch) {
                    setSelectedMeals({ ...selectedMeals, lunch: !selectedMeals.lunch });
                  }
                }}
                className={`p-4 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  existingRecorded.lunch
                    ? 'bg-emerald-50/70 border-emerald-300 opacity-90'
                    : selectedMeals.lunch
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold">Lunch</h4>
                  <p className={`text-xs ${selectedMeals.lunch ? 'text-zinc-300' : 'text-zinc-500'}`}>12:30 PM – 2:30 PM (₹65)</p>
                </div>
                <div>
                  {existingRecorded.lunch ? (
                    <span className="badge badge-success">✓ Already Recorded</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={selectedMeals.lunch}
                      onChange={() => {}}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-zinc-900"
                    />
                  )}
                </div>
              </div>

              {/* Dinner Tap Option */}
              <div
                onClick={() => {
                  if (!existingRecorded.dinner) {
                    setSelectedMeals({ ...selectedMeals, dinner: !selectedMeals.dinner });
                  }
                }}
                className={`p-4 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  existingRecorded.dinner
                    ? 'bg-emerald-50/70 border-emerald-300 opacity-90'
                    : selectedMeals.dinner
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold">Dinner</h4>
                  <p className={`text-xs ${selectedMeals.dinner ? 'text-zinc-300' : 'text-zinc-500'}`}>7:30 PM – 9:30 PM (₹55)</p>
                </div>
                <div>
                  {existingRecorded.dinner ? (
                    <span className="badge badge-success">✓ Already Recorded</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={selectedMeals.dinner}
                      onChange={() => {}}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-zinc-900"
                    />
                  )}
                </div>
              </div>
            </div>

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

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full h-11 text-sm font-semibold"
            >
              {isSubmitting ? 'Recording...' : 'Submit Self-Attendance'}
            </button>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
