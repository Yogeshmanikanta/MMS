'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useStore } from '@/lib/use-store';
import { Student } from '@/lib/types';
import { PageHeader, Segmented, Empty, Kbd } from '@/components/ui';
import { StudentSheet } from './student-sheet';
import { ImportSheet } from './import-sheet';

type StatusFilter = 'active' | 'inactive' | 'all';

const PAGE = 50;

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return Boolean(t && (t.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)));
}

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [year, setYear] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [limit, setLimit] = useState(PAGE);

  // `undefined` = closed, `null` = adding, Student = editing
  const [editing, setEditing] = useState<Student | null | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const counts = useStore(db => {
    const all = db.getStudents();
    const active = all.filter(s => s.status === 'active').length;
    return { active, inactive: all.length - active };
  });
  const facets = useStore(db => db.getStudentFacets());
  const students = useStore(
    db => db.getStudents({ search: search.trim(), department: dept, year, status }),
    [search, dept, year, status]
  );

  // Keep the open sheet pointed at the latest copy of the student after edits/sync.
  const editingLive = useStore(db => (editing ? db.getStudent(editing.id) ?? editing : editing), [editing]);

  // /students?import=1 (old import page URL) opens the import sheet.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('import')) {
      setImportOpen(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setLimit(PAGE);
  }, [search, dept, year, status]);

  const sheetOpen = editing !== undefined || importOpen;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheetOpen || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'n') {
        e.preventDefault();
        setEditing(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const filtered = search.trim() !== '' || dept !== 'all' || year !== 'all' || status !== 'active';
  const clearFilters = () => {
    setSearch('');
    setDept('all');
    setYear('all');
    setStatus('active');
  };

  const visible = useMemo(() => students.slice(0, limit), [students, limit]);

  const subtitle =
    `${counts.active} on the roll` + (counts.inactive ? `, ${counts.inactive} inactive` : '');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={subtitle}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(true)}>
              Import
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setEditing(null)} title="Add student (N)">
              Add student
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
            <input
              ref={searchRef}
              type="search"
              className="field pl-10 pr-10"
              placeholder="Roll no or name"
              aria-label="Search students"
              autoComplete="off"
              spellCheck={false}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setSearch('');
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === 'Enter' && students.length === 1) {
                  setEditing(students[0]);
                }
              }}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-3 hover:bg-sky-wash hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 md:block">
                <Kbd>/</Kbd>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <select
              className="field sm:w-auto sm:min-w-[12rem]"
              aria-label="Department"
              value={dept}
              onChange={e => setDept(e.target.value)}
            >
              <option value="all">All departments</option>
              {facets.departments.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className="field sm:w-auto"
              aria-label="Year"
              value={year}
              onChange={e => setYear(e.target.value)}
            >
              <option value="all">All years</option>
              {facets.years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="col-span-2 sm:col-span-1">
              <Segmented
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'all', label: 'All' }
                ]}
              />
            </div>
          </div>
        </div>

        <p className="text-sm text-ink-2">
          {students.length === 1 ? '1 student' : `${students.length} students`}
          {filtered && (
            <>
              {' '}
              <button type="button" onClick={clearFilters} className="ml-1 font-semibold text-royal underline underline-offset-2">
                Clear filters
              </button>
            </>
          )}
        </p>
      </div>

      {students.length === 0 ? (
        <Empty
          action={
            filtered ? (
              <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
                Add student
              </button>
            )
          }
        >
          {filtered
            ? search.trim()
              ? `No student matches “${search.trim()}”.`
              : 'No students match these filters.'
            : 'No students yet. Add one, or import a CSV or JSON file.'}
        </Empty>
      ) : (
        <>
          {/* Phone: two-line list */}
          <ul className="divide-y divide-rule border-y border-rule sm:hidden">
            {visible.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="flex w-full items-start justify-between gap-3 px-1 py-3 text-left active:bg-sky-wash"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold tracking-wide">{s.roll_number}</span>
                    <span className={s.status === 'inactive' ? 'block truncate text-ink-3' : 'block truncate'}>{s.name}</span>
                    <span className="block truncate text-sm text-ink-3">
                      {s.department}, {s.year}
                    </span>
                  </span>
                  {s.status === 'inactive' && <span className="shrink-0 text-sm text-ink-3">Inactive</span>}
                </button>
              </li>
            ))}
          </ul>

          {/* Tablet and desktop: ruled register */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="register">
              <thead>
                <tr>
                  <th>Roll no</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th className="hidden lg:table-cell">Year</th>
                  <th className="hidden md:table-cell">Gender</th>
                  <th className="w-24">
                    <span className="sr-only">Status</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map(s => {
                  const inactive = s.status === 'inactive';
                  return (
                    <tr
                      key={s.id}
                      tabIndex={0}
                      onClick={() => setEditing(s)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setEditing(s);
                        }
                      }}
                      className="cursor-pointer focus-visible:outline-none focus-visible:[&>td]:bg-sky-wash"
                    >
                      <td className={inactive ? 'font-semibold tracking-wide text-ink-3' : 'font-semibold tracking-wide'}>
                        {s.roll_number}
                      </td>
                      <td className={inactive ? 'text-ink-3' : undefined}>{s.name}</td>
                      <td className="text-ink-2">{s.department}</td>
                      <td className="hidden text-ink-2 lg:table-cell">{s.year}</td>
                      <td className="hidden text-ink-2 md:table-cell">{s.gender === 'M' ? 'Male' : 'Female'}</td>
                      <td className="text-sm text-ink-3">{inactive ? 'Inactive' : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {students.length > limit && (
            <div className="flex items-center justify-center gap-4">
              <p className="text-sm text-ink-3">
                Showing {limit} of {students.length}
              </p>
              <button type="button" className="btn btn-secondary" onClick={() => setLimit(l => l + PAGE)}>
                Show {Math.min(PAGE, students.length - limit)} more
              </button>
            </div>
          )}
        </>
      )}

      <StudentSheet
        open={editing !== undefined}
        student={editingLive ?? null}
        onClose={() => setEditing(undefined)}
      />
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
