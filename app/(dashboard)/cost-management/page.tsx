'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { localDb, getTodayString } from '@/lib/db';
import { MealPrice, MealType, TokenItem } from '@/lib/types';
import { useToast } from '@/components/toast';
import { 
  DollarSign, 
  Plus, 
  Edit3, 
  Trash2, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Coffee, 
  Utensils, 
  Sun, 
  Moon, 
  X,
  Save
} from 'lucide-react';

export default function CostManagementPage() {
  const todayStr = getTodayString();
  const [mealPrices, setMealPrices] = useState<MealPrice[]>([]);
  const [guestItems, setGuestItems] = useState<TokenItem[]>([]);

  // Subsection A: Meal Cost State
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [newMealPriceInput, setNewMealPriceInput] = useState('');
  const [effectiveFromInput, setEffectiveFromInput] = useState(todayStr);
  const { showToast } = useToast();

  // Subsection B: Guest Item Cost State (Add / Edit)
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Editing guest item modal state
  const [editingItem, setEditingItem] = useState<TokenItem | null>(null);
  const [editPriceInput, setEditPriceInput] = useState('');
  const [editNameInput, setEditNameInput] = useState('');

  const refreshData = () => {
    setMealPrices(localDb.getMealPrices());
    setGuestItems(localDb.getTokenItems());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Handler: Update Meal Price (Breakfast / Lunch / Dinner)
  const handleUpdateMealPrice = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = parseFloat(newMealPriceInput);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      showToast('error', 'Invalid Price', 'Price must be a valid non-negative number.');
      return;
    }

    try {
      localDb.updateMealPrice(selectedMealType, parsedPrice, effectiveFromInput);
      refreshData();
      showToast('success', 'Meal Price Updated!', `${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} price updated to \u20B9${parsedPrice.toFixed(2)} (Effective: ${effectiveFromInput}).`);
      setNewMealPriceInput('');
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Failed to update meal price');
    }
  };

  // Handler: Add New Guest Ledger Item
  const handleAddGuestItem = (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(newItemPrice);
    if (!newItemName.trim()) {
      showToast('error', 'Missing Name', 'Item name is required.');
      return;
    }
    if (isNaN(price) || price < 0) {
      showToast('error', 'Invalid Price', 'Price must be a valid non-negative number.');
      return;
    }

    try {
      localDb.addTokenItem(newItemName.trim(), price, todayStr);
      refreshData();
      showToast('success', 'Guest Item Added!', `Added new guest item "${newItemName.trim()}" at \u20B9${price.toFixed(2)}.`);
      setNewItemName('');
      setNewItemPrice('');
    } catch (err: any) {
      showToast('error', 'Add Failed', err.message || 'Failed to add guest item');
    }
  };

  // Handler: Edit Guest Item
  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const price = parseFloat(editPriceInput);
    if (!editNameInput.trim()) {
      showToast('error', 'Missing Name', 'Item name cannot be empty.');
      return;
    }
    if (isNaN(price) || price < 0) {
      showToast('error', 'Invalid Price', 'Price must be a non-negative number.');
      return;
    }

    localDb.updateTokenItem(editingItem.id, {
      name: editNameInput.trim(),
      price: price
    });

    setEditingItem(null);
    refreshData();
    showToast('success', 'Item Updated!', `Updated item "${editNameInput.trim()}" price to \u20B9${price.toFixed(2)}.`);
  };

  // Handler: Delete Guest Item
  const handleDeleteGuestItem = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from guest ledger items?`)) {
      localDb.deleteTokenItem(id);
      refreshData();
      showToast('warning', 'Item Deleted', `Deleted "${name}" from guest ledger items.`);
    }
  };

  // Current Active Prices
  const currentBreakfast = localDb.getEffectiveMealPrice('breakfast');
  const currentLunch = localDb.getEffectiveMealPrice('lunch');
  const currentDinner = localDb.getEffectiveMealPrice('dinner');

  return (
    <div className="space-y-8">
      <Header title="Cost Management" />

      {/* Intro Header */}
      <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900">System Pricing & Tariff Configurator</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage daily meal rates and add/edit prices for items available in the guest ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-blue-600" /> Live Rate Engine
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBSECTION A: MEAL COST */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-5">
        <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Subsection A</span>
            <h3 className="text-base font-bold text-zinc-900">Meal Cost Management</h3>
            <p className="text-xs text-zinc-500">Update prices for Breakfast, Lunch, and Dinner meals</p>
          </div>
          <Utensils className="w-5 h-5 text-amber-500" />
        </div>

        {/* Current Active Prices Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-700">Breakfast Price</p>
                <p className="text-lg font-bold font-mono text-amber-900">₹{currentBreakfast.toFixed(2)}</p>
              </div>
            </div>
            <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-semibold">Active</span>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-700">Lunch Price</p>
                <p className="text-lg font-bold font-mono text-blue-900">₹{currentLunch.toFixed(2)}</p>
              </div>
            </div>
            <span className="text-[10px] bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded font-semibold">Active</span>
          </div>

          <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-700">Dinner Price</p>
                <p className="text-lg font-bold font-mono text-indigo-900">₹{currentDinner.toFixed(2)}</p>
              </div>
            </div>
            <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded font-semibold">Active</span>
          </div>
        </div>

        {/* Update Price Form & History Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Form */}
          <form onSubmit={handleUpdateMealPrice} className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3 text-xs">
            <h4 className="font-bold text-zinc-800 text-xs">Update Meal Tariff Rate</h4>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Select Meal</label>
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value as MealType)}
                className="input-base text-xs font-medium"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">New Price (₹)</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                placeholder="e.g. 30"
                value={newMealPriceInput}
                onChange={(e) => setNewMealPriceInput(e.target.value)}
                className="input-base text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Effective From Date</label>
              <input
                type="date"
                required
                value={effectiveFromInput}
                onChange={(e) => setEffectiveFromInput(e.target.value)}
                className="input-base text-xs font-mono"
              />
            </div>


            <button type="submit" className="btn-primary w-full text-xs bg-blue-600 hover:bg-blue-700">
              <Save className="w-3.5 h-3.5" /> Update Meal Price
            </button>
          </form>

          {/* Price History Log */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800">Meal Price Audit Log</span>
              <History className="w-3.5 h-3.5 text-zinc-400" />
            </div>

            <div className="table-container max-h-48 overflow-y-auto border border-zinc-200 rounded">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="table-header">Meal Type</th>
                    <th className="table-header">Price (₹)</th>
                    <th className="table-header">Effective From</th>
                    <th className="table-header text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {mealPrices.map((mp) => (
                    <tr key={mp.id} className="table-row">
                      <td className="table-cell capitalize font-bold text-zinc-900">{mp.meal_type}</td>
                      <td className="table-cell font-mono font-bold text-emerald-700">₹{mp.price.toFixed(2)}</td>
                      <td className="table-cell font-mono text-zinc-600">{mp.effective_from}</td>
                      <td className="table-cell text-right text-zinc-400 font-mono text-[11px]">{mp.created_at.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBSECTION B: GUEST LEDGER ITEMS COST */}
      {/* ========================================================================= */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-5">
        <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Subsection B</span>
            <h3 className="text-base font-bold text-zinc-900">Guest Ledger Items Cost</h3>
            <p className="text-xs text-zinc-500">Manage rates for extra items (Tea, Coffee, Extra Chapati, Milk, etc.)</p>
          </div>
          <Coffee className="w-5 h-5 text-emerald-600" />
        </div>

        {/* Add Item Form & Existing Items List Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add New Item Form */}
          <form onSubmit={handleAddGuestItem} className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3 text-xs">
            <h4 className="font-bold text-zinc-800 text-xs">Add New Guest Item</h4>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Item Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tea / Coffee / Extra Chapati"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="input-base text-xs font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Item Price (₹) *</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                placeholder="e.g. 10"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="input-base text-xs font-mono font-bold"
              />
            </div>


            <button type="submit" className="btn-primary w-full text-xs bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-3.5 h-3.5" /> Add Guest Item
            </button>
          </form>

          {/* Table of Guest Ledger Items with Edit & Delete */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800">Available Guest Ledger Items ({guestItems.length})</span>
              <span className="text-[11px] text-zinc-400">Items available when recording guest sales</span>
            </div>

            <div className="table-container border border-zinc-200 rounded max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="table-header">Item Name</th>
                    <th className="table-header text-right">Price (₹)</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {guestItems.map((item) => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell font-bold text-zinc-900">{item.name}</td>
                      <td className="table-cell text-right font-mono font-bold text-emerald-700">₹{item.price.toFixed(2)}</td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setEditNameInput(item.name);
                              setEditPriceInput(String(item.price));
                            }}
                            className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded"
                            title="Edit Price"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGuestItem(item.id, item.name)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Guest Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-lg max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-900">Edit Guest Item Price</h3>
              <button onClick={() => setEditingItem(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  className="input-base text-xs font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Price (₹)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={editPriceInput}
                  onChange={(e) => setEditPriceInput(e.target.value)}
                  className="input-base text-xs font-mono font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingItem(null)} className="btn-secondary text-xs flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs flex-1 bg-emerald-600 hover:bg-emerald-700">
                  Save Item Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
