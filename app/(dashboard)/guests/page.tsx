'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Search, X, Download } from 'lucide-react';
import { localDb } from '@/lib/db';
import { useStore } from '@/lib/use-store';
import { useToast } from '@/components/toast';
import { PageHeader, Field, Sheet, MonthStepper, Empty } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  formatRupees,
  formatDayMonth,
  relativeDayName,
  getTodayString,
  getMonthName,
  monthKey,
  parseDate
} from '@/lib/dates';
import type { SelectableItem, TokenEntry } from '@/lib/types';

function currentYm() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function GuestsPage() {
  const { showToast } = useToast();
  const [ym, setYm] = useState(currentYm);
  const mk = monthKey(ym.year, ym.month);
  const now = currentYm();
  const isThisMonth = ym.year === now.year && ym.month === now.month;

  const entries = useStore(db => db.getTokenEntries(mk), [mk]);
  const summaries = useStore(db => db.getGuestSummaries(mk), [mk]);

  const [search, setSearch] = useState('');
  const [guestFilter, setGuestFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<TokenEntry | null>(null);

  // Clear the guest filter when the month changes and the guest isn't in it.
  useEffect(() => {
    if (guestFilter && !summaries.some(s => s.guest_name.toLowerCase() === guestFilter.toLowerCase())) {
      setGuestFilter(null);
    }
  }, [summaries, guestFilter]);

  const monthTotal = useMemo(() => entries.reduce((sum, e) => sum + e.total_price, 0), [entries]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(e => {
      if (guestFilter && e.consumer_name.toLowerCase() !== guestFilter.toLowerCase()) return false;
      if (!q) return true;
      return e.consumer_name.toLowerCase().includes(q) || (e.token_item_name || '').toLowerCase().includes(q);
    });
  }, [entries, search, guestFilter]);

  const groups = useMemo(() => {
    const out: { date: string; total: number; entries: TokenEntry[] }[] = [];
    visible.forEach(e => {
      let g = out[out.length - 1];
      if (!g || g.date !== e.date) {
        g = { date: e.date, total: 0, entries: [] };
        out.push(g);
      }
      g.entries.push(e);
      g.total += e.total_price;
    });
    return out;
  }, [visible]);

  const handleDownload = async () => {
    const rows = localDb.getTokenMonthlyReport(ym.year, ym.month);
    const name = getMonthName(ym.month);
    const { generateTokenReportExcel, triggerBrowserDownload } = await import('@/lib/excel-export');
    const buffer = await generateTokenReportExcel(rows, name, ym.year);
    triggerBrowserDownload(buffer, `Guest_report_${name}_${ym.year}.xlsx`);
  };

  const handleDelete = (entry: TokenEntry) => {
    const removed = localDb.deleteTokenEntry(entry.id);
    setEditing(null);
    showToast('success', 'Entry deleted', `${entry.quantity} × ${entry.token_item_name} for ${entry.consumer_name}`, {
      action: removed ? { label: 'Undo', onClick: () => localDb.restoreTokenEntry(removed) } : undefined
    });
  };

  const monthLabel = `${getMonthName(ym.month)} ${ym.year}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guests"
        subtitle={
          entries.length
            ? `${formatRupees(monthTotal)} ${isThisMonth ? 'this month' : `in ${monthLabel}`}, ${entries.length} ${
                entries.length === 1 ? 'entry' : 'entries'
              }`
            : isThisMonth
              ? 'Nothing recorded this month yet'
              : `Nothing recorded in ${monthLabel}`
        }
        actions={
          <>
            <MonthStepper year={ym.year} month={ym.month} onChange={(year, month) => setYm({ year, month })} max={now} />
            <button type="button" className="btn btn-secondary" onClick={handleDownload} disabled={!entries.length}>
              <Download className="h-4 w-4" />
              Download report
            </button>
          </>
        }
      />

      <QuickEntry
        onAdded={entry => {
          const d = parseDate(entry.date);
          if (d.getFullYear() !== ym.year || d.getMonth() + 1 !== ym.month) {
            setYm({ year: d.getFullYear(), month: d.getMonth() + 1 });
          }
        }}
      />

      {entries.length === 0 ? (
        <Empty>No guest entries in {getMonthName(ym.month)}.</Empty>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* Entries by day */}
          <section aria-labelledby="entries-heading" className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="entries-heading" className="text-xl font-bold">
                Entries
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Find guest or item"
                  aria-label="Find guest or item"
                  className="field field-sm pl-9"
                />
              </div>
            </div>

            {guestFilter && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setGuestFilter(null)}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-ink pl-4 pr-3 text-sm font-semibold text-white"
                >
                  Only {guestFilter}
                  <X className="h-4 w-4" aria-label="Show all guests" />
                </button>
              </div>
            )}

            {groups.length === 0 ? (
              <p className="mt-6 text-ink-2">No entries match.</p>
            ) : (
              <div className="mt-4 space-y-6">
                {groups.map(g => (
                  <div key={g.date}>
                    <div className="flex items-baseline justify-between border-b-2 border-sky pb-1.5">
                      <h3 className="font-bold">{relativeDayName(g.date) ?? formatDayMonth(g.date)}</h3>
                      <span className="tabular-nums text-ink-2">{formatRupees(g.total)}</span>
                    </div>
                    <ul>
                      {g.entries.map(e => (
                        <li key={e.id}>
                          <button
                            type="button"
                            onClick={() => setEditing(e)}
                            className="flex min-h-[3.25rem] w-full items-center gap-4 border-b border-rule px-1 py-2 text-left transition-colors hover:bg-sky-wash/60 focus-visible:bg-sky-wash"
                          >
                            <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-4">
                              <p className="truncate font-semibold sm:w-48 sm:shrink-0">{e.consumer_name}</p>
                              <p className="min-w-0 truncate text-ink-2">
                                {e.token_item_name} × {e.quantity}
                                {e.notes && <span className="ml-2 text-ink-3">{e.notes}</span>}
                              </p>
                            </div>
                            <span className="shrink-0 font-semibold tabular-nums">{formatRupees(e.total_price)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Accounts */}
          <section aria-labelledby="accounts-heading">
            <h2 id="accounts-heading" className="text-xl font-bold">
              Accounts
            </h2>
            <p className="mt-1 text-sm text-ink-3">What each guest owes for {getMonthName(ym.month)}. Tap to see their entries.</p>
            <ul className="mt-3 overflow-hidden rounded-lg border border-rule bg-sheet">
              {summaries.map(s => {
                const selected = guestFilter?.toLowerCase() === s.guest_name.toLowerCase();
                return (
                  <li key={s.guest_name} className="border-b border-rule last:border-b-0">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setGuestFilter(selected ? null : s.guest_name)}
                      className={cn(
                        'flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left transition-colors',
                        selected ? 'bg-sky-wash shadow-[inset_3px_0_0_#1B2CC1]' : 'hover:bg-sky-wash/60'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.guest_name}</p>
                        <p className="text-sm text-ink-3">
                          {s.total_entries} {s.total_entries === 1 ? 'entry' : 'entries'}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">{formatRupees(s.total_amount)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} onDelete={handleDelete} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick entry: name, item, quantity, Add. Enter submits from anywhere.
// ---------------------------------------------------------------------------

function QuickEntry({ onAdded }: { onAdded: (entry: TokenEntry) => void }) {
  const { showToast } = useToast();
  const today = getTodayString();

  const [guest, setGuest] = useState('');
  const [date, setDate] = useState(today);
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState<{ field: 'guest' | 'qty'; message: string } | null>(null);

  const items = useStore(db => db.getGuestSelectableItems(date), [date]);
  const names = useStore(db => db.getGuestNames());

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Keep a valid item selected as the price list changes.
  const selected: SelectableItem | undefined = items.find(i => i.id === itemId) ?? items[0];
  useEffect(() => {
    if (selected && selected.id !== itemId) setItemId(selected.id);
  }, [selected, itemId]);

  const qtyNum = parseInt(qty, 10);
  const lineTotal = selected && qtyNum > 0 ? selected.price * qtyNum : 0;

  const setQtyNum = (n: number) => setQty(String(Math.max(1, Math.min(999, n))));

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!guest.trim()) {
      setError({ field: 'guest', message: 'Enter who this is for.' });
      nameRef.current?.focus();
      return;
    }
    if (!(qtyNum > 0)) {
      setError({ field: 'qty', message: 'Quantity must be 1 or more.' });
      return;
    }
    if (!selected) return;
    try {
      const entry = localDb.addTokenEntry({
        token_item_id: selected.id,
        quantity: qtyNum,
        consumer_name: guest,
        date,
        notes: note
      });
      setError(null);
      setQty('1');
      setNote('');
      setShowNote(false);
      showToast('success', `Added ${entry.quantity} × ${entry.token_item_name} for ${entry.consumer_name}`, undefined, {
        action: { label: 'Undo', onClick: () => localDb.deleteTokenEntry(entry.id) }
      });
      onAdded(entry);
      requestAnimationFrame(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
      });
    } catch (err: any) {
      showToast('error', 'Could not add entry', err?.message);
    }
  };

  // Chips behave as one radio group: arrow keys move, Enter adds.
  const onChipKey = (e: React.KeyboardEvent, idx: number) => {
    const move = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (move) {
      e.preventDefault();
      const next = items[(idx + move + items.length) % items.length];
      setItemId(next.id);
      chipRefs.current[next.id]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const regular = items.filter(i => i.type === 'item');
  const meals = items.filter(i => i.type === 'meal');

  const renderChip = (item: SelectableItem) => {
    const idx = items.indexOf(item);
    const active = selected?.id === item.id;
    return (
      <button
        key={item.id}
        ref={el => {
          chipRefs.current[item.id] = el;
        }}
        type="button"
        role="radio"
        aria-checked={active}
        tabIndex={active ? 0 : -1}
        onClick={() => setItemId(item.id)}
        onKeyDown={e => onChipKey(e, idx)}
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-full border px-4 transition-colors',
          active ? 'border-ink bg-ink text-white' : 'border-sky bg-sheet text-ink hover:border-peri hover:bg-sky-wash'
        )}
      >
        <span className="font-semibold">{item.name}</span>
        <span className={cn('tabular-nums', active ? 'text-white/70' : 'text-ink-3')}>{formatRupees(item.price)}</span>
      </button>
    );
  };

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      aria-label="Add a guest entry"
      className="grid gap-x-3 gap-y-4 rounded-xl border border-rule bg-sheet p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end"
    >
      {/* Row 1, col 1 — guest */}
      <div className="lg:col-start-1 lg:row-start-1">
        <label htmlFor="guest-name" className="mb-1.5 block text-sm font-semibold text-ink-2">
          Guest
        </label>
        <GuestNameInput
          inputRef={nameRef}
          value={guest}
          onChange={v => {
            setGuest(v);
            if (error?.field === 'guest') setError(null);
          }}
          names={names}
          invalid={error?.field === 'guest'}
        />
        {error?.field === 'guest' && <p className="mt-1.5 text-sm text-away">{error.message}</p>}
      </div>

      {/* Row 2 — items (tab order: after guest, before quantity) */}
      <div className="lg:col-span-3 lg:row-start-2">
        <p id="item-label" className="mb-1.5 text-sm font-semibold text-ink-2">
          Item
        </p>
        <div role="radiogroup" aria-labelledby="item-label" className="flex flex-wrap items-center gap-2">
          {regular.map(renderChip)}
          {meals.length > 0 && regular.length > 0 && <span className="mx-1 h-6 w-px bg-sky" aria-hidden />}
          {meals.map(renderChip)}
        </div>
      </div>

      {/* Row 1, col 2 — quantity + total */}
      <div className="flex items-end gap-4 lg:col-start-2 lg:row-start-1">
        <div>
          <label htmlFor="guest-qty" className="mb-1.5 block text-sm font-semibold text-ink-2">
            Quantity
          </label>
          <div className="inline-flex h-11 items-stretch rounded-md border border-sky bg-sheet focus-within:border-royal focus-within:ring-2 focus-within:ring-peri/40">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setQtyNum((qtyNum || 1) - 1)}
              className="w-11 rounded-l-md text-ink-2 hover:bg-sky-wash"
              aria-label="One less"
            >
              <Minus className="mx-auto h-4 w-4" />
            </button>
            <input
              id="guest-qty"
              inputMode="numeric"
              value={qty}
              onChange={e => {
                setQty(e.target.value.replace(/\D/g, '').slice(0, 3));
                if (error?.field === 'qty') setError(null);
              }}
              onKeyDown={e => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setQtyNum((qtyNum || 0) + 1);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setQtyNum((qtyNum || 2) - 1);
                }
              }}
              onFocus={e => e.target.select()}
              className="w-12 bg-transparent text-center font-semibold tabular-nums focus:outline-none"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setQtyNum((qtyNum || 0) + 1)}
              className="w-11 rounded-r-md text-ink-2 hover:bg-sky-wash"
              aria-label="One more"
            >
              <Plus className="mx-auto h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="pb-2.5" aria-live="polite">
          <span className="sr-only">Total </span>
          <span className="text-xl font-bold tabular-nums">{formatRupees(lineTotal)}</span>
        </div>
      </div>

      {/* Row 1, col 3 — add */}
      <div className="lg:col-start-3 lg:row-start-1">
        <button type="submit" className="btn btn-primary w-full px-8 lg:w-auto">
          Add
        </button>
      </div>

      {error?.field === 'qty' && <p className="text-sm text-away lg:col-span-3">{error.message}</p>}

      {/* Row 3 — date and note, tucked away */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm lg:col-span-3">
        {showDate ? (
          <label className="flex items-center gap-2">
            <span className="text-ink-2">Date</span>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value || today)}
              className="field field-sm w-auto"
              autoFocus
            />
            {date !== today && (
              <button type="button" className="font-semibold text-royal hover:underline" onClick={() => setDate(today)}>
                Back to today
              </button>
            )}
          </label>
        ) : (
          <button type="button" onClick={() => setShowDate(true)} className="font-semibold text-royal hover:underline">
            {date === today ? 'Today' : formatDayMonth(date)}
            <span className="font-normal text-ink-3"> (change date)</span>
          </button>
        )}
        {showNote ? (
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note, e.g. placement drive lunch"
            aria-label="Note"
            className="field field-sm min-w-0 flex-1 sm:max-w-sm"
            autoFocus
          />
        ) : (
          <button type="button" onClick={() => setShowNote(true)} className="font-semibold text-royal hover:underline">
            Add note
          </button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Guest name with recent-name suggestions (arrow keys + Enter to pick)
// ---------------------------------------------------------------------------

function GuestNameInput({
  inputRef,
  value,
  onChange,
  names,
  invalid
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (v: string) => void;
  names: string[];
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q
      ? names.filter(n => n.toLowerCase().includes(q) && n.toLowerCase() !== q).sort((a, b) => {
          const as = a.toLowerCase().startsWith(q) ? 0 : 1;
          const bs = b.toLowerCase().startsWith(q) ? 0 : 1;
          return as - bs;
        })
      : names;
    return list.slice(0, 6);
  }, [value, names]);

  const showList = open && suggestions.length > 0;

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setHighlight(-1);
  };

  return (
    <div className="relative">
      <input
        id="guest-name"
        ref={inputRef}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls="guest-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={showList && highlight >= 0 ? `guest-opt-${highlight}` : undefined}
        aria-invalid={invalid || undefined}
        value={value}
        placeholder="Name or office, e.g. Exam cell"
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && suggestions.length) {
            e.preventDefault();
            setOpen(true);
            setHighlight(h => (h + 1) % suggestions.length);
          } else if (e.key === 'ArrowUp' && suggestions.length) {
            e.preventDefault();
            setOpen(true);
            setHighlight(h => (h <= 0 ? suggestions.length - 1 : h - 1));
          } else if (e.key === 'Enter' && showList && highlight >= 0) {
            e.preventDefault();
            pick(suggestions[highlight]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={cn('field', invalid && 'border-away')}
      />
      {showList && (
        <ul
          id="guest-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-rule bg-sheet py-1 shadow-float"
        >
          {suggestions.map((n, i) => (
            <li
              key={n}
              id={`guest-opt-${i}`}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={e => {
                e.preventDefault();
                pick(n);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn('flex h-11 cursor-pointer items-center px-3', i === highlight && 'bg-sky-wash')}
            >
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit sheet
// ---------------------------------------------------------------------------

function EditEntrySheet({
  entry,
  onClose,
  onDelete
}: {
  entry: TokenEntry | null;
  onClose: () => void;
  onDelete: (entry: TokenEntry) => void;
}) {
  const { showToast } = useToast();
  const [guest, setGuest] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const items = useStore(db => db.getGuestSelectableItems(date || undefined), [date]);
  const names = useStore(db => db.getGuestNames());

  useEffect(() => {
    if (!entry) return;
    setGuest(entry.consumer_name);
    setItemId(entry.token_item_id);
    setQty(String(entry.quantity));
    setDate(entry.date);
    setNote(entry.notes || '');
    setError('');
  }, [entry]);

  if (!entry) return null;

  // Items retired from the price list still show for old entries.
  const itemMissing = !items.some(i => i.id === entry.token_item_id);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseInt(qty, 10);
    if (!guest.trim()) return setError('Enter who this is for.');
    if (!(q > 0)) return setError('Quantity must be 1 or more.');
    try {
      localDb.updateTokenEntry(entry.id, {
        token_item_id: itemId,
        quantity: q,
        consumer_name: guest,
        date: date || entry.date,
        notes: note.trim() || undefined
      });
      showToast('success', 'Changes saved');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save changes.');
    }
  };

  return (
    <Sheet
      open={Boolean(entry)}
      onClose={onClose}
      title="Edit entry"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn btn-danger" onClick={() => onDelete(entry)}>
            Delete
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form="edit-entry-form" className="btn btn-primary">
              Save changes
            </button>
          </div>
        </div>
      }
    >
      <form id="edit-entry-form" onSubmit={save} className="space-y-4">
        <Field label="Guest" htmlFor="edit-guest">
          <input
            id="edit-guest"
            list="edit-guest-names"
            value={guest}
            onChange={e => setGuest(e.target.value)}
            className="field"
          />
          <datalist id="edit-guest-names">
            {names.map(n => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
        <Field label="Item" htmlFor="edit-item">
          <select id="edit-item" value={itemId} onChange={e => setItemId(e.target.value)} className="field">
            {itemMissing && (
              <option value={entry.token_item_id}>
                {entry.token_item_name} ({formatRupees(entry.unit_price)})
              </option>
            )}
            <optgroup label="Items">
              {items
                .filter(i => i.type === 'item')
                .map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({formatRupees(i.price)})
                  </option>
                ))}
            </optgroup>
            <optgroup label="Meals">
              {items
                .filter(i => i.type === 'meal')
                .map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({formatRupees(i.price)})
                  </option>
                ))}
            </optgroup>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" htmlFor="edit-qty">
            <input
              id="edit-qty"
              inputMode="numeric"
              value={qty}
              onChange={e => setQty(e.target.value.replace(/\D/g, '').slice(0, 3))}
              className="field tabular-nums"
            />
          </Field>
          <Field label="Date" htmlFor="edit-date">
            <input
              id="edit-date"
              type="date"
              value={date}
              max={getTodayString()}
              onChange={e => setDate(e.target.value)}
              className="field"
            />
          </Field>
        </div>
        <Field label="Note" htmlFor="edit-note" hint="Optional">
          <input id="edit-note" value={note} onChange={e => setNote(e.target.value)} className="field" />
        </Field>
        {itemId === entry.token_item_id && (
          <p className="text-sm text-ink-3">
            Charged at {formatRupees(entry.unit_price)} each, the price on the day it was added.
          </p>
        )}
        {error && <p className="text-sm text-away">{error}</p>}
      </form>
    </Sheet>
  );
}
