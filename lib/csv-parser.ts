import Papa from 'papaparse';
import { BulkImportRow, Student } from './types';

export function parseAndValidateCSV(
  fileContent: string,
  existingStudents: Student[]
): { rows: BulkImportRow[]; validCount: number; invalidCount: number } {
  const existingRollSet = new Set(
    existingStudents.map(s => s.roll_number.toLowerCase().trim())
  );

  const parsed = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
  });

  const fileRollSet = new Set<string>();
  const rows: BulkImportRow[] = [];
  let validCount = 0;
  let invalidCount = 0;

  parsed.data.forEach((rawRow, index) => {
    // Map flexible column headers
    const rollNumber = (rawRow.roll_number || rawRow.rollno || rawRow.roll_no || rawRow.roll || '').trim();
    const name = (rawRow.name || rawRow.student_name || rawRow.studentname || '').trim();
    const department = (rawRow.department || rawRow.dept || '').trim() || 'General';
    const year = (rawRow.year || rawRow.academic_year || '').trim() || '1st Year';
    const course = (rawRow.course || rawRow.program || '').trim() || 'B.Tech';
    const contact = (rawRow.contact || rawRow.phone || rawRow.mobile || '').trim();
    const joinedAt = (rawRow.joined_at || rawRow.joining_date || '').trim();

    const errors: string[] = [];

    // Validations
    if (!rollNumber) {
      errors.push('Missing Roll Number');
    }
    if (!name) {
      errors.push('Missing Student Name');
    }

    const rollLower = rollNumber.toLowerCase();
    let isDuplicateInFile = false;
    let isDuplicateInDb = false;

    if (rollNumber) {
      if (fileRollSet.has(rollLower)) {
        isDuplicateInFile = true;
        errors.push(`Duplicate roll number "${rollNumber}" in CSV file`);
      } else {
        fileRollSet.add(rollLower);
      }

      if (existingRollSet.has(rollLower)) {
        isDuplicateInDb = true;
        errors.push(`Roll number "${rollNumber}" already exists in database`);
      }
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    rows.push({
      roll_number: rollNumber || `[Row ${index + 2} Missing]`,
      name: name || '[Missing Name]',
      department,
      year,
      course,
      contact,
      joined_at: joinedAt,
      isValid,
      errors,
      isDuplicateInFile,
      isDuplicateInDb
    });
  });

  return { rows, validCount, invalidCount };
}
