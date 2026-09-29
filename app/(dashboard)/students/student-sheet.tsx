'use client';

import React, { useEffect, useRef, useState } from 'react';
import { localDb } from '@/lib/db';
import { useStore } from '@/lib/use-store';
import { Student, StudentStatus } from '@/lib/types';
import { getTodayString } from '@/lib/dates';
import { useToast } from '@/components/toast';
import { Sheet, Field, Segmented, ConfirmDialog } from '@/components/ui';

const DEFAULT_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const OTHER = '__other__';

interface FormState {
  roll_number: string;
  name: string;
  gender: 'F' | 'M';
  department: string;
  year: string;
  course: string;
  joined_at: string;
  contact: string;
}

function emptyForm(keep?: Partial<FormState>): FormState {
  return {
    roll_number: '',
    name: '',
    gender: keep?.gender || 'F',
    department: keep?.department || '',
    year: keep?.year || '1st Year',
    course: keep?.course || 'B.Tech',
    joined_at: getTodayString(),
    contact: ''
  };
}

function fromStudent(s: Student): FormState {
  return {
    roll_number: s.roll_number,
    name: s.name,
    gender: s.gender === 'M' ? 'M' : 'F',
    department: s.department,
    year: s.year,
    course: s.course || 'B.Tech',
    joined_at: s.joined_at || getTodayString(),
    contact: s.contact || ''
  };
}

type Errors = Partial<Record<'roll_number' | 'name' | 'department' | 'form', string>>;

