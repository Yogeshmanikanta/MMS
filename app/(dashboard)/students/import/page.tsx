'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { localDb } from '@/lib/db';
import { StudentImportValidationItem, Student } from '@/lib/types';
import { 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  ArrowLeft, 
  Users, 
  Sparkles,
  ShieldCheck,
  FileCheck
} from 'lucide-react';

export default function StudentImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [fileRawContent, setFileRawContent] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Validation state
  const [isValidated, setIsValidated] = useState(false);
  const [validationResults, setValidationResults] = useState<StudentImportValidationItem[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'problems'>('all');

  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Handle file selection / drag-and-drop
  const handleFileSelected = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setJsonError('Only JSON files (.json) are supported.');
      return;
    }

    setFileName(file.name);
    setJsonError('');
    setIsValidated(false);
    setValidationResults([]);
    setImportSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileRawContent(content);
      validateJsonContent(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Run comprehensive validation on raw JSON string
  const validateJsonContent = (rawText: string) => {
    setJsonError('');
    setIsValidated(false);

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      setJsonError('Invalid JSON format: The uploaded file is not a valid JSON document.');
      return;
    }

    if (!Array.isArray(parsed)) {
      setJsonError('Invalid JSON structure: The root element must be a JSON array of student objects [ {...}, {...} ].');
      return;
    }

    if (parsed.length === 0) {
      setJsonError('The uploaded JSON array contains no student records.');
      return;
    }

    const seenRollNumbersInFile = new Set<string>();
    const results: StudentImportValidationItem[] = [];

    parsed.forEach((item: any, idx: number) => {
      const name = String(item.name || item.student_name || '').trim();
      const rollNumber = String(item.roll_no || item.roll_number || item.rollNo || '').trim().toUpperCase();
      const gender = String(item.gender || 'F').trim().toUpperCase();
      const department = String(item.department || item.dept || 'Engineering & Tech').trim();
      const year = String(item.year || '1st Year').trim();
      const course = String(item.course || 'B.Tech').trim();

      const errors: string[] = [];
      let isDuplicateInFile = false;
      let isDuplicateInDb = false;

      // Check required fields
      if (!name) errors.push('Missing Student Name');
      if (!rollNumber) errors.push('Missing Roll Number');

      // Check duplicate in current file
      if (rollNumber) {
        if (seenRollNumbersInFile.has(rollNumber)) {
          isDuplicateInFile = true;
          errors.push('Duplicate Roll Number in this JSON file');
        } else {
          seenRollNumbersInFile.add(rollNumber);
        }

        // Check duplicate in existing database master
        const existingStudent = localDb.getStudentByRollNumber(rollNumber);
        if (existingStudent) {
          isDuplicateInDb = true;
          errors.push(`Already registered in database (${existingStudent.name})`);
        }
      }

      const isValid = errors.length === 0;

      results.push({
        index: idx + 1,
        name: name || 'UNNAMED STUDENT',
        roll_number: rollNumber || 'MISSING_ROLL',
        gender: gender || 'F',
        department: department,
        year: year,
        course: course,
        isValid,
        isDuplicateInDb,
        isDuplicateInFile,
        errors
      });
    });

    setValidationResults(results);
    setIsValidated(true);
  };

  // Download Sample First-Year Onboarding JSON
  const handleDownloadSampleJson = () => {
    const sampleData = [
      {
        "name": "KADARI THANUJA",
        "roll_no": "24811A0214",
        "gender": "F",
        "department": "Electrical & Electronics (EEE)",
        "year": "1st Year",
        "course": "B.Tech"
      },
      {
        "name": "DANGUDUBIYYAPU BHAVANI",
        "roll_no": "24811A0418",
        "gender": "F",
        "department": "Electronics & Comm (ECE)",
        "year": "1st Year",
        "course": "B.Tech"
      },
      {
        "name": "POTHANA SATYA GANESH",
        "roll_no": "24811A0462",
        "gender": "M",
        "department": "Electronics & Comm (ECE)",
        "year": "1st Year",
        "course": "B.Tech"
      },
      {
        "name": "BAKA SWETHA",
        "roll_no": "24811A0511",
        "gender": "F",
        "department": "Computer Science & Engg (CSE)",
        "year": "1st Year",
        "course": "B.Tech"
      }
    ];

    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_first_year_students.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Confirm Import Valid Students into Database
  const handleConfirmImport = () => {
    const validItems = validationResults.filter(r => r.isValid);
    if (validItems.length === 0) {
      alert('There are no valid student records to import.');
      return;
    }

    setIsImporting(true);

    try {
      const newStudentsToInsert = validItems.map(item => ({
        roll_number: item.roll_number,
        name: item.name,
        gender: item.gender,
        department: item.department,
        year: item.year,
        course: item.course,
        status: 'active' as const,
        joined_at: new Date().toISOString().slice(0, 10)
      }));

      const imported = localDb.bulkImportStudents(newStudentsToInsert);
      setImportSuccessMsg(`Successfully imported ${imported.length} new first-year student records into the database!`);
      
      // Re-run validation to update duplicate indicators
      if (fileRawContent) {
        validateJsonContent(fileRawContent);
      }
    } catch (err: any) {
      alert('Import error: ' + (err.message || 'Failed to import students'));
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered rows for preview
  const filteredPreview = validationResults.filter(r => {
    if (filterTab === 'valid') return r.isValid;
    if (filterTab === 'problems') return !r.isValid;
    return true;
  });

  const totalCount = validationResults.length;
  const validCount = validationResults.filter(r => r.isValid).length;
  const duplicateDbCount = validationResults.filter(r => r.isDuplicateInDb).length;
  const duplicateFileCount = validationResults.filter(r => r.isDuplicateInFile).length;
  const errorCount = validationResults.filter(r => !r.isValid && !r.isDuplicateInDb && !r.isDuplicateInFile).length;
  const problemCount = totalCount - validCount;

  return (
    <div className="space-y-6">
      <Header title="Import Student Master Data" />

      {/* Intro Header & Action Links */}
      <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              Bulk Onboarding Engine
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-900 mt-1">Import First-Year Students JSON</h2>
          <p className="text-xs text-zinc-500">
            Upload a seed JSON file to quickly add new student batches without manual entry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSampleJson}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Download example format for student JSON seed file"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            Download Sample JSON
          </button>
          
          <button
            onClick={() => router.push('/students')}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Student Directory
          </button>
        </div>
      </div>

      {/* Upload Box (Drag & Drop Zone) */}
      <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900">1. Upload Student Seed JSON File</h3>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            fileName ? 'border-blue-500 bg-blue-50/30' : 'border-zinc-300 hover:border-blue-400 bg-zinc-50/50 hover:bg-zinc-50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
          />

          <div className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-800">
                {fileName ? `Uploaded: ${fileName}` : 'Click to select or drag & drop student JSON file'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Supported format: <code className="font-mono bg-zinc-200 px-1 py-0.5 rounded text-zinc-800 font-bold">.json</code> (JSON Array of Student Objects)
              </p>
            </div>
          </div>
        </div>

        {jsonError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{jsonError}</span>
          </div>
        )}
      </div>

      {/* Validation Summary & Preview Section */}
      {isValidated && (
        <div className="space-y-6">
          {/* Summary Metric Banner */}
          <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">2. Import Validation Summary</h3>
                <p className="text-xs text-zinc-500">File verified against database constraints</p>
              </div>

              {/* Confirm Import Action Button */}
              <button
                onClick={handleConfirmImport}
                disabled={validCount === 0 || isImporting}
                className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 px-5 shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Import ({validCount} Valid Students)</span>
              </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                <span className="text-[10px] text-zinc-500 font-bold uppercase block">Total Records</span>
                <span className="text-lg font-bold font-mono text-zinc-900">{totalCount}</span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Valid Records</span>
                <span className="text-lg font-bold font-mono text-emerald-800">{validCount}</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <span className="text-[10px] text-amber-700 font-bold uppercase block">Duplicates</span>
                <span className="text-lg font-bold font-mono text-amber-800">{duplicateDbCount + duplicateFileCount}</span>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <span className="text-[10px] text-red-700 font-bold uppercase block">Errors</span>
                <span className="text-lg font-bold font-mono text-red-800">{errorCount}</span>
              </div>
            </div>

            {importSuccessMsg && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-md flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700" />
                <span>{importSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Student Preview Table */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden space-y-3 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">3. Student Preview Table</h3>
                <p className="text-xs text-zinc-500">Review student records before database insertion</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-md text-xs font-semibold">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded transition-all ${filterTab === 'all' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setFilterTab('valid')}
                  className={`px-3 py-1 rounded transition-all ${filterTab === 'valid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
                >
                  Valid Only ({validCount})
                </button>
                <button
                  onClick={() => setFilterTab('problems')}
                  className={`px-3 py-1 rounded transition-all ${filterTab === 'problems' ? 'bg-white text-amber-700 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
                >
                  Problems ({problemCount})
                </button>
              </div>
            </div>

            <div className="table-container max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-700 font-bold">
                    <th className="table-header text-center">S.No</th>
                    <th className="table-header">Student Name</th>
                    <th className="table-header">Roll Number</th>
                    <th className="table-header text-center">Gender</th>
                    <th className="table-header">Department</th>
                    <th className="table-header">Year</th>
                    <th className="table-header text-center">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredPreview.map((item) => (
                    <tr key={item.index} className={`table-row ${!item.isValid ? 'bg-amber-50/30' : ''}`}>
                      <td className="table-cell text-center font-mono text-zinc-400">{item.index}</td>
                      <td className="table-cell font-bold text-zinc-900">{item.name}</td>
                      <td className="table-cell font-mono font-bold text-blue-900">{item.roll_number}</td>
                      <td className="table-cell text-center font-bold text-zinc-700">{item.gender}</td>
                      <td className="table-cell text-zinc-600">{item.department}</td>
                      <td className="table-cell text-zinc-500">{item.year}</td>
                      <td className="table-cell text-center">
                        {item.isValid ? (
                          <span className="badge badge-success flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                          </span>
                        ) : item.isDuplicateInDb ? (
                          <span className="badge badge-warning flex items-center justify-center gap-1" title={item.errors.join(', ')}>
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Duplicate in DB
                          </span>
                        ) : item.isDuplicateInFile ? (
                          <span className="badge badge-warning flex items-center justify-center gap-1" title={item.errors.join(', ')}>
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Duplicate in File
                          </span>
                        ) : (
                          <span className="badge badge-danger flex items-center justify-center gap-1" title={item.errors.join(', ')}>
                            <XCircle className="w-3 h-3 text-red-600" /> {item.errors[0] || 'Invalid'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>Showing {filteredPreview.length} records</span>
              <button
                onClick={handleConfirmImport}
                disabled={validCount === 0 || isImporting}
                className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirm Import ({validCount} Valid)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
