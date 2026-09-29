'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { localDb, getTodayString } from '@/lib/db';
import { 
  ClipboardCheck, 
  UserCheck, 
  Receipt, 
  Coffee, 
  FileSpreadsheet, 
  ArrowRight,
  Download,
  AlertCircle
} from 'lucide-react';
import { generateStudentBillingExcel, generateTokenReportExcel, triggerBrowserDownload } from '@/lib/excel-export';

export default function DashboardPage() {
  const todayStr = getTodayString();
  const activeStudents = localDb.getStudents({ status: 'active' });
  const totalActiveCount = activeStudents.length;

  const todayAttendance = localDb.getAttendanceForDate(todayStr);

  const getMealStats = (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const mealRecords = todayAttendance.filter(a => a.meal_type === mealType);
    const presentCount = mealRecords.filter(a => a.status === 'present').length;
    const absentCount = mealRecords.filter(a => a.status === 'absent').length;
    const unmarkedCount = totalActiveCount - (presentCount + absentCount);
    return { presentCount, absentCount, unmarkedCount };
  };

  const breakfastStats = getMealStats('breakfast');
  const lunchStats = getMealStats('lunch');
  const dinnerStats = getMealStats('dinner');

  // Token stats for today
  const todayTokens = localDb.getTokenEntries(todayStr);
  const todayTokenTotal = todayTokens.reduce((sum, t) => sum + t.total_price, 0);

  // Monthly billing snapshot
  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long' });
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;

  const monthlyHostelSnapshot = localDb.getMonthlyHostelBills(currentYear, currentMonthNum);
  const totalStudentMonthlyBill = monthlyHostelSnapshot.total_payable;

  const tokenMonthlyRows = localDb.getTokenMonthlyReport(currentYear, currentMonthNum);
  const totalTokenMonthlyBill = tokenMonthlyRows.reduce((sum, r) => sum + r.total_amount, 0);

  const handleExportStudentBill = async () => {
    const buffer = await generateStudentBillingExcel(monthlyHostelSnapshot.rows, currentMonthName, currentYear);
    triggerBrowserDownload(buffer, `W_HOSTEL_BILL_${currentMonthName.toUpperCase()}_${currentYear}.xlsx`);
  };

  const handleExportTokenBill = async () => {
    const buffer = await generateTokenReportExcel(tokenMonthlyRows, currentMonthName, currentYear);
    triggerBrowserDownload(buffer, `Token_Consumption_Report_${currentMonthName}_${currentYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Header title="Overview Dashboard" />

      {/* Quick Action Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/attendance"
          className="p-4 bg-white border border-zinc-200 rounded-md shadow-sm hover:border-zinc-300 hover:shadow-sm transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">Mark Attendance</h3>
              <p className="text-[11px] text-zinc-500">Record breakfast, lunch, or dinner</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/in-charge"
          className="p-4 bg-white border border-zinc-200 rounded-md shadow-sm hover:border-zinc-300 hover:shadow-sm transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 group-hover:text-amber-600 transition-colors">Unmarked Students</h3>
              <p className="text-[11px] text-zinc-500">Fast lookup during rush periods</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/tokens"
          className="p-4 bg-white border border-zinc-200 rounded-md shadow-sm hover:border-zinc-300 hover:shadow-sm transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 group-hover:text-emerald-600 transition-colors">Guest Token Entry</h3>
              <p className="text-[11px] text-zinc-500">Record tea/coffee & guest meals</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Main Grid: Attendance Summary Table + Monthly Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compact Table: Today's Attendance Breakdown per Meal */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Today's Meal Attendance Summary</h3>
              <p className="text-xs text-zinc-500">Real-time head count breakdown for {todayStr}</p>
            </div>
            <span className="text-xs text-zinc-500 font-medium bg-zinc-100 px-2.5 py-1 rounded border border-zinc-200">
              Total Active Students: {totalActiveCount}
            </span>
          </div>

          <div className="table-container">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header">Meal Type</th>
                  <th className="table-header text-center">Present Headcount</th>
                  <th className="table-header text-center">Unmarked Status</th>
                  <th className="table-header text-center">Marked Absent</th>
                  <th className="table-header text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr className="table-row">
                  <td className="table-cell font-medium text-zinc-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Breakfast
                  </td>
                  <td className="table-cell text-center">
                    <span className="font-semibold text-emerald-700">{breakfastStats.presentCount}</span>
                  </td>
                  <td className="table-cell text-center">
                    <span className="badge badge-warning">{breakfastStats.unmarkedCount} Unmarked</span>
                  </td>
                  <td className="table-cell text-center text-zinc-500">
                    {breakfastStats.absentCount}
                  </td>
                  <td className="table-cell text-right font-medium text-zinc-700">
                    {totalActiveCount > 0 ? Math.round((breakfastStats.presentCount / totalActiveCount) * 100) : 0}%
                  </td>
                </tr>

                <tr className="table-row">
                  <td className="table-cell font-medium text-zinc-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Lunch
                  </td>
                  <td className="table-cell text-center">
                    <span className="font-semibold text-emerald-700">{lunchStats.presentCount}</span>
                  </td>
                  <td className="table-cell text-center">
                    <span className="badge badge-warning">{lunchStats.unmarkedCount} Unmarked</span>
                  </td>
                  <td className="table-cell text-center text-zinc-500">
                    {lunchStats.absentCount}
                  </td>
                  <td className="table-cell text-right font-medium text-zinc-700">
                    {totalActiveCount > 0 ? Math.round((lunchStats.presentCount / totalActiveCount) * 100) : 0}%
                  </td>
                </tr>

                <tr className="table-row">
                  <td className="table-cell font-medium text-zinc-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    Dinner
                  </td>
                  <td className="table-cell text-center">
                    <span className="font-semibold text-emerald-700">{dinnerStats.presentCount}</span>
                  </td>
                  <td className="table-cell text-center">
                    <span className="badge badge-warning">{dinnerStats.unmarkedCount} Unmarked</span>
                  </td>
                  <td className="table-cell text-center text-zinc-500">
                    {dinnerStats.absentCount}
                  </td>
                  <td className="table-cell text-right font-medium text-zinc-700">
                    {totalActiveCount > 0 ? Math.round((dinnerStats.presentCount / totalActiveCount) * 100) : 0}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-zinc-100/60 rounded-md border border-zinc-200/80 text-xs text-zinc-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>
              <strong>Note:</strong> Unmarked students are distinct from Marked Absent. Unmarked simply means attendance has not yet been recorded.
            </span>
          </div>
        </div>

        {/* Monthly Billing & Token Snapshot Card */}
        <div className="space-y-4">
          <div className="bg-white border border-zinc-200 rounded-md p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Billing Snapshot</h3>
                <p className="text-xs text-zinc-500">{currentMonthName} {currentYear}</p>
              </div>
              <Receipt className="w-4 h-4 text-zinc-400" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-600 font-medium">Student Meals Bill Total:</span>
                <span className="font-bold text-zinc-900 text-sm">₹{totalStudentMonthlyBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-600 font-medium">Guest / Token Sales Total:</span>
                <span className="font-bold text-zinc-900 text-sm">₹{totalTokenMonthlyBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2 border-t border-zinc-200 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-900">Combined Revenue:</span>
                <span className="text-sm font-extrabold text-blue-700">
                  ₹{(totalStudentMonthlyBill + totalTokenMonthlyBill).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={handleExportStudentBill}
                className="btn-secondary w-full text-xs justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Student Bill (.xlsx)
                </span>
                <Download className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              <button
                onClick={handleExportTokenBill}
                className="btn-secondary w-full text-xs justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Export Token Ledger (.xlsx)
                </span>
                <Download className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
