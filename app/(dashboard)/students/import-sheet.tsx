'use client';

import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import { localDb } from '@/lib/db';
import { StudentStatus } from '@/lib/types';
import { getTodayString } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/toast';
import { Sheet, Segmented } from '@/components/ui';

interface ImportRow {
  line: number;
  roll_number: string;
  name: string;
  gender: 'F' | 'M';
  department: string;
  year: string;
  course: string;
  contact: string;
  joined_at: string;
  problems: string[];
}

const SAMPLE_CSV = [
  'roll_no,name,gender,department,year,course',
  '24811A0214,Kadari Thanuja,F,Electrical & Electronics (EEE),1st Year,B.Tech',
  '24811A0418,Dangudubiyyapu Bhavani,F,Electronics & Comm (ECE),1st Year,B.Tech',
  '24811A0462,Pothana Satya Ganesh,M,Electronics & Comm (ECE),1st Year,B.Tech'
].join('\n');

/** Accept the column names people actually use in spreadsheets. */
function pick(raw: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function normaliseKey(k: string) {
  return k.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
}

function toRows(records: Record<string, unknown>[], firstLine: number): ImportRow[] {
  const seen = new Set<string>();
  return records.map((rec, i) => {
    const raw: Record<string, unknown> = {};
    Object.entries(rec).forEach(([k, v]) => (raw[normaliseKey(k)] = v));

    const roll = pick(raw, ['roll_no', 'roll_number', 'rollno', 'rollnumber', 'roll']).toUpperCase();
    const name = pick(raw, ['name', 'student_name', 'studentname']);
    const g = pick(raw, ['gender', 'sex']).toUpperCase();
    const problems: string[] = [];

    if (!roll) problems.push('No roll number');
    if (!name) problems.push('No name');
    if (roll) {
      const key = roll.toLowerCase();
      if (seen.has(key)) problems.push('Repeated in this file');
      else seen.add(key);
      const existing = localDb.getStudentByRollNumber(roll);
      if (existing) problems.push(`Already on the roll as ${existing.name}`);
    }
    if (g && !['F', 'M', 'FEMALE', 'MALE'].includes(g)) problems.push(`Gender “${g}” should be F or M`);

    return {
      line: firstLine + i,
      roll_number: roll,
      name,
      gender: g.startsWith('M') ? 'M' : 'F',
      department: pick(raw, ['department', 'dept', 'branch']) || 'Engineering & Technology',
      year: pick(raw, ['year', 'academic_year']) || '1st Year',
      course: pick(raw, ['course', 'program']) || 'B.Tech',
      contact: pick(raw, ['contact', 'phone', 'mobile']),
      joined_at: pick(raw, ['joined_at', 'joining_date', 'joined']),
      problems
    };
  });
}

function parseFile(name: string, text: string): { rows?: ImportRow[]; error?: string } {
  if (name.toLowerCase().endsWith('.json')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { error: 'This file isn’t valid JSON. Check it opens in a text editor and try again.' };
    }
    if (!Array.isArray(parsed)) return { error: 'The JSON file should contain a list of students: [ { … }, { … } ].' };
    if (!parsed.length) return { error: 'The file has no students in it.' };
    return { rows: toRows(parsed as Record<string, unknown>[], 1) };
  }
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (!result.data.length) return { error: 'The file has no rows under the header line.' };
  // Line 1 is the header, so data starts on line 2.
  return { rows: toRows(result.data, 2) };
}

