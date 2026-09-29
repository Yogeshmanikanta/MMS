export type UserRole = 'admin' | 'in_charge' | 'student';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roll_number?: string;
}

export type StudentStatus = 'active' | 'inactive';

export interface Student {
  id: string;
  roll_number: string;
  name: string;
  gender?: string; // 'F' or 'M'
  department: string;
  year: string;
  course: string;
  contact?: string;
  status: StudentStatus;
  joined_at: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MealPrice {
  id: string;
  meal_type: MealType;
  price: number;
  effective_from: string; // YYYY-MM-DD
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  meal_type: MealType;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  marked_by?: string;
  created_at: string;
}

export interface AttendanceTableRow {
  student: Student;
  breakfast: 'present' | 'absent' | 'unmarked';
  lunch: 'present' | 'absent' | 'unmarked';
  dinner: 'present' | 'absent' | 'unmarked';
  breakfastRecordId?: string;
  lunchRecordId?: string;
  dinnerRecordId?: string;
}

export interface TokenItem {
  id: string;
  name: string;
  price: number;
  effective_from: string; // YYYY-MM-DD
  status: 'active' | 'inactive';
  created_at: string;
}

export interface TokenEntry {
  id: string;
  token_item_id: string;
  token_item_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  consumer_name: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
}

export interface BulkImportRow {
  roll_number: string;
  name: string;
  department: string;
  year: string;
  course: string;
  contact?: string;
  joined_at?: string;
  isValid: boolean;
  errors: string[];
  isDuplicateInFile: boolean;
  isDuplicateInDb: boolean;
}

export interface StudentImportValidationItem {
  index: number;
  name: string;
  roll_number: string;
  gender: string;
  department: string;
  year: string;
  course: string;
  isValid: boolean;
  isDuplicateInDb: boolean;
  isDuplicateInFile: boolean;
  errors: string[];
}

export interface StudentBillingSummary {
  student: Student;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  breakfastPrice: number;
  lunchPrice: number;
  dinnerPrice: number;
  totalBill: number;
  joinedAt: string;
}

// EXACT HOSTEL BILLING ROW STRUCTURE (MATCHING "W HOSTEL BILLS 2026.xlsx")
export interface MonthlyHostelBillRow {
  s_no: number;
  student: Student;
  roll_number: string;
  name: string;
  gender: string;
  month_amount: number;
  running_days: number;
  absent_days: number;
  deduct_days: number;
  eligible_days: number;
  deduction_amount: number;
  payable_amount: number;
  breakfast_count: number;
  lunch_count: number;
  dinner_count: number;
}

export interface MonthlyBillSnapshot {
  id: string;
  year: number;
  month: number;
  month_name: string;
  month_amount: number;
  running_days: number;
  total_students: number;
  total_payable: number;
  is_finalized: boolean;
  finalized_at?: string;
  rows: MonthlyHostelBillRow[];
  created_at: string;
}

export interface GuestSummary {
  guest_name: string;
  total_entries: number;
  total_amount: number;
  latest_date: string;
  items_consumed: { item_name: string; quantity: number; amount: number }[];
}

export interface TokenMonthlyReportRow {
  token_item_id: string;
  item_name: string;
  unit_price: number;
  total_quantity: number;
  total_amount: number;
  daily_breakdown: Record<string, { quantity: number; amount: number }>;
}
