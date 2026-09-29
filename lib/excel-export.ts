import ExcelJS from 'exceljs';
import { MonthlyHostelBillRow, TokenMonthlyReportRow } from './types';

// Export Monthly Hostel Bill to XLSX matching "W HOSTEL BILLS 2026.xlsx" EXACTLY
export async function generateStudentBillingExcel(
  rows: MonthlyHostelBillRow[],
  monthName: string,
  year: number,
  titleHeader = 'GIRLS HOSTEL MESS BILL'
): Promise<any> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NYTLabs - College Mess Management';
  workbook.created = new Date();

  const sheetName = `${monthName.slice(0, 3)} ${year}`;
  const worksheet = workbook.addWorksheet(sheetName);

  // --------------------------------------------------------------------------
  // TITLE HEADER BLOCK (MATCHING EXCEL SPEC)
  // --------------------------------------------------------------------------
  worksheet.mergeCells('A1:K1');
  const r1 = worksheet.getCell('A1');
  r1.value = 'AVANTHI INSTITUTE OF ENGINEERING AND TECHNOLOGY';
  r1.font = { name: 'Arial', size: 12, bold: true, color: { argb: '000000' } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 24;

  worksheet.mergeCells('A2:K2');
  const r2 = worksheet.getCell('A2');
  r2.value = 'TAMARAM,MAKAVARAPALEM,VISAKHAPATNAM-DT';
  r2.font = { name: 'Arial', size: 10, bold: true, color: { argb: '333333' } };
  r2.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  worksheet.mergeCells('A3:K3');
  const r3 = worksheet.getCell('A3');
  r3.value = `${titleHeader.toUpperCase()} FOR THE MONTH OF ${monthName.toUpperCase()} -${year}`;
  r3.font = { name: 'Arial', size: 11, bold: true, color: { argb: '1E3A8A' } };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 24;

  // --------------------------------------------------------------------------
  // TABLE HEADERS (ROW 4)
  // --------------------------------------------------------------------------
  const headers = [
    'S.NO',
    'NAME OF THE STUDENT',
    'GENDER',
    'ROLL NO',
    'Month Amount',
    'Running days',
    'Absent Days',
    'Deduct  Days',
    'Eligible Days',
    'Deduction Amount',
    'Payable Amount-Mess'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 26;
  headerRow.font = { name: 'Arial', size: 9, bold: true, color: { argb: '000000' } };
  
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } }; // Soft blue fill
    cell.border = {
      top: { style: 'thin', color: { argb: '94A3B8' } },
      bottom: { style: 'medium', color: { argb: '475569' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  let totalPayable = 0;
  let totalDeduction = 0;

  // --------------------------------------------------------------------------
  // DATA ROWS (STARTING AT ROW 5)
  // --------------------------------------------------------------------------
  rows.forEach((r, idx) => {
    const rowNum = idx + 5; // 1-indexed Excel row number
    
    // Add row values with Excel formulas for exact specification match
    const row = worksheet.addRow([
      r.s_no,
      r.name,
      r.gender || 'F',
      r.roll_number,
      r.month_amount,
      r.running_days,
      r.absent_days,
      { formula: `IFS(G${rowNum}=F${rowNum},0,G${rowNum}>=10,G${rowNum}/2,G${rowNum}<10,0)`, result: r.deduct_days },
      { formula: `IFS(G${rowNum}=F${rowNum},0,G${rowNum}=0,F${rowNum},G${rowNum}<10,F${rowNum}-G${rowNum},G${rowNum}>=10,F${rowNum}-H${rowNum})`, result: r.eligible_days },
      { formula: `IF(G${rowNum}=F${rowNum},E${rowNum},IF(H${rowNum}>=1,ROUND((E${rowNum}/F${rowNum})*H${rowNum},2),0))`, result: r.deduction_amount },
      { formula: `E${rowNum}-J${rowNum}`, result: r.payable_amount }
    ]);

    totalPayable += r.payable_amount;
    totalDeduction += r.deduction_amount;

    row.height = 20;
    row.font = { name: 'Arial', size: 9 };
    
    row.eachCell((cell, colIndex) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'F1F5F9' } },
        right: { style: 'thin', color: { argb: 'F1F5F9' } }
      };

      if (colIndex === 1 || colIndex === 3 || colIndex === 6 || colIndex === 7 || colIndex === 8 || colIndex === 9) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colIndex === 4) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (colIndex === 5 || colIndex === 10 || colIndex === 11) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00';
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUMMARY TOTAL ROW AT BOTTOM
  // --------------------------------------------------------------------------
  const summaryRow = worksheet.addRow([
    'TOTAL',
    `${rows.length} Students`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalDeduction,
    totalPayable
  ]);
  summaryRow.height = 24;
  summaryRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } };
  summaryRow.eachCell((cell, colIndex) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    cell.border = {
      top: { style: 'medium', color: { argb: '000000' } },
      bottom: { style: 'double', color: { argb: '000000' } }
    };
    if (colIndex === 10 || colIndex === 11) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '₹#,##0.00';
    }
  });

  // Column Widths
  worksheet.columns = [
    { width: 8 },  // S.NO
    { width: 28 }, // NAME
    { width: 10 }, // GENDER
    { width: 16 }, // ROLL NO
    { width: 14 }, // Month Amount
    { width: 14 }, // Running days
    { width: 14 }, // Absent Days
    { width: 14 }, // Deduct Days
    { width: 14 }, // Eligible Days
    { width: 16 }, // Deduction Amount
    { width: 20 }, // Payable Amount-Mess
  ];

  return await workbook.xlsx.writeBuffer();
}

