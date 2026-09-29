'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { localDb, getTodayString } from '@/lib/db';
import { TokenEntry, GuestSummary } from '@/lib/types';
import { 
  Coffee, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  X,
  UserCheck,
  Receipt,
  Search,
  Filter,
  Users
} from 'lucide-react';

export default function GuestLedgerPage() {
  const todayStr = getTodayString();
  const [selectableItems, setSelectableItems] = useState(() => localDb.getGuestSelectableItems());
  const [entries, setEntries] = useState<TokenEntry[]>(() => localDb.getTokenEntries());
  const [guestSummaries, setGuestSummaries] = useState<GuestSummary[]>(() => localDb.getGuestSummaries());

  // Form State
  const [consumerInput, setConsumerInput] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(selectableItems[0]?.id || 'ti-1');
  const [quantityInput, setQuantityInput] = useState('1');
  const [entryDateInput, setEntryDateInput] = useState(todayStr);
  const [notesInput, setNotesInput] = useState('');
  
  // Status feedback
  const [entryError, setEntryError] = useState('');
  const [entrySuccess, setEntrySuccess] = useState('');

  // Editing Entry state
  const [editingEntry, setEditingEntry] = useState<TokenEntry | null>(null);

  // Guest Search Filter for ledger summary
  const [guestSearch, setGuestSearch] = useState('');
  const [selectedGuestFilter, setSelectedGuestFilter] = useState<string | null>(null);

  const refreshData = () => {
    const items = localDb.getGuestSelectableItems();
    setSelectableItems(items);
    setEntries(localDb.getTokenEntries());
    setGuestSummaries(localDb.getGuestSummaries());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Selected Item Calc Preview
  const activeItem = selectableItems.find(i => i.id === selectedItemId);
  const qtyNum = parseInt(quantityInput, 10) || 0;
  const lineTotalPreview = (activeItem ? activeItem.price : 0) * (qtyNum > 0 ? qtyNum : 0);

  // Submit Add / Edit Guest Entry
  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError('');
    setEntrySuccess('');

    if (!consumerInput.trim()) {
      setEntryError('Guest / Consumer Name is required.');
      return;
    }

    const qty = parseInt(quantityInput, 10);
    if (isNaN(qty) || qty <= 0) {
      setEntryError('Quantity must be a positive number.');
      return;
    }

    try {
      if (editingEntry) {
        localDb.updateTokenEntry(editingEntry.id, {
          token_item_id: selectedItemId,
          quantity: qty,
          consumer_name: consumerInput.trim(),
          date: entryDateInput,
          notes: notesInput.trim()
        });
        setEntrySuccess(`Updated entry for guest "${consumerInput.trim()}" successfully.`);
      } else {
        localDb.addTokenEntry({
          token_item_id: selectedItemId,
          quantity: qty,
          consumer_name: consumerInput.trim(),
          date: entryDateInput,
          notes: notesInput.trim()
        });
        setEntrySuccess(`Recorded guest meal/item entry for "${consumerInput.trim()}" successfully.`);
      }

      setQuantityInput('1');
      setNotesInput('');
      setEditingEntry(null);
      refreshData();

      setTimeout(() => setEntrySuccess(''), 3500);
    } catch (err: any) {
      setEntryError(err.message || 'Error saving guest entry');
    }
  };

  const handleEditClick = (entry: TokenEntry) => {
    setEditingEntry(entry);
    setConsumerInput(entry.consumer_name);
    setSelectedItemId(entry.token_item_id);
    setQuantityInput(String(entry.quantity));
    setEntryDateInput(entry.date);
    setNotesInput(entry.notes || '');
    setEntryError('');
    setEntrySuccess('');
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('Are you sure you want to delete this guest ledger record?')) {
      localDb.deleteTokenEntry(id);
      refreshData();
      if (editingEntry?.id === id) {
        setEditingEntry(null);
      }
    }
  };

  // Filtered History Entries
  const filteredEntries = entries.filter(e => {
    if (selectedGuestFilter && e.consumer_name.toLowerCase() !== selectedGuestFilter.toLowerCase()) {
      return false;
    }
    if (guestSearch.trim()) {
      const q = guestSearch.toLowerCase();
      return e.consumer_name.toLowerCase().includes(q) || (e.token_item_name && e.token_item_name.toLowerCase().includes(q));
    }
    return true;
  });

  // Unique guest names for auto-complete drop down
  const existingGuestNames = Array.from(new Set(guestSummaries.map(g => g.guest_name)));

  const overallPayableSum = guestSummaries.reduce((sum, g) => sum + g.total_amount, 0);

  return (
    <div className="space-y-6">
      <Header title="Guest Ledger Management" />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Guest Payable</p>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-1">₹{overallPayableSum.toFixed(2)}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Guest Accounts</p>
            <p className="text-xl font-bold font-mono text-blue-700 mt-1">{guestSummaries.length} Guests</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Ledger Entries</p>
            <p className="text-xl font-bold font-mono text-zinc-800 mt-1">{entries.length} Entries</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
            <Coffee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form to Add/Record Guest Meal & Item */}
        <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                {editingEntry ? 'Edit Guest Ledger Record' : 'Record Guest Meal / Item'}
              </h3>
              <p className="text-xs text-zinc-500">Log guest meal consumption & beverage charges</p>
            </div>
            <Coffee className="w-4 h-4 text-blue-600" />
          </div>

          <form onSubmit={handleEntrySubmit} className="space-y-3 text-xs">
            {/* Guest Name Input / Selector */}
            <div>
              <label className="font-bold text-zinc-700 mb-1 block">Guest / Organization Name *</label>
              <input
                type="text"
                required
                list="guest-suggestions"
                placeholder="e.g. Dr. Sharma (External Inspector), VIP Office"
                value={consumerInput}
                onChange={(e) => setConsumerInput(e.target.value)}
                className="input-base text-xs font-medium"
              />
              <datalist id="guest-suggestions">
                {existingGuestNames.map((name, idx) => (
                  <option key={idx} value={name} />
                ))}
              </datalist>
            </div>

            {/* Item / Meal Selection */}
            <div>
              <label className="font-bold text-zinc-700 mb-1 block">Select Meal or Guest Item *</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="input-base text-xs font-medium"
              >
                <optgroup label="Regular Meals">
                  {selectableItems.filter(i => i.type === 'meal').map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} — ₹{item.price.toFixed(2)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Guest Ledger Items">
                  {selectableItems.filter(i => i.type === 'item').map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} — ₹{item.price.toFixed(2)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-zinc-700 mb-1 block">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="1"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  className="input-base text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 mb-1 block">Date</label>
                <input
                  type="date"
                  required
                  value={entryDateInput}
                  onChange={(e) => setEntryDateInput(e.target.value)}
                  className="input-base text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-zinc-700 mb-1 block">Notes / Purpose (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Placement drive lunch"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="input-base text-xs"
              />
            </div>

            {/* Calculated Line Total Card */}
            <div className="p-3 bg-emerald-50 rounded border border-emerald-200 flex justify-between items-center text-xs">
              <span className="text-emerald-800 font-medium">Calculated Total:</span>
              <span className="font-bold font-mono text-emerald-900 text-base">
                ₹{lineTotalPreview.toFixed(2)}
              </span>
            </div>

            {entryError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>{entryError}</span>
              </div>
            )}

            {entrySuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{entrySuccess}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {editingEntry && (
                <button
                  type="button"
                  onClick={() => { setEditingEntry(null); setQuantityInput('1'); setConsumerInput(''); }}
                  className="btn-secondary text-xs flex-1"
                >
                  Cancel Edit
                </button>
              )}
              <button type="submit" className="btn-primary text-xs flex-1 bg-blue-600 hover:bg-blue-700">
                {editingEntry ? 'Save Changes' : 'Record Guest Entry'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Guest Payable Summaries & Records History */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section: Guest Total Amount Payable Summary */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Total Amount Payable by Each Guest</h3>
                <p className="text-xs text-zinc-500">Summary of accumulated charges per guest account</p>
              </div>
              {selectedGuestFilter && (
                <button
                  onClick={() => setSelectedGuestFilter(null)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Show All Guests
                </button>
              )}
            </div>

            {guestSummaries.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No guest ledger entries recorded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {guestSummaries.map((g, idx) => {
                  const isSelected = selectedGuestFilter?.toLowerCase() === g.guest_name.toLowerCase();
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedGuestFilter(isSelected ? null : g.guest_name)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm' 
                          : 'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-zinc-900 truncate max-w-[160px]">{g.guest_name}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{g.total_entries} transaction(s) • Last: {g.latest_date}</p>
                        </div>
                        <span className="font-bold font-mono text-emerald-700 text-sm">
                          ₹{g.total_amount.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Breakdown pills */}
                      <div className="mt-2 pt-2 border-t border-zinc-200/60 flex flex-wrap gap-1">
                        {g.items_consumed.map((item, itemIdx) => (
                          <span key={itemIdx} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-600 font-mono">
                            {item.item_name} ×{item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Detailed Entry History Table */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Guest Meal & Item Consumption History
                </h3>
                {selectedGuestFilter && (
                  <p className="text-xs text-blue-600 font-semibold">
                    Filtering for guest: "{selectedGuestFilter}"
                  </p>
                )}
              </div>

              {/* Fast Search */}
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="input-base input-with-icon text-xs py-1"
                />
              </div>
            </div>

            <div className="table-container max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Guest / Organization</th>
                    <th className="table-header">Item / Meal</th>
                    <th className="table-header text-center">Qty</th>
                    <th className="table-header text-right">Price</th>
                    <th className="table-header text-right">Total (₹)</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-zinc-400">
                        No guest ledger entries match the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((e) => (
                      <tr key={e.id} className="table-row">
                        <td className="table-cell font-mono text-zinc-600">{e.date}</td>
                        <td className="table-cell font-bold text-zinc-900">{e.consumer_name}</td>
                        <td className="table-cell font-medium text-zinc-800">
                          {e.token_item_name}
                          {e.notes && <span className="block text-[10px] text-zinc-400 italic">{e.notes}</span>}
                        </td>
                        <td className="table-cell text-center font-bold text-zinc-800">{e.quantity}</td>
                        <td className="table-cell text-right font-mono text-zinc-500">₹{e.unit_price.toFixed(2)}</td>
                        <td className="table-cell text-right font-mono font-bold text-emerald-700">₹{e.total_price.toFixed(2)}</td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditClick(e)}
                              className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded"
                              title="Edit Entry"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(e.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
