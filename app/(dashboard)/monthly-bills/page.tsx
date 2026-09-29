'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { localDb, getMonthName, getDaysInMonth } from '@/lib/db';
import { MonthlyBillSnapshot, MonthlyHostelBillRow } from '@/lib/types';
import { 
  FileSpreadsheet, 
  Calendar, 
  Search, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Building2, 
  ChevronRight, 
  Sparkles, 
  DollarSign,
  Download
} from 'lucide-react';
import { generateStudentBillingExcel, triggerBrowserDownload } from '@/lib/excel-export';

export default function MonthlyBillsPage() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(5); // Default May (Month of Excel spec)
  const [search, setSearch] = useState('');
  const [monthAmountInput, setMonthAmountInput] = useState(2500);

  const [billSnapshot, setBillSnapshot] = useState<MonthlyBillSnapshot | null>(null);
  const [notification, setNotification] = useState<string>('');

  const monthsList = [
    { num: 1, name: 'January' },
    { num: 2, name: 'February' },
    { num: 3, name: 'March' },
    { num: 4, name: 'April' },
    { num: 5, name: 'May' },
    { num: 6, name: 'June' },
    { num: 7, name: 'July' },
    { num: 8, name: 'August' },
    { num: 9, name: 'September' },
    { num: 10, name: 'October' },
    { num: 11, name: 'November' },
    { num: 12, name: 'December' },
  ];

  const loadBillData = () => {
    const snapshot = localDb.getMonthlyHostelBills(selectedYear, selectedMonth, monthAmountInput);
    setBillSnapshot(snapshot);
  };

  useEffect(() => {
    loadBillData();
  }, [selectedYear, selectedMonth, monthAmountInput]);

  const handleFinalizeBill = () => {
    if (confirm(`Are you sure you want to finalize and freeze the bill for ${getMonthName(selectedMonth)} ${selectedYear}? Once finalized, changing meal prices will not alter this month's calculations.`)) {
      const finalized = localDb.finalizeMonthlyBill(selectedYear, selectedMonth, monthAmountInput);
      setBillSnapshot(finalized);
      setNotification(`Bill for ${getMonthName(selectedMonth)} ${selectedYear} has been finalized and saved in history.`);
      setTimeout(() => setNotification(''), 4000);
    }
  };

  const handleExportExcel = async () => {
    if (!billSnapshot) return;
    const mName = getMonthName(selectedMonth);
    const buffer = await generateStudentBillingExcel(
      billSnapshot.rows,
      mName,
      selectedYear,
      'GIRLS HOSTEL MESS BILL'
    );
    triggerBrowserDownload(buffer, `W_HOSTEL_BILL_${mName.toUpperCase()}_${selectedYear}.xlsx`);
  };

  // Filter rows by search
  const filteredRows = billSnapshot?.rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.roll_number.toLowerCase().includes(q);
  }) || [];

  return (
    <div className="space-y-6">
      <Header title="Monthly Hostel Billing Ledger" />

      {/* Year & Month Picker Navigation */}
      <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Select Billing Cycle</span>
            <h3 className="text-sm font-bold text-zinc-900">Year & Month History Selector</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input-base text-xs font-mono font-bold w-28 border-blue-300"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>

        {/* Month Buttons Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 text-xs">
          {monthsList.map((m) => {
            const isSelected = selectedMonth === m.num;
            return (
              <button
                key={m.num}
                onClick={() => setSelectedMonth(m.num)}
                className={`py-2 px-2 rounded-md font-semibold text-center transition-all border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold scale-105'
                    : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border-zinc-200'
                }`}
              >
                {m.name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Bill View matching "W HOSTEL BILLS 2026.xlsx" */}
      {billSnapshot && (
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden space-y-4">
          
          {/* Institution Header Banner */}
          <div className="p-5 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white text-center space-y-1">
            <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase">
              AVANTHI INSTITUTE OF ENGINEERING AND TECHNOLOGY
            </h2>
            <p className="text-xs text-blue-200 font-medium">TAMARAM, MAKAVARAPALEM, VISAKHAPATNAM-DT</p>
            <div className="pt-2">
              <span className="inline-block bg-white/20 backdrop-blur-xs text-white text-xs font-extrabold px-4 py-1 rounded-full uppercase tracking-wider border border-white/30">
                GIRLS HOSTEL MESS BILL FOR THE MONTH OF {billSnapshot.month_name.toUpperCase()} - {billSnapshot.year}
              </span>
            </div>
          </div>

          {/* Action Control Bar & Summary Statistics */}
          <div className="px-5 pt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs flex-1">
              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded">
                <span className="text-[10px] text-zinc-500 font-semibold block">Month Amount</span>
                <span className="font-bold font-mono text-zinc-900 text-sm">₹{billSnapshot.month_amount.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded">
                <span className="text-[10px] text-zinc-500 font-semibold block">Running Days</span>
                <span className="font-bold font-mono text-blue-700 text-sm">{billSnapshot.running_days} Days</span>
              </div>
              <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded">
                <span className="text-[10px] text-zinc-500 font-semibold block">Total Students</span>
                <span className="font-bold font-mono text-zinc-900 text-sm">{billSnapshot.total_students}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
                <span className="text-[10px] text-emerald-700 font-semibold block">Total Payable Mess Bill</span>
                <span className="font-bold font-mono text-emerald-800 text-sm">₹{billSnapshot.total_payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input */}
              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search student/roll..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-base input-with-icon text-xs py-1"
                />
              </div>

              {/* Finalize button */}
              {billSnapshot.is_finalized ? (
                <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 border border-emerald-200">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" /> Finalized & Frozen
                </span>
              ) : (
                <button
                  onClick={handleFinalizeBill}
                  className="btn-secondary text-xs flex items-center gap-1.5 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  title="Freeze monthly bill calculations for historical history"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-600" /> Freeze Bill History
                </button>
              )}

              {/* Excel Export Button */}
              <button
                onClick={handleExportExcel}
                className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Export Excel
              </button>
            </div>
          </div>

          {/* Table matching "W HOSTEL BILLS 2026.xlsx" format */}
          <div className="table-container p-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-blue-50/80 text-zinc-800">
                  <th className="table-header text-center border border-zinc-200">S.NO</th>
                  <th className="table-header border border-zinc-200">NAME OF THE STUDENT</th>
                  <th className="table-header text-center border border-zinc-200">GENDER</th>
                  <th className="table-header border border-zinc-200">ROLL NO</th>
                  <th className="table-header text-right border border-zinc-200">Month Amount</th>
                  <th className="table-header text-center border border-zinc-200">Running days</th>
                  <th className="table-header text-center border border-zinc-200">Absent Days</th>
                  <th className="table-header text-center border border-zinc-200">Deduct Days</th>
                  <th className="table-header text-center border border-zinc-200">Eligible Days</th>
                  <th className="table-header text-right border border-zinc-200">Deduction Amount</th>
                  <th className="table-header text-right border border-zinc-200">Payable Amount-Mess</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-mono">
                {filteredRows.map((r) => (
                  <tr key={r.student.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-2 text-center text-zinc-500 font-sans text-xs border border-zinc-200">{r.s_no}</td>
                    <td className="p-2 font-bold font-sans text-zinc-900 border border-zinc-200">{r.name}</td>
                    <td className="p-2 text-center text-zinc-700 border border-zinc-200 font-bold">{r.gender || 'F'}</td>
                    <td className="p-2 font-bold text-blue-900 border border-zinc-200">{r.roll_number}</td>
                    <td className="p-2 text-right text-zinc-700 border border-zinc-200">₹{r.month_amount.toFixed(2)}</td>
                    <td className="p-2 text-center text-zinc-700 border border-zinc-200">{r.running_days}</td>
                    <td className={`p-2 text-center font-bold border border-zinc-200 ${r.absent_days > 0 ? 'text-amber-700 bg-amber-50/50' : 'text-zinc-500'}`}>
                      {r.absent_days}
                    </td>
                    <td className="p-2 text-center text-zinc-700 border border-zinc-200">{r.deduct_days}</td>
                    <td className="p-2 text-center font-bold text-zinc-900 border border-zinc-200">{r.eligible_days}</td>
                    <td className="p-2 text-right text-red-700 border border-zinc-200">₹{r.deduction_amount.toFixed(2)}</td>
                    <td className="p-2 text-right font-bold text-emerald-800 border border-zinc-200 bg-emerald-50/30">
                      ₹{r.payable_amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-100 font-bold text-zinc-900 text-xs">
                  <td colSpan={4} className="p-3 text-left font-sans border border-zinc-300">
                    TOTAL ({filteredRows.length} Students)
                  </td>
                  <td colSpan={5} className="border border-zinc-300"></td>
                  <td className="p-3 text-right font-mono border border-zinc-300 text-red-700">
                    ₹{filteredRows.reduce((sum, r) => sum + r.deduction_amount, 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-mono border border-zinc-300 text-emerald-800 text-sm">
                    ₹{filteredRows.reduce((sum, r) => sum + r.payable_amount, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