export function StudentSheet({
  open,
  student,
  onClose
}: {
  open: boolean;
  /** null = adding a new student */
  student: Student | null;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const facets = useStore(db => db.getStudentFacets());
  const [form, setForm] = useState<FormState>(emptyForm());
  const [customDept, setCustomDept] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmInactive, setConfirmInactive] = useState(false);
  const rollRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(student);
  const departments = facets.departments;
  const years = Array.from(new Set([...DEFAULT_YEARS, ...facets.years])).sort();

  // Reset whenever the sheet opens for a different student.
  useEffect(() => {
    if (!open) return;
    const next = student ? fromStudent(student) : emptyForm({ department: departments[0] });
    setForm(next);
    setCustomDept(Boolean(next.department) && !departments.includes(next.department));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    if (key in errors) setErrors(e => ({ ...e, [key]: undefined, form: undefined }));
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!form.roll_number.trim()) next.roll_number = 'Enter a roll number.';
    if (!form.name.trim()) next.name = 'Enter the student’s name.';
    if (!form.department.trim()) next.department = 'Choose or type a department.';
    const clash = form.roll_number.trim() && localDb.getStudentByRollNumber(form.roll_number);
    if (clash && clash.id !== student?.id) next.roll_number = `${clash.roll_number} already belongs to ${clash.name}.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = (addAnother: boolean) => {
    if (!validate()) return;
    const payload = {
      roll_number: form.roll_number.trim().toUpperCase(),
      name: form.name.trim(),
      gender: form.gender,
      department: form.department.trim(),
      year: form.year,
      course: form.course.trim() || 'B.Tech',
      joined_at: form.joined_at || getTodayString(),
      contact: form.contact.trim() || undefined
    };
    try {
      if (student) {
        localDb.updateStudent(student.id, payload);
        showToast('success', 'Saved changes');
        onClose();
      } else {
        const added = localDb.addStudent({ ...payload, status: 'active' as StudentStatus });
        showToast('success', `Added ${added.roll_number} ${added.name}`);
        if (addAnother) {
          setForm(f => emptyForm({ gender: f.gender, department: f.department, year: f.year, course: f.course }));
          setErrors({});
          requestAnimationFrame(() => rollRef.current?.focus());
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      const msg: string = err?.message || 'Could not save.';
      if (/roll/i.test(msg) || /already/i.test(msg)) setErrors({ roll_number: msg });
      else if (/name/i.test(msg)) setErrors({ name: msg });
      else setErrors({ form: msg });
    }
  };

  const setStatus = (status: StudentStatus) => {
    if (!student) return;
    localDb.toggleStudentStatus(student.id, status);
    showToast('success', status === 'inactive' ? `${student.name} marked inactive` : `${student.name} is back on the roll`);
    setConfirmInactive(false);
    onClose();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save(false);
  };

  const footer = (
    <div className="flex flex-wrap items-center gap-2">
      {isEdit && student && (
        student.status === 'active' ? (
          <button type="button" className="btn btn-danger" onClick={() => setConfirmInactive(true)}>
            Mark inactive
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setStatus('active')}>
            Mark active
          </button>
        )
      )}
      <div className="ml-auto flex flex-wrap gap-2">
        {!isEdit && (
          <button type="button" className="btn btn-secondary" onClick={() => save(true)}>
            Save and add another
          </button>
        )}
        <button type="submit" form="student-form" className="btn btn-primary">
          Save
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} title={isEdit ? 'Edit student' : 'Add student'} footer={footer}>
        <form id="student-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
            <Field label="Roll no" htmlFor="st-roll" error={errors.roll_number}>
              <input
                id="st-roll"
                ref={rollRef}
                className="field uppercase tracking-wide"
                autoComplete="off"
                spellCheck={false}
                placeholder="24811A0214"
                value={form.roll_number}
                onChange={e => set('roll_number', e.target.value.toUpperCase())}
                aria-invalid={Boolean(errors.roll_number)}
              />
            </Field>
            <Field label="Name" htmlFor="st-name" error={errors.name}>
              <input
                id="st-name"
                className="field"
                autoComplete="off"
                placeholder="Full name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                aria-invalid={Boolean(errors.name)}
              />
            </Field>
          </div>

          <Field label="Gender">
            <Segmented
              label="Gender"
              value={form.gender}
              onChange={v => set('gender', v)}
              options={[
                { value: 'F', label: 'Female' },
                { value: 'M', label: 'Male' }
              ]}
            />
          </Field>

          <Field label="Department" htmlFor="st-dept" error={errors.department}>
            {customDept ? (
              <div className="flex gap-2">
                <input
                  id="st-dept"
                  className="field"
                  placeholder="Department name"
                  value={form.department}
                  onChange={e => set('department', e.target.value)}
                  autoFocus
                />
                {departments.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost shrink-0"
                    onClick={() => {
                      setCustomDept(false);
                      set('department', departments[0]);
                    }}
                  >
                    Pick from list
                  </button>
                )}
              </div>
            ) : (
              <select
                id="st-dept"
                className="field"
                value={form.department}
                onChange={e => {
                  if (e.target.value === OTHER) {
                    setCustomDept(true);
                    set('department', '');
                  } else set('department', e.target.value);
                }}
              >
                {departments.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value={OTHER}>Other…</option>
              </select>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Year" htmlFor="st-year">
              <select id="st-year" className="field" value={form.year} onChange={e => set('year', e.target.value)}>
                {years.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Course" htmlFor="st-course">
              <input
                id="st-course"
                className="field"
                list="st-course-list"
                value={form.course}
                onChange={e => set('course', e.target.value)}
              />
              <datalist id="st-course-list">
                {facets.courses.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Joined on" htmlFor="st-joined">
              <input
                id="st-joined"
                type="date"
                className="field"
                value={form.joined_at}
                onChange={e => set('joined_at', e.target.value)}
              />
            </Field>
            <Field label="Contact" htmlFor="st-contact" hint="Optional">
              <input
                id="st-contact"
                type="tel"
                inputMode="tel"
                className="field"
                placeholder="Mobile number"
                value={form.contact}
                onChange={e => set('contact', e.target.value)}
              />
            </Field>
          </div>

          {errors.form && <p className="text-sm text-away">{errors.form}</p>}
          {/* Enter in any field saves. */}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Sheet>

      <ConfirmDialog
        open={confirmInactive}
        title={`Mark ${student?.name ?? 'student'} inactive?`}
        body="They drop off the daily roll and won’t appear on new monthly bills. You can mark them active again at any time."
        confirmLabel="Mark inactive"
        tone="danger"
        onConfirm={() => setStatus('inactive')}
        onCancel={() => setConfirmInactive(false)}
      />
    </>
  );
}
