'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Search, Lock } from 'lucide-react';
import { localDb } from '@/lib/db';
import { useStore } from '@/lib/use-store';
import { useToast } from '@/components/toast';
import { PageHeader, ConfirmDialog, MonthStepper, Segmented, Empty } from '@/components/ui';
import { formatRupees, formatShortDate, monthKey, getMonthName, parseDate } from '@/lib/dates';
import { cn } from '@/lib/cn';

type RowFilter = 'all' | 'deductions';

const MAX_LISTED_DAYS = 12;

export default function BillsPage() {
  const now = new Date();
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RowFilter>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { showToast } = useToast();

  // Older months live outside the synced window; fetch their attendance first.
  useEffect(() => {
    localDb.ensureMonthLoaded(year, month);
  }, [year, month]);

  const bill = useStore(db => db.getMonthlyHostelBills(year, month), [year, month]);
  const unrecorded = useStore(db => db.getUnrecordedDays(year, month), [year, month]);
  const tokenRows = useStore(db => db.getTokenMonthlyReport(year, month), [year, month]);
  const guestIncome = useStore(
    db => db.getTokenEntries(monthKey(year, month)).reduce((sum, e) => sum + e.total_price, 0),
    [year, month]
  );
  const defaultAmount = useStore(db => db.getDefaultMonthAmount());

  const frozen = bill.is_finalized;
  const monthLabel = `${getMonthName(month)} ${year}`;

  // Month amount input: shows the frozen amount, or the editable default.
  const [amountInput, setAmountInput] = useState(String(defaultAmount));
  useEffect(() => {
    setAmountInput(String(frozen ? bill.month_amount : defaultAmount));
  }, [frozen, bill.month_amount, defaultAmount]);

  const saveAmount = () => {
    const value = Number(amountInput);
    if (!(value > 0)) {
      setAmountInput(String(defaultAmount));
      showToast('error', 'Month amount must be more than zero');
      return;
    }
    if (value !== defaultAmount) {
      localDb.setDefaultMonthAmount(value);
      showToast('success', `Month amount set to ${formatRupees(value)}`);
    }
  };

  const totalDeductions = useMemo(
    () => bill.rows.reduce((sum, r) => sum + r.deduction_amount, 0),
    [bill]
  );
  const withDeductions = useMemo(() => bill.rows.filter(r => r.deduction_amount > 0).length, [bill]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bill.rows.filter(r => {
      if (filter === 'deductions' && r.deduction_amount <= 0) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.roll_number.toLowerCase().includes(q);
    });
  }, [bill, search, filter]);

  const shownDeductions = rows.reduce((sum, r) => sum + r.deduction_amount, 0);
  const shownPayable = rows.reduce((sum, r) => sum + r.payable_amount, 0);

  const downloadBill = async () => {
    const name = getMonthName(month);
    const { generateStudentBillingExcel, triggerBrowserDownload } = await import('@/lib/excel-export');
    const buffer = await generateStudentBillingExcel(bill.rows, name, year, 'GIRLS HOSTEL MESS BILL');
    triggerBrowserDownload(buffer, `W_HOSTEL_BILL_${name.toUpperCase()}_${year}.xlsx`);
  };

  const downloadGuestReport = async () => {
    const name = getMonthName(month);
    const { generateTokenReportExcel, triggerBrowserDownload } = await import('@/lib/excel-export');
    const buffer = await generateTokenReportExcel(tokenRows, name, year);
    triggerBrowserDownload(buffer, `Guest_report_${name}_${year}.xlsx`);
  };

  const freeze = () => {
    localDb.finalizeMonthlyBill(year, month);
    setConfirmOpen(false);
    showToast('success', `${monthLabel} bill frozen`);
  };

  const monthShort = parseDate(`${monthKey(year, month)}-01`).toLocaleDateString('en-IN', { month: 'short' });
  const listedDays = unrecorded.slice(0, MAX_LISTED_DAYS);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills"
        subtitle="Avanthi Institute of Engineering and Technology, girls hostel mess"
        actions={
          <>
            <MonthStepper
              year={year}
              month={month}
              max={current}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
            <button type="button" className="btn btn-primary" onClick={downloadBill} disabled={!bill.rows.length}>
              <Download className="h-4 w-4" /> Download bill
            </button>
            <button type="button" className="btn btn-secondary" onClick={downloadGuestReport}>
              Guest report
            </button>
          </>
        }
      />

      {/* Summary: one quiet ruled row */}
      <dl className="grid grid-cols-2 gap-y-4 border-y border-sky py-4 sm:grid-cols-3 lg:flex lg:items-end lg:gap-0 lg:divide-x lg:divide-rule">
        <Stat label="Students">{bill.total_students}</Stat>
        <div className="lg:px-6 lg:first:pl-0">
          <dt className="text-sm text-ink-2">
            <label htmlFor="month-amount">Month amount</label>
          </dt>
          <dd className="mt-1 flex items-center gap-1">
            <span className="text-ink-3">₹</span>
            <input
              id="month-amount"
              type="number"
              inputMode="numeric"
              min={1}
              value={amountInput}
              disabled={frozen}
              onChange={e => setAmountInput(e.target.value)}
              onBlur={() => !frozen && saveAmount()}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              className="field field-sm w-28 text-lg font-semibold tabular-nums"
            />
          </dd>
        </div>
        <Stat label="Running days">{bill.running_days}</Stat>
        <Stat label="Deductions">
          <span className={cn(totalDeductions > 0 && 'text-away')}>{formatRupees(totalDeductions)}</span>
        </Stat>
        <Stat label="Guest income">{formatRupees(guestIncome)}</Stat>
        <div className="col-span-2 sm:col-span-1 lg:ml-auto lg:px-6 lg:pr-0 lg:text-right">
          <dt className="text-sm text-ink-2">Payable</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{formatRupees(bill.total_payable)}</dd>
        </div>
      </dl>

      {/* Days with no attendance */}
      {!frozen && unrecorded.length > 0 && (
        <div className="rounded-md bg-marker px-4 py-3 text-marker-ink">
          {unrecorded.length} {unrecorded.length === 1 ? 'day' : 'days'} this month {unrecorded.length === 1 ? 'has' : 'have'} no
          attendance taken:{' '}
          {listedDays.map((d, i) => (
            <React.Fragment key={d}>
              <Link href={`/today?date=${d}`} className="font-semibold underline underline-offset-2 hover:text-ink">
                {Number(d.slice(8))}
              </Link>
              {i < listedDays.length - 1 ? ', ' : ''}
            </React.Fragment>
          ))}
          {unrecorded.length > MAX_LISTED_DAYS ? ` and ${unrecorded.length - MAX_LISTED_DAYS} more` : ''} {monthShort}. Those
          days count as present for everyone.
        </div>
      )}

      {/* Freeze */}
      {frozen ? (
        <p className="flex items-center gap-2 text-ink-2">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            Frozen on {bill.finalized_at ? formatShortDate(bill.finalized_at.slice(0, 10)) : 'an earlier date'}. Later changes to
            attendance or prices won’t affect this bill.
          </span>
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-2">This bill updates as attendance changes. Freeze it once it’s final.</p>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmOpen(true)} disabled={!bill.rows.length}>
            <Lock className="h-4 w-4" /> Freeze bill
          </button>
        </div>
      )}

      {/* Register */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              placeholder="Search name or roll no"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="field pl-9"
              aria-label="Search bill"
            />
          </div>
          <Segmented<RowFilter>
            label="Filter rows"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'deductions', label: 'With deductions' }
            ]}
          />
          <p className="text-sm text-ink-2 sm:ml-auto">
            {bill.rows.length} students, {withDeductions} with deductions
          </p>
        </div>

        {bill.rows.length === 0 ? (
          <Empty action={<Link href="/students" className="btn btn-secondary">Go to students</Link>}>
            No active students on the roll, so there’s nothing to bill.
          </Empty>
        ) : rows.length === 0 ? (
          <Empty
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
              >
                Show all students
              </button>
            }
          >
            No students match {search ? `“${search}”` : 'this filter'}.
          </Empty>
        ) : (
          <>
            {/* Phone: two-line list */}
            <ul className="divide-y divide-rule border-y border-sky bg-sheet sm:hidden">
              {rows.map(r => (
                <li key={r.student.id} className="flex items-start justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="text-sm text-ink-2">
                      {r.roll_number}
                      {r.absent_days > 0 && (
                        <span className="ml-2 rounded-sm bg-away-wash px-1.5 text-away">
                          {r.absent_days} absent
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="font-semibold">{formatRupees(r.payable_amount)}</p>
                    {r.deduction_amount > 0 && <p className="text-sm text-away">−{formatRupees(r.deduction_amount)}</p>}
                  </div>
                </li>
              ))}
              <li className="flex justify-between px-3 py-3 font-bold tabular-nums">
                <span>Total, {rows.length} students</span>
                <span>{formatRupees(shownPayable)}</span>
              </li>
            </ul>

            {/* Tablet and desktop: the register */}
            <div className="hidden max-h-[70vh] overflow-auto rounded-md border border-sky bg-sheet sm:block">
              <table className="register min-w-[56rem]">
                <thead>
                  <tr>
                    <th className="num w-14">S.no</th>
                    <th>Name</th>
                    <th className="text-center">Gender</th>
                    <th>Roll no</th>
                    <th className="num whitespace-normal leading-tight">Month amount</th>
                    <th className="num whitespace-normal leading-tight">Running days</th>
                    <th className="num whitespace-normal leading-tight">Absent days</th>
                    <th className="num whitespace-normal leading-tight">Deduct days</th>
                    <th className="num whitespace-normal leading-tight">Eligible days</th>
                    <th className="num">Deduction</th>
                    <th className="num">Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.student.id}>
                      <td className="num text-ink-3">{r.s_no}</td>
                      <td className="font-semibold">{r.name}</td>
                      <td className="text-center text-ink-2">{r.gender || 'F'}</td>
                      <td className="whitespace-nowrap">{r.roll_number}</td>
                      <td className="num text-ink-2">{formatRupees(r.month_amount)}</td>
                      <td className="num text-ink-2">{r.running_days}</td>
                      <td className={cn('num', r.absent_days > 0 ? 'bg-away-wash font-semibold' : 'text-ink-3')}>
                        {r.absent_days}
                      </td>
                      <td className="num text-ink-2">{r.deduct_days}</td>
                      <td className="num">{r.eligible_days}</td>
                      <td className={cn('num', r.deduction_amount > 0 ? 'text-away' : 'text-ink-3')}>
                        {formatRupees(r.deduction_amount)}
                      </td>
                      <td className="num font-semibold">{formatRupees(r.payable_amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={9} className="sticky bottom-0 border-t-2 border-sky bg-paper px-3 h-12">
                      Total, {rows.length} {rows.length === 1 ? 'student' : 'students'}
                    </td>
                    <td className={cn('num sticky bottom-0 border-t-2 border-sky bg-paper px-3', shownDeductions > 0 && 'text-away')}>
                      {formatRupees(shownDeductions)}
                    </td>
                    <td className="num sticky bottom-0 border-t-2 border-sky bg-paper px-3">{formatRupees(shownPayable)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title={`Freeze ${monthLabel} bill?`}
        body={
          <>
            The amounts are saved as they are now ({formatRupees(bill.total_payable)} for {bill.total_students} students).
            Attendance or price changes made later won’t change this bill.
          </>
        }
        confirmLabel="Freeze bill"
        onConfirm={freeze}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lg:px-6 lg:first:pl-0">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