// Export Monthly Token Consumption Report to XLSX
export async function generateTokenReportExcel(
  reportRows: TokenMonthlyReportRow[],
  monthName: string,
  year: number
): Promise<any> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NYTLabs - College Mess Management';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Token Report ${monthName} ${year}`);

  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `GUEST & LECTURER TOKEN CONSUMPTION REPORT (${monthName.toUpperCase()} ${year})`;
  titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  const headers = ['Token Item', 'Unit Price (₹)', 'Total Quantity Consumed', 'Total Amount (₹)'];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;
  headerRow.font = { name: 'Arial', size: 10, bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { argb: '64748B' } }
    };
  });

  let grandQty = 0;
  let grandTotalAmount = 0;

  reportRows.forEach((r) => {
    grandQty += r.total_quantity;
    grandTotalAmount += r.total_amount;

    const row = worksheet.addRow([
      r.item_name,
      r.unit_price,
      r.total_quantity,
      r.total_amount
    ]);

    row.height = 20;
    row.font = { name: 'Arial', size: 9 };
    row.getCell(2).numFmt = '₹#,##0.00';
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).numFmt = '₹#,##0.00';
    row.getCell(4).alignment = { horizontal: 'right' };
  });

  const totalRow = worksheet.addRow([
    'GRAND TOTAL',
    '',
    grandQty,
    grandTotalAmount
  ]);
  totalRow.height = 24;
  totalRow.font = { name: 'Arial', size: 10, bold: true };
  totalRow.eachCell((cell, col) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    cell.border = {
      top: { style: 'medium', color: { argb: '000000' } },
      bottom: { style: 'medium', color: { argb: '000000' } }
    };
    if (col === 3) cell.alignment = { horizontal: 'center' };
    if (col === 4) {
      cell.alignment = { horizontal: 'right' };
      cell.numFmt = '₹#,##0.00';
    }
  });

  worksheet.columns = [
    { width: 32 },
    { width: 16 },
    { width: 24 },
    { width: 20 },
  ];

  return await workbook.xlsx.writeBuffer();
}

// Download helper for browser
export function triggerBrowserDownload(buffer: any, filename: string) {
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
