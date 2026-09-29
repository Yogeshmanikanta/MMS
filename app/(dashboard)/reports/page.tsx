'use client';

import React, { useState } from 'react';
import { Header } from '@/components/header';
import { localDb } from '@/lib/db';
import { generateStudentBillingExcel, generateTokenReportExcel, triggerBrowserDownload } from '@/lib/excel-export';
import { FileSpreadsheet, Download, Calendar, Users, Coffee } from 'lucide-react';

export default function ReportsPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthlySnapshot = localDb.getMonthlyHostelBills(selectedYear, selectedMonth);
  const tokenRows = localDb.getTokenMonthlyReport(selectedYear, selectedMonth);

  const totalStudentBill = monthlySnapshot.total_payable;
  const totalTokenBill = tokenRows.reduce((sum, r) => sum + r.total_amount, 0);

  const handleDownloadStudentReport = async () => {
    const monthName = monthNames[selectedMonth - 1];
    const buffer = await generateStudentBillingExcel(monthlySnapshot.rows, monthName, selectedYear);
    triggerBrowserDownload(buffer, `W_HOSTEL_BILL_${monthName.toUpperCase()}_${selectedYear}.xlsx`);
  };

  const handleDownloadTokenReport = async () => {
    const monthName = monthNames[selectedMonth - 1];
    const buffer = await generateTokenReportExcel(tokenRows, monthName, selectedYear);
    triggerBrowserDownload(buffer, `Guest_Token_Consumption_Report_${monthName}_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Header title="Monthly Financial & Attendance Excel Reports" />

      {/* Month / Year Selector Bar */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-zinc-900">Select Reporting Period:</h3>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="input-base text-xs w-36"
          >
            {monthNames.map((m, idx) => (
              <option key={idx} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input-base text-xs w-28"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Report Card 1: Student Monthly Billing Report */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <Users className="w-5 h-5" />
              </div>
              <span className="badge badge-success font-mono">XLSX Export</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-900">Monthly Student Attendance & Billing Report</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Complete breakdown per student: Roll Number, Name, Department, Joining Date, Breakfast/Lunch/Dinner counts, and Total Bill.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 rounded border border-zinc-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600">Total Active Students:</span>
                <span className="font-semibold text-zinc-900">{monthlySnapshot.total_students}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Calculated Billing Total:</span>
                <span className="font-bold text-emerald-700">₹{totalStudentBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadStudentReport}
            className="btn-primary w-full text-xs h-10 font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download Student Billing (.xlsx)
          </button>
        </div>

        {/* Report Card 2: Guest Token Monthly Report */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <Coffee className="w-5 h-5" />
              </div>
              <span className="badge bg-blue-50 text-blue-700 border-blue-200 font-mono">XLSX Export</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-900">Guest & Lecturer Token Consumption Report</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Per-day breakdown of item quantities, line amounts, unit prices, itemized totals, and grand monthly token bill.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 rounded border border-zinc-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600">Token Items Logged:</span>
                <span className="font-semibold text-zinc-900">{tokenRows.length} Items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Grand Monthly Token Bill:</span>
                <span className="font-bold text-blue-700">₹{totalTokenBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadTokenReport}
            className="btn-accent w-full text-xs h-10 font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download Token Report (.xlsx)
          </button>
        </div>
      </div>
    </div>
  );
}
