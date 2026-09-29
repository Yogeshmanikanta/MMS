'use client';

import React, { useRef, useState } from 'react';
import { localDb } from '@/lib/db';
import { useStore } from '@/lib/use-store';
import { useToast } from '@/components/toast';
import { ConfirmDialog, PageHeader } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatRupees, formatShortDate, getTodayString } from '@/lib/dates';
import { MEAL_ORDER, MealType, TokenItem } from '@/lib/types';

const MEAL_LABEL: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export default function PricesPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Prices"
        subtitle="Used when you add guest entries. Hostel bills use the monthly amount set on the Bills page."
      />
      <MealPrices />
      <GuestItems />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meal rates
// ---------------------------------------------------------------------------

function MealPrices() {
  const prices = useStore(db => db.getMealPrices());
  const [editing, setEditing] = useState<MealType | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const today = getTodayString();

  const current = (meal: MealType) => prices.find(p => p.meal_type === meal && p.effective_from <= today);
  const upcoming = (meal: MealType) =>
    prices.filter(p => p.meal_type === meal && p.effective_from > today).sort((a, b) => a.effective_from.localeCompare(b.effective_from))[0];

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Meals</h2>
      <div className="divide-y divide-rule border-y-2 border-sky">
        {MEAL_ORDER.map(meal => {
          const cur = current(meal);
          const next = upcoming(meal);
          return (
            <div key={meal} className="py-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <p className="w-28 font-semibold">{MEAL_LABEL[meal]}</p>
                <p className="w-24 text-xl font-bold tabular-nums">{formatRupees(cur?.price ?? 0)}</p>
                <p className="min-w-0 flex-1 text-sm text-ink-3">
                  {cur ? `Since ${formatShortDate(cur.effective_from)}` : 'Not set'}
                  {next && `. Changes to ${formatRupees(next.price)} on ${formatShortDate(next.effective_from)}`}
                </p>
                {editing !== meal && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(meal)}>
                    Change price
                  </button>
                )}
              </div>
              {editing === meal && <MealPriceForm meal={meal} currentPrice={cur?.price} onDone={() => setEditing(null)} />}
            </div>
          );
        })}
      </div>
      <button type="button" className="text-sm font-semibold text-royal underline-offset-2 hover:underline" onClick={() => setShowHistory(s => !s)}>
        {showHistory ? 'Hide price history' : 'Show price history'}
      </button>
      {showHistory && (
        <div className="overflow-x-auto">
          <table className="register max-w-xl">
            <thead>
              <tr>
                <th>Meal</th>
                <th className="num">Price</th>
                <th>From</th>
                <th>Changed on</th>
              </tr>
            </thead>
            <tbody>
              {prices.map(p => (
                <tr key={p.id}>
                  <td>{MEAL_LABEL[p.meal_type]}</td>
                  <td className="num">{formatRupees(p.price)}</td>
                  <td>{formatShortDate(p.effective_from)}</td>
                  <td className="text-ink-3">{formatShortDate(p.created_at.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MealPriceForm({ meal, currentPrice, onDone }: { meal: MealType; currentPrice?: number; onDone: () => void }) {
  const { showToast } = useToast();
  const [price, setPrice] = useState(currentPrice !== undefined ? String(currentPrice) : '');
  const [from, setFrom] = useState(getTodayString());
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(price);
    if (price.trim() === '' || !(value >= 0)) {
      setError('Enter a price of 0 or more.');
      return;
    }
    localDb.updateMealPrice(meal, value, from);
    showToast('success', `${MEAL_LABEL[meal]} is ${formatRupees(value)} from ${formatShortDate(from)}`);
    onDone();
  };

  return (
    <form onSubmit={submit} onKeyDown={e => e.key === 'Escape' && onDone()} className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-sky-wash/60 p-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink-2">New price (₹)</span>
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          min={0}
          step="0.5"
          value={price}
          onChange={e => {
            setPrice(e.target.value);
            setError('');
          }}
          className="field w-32"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink-2">Starting</span>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="field w-44" />
      </label>
      <button type="submit" className="btn btn-primary">
        Save price
      </button>
      <button type="button" className="btn btn-ghost" onClick={onDone}>
        Cancel
      </button>
      {error && <p className="basis-full text-sm text-away">{error}</p>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Guest items
// ---------------------------------------------------------------------------

function GuestItems() {
  const { showToast } = useToast();
  const items = useStore(db => db.getTokenItems());
  const usedIds = useStore(db => new Set(db.getTokenEntries().map(e => e.token_item_id)));
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TokenItem | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const value = Number(price);
      if (price.trim() === '' || !(value >= 0)) throw new Error('Enter a price of 0 or more.');
      const item = localDb.addTokenItem(name, value);
      showToast('success', `Added ${item.name} at ${formatRupees(item.price)}`);
      setName('');
      setPrice('');
      setError('');
      nameRef.current?.focus();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const setStatus = (item: TokenItem, status: 'active' | 'inactive') => {
    localDb.updateTokenItem(item.id, { status });
    showToast(
      'success',
      status === 'inactive' ? `${item.name} hidden from guest entry` : `${item.name} available again`,
      undefined,
      { action: { label: 'Undo', onClick: () => localDb.updateTokenItem(item.id, { status: item.status }) } }
    );
  };

  const remove = () => {
    if (!toDelete) return;
    const item = toDelete;
    localDb.deleteTokenItem(item.id);
    setToDelete(null);
    showToast('success', `Deleted ${item.name}`);
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">Guest items</h2>
        <p className="mt-1 text-ink-2">Tea, snacks and other things sold to guests and staff.</p>
      </div>

      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[12rem] flex-1 sm:max-w-xs">
          <span className="mb-1 block text-sm font-semibold text-ink-2">Item</span>
          <input
            ref={nameRef}
            value={name}
            onChange={e => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="e.g. Sp dinner"
            className="field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-2">Price (₹)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            value={price}
            onChange={e => {
              setPrice(e.target.value);
              setError('');
            }}
            className="field w-28"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          Add item
        </button>
        {error && <p className="basis-full text-sm text-away">{error}</p>}
      </form>

      <div className="divide-y divide-rule border-y-2 border-sky">
        {items.map(item =>
          editingId === item.id ? (
            <ItemEditRow key={item.id} item={item} onDone={() => setEditingId(null)} />
          ) : (
            <div key={item.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 py-3', item.status === 'inactive' && 'text-ink-3')}>
              <p className="min-w-0 flex-1 font-semibold">
                {item.name}
                {item.status === 'inactive' && <span className="ml-2 text-sm font-normal">hidden</span>}
              </p>
              <p className="w-20 text-right tabular-nums">{formatRupees(item.price)}</p>
              <div className="flex gap-1">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(item.id)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStatus(item, item.status === 'active' ? 'inactive' : 'active')}
                >
                  {item.status === 'active' ? 'Hide' : 'Show'}
                </button>
                {!usedIds.has(item.id) && (
                  <button type="button" className="btn btn-ghost btn-sm text-away hover:bg-away-wash" onClick={() => setToDelete(item)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>
      <p className="text-sm text-ink-3">Items already used in guest entries can be hidden but not deleted, so old entries keep their names.</p>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`Delete ${toDelete?.name}?`}
        body="It has never been used in a guest entry. This can't be undone."
        confirmLabel="Delete item"
        tone="danger"
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}

function ItemEditRow({ item, onDone }: { item: TokenItem; onDone: () => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [error, setError] = useState('');

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(price);
    if (!name.trim()) return setError('Enter an item name.');
    if (price.trim() === '' || !(value >= 0)) return setError('Enter a price of 0 or more.');
    localDb.updateTokenItem(item.id, { name: name.trim(), price: value });
    showToast('success', 'Saved changes');
    onDone();
  };

  return (
    <form onSubmit={save} onKeyDown={e => e.key === 'Escape' && onDone()} className="flex flex-wrap items-center gap-2 bg-sky-wash/60 px-2 py-2">
      <input autoFocus value={name} onChange={e => setName(e.target.value)} className="field field-sm min-w-[10rem] flex-1" aria-label="Item name" />
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.5"
        value={price}
        onChange={e => setPrice(e.target.value)}
        className="field field-sm w-24"
        aria-label="Price"
      />
      <button type="submit" className="btn btn-primary btn-sm">
        Save
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
        Cancel
      </button>
      {error && <p className="basis-full text-sm text-away">{error}</p>}
    </form>
  );
}
