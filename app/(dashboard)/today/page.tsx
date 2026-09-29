'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, Copy, Undo2 } from 'lucide-react';
import { localDb } from '@/lib/db';
import { useStore } from '@/lib/use-store';
import { useToast } from '@/components/toast';
import { ConfirmDialog, Kbd, Segmented, Empty } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  addDays,
  formatDayMonth,
  formatLongDate,
  formatDayMonthLong,
  formatShortDate,
  formatTime,
  getTodayString,
  parseDate,
  relativeDayName
} from '@/lib/dates';
import { ALL_MEALS, MEAL_BITS, MEAL_ORDER, MealMask, MealType, Student } from '@/lib/types';

const MEAL_LABEL: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const MEAL_KEY: Record<string, MealType> = { b: 'breakfast', l: 'lunch', d: 'dinner' };

function readDateParam(): string | null {
  if (typeof window === 'undefined') return null;
  const d = new URLSearchParams(window.location.search).get('date');
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export default function TodayPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(() => readDateParam() || getTodayString());
  const [view, setView] = useState<'away' | 'roll'>('away');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  // Students touched this session stay listed even after they're set back to all meals,
  // so a mis-tap doesn't make the row vanish under your finger.
  const [pinned, setPinned] = useState<string[]>([]);
  const [confirmCopy, setConfirmCopy] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const today = getTodayString();
  const day = useStore(db => db.getDay(date), [date]);
  const counts = useStore(db => db.getDayCounts(date), [date]);
  const awayList = useStore(db => db.getAwayList(date), [date]);
  const activeStudents = useStore(db => db.getActiveStudents());
  const unrecorded = useStore(
    db => {
      const d = parseDate(date);
      return db.getUnrecordedDays(d.getFullYear(), d.getMonth() + 1).filter(x => x !== date);
    },
    [date]
  );
  const previousRecorded = useStore(
    db => {
      const d = parseDate(date);
      const prev = [...db.getRecordedDays(d.getFullYear(), d.getMonth() + 1)].filter(x => x < date).pop();
      if (prev) return prev;
      // fall back to previous month
      const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      return db.getRecordedDays(pm.getFullYear(), pm.getMonth() + 1).pop() || null;
    },
    [date]
  );

  const suggestions = useMemo(
    () => (query.trim() ? localDb.searchStudents(query, { activeOnly: true, limit: 7 }) : []),
    // activeStudents changes when the roster syncs
    [query, activeStudents]
  );

  // Keep URL in sync so a date can be linked to (Bills links here).
  useEffect(() => {
    const url = date === today ? '/today' : `/today?date=${date}`;
    window.history.replaceState(null, '', url);
    setPinned([]);
    setFocusId(null);
  }, [date, today]);

  // "/" jumps to search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, { student: Student; mask: MealMask }>();
    awayList.forEach(r => map.set(r.student.id, r));
    pinned.forEach(id => {
      if (!map.has(id)) {
        const s = localDb.getStudent(id);
        if (s) map.set(id, { student: s, mask: localDb.getStudentMask(date, id) });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.student.roll_number.localeCompare(b.student.roll_number));
  }, [awayList, pinned, date]);

  const flash = (id: string) => {
    setFlashId(id);
    setTimeout(() => setFlashId(cur => (cur === id ? null : cur)), 900);
  };

  // Focus moves in a layout effect (same task as the keypress) so the very next
  // key — B, L, D or a digit — lands on the row, however fast someone types.
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!pendingFocus) return;
    const el = rowRefs.current.get(pendingFocus);
    el?.focus();
    el?.scrollIntoView({ block: 'nearest' });
    setPendingFocus(null);
  }, [pendingFocus]);

  const focusRow = useCallback((id: string) => {
    setFocusId(id);
    setPendingFocus(id);
  }, []);

  const pin = (id: string) => setPinned(p => (p.includes(id) ? p : [...p, id]));

  const markAway = (student: Student) => {
    const current = localDb.getStudentMask(date, student.id);
    if (current === ALL_MEALS) localDb.setStudentMeals(date, student.id, 0);
    pin(student.id);
    setQuery('');
    setHighlight(0);
    setView('away');
    flash(student.id);
    focusRow(student.id);
  };

  const setMask = (studentId: string, mask: MealMask) => {
    pin(studentId);
    localDb.setStudentMeals(date, studentId, mask);
  };

  const toggleMeal = (studentId: string, meal: MealType) => {
    const mask = localDb.getStudentMask(date, studentId);
    setMask(studentId, mask ^ MEAL_BITS[meal]);
  };

  const backToAll = (student: Student) => {
    const before = localDb.getStudentMask(date, student.id);
    localDb.setStudentMeals(date, student.id, ALL_MEALS);
    setPinned(p => p.filter(id => id !== student.id));
    showToast('success', `${student.name} back on all meals`, undefined, {
      action: {
        label: 'Undo',
        onClick: () => {
          localDb.setStudentMeals(date, student.id, before);
          pin(student.id);
        }
      }
    });
    searchRef.current?.focus();
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = suggestions[highlight];
      if (pick) markAway(pick);
      else if (query.trim()) showToast('error', `No active student matches “${query.trim()}”`);
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  };

  /** Keys while a row has focus: B/L/D toggle meals, Enter/Esc back to search, anything else starts a new search. */
  const onRowKey = (e: React.KeyboardEvent, student: Student) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (MEAL_KEY[k]) {
      e.preventDefault();
      toggleMeal(student.id, MEAL_KEY[k]);
    } else if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      searchRef.current?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = rows.findIndex(r => r.student.id === student.id);
      const next = rows[idx + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) focusRow(next.student.id);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      backToAll(student);
    } else if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) {
      e.preventDefault();
      setQuery(e.key.toUpperCase());
      setHighlight(0);
      searchRef.current?.focus();
    }
  };

  const recordAllPresent = () => {
    localDb.recordDay(date);
    showToast('success', 'Attendance taken', 'Everyone else is counted for all three meals.', {
      action: { label: 'Undo', onClick: () => localDb.clearDay(date) }
    });
  };

  const copyPrevious = () => {
    setConfirmCopy(false);
    const before = localDb.getDay(date);
    const snapshot = before ? { recordedAt: before.recordedAt, away: { ...before.away } } : undefined;
    const res = localDb.copyAttendanceFromPreviousDay(date);
    if (!res.success) {
      showToast('info', 'No earlier day to copy from');
      return;
    }
    setPinned([]);
    showToast('success', `Copied ${res.count} away from ${formatDayMonth(res.sourceDate)}`, undefined, {
      action: { label: 'Undo', onClick: () => localDb.restoreDay(date, snapshot) }
    });
  };

  const rel = relativeDayName(date);
  const recorded = Boolean(day);

  return (
    <div className="space-y-8">
      {/* Date line */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {rel && rel !== 'Tomorrow' ? `${rel}, ${formatDayMonthLong(date)}` : formatLongDate(date)}
          </h1>
          <p className="mt-1 text-ink-2">
            {recorded ? (
              <>Attendance taken at {formatTime(day!.recordedAt)}{day!.recordedAt.slice(0, 10) !== date && ` on ${formatShortDate(day!.recordedAt.slice(0, 10))}`}.</>
            ) : (
              <>Not taken yet. Everyone counts as present until someone is marked away.</>
            )}
          </p>
        </div>
        <DateSwitcher date={date} today={today} onChange={setDate} />
      </div>

      {/* Tallies */}
      <section aria-label="Meal counts" className="grid grid-cols-3 border-y-2 border-sky">
        {MEAL_ORDER.map((meal, i) => {
          const present = counts[meal];
          const missed = counts.total - present;
          return (
            <div key={meal} className={cn('py-5 sm:py-6', i > 0 && 'border-l border-rule pl-4 sm:pl-6')}>
              <p className="font-semibold text-ink-2">{MEAL_LABEL[meal]}</p>
              <p className="mt-2 text-tally font-bold tabular-nums">{present}</p>
              <p className="mt-2 text-sm text-ink-3">
                of {counts.total}
                {missed > 0 && <span className="text-away">, {missed} away</span>}
              </p>
            </div>
          );
        })}
      </section>

      {unrecorded.length > 0 && (
        <p className="rounded-md bg-marker px-4 py-3 text-marker-ink">
          {unrecorded.length === 1 ? 'One earlier day' : `${unrecorded.length} earlier days`} this month not taken:{' '}
          {unrecorded.slice(0, 8).map((d, i) => (
            <React.Fragment key={d}>
              {i > 0 && ', '}
              <Link href={`/today?date=${d}`} onClick={e => { e.preventDefault(); setDate(d); }} className="font-semibold underline underline-offset-2">
                {formatDayMonth(d)}
              </Link>
            </React.Fragment>
          ))}
          {unrecorded.length > 8 && ` and ${unrecorded.length - 8} more`}.
        </p>
      )}

      {/* Mark away */}
      <section className="space-y-3">
        <div className="relative">
          <label htmlFor="away-search" className="mb-1.5 block font-semibold">
            Mark a student away
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
            <input
              id="away-search"
              ref={searchRef}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="away-suggestions"
              aria-activedescendant={suggestions[highlight] ? `sugg-${suggestions[highlight].id}` : undefined}
              placeholder="Roll number, or its last digits"
              value={query}
              onChange={e => {
                setQuery(e.target.value.toUpperCase());
                setHighlight(0);
              }}
              onKeyDown={onSearchKey}
              className="field h-14 pl-11 text-lg tracking-wide"
            />
          </div>
          {suggestions.length > 0 && (
            <ul
              id="away-suggestions"
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-sky bg-sheet shadow-float"
            >
              {suggestions.map((s, i) => {
                const mask = localDb.getStudentMask(date, s.id);
                return (
                  <li
                    key={s.id}
                    id={`sugg-${s.id}`}
                    role="option"
                    aria-selected={i === highlight}
                    onMouseDown={e => {
                      e.preventDefault();
                      markAway(s);
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 px-4 py-3',
                      i === highlight && 'bg-sky-wash'
                    )}
                  >
                    <span className="w-28 shrink-0 font-semibold tabular-nums">
                      <RollHighlight roll={s.roll_number} query={query} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="hidden truncate text-sm text-ink-3 sm:block">{s.department}</span>
                    {mask !== ALL_MEALS && <span className="text-sm text-away">already away</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="hidden text-sm text-ink-3 md:block">
          <Kbd>Enter</Kbd> marks away for the whole day. Then <Kbd>B</Kbd> <Kbd>L</Kbd> <Kbd>D</Kbd> switch a single
          meal back on. Start typing the next roll number straight away.
        </p>
      </section>

      {/* Away list / full roll */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="List"
            value={view}
            onChange={setView}
            size="sm"
            options={[
              { value: 'away', label: `Away (${counts.awayStudents})` },
              { value: 'roll', label: `Full roll (${counts.total})` }
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {previousRecorded && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => (awayList.length ? setConfirmCopy(true) : copyPrevious())}
              >
                <Copy className="h-4 w-4" />
                Same as {relativeDayName(previousRecorded)?.toLowerCase() || formatDayMonth(previousRecorded)}
              </button>
            )}
            {!recorded && (
              <button type="button" className="btn btn-primary btn-sm" onClick={recordAllPresent}>
                Everyone else present
              </button>
            )}
          </div>
        </div>

        {view === 'away' ? (
          rows.length === 0 ? (
            <Empty>
              {recorded
                ? 'Nobody away. All students are counted for all three meals.'
                : 'Nobody marked away yet. Search above to add someone, or take attendance with everyone present.'}
            </Empty>
          ) : (
            <div className="divide-y divide-rule border-y border-rule">
              {rows.map(({ student, mask }) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  mask={mask}
                  focused={focusId === student.id}
                  flashing={flashId === student.id}
                  rowRef={el => (el ? rowRefs.current.set(student.id, el) : rowRefs.current.delete(student.id))}
                  onFocus={() => setFocusId(student.id)}
                  onKeyDown={e => onRowKey(e, student)}
                  onToggle={meal => toggleMeal(student.id, meal)}
                  onBack={() => backToAll(student)}
                />
              ))}
            </div>
          )
        ) : (
          <FullRoll date={date} students={activeStudents} onToggle={toggleMeal} />
        )}
      </section>

      <ConfirmDialog
        open={confirmCopy}
        title={`Replace today’s away list?`}
        body={`The ${awayList.length} students marked away for ${formatDayMonth(date)} will be replaced with the list from ${previousRecorded ? formatDayMonth(previousRecorded) : 'the last day'}.`}
        confirmLabel="Replace list"
        onConfirm={copyPrevious}
        onCancel={() => setConfirmCopy(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function DateSwitcher({ date, today, onChange }: { date: string; today: string; onChange: (d: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-sky bg-sheet">
        <button type="button" className="btn btn-ghost h-10 w-10 px-0" onClick={() => onChange(addDays(date, -1))} aria-label="Previous day">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <label className="relative cursor-pointer px-2 font-semibold">
          <span>{formatDayMonth(date)}</span>
          <input
            type="date"
            value={date}
            onChange={e => e.target.value && onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Pick a date"
          />
        </label>
        <button type="button" className="btn btn-ghost h-10 w-10 px-0" onClick={() => onChange(addDays(date, 1))} aria-label="Next day">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      {date !== today && (
        <button type="button" className="btn btn-secondary h-10" onClick={() => onChange(today)}>
          Today
        </button>
      )}
    </div>
  );
}

function RollHighlight({ roll, query }: { roll: string; query: string }) {
  const q = query.trim().toUpperCase();
  const i = q ? roll.lastIndexOf(q) : -1;
  if (i < 0) return <>{roll}</>;
  return (
    <>
      <span className="text-ink-3">{roll.slice(0, i)}</span>
      <span className="text-royal">{roll.slice(i, i + q.length)}</span>
      <span className="text-ink-3">{roll.slice(i + q.length)}</span>
    </>
  );
}

function MealToggle({ meal, ate, onClick }: { meal: MealType; ate: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      aria-pressed={ate}
      title={`${MEAL_LABEL[meal]}: ${ate ? 'ate' : 'away'}`}
      className={cn(
        'h-11 min-w-[2.75rem] rounded-md border px-2 font-semibold transition-colors sm:min-w-[6.5rem]',
        ate ? 'border-sky bg-sheet text-ink hover:border-peri' : 'border-away/30 bg-away-wash text-away line-through decoration-2'
      )}
    >
      <span className="sm:hidden">{MEAL_LABEL[meal][0]}</span>
      <span className="hidden sm:inline">{MEAL_LABEL[meal]}</span>
    </button>
  );
}

function StudentRow({
  student,
  mask,
  focused,
  flashing,
  rowRef,
  onFocus,
  onKeyDown,
  onToggle,
  onBack
}: {
  student: Student;
  mask: MealMask;
  focused: boolean;
  flashing: boolean;
  rowRef: (el: HTMLDivElement | null) => void;
  onFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onToggle: (meal: MealType) => void;
  onBack: () => void;
}) {
  const allBack = mask === ALL_MEALS;
  return (
    <div
      ref={rowRef}
      tabIndex={0}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      aria-label={`${student.roll_number} ${student.name}`}
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 px-2 py-3 outline-none sm:flex-nowrap',
        focused && 'bg-sky-wash/70 shadow-[inset_3px_0_0_#1B2CC1]',
        flashing && 'animate-[flash_900ms_ease-out]',
        allBack && 'opacity-60'
      )}
    >
      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
        <p className="truncate">
          <span className="mr-3 font-semibold tabular-nums">{student.roll_number}</span>
          {student.name}
        </p>
        <p className="truncate text-sm text-ink-3">
          {allBack ? 'Back on all meals' : mask === 0 ? 'Away all day' : `Ate ${MEAL_ORDER.filter(m => mask & MEAL_BITS[m]).map(m => MEAL_LABEL[m].toLowerCase()).join(' and ')}`}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {MEAL_ORDER.map(meal => (
          <MealToggle key={meal} meal={meal} ate={Boolean(mask & MEAL_BITS[meal])} onClick={() => onToggle(meal)} />
        ))}
      </div>
      {!allBack && (
        <button
          type="button"
          tabIndex={-1}
          onClick={onBack}
          className="btn btn-ghost h-11 w-11 px-0"
          title="Back on all meals"
          aria-label={`Put ${student.name} back on all meals`}
        >
          <Undo2 className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function FullRoll({
  date,
  students,
  onToggle
}: {
  date: string;
  students: Student[];
  onToggle: (studentId: string, meal: MealType) => void;
}) {
  const [filter, setFilter] = useState('');
  const [limit, setLimit] = useState(60);
  // Re-read masks whenever the store changes.
  useStore(db => db.getDay(date), [date]);
  const list = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? students.filter(s => s.roll_number.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) : students;
  }, [students, filter]);

  return (
    <div className="space-y-3">
      <input
        className="field field-sm max-w-xs"
        placeholder="Filter by roll or name"
        value={filter}
        onChange={e => {
          setFilter(e.target.value);
          setLimit(60);
        }}
      />
      <div className="divide-y divide-rule border-y border-rule">
        {list.slice(0, limit).map(s => {
          const mask = localDb.getStudentMask(date, s.id);
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 py-2.5 sm:flex-nowrap">
              <p className="min-w-0 flex-1 basis-full truncate sm:basis-auto">
                <span className="mr-3 font-semibold tabular-nums">{s.roll_number}</span>
                {s.name}
              </p>
              <div className="flex gap-1.5">
                {MEAL_ORDER.map(meal => (
                  <MealToggle key={meal} meal={meal} ate={Boolean(mask & MEAL_BITS[meal])} onClick={() => onToggle(s.id, meal)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {list.length > limit && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLimit(l => l + 100)}>
          Show {Math.min(100, list.length - limit)} more of {list.length - limit}
        </button>
      )}
    </div>
  );
}