function downloadSample() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students-sample.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'ready' | 'problems'>('ready');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) {
      setRows(null);
      setFileName('');
      setError('');
      setTab('ready');
    }
  }, [open]);

  const readFile = (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.json')) {
      setError('Choose a .csv or .json file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = parseFile(file.name, String(reader.result || ''));
      setFileName(file.name);
      if (res.error) {
        setError(res.error);
        setRows(null);
      } else {
        setError('');
        setRows(res.rows!);
        setTab(res.rows!.some(r => !r.problems.length) ? 'ready' : 'problems');
      }
    };
    reader.readAsText(file);
  };

  const ready = rows?.filter(r => !r.problems.length) || [];
  const problems = rows?.filter(r => r.problems.length) || [];
  const shown = tab === 'ready' ? ready : problems;

  const commit = () => {
    if (!ready.length) return;
    const { added, skipped } = localDb.bulkImportStudents(
      ready.map(r => ({
        roll_number: r.roll_number,
        name: r.name,
        gender: r.gender,
        department: r.department,
        year: r.year,
        course: r.course,
        contact: r.contact || undefined,
        status: 'active' as StudentStatus,
        joined_at: r.joined_at || getTodayString()
      }))
    );
    showToast(
      'success',
      `Added ${added.length} student${added.length === 1 ? '' : 's'}`,
      skipped ? `${skipped} skipped because they were already on the roll.` : undefined
    );
    onClose();
  };

  const footer = rows ? (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}>
        Choose another file
      </button>
      <button type="button" className="btn btn-primary" disabled={!ready.length} onClick={commit}>
        Add {ready.length} student{ready.length === 1 ? '' : 's'}
      </button>
    </div>
  ) : undefined;

  return (
    <Sheet open={open} onClose={onClose} title="Import students" width="lg" footer={footer}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) readFile(f);
          e.target.value = '';
        }}
      />

      {!rows ? (
        <div className="space-y-4">
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) readFile(f);
            }}
            className={cn(
              'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors',
              dragging ? 'border-royal bg-sky-wash' : 'border-sky'
            )}
          >
            <Upload className="h-7 w-7 text-ink-3" />
            <p className="text-ink-2">Drop a CSV or JSON file here</p>
            <button type="button" data-autofocus className="btn btn-primary" onClick={() => inputRef.current?.click()}>
              Choose file
            </button>
          </div>
          {error && <p className="text-away">{error}</p>}
          <div className="space-y-2 text-ink-2">
            <p>
              Needs a roll number and name on each row. Gender, department, year and course are read when present.
              Roll numbers already on the roll are skipped.
            </p>
            <button type="button" onClick={downloadSample} className="font-semibold text-royal underline underline-offset-2">
              Download sample CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink-2">
              <span className="font-semibold text-ink">{ready.length} ready to add</span>
              {problems.length > 0 && (
                <>
                  , <span className="font-semibold text-away">{problems.length} with problems</span>
                </>
              )}
              <span className="block text-sm text-ink-3">{fileName}</span>
            </p>
            <Segmented
              size="sm"
              label="Show rows"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'ready', label: `Ready (${ready.length})` },
                { value: 'problems', label: `Problems (${problems.length})` }
              ]}
            />
          </div>

          {shown.length === 0 ? (
            <p className="rounded-lg border border-dashed border-sky px-4 py-8 text-center text-ink-2">
              {tab === 'ready' ? 'No rows are ready. Fix the problems in the file and choose it again.' : 'No problems found.'}
            </p>
          ) : (
            <div className="max-h-[55dvh] overflow-auto rounded-md border border-rule">
              <table className="register text-sm">
                <thead>
                  <tr>
                    <th className="num w-12">Line</th>
                    <th>Roll no</th>
                    <th>Name</th>
                    <th className="hidden sm:table-cell">Department</th>
                    <th className="hidden sm:table-cell">Year</th>
                    {tab === 'problems' && <th>Problem</th>}
                  </tr>
                </thead>
                <tbody>
                  {shown.map(r => (
                    <tr key={r.line}>
                      <td className="num text-ink-3">{r.line}</td>
                      <td className="font-semibold tracking-wide">{r.roll_number || '—'}</td>
                      <td>{r.name || '—'}</td>
                      <td className="hidden text-ink-2 sm:table-cell">{r.department}</td>
                      <td className="hidden text-ink-2 sm:table-cell">{r.year}</td>
                      {tab === 'problems' && <td className="text-away">{r.problems.join('. ')}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {error && <p className="text-away">{error}</p>}
        </div>
      )}
    </Sheet>
  );
}
