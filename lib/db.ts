import { 
  Student, 
  MealPrice, 
  AttendanceRecord, 
  TokenItem, 
  TokenEntry, 
  MealType, 
  StudentStatus,
  StudentBillingSummary,
  TokenMonthlyReportRow,
  GuestSummary,
  MonthlyHostelBillRow,
  MonthlyBillSnapshot
} from './types';
import studentsSeed from '../supabase/students_seed.json';
import { supabase, isSupabaseConfigured } from './supabase';


// INITIAL SEED MEAL PRICES
const INITIAL_MEAL_PRICES: MealPrice[] = [
  { id: 'mp-1', meal_type: 'breakfast', price: 30.00, effective_from: '2026-01-01', created_at: new Date().toISOString() },
  { id: 'mp-2', meal_type: 'lunch', price: 50.00, effective_from: '2026-01-01', created_at: new Date().toISOString() },
  { id: 'mp-3', meal_type: 'dinner', price: 40.00, effective_from: '2026-01-01', created_at: new Date().toISOString() },
];

const INITIAL_TOKEN_ITEMS: TokenItem[] = [
  { id: 'ti-1', name: 'Tea', price: 10.00, effective_from: '2026-01-01', status: 'active', created_at: new Date().toISOString() },
  { id: 'ti-2', name: 'Coffee', price: 15.00, effective_from: '2026-01-01', status: 'active', created_at: new Date().toISOString() },
  { id: 'ti-3', name: 'Extra Chapati', price: 5.00, effective_from: '2026-01-01', status: 'active', created_at: new Date().toISOString() },
  { id: 'ti-4', name: 'Milk', price: 20.00, effective_from: '2026-01-01', status: 'active', created_at: new Date().toISOString() },
  { id: 'ti-5', name: 'Snack Box', price: 40.00, effective_from: '2026-01-01', status: 'active', created_at: new Date().toISOString() },
  { id: 'ti-6', name: 'VIP Guest Lunch Thali', price: 120.00, effective_from: '2026-01-01', status: 'active', created_at: new Date().toISOString() },
];

