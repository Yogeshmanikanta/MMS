'use client';

import React, { useState } from 'react';
import { localDb } from '@/lib/db';
import { useStore } from '@/lib/use-store';
import { cn } from '@/lib/cn';
import { formatLongDate, getTodayString } from '@/lib/dates';
import { MEAL_BITS, MEAL_ORDER, MealMask, MealType, Student } from '@/lib/types';

const MEAL_LABEL: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

/**
 * Student kiosk: enter your roll number, see today's meals, and switch any meal
 * you're skipping. Everyone is counted for all meals unless they say otherwise.
 */
export default function StudentSelfPage() {
  const today = getTodayString();
  const [roll, setRoll] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const mask = useStore(db => (student ? db.getStudentMask(today, student.id) : 0), [student?.id, today]);

  const lookUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const r = roll.trim();
    if (!r) return setError('Enter your roll number.');
    const s = localDb.getStudentByRollNumber(r);
    if (!s) return setError(`${r.toUpperCase()} isn’t on the hostel roll. Check the number, or ask the mess office.`);
    if (s.status !== 'active') return setError(`${s.name} is not on the active roll. Please see the mess office.`);
    setStudent(s);
    setSaved(false);
  };

  const toggle = (meal: MealType) => {
    if (!student) return;
    localDb.setStudentMeals(today, student.id, (mask as MealMask) ^ MEAL_BITS[meal], 'student_self');
    setSaved(true);
  };

  const done = () => {
    setStudent(null);
    setRoll('');
    setSaved(false);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-ink px-5 py-4 text-white">
        <p className="text-lg font-bold">Hostel Mess</p>
        <p className="text-sm text-white/70">{formatLongDate(today)}</p>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
        {!student ? (
          <form onSubmit={lookUp} className="space-y-4">
            <h1 className="text-2xl font-bold">Your meals today</h1>
            <label htmlFor="roll" className="block font-semibold text-ink-2">
              Roll number
            </label>
            <input
              id="roll"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={roll}
              onChange={e => {
                setRoll(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="23811A0214"
              className="field h-16 text-center text-2xl tracking-widest"
            />
            {error && <p className="rounded-md bg-away-wash px-3 py-2.5 text-away">{error}</p>}
            <button type="submit" className="btn btn-primary h-14 w-full text-lg">
              Continue
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-2xl font-bold">{student.name}</p>
              <p className="mt-1 text-ink-2">
                <span className="font-semibold tabular-nums">{student.roll_number}</span>, {student.department}
              </p>
            </div>
            <p className="text-ink-2">Tap a meal you’re skipping. Tap again to undo.</p>
            <div className="space-y-3">
              {MEAL_ORDER.map(meal => {
                const eating = Boolean(mask & MEAL_BITS[meal]);
                return (
                  <button
                    key={meal}
                    type="button"
                    onClick={() => toggle(meal)}
                    aria-pressed={!eating}
                    className={cn(
                      'flex h-16 w-full items-center justify-between rounded-lg border-2 px-5 text-lg font-semibold transition-colors',
                      eating ? 'border-sky bg-sheet text-ink' : 'border-away/40 bg-away-wash text-away'
                    )}
                  >
                    <span>{MEAL_LABEL[meal]}</span>
                    <span className="text-base font-normal">{eating ? 'Eating' : 'Skipping'}</span>
                  </button>
                );
              })}
            </div>
            {saved && <p className="text-ink-2">Saved.</p>}
            <button type="button" onClick={done} className="btn btn-secondary h-14 w-full text-lg">
              Done
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