// INITIAL SEED STUDENTS FROM JSON (395 STUDENTS FROM EXCEL FILE)
const INITIAL_STUDENTS: Student[] = (studentsSeed as any[]).map((s, idx) => ({
  id: `s-seed-${idx + 1}`,
  roll_number: s.roll_number,
  name: s.name,
  gender: s.gender || 'F',
  department: s.department,
  year: s.year,
  course: s.course || 'B.Tech',
  status: s.status as StudentStatus || 'active',
  joined_at: s.joined_at || '2026-01-01',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPreviousDateString(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getMonthName(month: number): string {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return names[month - 1] || 'January';
}

const LOCAL_STORAGE_KEY = 'mms_hostel_canteen_store_v3';

class LocalDataStore {
  private students: Student[] = INITIAL_STUDENTS;
  private mealPrices: MealPrice[] = INITIAL_MEAL_PRICES;
  private attendance: AttendanceRecord[] = [];
  private tokenItems: TokenItem[] = INITIAL_TOKEN_ITEMS;
  private tokenEntries: TokenEntry[] = [];
  private finalizedBillSnapshots: Map<string, MonthlyBillSnapshot> = new Map();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
    this.initDemoDataIfNeeded();
    this.syncWithSupabase();
  }

  public async syncWithSupabase() {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // 1. Sync Guest Items
      const { data: dbItems } = await supabase.from('guest_items').select('*');
      if (dbItems && dbItems.length > 0) {
        this.tokenItems = dbItems.map((i: any) => ({
          id: i.id,
          name: i.name,
          price: Number(i.price),
          effective_from: i.effective_from,
          status: i.status || 'active',
          created_at: i.created_at
        }));
      }

      // 2. Sync Meal Costs
      const { data: dbCosts } = await supabase.from('meal_costs').select('*');
      if (dbCosts && dbCosts.length > 0) {
        this.mealPrices = dbCosts.map((c: any) => ({
          id: c.id,
          meal_type: c.meal_type,
          price: Number(c.price),
          effective_from: c.effective_from,
          created_at: c.created_at
        }));
      }

      // 3. Sync Students
      const { data: dbStudents } = await supabase.from('students').select('*');
      if (dbStudents && dbStudents.length > 0) {
        this.students = dbStudents.map((s: any) => ({
          id: s.id,
          roll_number: s.roll_number,
          name: s.name,
          gender: s.gender || 'F',
          department: s.department,
          year: s.year,
          course: s.course || 'B.Tech',
          contact: s.contact,
          status: s.status || 'active',
          joined_at: s.joined_at,
          created_at: s.created_at,
          updated_at: s.updated_at
        }));
      }

      // 4. Sync Guest Ledger
      const { data: dbEntries } = await supabase.from('guest_ledger').select('*');
      if (dbEntries && dbEntries.length > 0) {
        this.tokenEntries = dbEntries.map((e: any) => ({
          id: e.id,
          token_item_id: e.guest_item_id,
          token_item_name: e.token_item_name,
          quantity: e.quantity,
          unit_price: Number(e.unit_price),
          total_price: Number(e.total_price),
          consumer_name: e.consumer_name,
          date: e.date,
          notes: e.notes,
          created_at: e.created_at
        }));
      }

      // 5. Sync Daily Attendance
      const { data: dbAtt } = await supabase.from('daily_attendance').select('*');
      if (dbAtt && dbAtt.length > 0) {
        this.attendance = dbAtt.map((a: any) => ({
          id: a.id,
          student_id: a.student_id,
          meal_type: a.meal_type,
          date: a.date,
          status: a.status,
          marked_by: a.marked_by,
          created_at: a.created_at
        }));
      }

      this.saveToStorage();
    } catch (e) {
      console.error('Failed to sync with Supabase:', e);
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.students?.length) this.students = parsed.students;
        if (parsed.mealPrices?.length) this.mealPrices = parsed.mealPrices;
        if (parsed.attendance) this.attendance = parsed.attendance;
        if (parsed.tokenItems?.length) this.tokenItems = parsed.tokenItems;
        if (parsed.tokenEntries) this.tokenEntries = parsed.tokenEntries;
        if (parsed.finalizedSnapshots) {
          Object.entries(parsed.finalizedSnapshots).forEach(([key, val]) => {
            this.finalizedBillSnapshots.set(key, val as MonthlyBillSnapshot);
          });
        }
        this.initialized = true;
      }
    } catch (e) {
      console.error('Failed to load local database storage', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const snapshotsObj: Record<string, MonthlyBillSnapshot> = {};
      this.finalizedBillSnapshots.forEach((val, key) => {
        snapshotsObj[key] = val;
      });

      const data = {
        students: this.students,
        mealPrices: this.mealPrices,
        attendance: this.attendance,
        tokenItems: this.tokenItems,
        tokenEntries: this.tokenEntries,
        finalizedSnapshots: snapshotsObj
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to local database storage', e);
    }
  }

  private initDemoDataIfNeeded() {
    if (this.initialized) return;
    this.initialized = true;
    // No demo data — start clean with only seed students, default meal prices, and default token items
    this.saveToStorage();
  }

  // --- STUDENTS MASTER DATA ---
  getStudents(params?: { search?: string; department?: string; year?: string; gender?: string; status?: string }) {
    let list = [...this.students];
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q));
    }
    if (params?.department && params.department !== 'all') {
      list = list.filter(s => s.department === params.department);
    }
    if (params?.year && params.year !== 'all') {
      list = list.filter(s => s.year === params.year);
    }
    if (params?.gender && params.gender !== 'all') {
      list = list.filter(s => (s.gender || 'F') === params.gender);
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter(s => s.status === params.status);
    }
    return list;
  }

  getStudentByRollNumber(rollNumber: string): Student | undefined {
    return this.students.find(s => s.roll_number.toLowerCase() === rollNumber.trim().toLowerCase());
  }

  searchStudentsByPartialRoll(query: string): Student[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.students.filter(s => 
      s.roll_number.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }

  addStudent(data: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Student {
    const existing = this.getStudentByRollNumber(data.roll_number);
    if (existing) {
      throw new Error(`Roll number "${data.roll_number}" is already registered.`);
    }
    const newStudent: Student = {
      ...data,
      id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      gender: data.gender || 'F',
      status: data.status || 'active',
      joined_at: data.joined_at || getTodayString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.students.unshift(newStudent);
    this.saveToStorage();
    return newStudent;
  }

  updateStudent(id: string, updates: Partial<Student>): Student {
    const idx = this.students.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Student not found');
    this.students[idx] = {
      ...this.students[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.saveToStorage();
    return this.students[idx];
  }

  toggleStudentStatus(id: string, newStatus: StudentStatus): Student {
    return this.updateStudent(id, { status: newStatus });
  }

  bulkImportStudents(newStudents: Array<Omit<Student, 'id' | 'created_at' | 'updated_at'>>) {
    const imported: Student[] = [];
    for (const s of newStudents) {
      try {
        const added = this.addStudent(s);
        imported.push(added);
      } catch (err) {
        // Skip duplicates
      }
    }
    this.saveToStorage();
    return imported;
  }

  // --- MEAL PRICES ---
  getMealPrices(): MealPrice[] {
    return [...this.mealPrices];
  }

  getEffectiveMealPrice(mealType: MealType, dateStr?: string): number {
    const targetDate = dateStr || getTodayString();
    const prices = this.mealPrices
      .filter(p => p.meal_type === mealType && p.effective_from <= targetDate)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    
    if (prices.length > 0) return prices[0].price;
    const fallback = this.mealPrices.find(p => p.meal_type === mealType);
    return fallback ? fallback.price : (mealType === 'breakfast' ? 30 : mealType === 'lunch' ? 50 : 40);
  }

  updateMealPrice(mealType: MealType, newPrice: number, effectiveFrom?: string): MealPrice {
    if (newPrice < 0) throw new Error('Meal price cannot be negative.');
    const dateStr = effectiveFrom || getTodayString();
    const newRecord: MealPrice = {
      id: `mp-${Date.now()}`,
      meal_type: mealType,
      price: newPrice,
      effective_from: dateStr,
      created_at: new Date().toISOString()
    };
    this.mealPrices.unshift(newRecord);
    this.saveToStorage();
    return newRecord;
  }

  // --- ATTENDANCE ---
  getAttendanceForDate(dateStr: string): AttendanceRecord[] {
    return this.attendance.filter(a => a.date === dateStr);
  }

  hasAttendanceForDate(dateStr: string): boolean {
    return this.attendance.some(a => a.date === dateStr);
  }

  getAttendanceStateForDate(dateStr: string): Map<string, { breakfast: boolean; lunch: boolean; dinner: boolean }> {
    const map = new Map<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>();
    const activeStudents = this.students.filter(s => s.status === 'active');
    const savedRecords = this.getAttendanceForDate(dateStr);
    const hasSavedData = savedRecords.length > 0;

    activeStudents.forEach(st => {
      if (hasSavedData) {
        const bRec = savedRecords.find(r => r.student_id === st.id && r.meal_type === 'breakfast');
        const lRec = savedRecords.find(r => r.student_id === st.id && r.meal_type === 'lunch');
        const dRec = savedRecords.find(r => r.student_id === st.id && r.meal_type === 'dinner');

        map.set(st.id, {
          breakfast: bRec ? bRec.status === 'present' : true,
          lunch: lRec ? lRec.status === 'present' : true,
          dinner: dRec ? dRec.status === 'present' : true,
        });
      } else {
        // DEFAULT REQUIREMENT: Breakfast, Lunch, and Dinner should ALL be selected (true)
        map.set(st.id, { breakfast: true, lunch: true, dinner: true });
      }
    });

    return map;
  }

  copyAttendanceFromPreviousDay(targetDateStr: string): { success: boolean; sourceDate: string; count: number } {
    const prevDateStr = getPreviousDateString(targetDateStr);
    let sourceDate = prevDateStr;
    let sourceRecords = this.getAttendanceForDate(sourceDate);

    if (sourceRecords.length === 0) {
      const datesWithAttendance = Array.from(new Set(this.attendance.map(a => a.date)))
        .filter(d => d < targetDateStr)
        .sort((a, b) => b.localeCompare(a));
      
      if (datesWithAttendance.length > 0) {
        sourceDate = datesWithAttendance[0];
        sourceRecords = this.getAttendanceForDate(sourceDate);
      }
    }

    if (sourceRecords.length === 0) {
      return { success: false, sourceDate: '', count: 0 };
    }

    this.attendance = this.attendance.filter(a => a.date !== targetDateStr);
    const copiedRecords: AttendanceRecord[] = sourceRecords.map(r => ({
      id: `att-cp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      student_id: r.student_id,
      meal_type: r.meal_type,
      date: targetDateStr,
      status: r.status,
      marked_by: 'admin_copied',
      created_at: new Date().toISOString()
    }));

    this.attendance.push(...copiedRecords);
    this.saveToStorage();

    return { success: true, sourceDate, count: copiedRecords.length };
  }

  saveDailyAttendanceRecords(dateStr: string, records: { student_id: string; breakfast: boolean; lunch: boolean; dinner: boolean }[]): void {
    this.attendance = this.attendance.filter(a => a.date !== dateStr);
    const now = new Date().toISOString();
    const newRecords: AttendanceRecord[] = [];

    records.forEach(r => {
      newRecords.push({
        id: `att-${Date.now()}-b-${r.student_id}`,
        student_id: r.student_id,
        meal_type: 'breakfast',
        date: dateStr,
        status: r.breakfast ? 'present' : 'absent',
        marked_by: 'admin',
        created_at: now
      });
      newRecords.push({
        id: `att-${Date.now()}-l-${r.student_id}`,
        student_id: r.student_id,
        meal_type: 'lunch',
        date: dateStr,
        status: r.lunch ? 'present' : 'absent',
        marked_by: 'admin',
        created_at: now
      });
      newRecords.push({
        id: `att-${Date.now()}-d-${r.student_id}`,
        student_id: r.student_id,
        meal_type: 'dinner',
        date: dateStr,
        status: r.dinner ? 'present' : 'absent',
        marked_by: 'admin',
        created_at: now
      });
    });

    this.attendance.push(...newRecords);
    this.saveToStorage();
  }

  markAttendance(studentId: string, mealType: MealType, dateStr: string, status: 'present' | 'absent', markedBy?: string): AttendanceRecord {
    const existingIdx = this.attendance.findIndex(
      a => a.student_id === studentId && a.meal_type === mealType && a.date === dateStr
    );

    if (existingIdx >= 0) {
      this.attendance[existingIdx] = {
        ...this.attendance[existingIdx],
        status,
        marked_by: markedBy || this.attendance[existingIdx].marked_by
      };
      this.saveToStorage();
      return this.attendance[existingIdx];
    }

    const record: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      student_id: studentId,
      meal_type: mealType,
      date: dateStr,
      status,
      marked_by: markedBy,
      created_at: new Date().toISOString()
    };

    this.attendance.push(record);
    this.saveToStorage();
    return record;
  }

  // --- GUEST LEDGER & ITEM COST MANAGEMENT ---
  getTokenItems(): TokenItem[] {
    return [...this.tokenItems];
  }

  getGuestSelectableItems(): { id: string; name: string; price: number; type: 'item' | 'meal' }[] {
    const items = this.tokenItems.map(i => ({ id: i.id, name: i.name, price: i.price, type: 'item' as const }));
    const bPrice = this.getEffectiveMealPrice('breakfast');
    const lPrice = this.getEffectiveMealPrice('lunch');
    const dPrice = this.getEffectiveMealPrice('dinner');

    const meals = [
      { id: 'meal-breakfast', name: 'Breakfast Meal', price: bPrice, type: 'meal' as const },
      { id: 'meal-lunch', name: 'Lunch Meal', price: lPrice, type: 'meal' as const },
      { id: 'meal-dinner', name: 'Dinner Meal', price: dPrice, type: 'meal' as const },
    ];

    return [...items, ...meals];
  }

  addTokenItem(name: string, price: number, effectiveFrom?: string): TokenItem {
    if (price < 0) throw new Error('Price cannot be negative.');
    const effFrom = effectiveFrom || getTodayString();
    const newItem: TokenItem = {
      id: `ti-${Date.now()}`,
      name,
      price,
      effective_from: effFrom,
      status: 'active',
      created_at: new Date().toISOString()
    };
    this.tokenItems.unshift(newItem);
    this.saveToStorage();

    if (isSupabaseConfigured && supabase) {
      supabase.from('guest_items').insert([{
        name,
        price,
        effective_from: effFrom,
        status: 'active'
      }]).select().then(({ data, error }) => {
        if (error) console.error('Supabase guest_items insert error:', error);
        else if (data && data[0]) {
          newItem.id = data[0].id;
          this.saveToStorage();
        }
      });
    }

    return newItem;
  }

  updateTokenItem(id: string, updates: Partial<TokenItem>): TokenItem {
    const idx = this.tokenItems.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Token item not found');
    this.tokenItems[idx] = { ...this.tokenItems[idx], ...updates };
    this.saveToStorage();

    if (isSupabaseConfigured && supabase) {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.price !== undefined) payload.price = updates.price;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.effective_from !== undefined) payload.effective_from = updates.effective_from;

      supabase.from('guest_items').update(payload).eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase guest_items update error:', error);
      });
    }

    return this.tokenItems[idx];
  }

  deleteTokenItem(id: string): void {
    this.tokenItems = this.tokenItems.filter(t => t.id !== id);
    this.saveToStorage();

    if (isSupabaseConfigured && supabase) {
      supabase.from('guest_items').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase guest_items delete error:', error);
      });
    }
  }

  getTokenEntries(dateStr?: string): TokenEntry[] {
    if (dateStr) return this.tokenEntries.filter(e => e.date === dateStr);
    return [...this.tokenEntries].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  addTokenEntry(data: { token_item_id: string; quantity: number; consumer_name: string; date?: string; notes?: string }): TokenEntry {
    if (isNaN(data.quantity) || data.quantity <= 0) throw new Error('Quantity must be a positive integer.');

    let itemName = '';
    let unitPrice = 0;

    if (data.token_item_id === 'meal-breakfast') {
      itemName = 'Breakfast Meal';
      unitPrice = this.getEffectiveMealPrice('breakfast', data.date);
    } else if (data.token_item_id === 'meal-lunch') {
      itemName = 'Lunch Meal';
      unitPrice = this.getEffectiveMealPrice('lunch', data.date);
    } else if (data.token_item_id === 'meal-dinner') {
      itemName = 'Dinner Meal';
      unitPrice = this.getEffectiveMealPrice('dinner', data.date);
    } else {
      const item = this.tokenItems.find(i => i.id === data.token_item_id);
      if (!item) throw new Error('Selected item does not exist.');
      itemName = item.name;
      unitPrice = item.price;
    }

    const dateStr = data.date || getTodayString();
    const entry: TokenEntry = {
      id: `te-${Date.now()}`,
      token_item_id: data.token_item_id,
      token_item_name: itemName,
      quantity: data.quantity,
      unit_price: unitPrice,
      total_price: unitPrice * data.quantity,
      consumer_name: data.consumer_name.trim(),
      date: dateStr,
      notes: data.notes?.trim(),
      created_at: new Date().toISOString()
    };
    this.tokenEntries.unshift(entry);
    this.saveToStorage();
    return entry;
  }

  updateTokenEntry(id: string, updates: Partial<TokenEntry>): TokenEntry {
    const idx = this.tokenEntries.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Token entry not found');

    const current = this.tokenEntries[idx];
    let qty = updates.quantity !== undefined ? updates.quantity : current.quantity;
    if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be a positive integer.');

    let unitPrice = current.unit_price;
    let itemName = current.token_item_name;

    if (updates.token_item_id && updates.token_item_id !== current.token_item_id) {
      const item = this.tokenItems.find(i => i.id === updates.token_item_id);
      if (item) {
        unitPrice = item.price;
        itemName = item.name;
      }
    }

    const updated: TokenEntry = {
      ...current,
      ...updates,
      token_item_name: itemName,
      quantity: qty,
      unit_price: unitPrice,
      total_price: qty * unitPrice
    };

    this.tokenEntries[idx] = updated;
    this.saveToStorage();
    return updated;
  }

  deleteTokenEntry(id: string): void {
    this.tokenEntries = this.tokenEntries.filter(e => e.id !== id);
    this.saveToStorage();
  }

  getGuestSummaries(): GuestSummary[] {
    const map = new Map<string, { total_amount: number; total_entries: number; latest_date: string; items: Map<string, { quantity: number; amount: number }> }>();

    this.tokenEntries.forEach(entry => {
      const gName = entry.consumer_name;
      let guestData = map.get(gName);
      if (!guestData) {
        guestData = { total_amount: 0, total_entries: 0, latest_date: entry.date, items: new Map() };
        map.set(gName, guestData);
      }
      guestData.total_amount += entry.total_price;
      guestData.total_entries += 1;
      if (entry.date > guestData.latest_date) guestData.latest_date = entry.date;

      const itemName = entry.token_item_name || 'Item';
      let itemRecord = guestData.items.get(itemName);
      if (!itemRecord) {
        itemRecord = { quantity: 0, amount: 0 };
        guestData.items.set(itemName, itemRecord);
      }
      itemRecord.quantity += entry.quantity;
      itemRecord.amount += entry.total_price;
    });

    const summaries: GuestSummary[] = [];
    map.forEach((val, gName) => {
      const itemsConsumed = Array.from(val.items.entries()).map(([itemName, data]) => ({
        item_name: itemName,
        quantity: data.quantity,
        amount: data.amount
      }));
      summaries.push({
        guest_name: gName,
        total_entries: val.total_entries,
        total_amount: val.total_amount,
        latest_date: val.latest_date,
        items_consumed: itemsConsumed
      });
    });

    return summaries.sort((a, b) => b.total_amount - a.total_amount);
  }

  // =========================================================================
  // MONTHLY BILLING ENGINE (EXACT MATCH FOR "W HOSTEL BILLS 2026.xlsx")
  // =========================================================================
  getMonthlyHostelBills(year: number, month: number, customMonthAmount = 2500): MonthlyBillSnapshot {
    const snapshotKey = `${year}-${String(month).padStart(2, '0')}`;
    
    if (this.finalizedBillSnapshots.has(snapshotKey)) {
      return this.finalizedBillSnapshots.get(snapshotKey)!;
    }

    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const runningDays = getDaysInMonth(year, month);
    const monthName = getMonthName(month);

    const activeStudents = this.students;
    const rows: MonthlyHostelBillRow[] = [];
    let totalPayable = 0;

    activeStudents.forEach((st, idx) => {
      const monthAtt = this.attendance.filter(a => a.student_id === st.id && a.date.startsWith(prefix));

      let bCount = 0, lCount = 0, dCount = 0;
      const attendedDaysSet = new Set<string>();

      monthAtt.forEach(att => {
        if (att.status === 'present') {
          attendedDaysSet.add(att.date);
          if (att.meal_type === 'breakfast') bCount++;
          if (att.meal_type === 'lunch') lCount++;
          if (att.meal_type === 'dinner') dCount++;
        }
      });

      let absentDays = 0;
      if (monthAtt.length > 0) {
        absentDays = Math.max(0, runningDays - attendedDaysSet.size);
      }

      // EXCEL FORMULAS FROM W HOSTEL BILLS 2026.xlsx
      let deductDays = 0;
      if (absentDays === runningDays) {
        deductDays = 0;
      } else if (absentDays >= 10) {
        deductDays = Math.floor(absentDays / 2);
      } else {
        deductDays = 0;
      }

      let eligibleDays = runningDays;
      if (absentDays === runningDays) {
        eligibleDays = 0;
      } else if (absentDays === 0) {
        eligibleDays = runningDays;
      } else if (absentDays < 10) {
        eligibleDays = runningDays - absentDays;
      } else {
        eligibleDays = runningDays - deductDays;
      }

      let deductionAmount = 0;
      if (absentDays === runningDays) {
        deductionAmount = customMonthAmount;
      } else if (deductDays >= 1) {
        deductionAmount = Math.round(((customMonthAmount / runningDays) * deductDays) * 100) / 100;
      } else {
        deductionAmount = 0;
      }

      const payableAmount = Math.max(0, Math.round((customMonthAmount - deductionAmount) * 100) / 100);
      totalPayable += payableAmount;

      rows.push({
        s_no: idx + 1,
        student: st,
        roll_number: st.roll_number,
        name: st.name,
        gender: st.gender || 'F',
        month_amount: customMonthAmount,
        running_days: runningDays,
        absent_days: absentDays,
        deduct_days: deductDays,
        eligible_days: eligibleDays,
        deduction_amount: deductionAmount,
        payable_amount: payableAmount,
        breakfast_count: bCount,
        lunch_count: lCount,
        dinner_count: dCount
      });
    });

    return {
      id: `bill-${snapshotKey}`,
      year,
      month,
      month_name: monthName,
      month_amount: customMonthAmount,
      running_days: runningDays,
      total_students: rows.length,
      total_payable: Math.round(totalPayable * 100) / 100,
      is_finalized: false,
      rows,
      created_at: new Date().toISOString()
    };
  }

  finalizeMonthlyBill(year: number, month: number, customMonthAmount = 2500): MonthlyBillSnapshot {
    const snapshotKey = `${year}-${String(month).padStart(2, '0')}`;
    const bill = this.getMonthlyHostelBills(year, month, customMonthAmount);
    bill.is_finalized = true;
    bill.finalized_at = new Date().toISOString();

    this.finalizedBillSnapshots.set(snapshotKey, bill);
    this.saveToStorage();
    return bill;
  }

  // --- LEGACY / COMPATIBILITY HELPERS ---
  getStudentMonthlyBilling(year: number, month: number): StudentBillingSummary[] {
    const snapshot = this.getMonthlyHostelBills(year, month);
    return snapshot.rows.map(r => ({
      student: r.student,
      breakfastCount: r.breakfast_count,
      lunchCount: r.lunch_count,
      dinnerCount: r.dinner_count,
      breakfastPrice: this.getEffectiveMealPrice('breakfast'),
      lunchPrice: this.getEffectiveMealPrice('lunch'),
      dinnerPrice: this.getEffectiveMealPrice('dinner'),
      totalBill: r.payable_amount,
      joinedAt: r.student.joined_at
    }));
  }

  getTokenMonthlyReport(year: number, month: number): TokenMonthlyReportRow[] {
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const entriesInMonth = this.tokenEntries.filter(e => e.date.startsWith(prefix));
    const itemMap = new Map<string, TokenMonthlyReportRow>();

    this.tokenItems.forEach(item => {
      itemMap.set(item.id, {
        token_item_id: item.id,
        item_name: item.name,
        unit_price: item.price,
        total_quantity: 0,
        total_amount: 0,
        daily_breakdown: {}
      });
    });

    entriesInMonth.forEach(entry => {
      let row = itemMap.get(entry.token_item_id);
      if (!row) {
        row = {
          token_item_id: entry.token_item_id,
          item_name: entry.token_item_name || 'Token Item',
          unit_price: entry.unit_price,
          total_quantity: 0,
          total_amount: 0,
          daily_breakdown: {}
        };
        itemMap.set(entry.token_item_id, row);
      }
      row.total_quantity += entry.quantity;
      row.total_amount += entry.total_price;
    });

    return Array.from(itemMap.values());
  }
}

export const localDb = new LocalDataStore();
