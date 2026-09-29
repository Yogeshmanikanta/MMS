import {
  Student,
  MealPrice,
  TokenItem,
  TokenEntry,
  MealType,
  StudentStatus,
  TokenMonthlyReportRow,
  GuestSummary,
  MonthlyHostelBillRow,
  MonthlyBillSnapshot,
  MealMask,
  DayRecord,
  DayCounts,
  SelectableItem,
  SyncStatus,
  MEAL_BITS,
  ALL_MEALS,
  MEAL_ORDER
} from './types';
import studentsSeed from '../supabase/students_seed.json';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  getTodayString,
  getPreviousDateString,
  getDaysInMonth,
  getMonthName,
  monthKey,
  shiftMonth,
  toDateString
} from './dates';

export { getTodayString, getPreviousDateString, getDaysInMonth, getMonthName } from './dates';

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/** UUID v4. Falls back to getRandomValues because randomUUID is missing on plain-http LAN hosts. */
export function newId(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c?.randomUUID) {
    try {
      return c.randomUUID();
    } catch {
      // insecure context — fall through
    }
  }
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

function seedMealPrices(): MealPrice[] {
  const now = new Date().toISOString();
  return [
    { id: newId(), meal_type: 'breakfast', price: 30, effective_from: '2026-01-01', created_at: now },
    { id: newId(), meal_type: 'lunch', price: 50, effective_from: '2026-01-01', created_at: now },
    { id: newId(), meal_type: 'dinner', price: 40, effective_from: '2026-01-01', created_at: now }
  ];
}

function seedGuestItems(): TokenItem[] {
  const now = new Date().toISOString();
  return [
    ['Tea', 10], ['Coffee', 15], ['Extra Chapati', 5], ['Milk', 20], ['Snack Box', 40], ['VIP Guest Lunch Thali', 120]
  ].map(([name, price]) => ({
    id: newId(),
    name: name as string,
    price: price as number,
    effective_from: '2026-01-01',
    status: 'active' as const,
    created_at: now
  }));
}

function seedStudents(): Student[] {
  const now = new Date().toISOString();
  return (studentsSeed as any[]).map(s => ({
    id: newId(),
    roll_number: s.roll_number,
    name: s.name,
    gender: s.gender || 'F',
    department: s.department,
    year: s.year,
    course: s.course || 'B.Tech',
    status: (s.status as StudentStatus) || 'active',
    joined_at: s.joined_at || '2026-01-01',
    created_at: now,
    updated_at: now
  }));
}

// ---------------------------------------------------------------------------
// Outbox: every local write is mirrored to Supabase through this queue, so
// entries made while offline are sent once the connection comes back.
// ---------------------------------------------------------------------------

type OutboxOp =
  | { t: 'upsert'; table: string; rows: Record<string, unknown>[]; onConflict?: string }
  | { t: 'delete'; table: string; match: Record<string, string | number> }
  | { t: 'bill'; snapshot: MonthlyBillSnapshot };

const STORAGE_KEY = 'mms_store_v4';
const LEGACY_STORAGE_KEY = 'mms_hostel_canteen_store_v3';
const PULL_MONTHS_BACK = 3;
const CHUNK = 500;

interface PersistedState {
  students: Student[];
  mealPrices: MealPrice[];
  days: Record<string, DayRecord>;
  guestItems: TokenItem[];
  ledger: TokenEntry[];
  snapshots: Record<string, MonthlyBillSnapshot>;
  monthAmount: number;
  outbox: OutboxOp[];
  lastSyncedAt?: string;
}

function studentRow(s: Student) {
  return {
    id: s.id,
    roll_number: s.roll_number,
    name: s.name,
    gender: s.gender || 'F',
    department: s.department,
    year: s.year,
    course: s.course,
    contact: s.contact || null,
    status: s.status,
    joined_at: s.joined_at,
    updated_at: s.updated_at
  };
}

function ledgerRow(e: TokenEntry) {
  return {
    id: e.id,
    guest_item_id: e.token_item_id,
    token_item_name: e.token_item_name || '',
    quantity: e.quantity,
    unit_price: e.unit_price,
    total_price: e.total_price,
    consumer_name: e.consumer_name,
    date: e.date,
    notes: e.notes || null
  };
}

function guestItemRow(i: TokenItem) {
  return { id: i.id, name: i.name, price: i.price, effective_from: i.effective_from, status: i.status };
}

function mealPriceRow(p: MealPrice) {
  return { id: p.id, meal_type: p.meal_type, price: p.price, effective_from: p.effective_from };
}

function maskToRows(studentId: string, date: string, mask: MealMask, markedBy: string) {
  return MEAL_ORDER.map(meal => ({
    student_id: studentId,
    date,
    meal_type: meal,
    status: mask & MEAL_BITS[meal] ? 'present' : 'absent',
    marked_by: markedBy
  }));
}

async function fetchAll(table: string, columns = '*', apply?: (q: any) => any): Promise<any[]> {
  if (!supabase) return [];
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(columns);
    if (apply) q = apply(q);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

class MessStore {
  private students: Student[] = [];
  private mealPrices: MealPrice[] = [];
  private days: Record<string, DayRecord> = {};
  private guestItems: TokenItem[] = [];
  private ledger: TokenEntry[] = [];
  private snapshots: Record<string, MonthlyBillSnapshot> = {};
  private monthAmount = 2500;
  private outbox: OutboxOp[] = [];

  private version = 0;
  private listeners = new Set<() => void>();
  private sync: SyncStatus = { state: isSupabaseConfigured ? 'idle' : 'local', pending: 0 };
  private syncing: Promise<void> | null = null;
  private started = false;

  constructor() {
    this.load();
  }

  // ----- subscription (used by useStore) -----

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    this.start();
    return () => {
      this.listeners.delete(fn);
    };
  };

  getVersion = () => this.version;

  private commit() {
    this.version++;
    this.persist();
    this.listeners.forEach(fn => fn());
  }

  private enqueue(...ops: OutboxOp[]) {
    if (!isSupabaseConfigured) return;
    this.outbox.push(...ops);
    this.sync = { ...this.sync, pending: this.outbox.length };
    // Let the UI update first; push in the background.
    setTimeout(() => this.flush(), 0);
  }

  // ----- persistence -----

  private load() {
    let state: Partial<PersistedState> | null = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) state = JSON.parse(raw);
        else {
          const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacy) state = migrateLegacy(JSON.parse(legacy));
        }
      } catch (e) {
        console.error('Could not read saved data', e);
      }
    }

    this.students = state?.students?.length ? state.students : seedStudents();
    this.mealPrices = state?.mealPrices?.length ? state.mealPrices : seedMealPrices();
    this.guestItems = state?.guestItems?.length ? state.guestItems : seedGuestItems();
    this.days = state?.days || {};
    this.ledger = state?.ledger || [];
    this.snapshots = state?.snapshots || {};
    this.monthAmount = state?.monthAmount || 2500;
    this.outbox = isSupabaseConfigured ? state?.outbox || [] : [];
    this.sync = {
      state: isSupabaseConfigured ? 'idle' : 'local',
      pending: this.outbox.length,
      lastSyncedAt: state?.lastSyncedAt
    };
    this.ensureUuids();
    this.persist();
  }

  /** Old builds used ids like "s-seed-12"; Supabase needs UUIDs. Remap everything that points at them. */
  private ensureUuids() {
    const remap = new Map<string, string>();
    this.students.forEach(s => {
      if (!isUuid(s.id)) {
        const id = newId();
        remap.set(s.id, id);
        s.id = id;
      }
    });
    if (remap.size) {
      Object.values(this.days).forEach(day => {
        const away: Record<string, MealMask> = {};
        Object.entries(day.away).forEach(([sid, mask]) => (away[remap.get(sid) || sid] = mask));
        day.away = away;
      });
    }
    this.mealPrices.forEach(p => { if (!isUuid(p.id)) p.id = newId(); });
    this.ledger.forEach(e => { if (!isUuid(e.id)) e.id = newId(); });
    const itemRemap = new Map<string, string>();
    this.guestItems.forEach(i => {
      if (!isUuid(i.id)) {
        const id = newId();
        itemRemap.set(i.id, id);
        i.id = id;
      }
    });
    this.ledger.forEach(e => {
      const id = itemRemap.get(e.token_item_id);
      if (id) e.token_item_id = id;
    });
  }

  private persist() {
    if (typeof window === 'undefined') return;
    const state: PersistedState = {
      students: this.students,
      mealPrices: this.mealPrices,
      days: this.days,
      guestItems: this.guestItems,
      ledger: this.ledger,
      snapshots: this.snapshots,
      monthAmount: this.monthAmount,
      outbox: this.outbox,
      lastSyncedAt: this.sync.lastSyncedAt
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Could not save data locally', e);
    }
  }

  // ----- sync -----

  getSyncStatus(): SyncStatus {
    return this.sync;
  }

  private setSync(next: Partial<SyncStatus>) {
    this.sync = { ...this.sync, ...next, pending: this.outbox.length };
    this.commit();
  }

  private start() {
    if (this.started || typeof window === 'undefined' || !isSupabaseConfigured) return;
    this.started = true;
    window.addEventListener('online', () => this.syncNow());
    window.addEventListener('offline', () => this.setSync({ state: 'offline' }));
    setInterval(() => {
      if (this.outbox.length) this.flush();
    }, 30_000);
    this.syncNow();
  }

  /** Push pending writes, then pull the latest data. */
  syncNow(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return Promise.resolve();
    if (this.syncing) return this.syncing;
    this.syncing = (async () => {
      this.setSync({ state: 'syncing' });
      try {
        await this.flush();
        if (this.outbox.length) return; // still offline or failing; don't overwrite unsent work
        const flushError = this.sync.state === 'error' ? this.sync.error : undefined;
        await this.pull();
        this.setSync({ state: flushError ? 'error' : 'idle', lastSyncedAt: new Date().toISOString(), error: flushError });
      } catch (e: any) {
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        this.setSync({ state: offline ? 'offline' : 'error', error: e?.message || String(e) });
      } finally {
        this.syncing = null;
      }
    })();
    return this.syncing;
  }

  private flushing = false;

  private async flush() {
    if (!supabase || this.flushing || !this.outbox.length) return;
    this.flushing = true;
    try {
      let rejected = 0;
      let lastRejection = '';
      while (this.outbox.length) {
        try {
          await this.send(this.outbox[0]);
        } catch (e: any) {
          // A database error (it has a Postgres code) will fail the same way every time,
          // so set it aside instead of blocking everything queued behind it.
          // Network errors have no code: stop and retry later.
          if (!e?.code) throw e;
          console.error('Supabase rejected a change', e, this.outbox[0]);
          rejected++;
          lastRejection = e.message || String(e);
        }
        this.outbox.shift();
        this.sync = { ...this.sync, pending: this.outbox.length };
        this.persist();
      }
      if (rejected) this.setSync({ state: 'error', error: `${rejected} change(s) rejected by the server: ${lastRejection}` });
      else if (this.sync.state !== 'syncing') this.setSync({ state: 'idle', lastSyncedAt: new Date().toISOString(), error: undefined });
    } catch (e: any) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      this.setSync({ state: offline ? 'offline' : 'error', error: e?.message || String(e) });
    } finally {
      this.flushing = false;
    }
  }

  private async send(op: OutboxOp) {
    if (!supabase) return;
    if (op.t === 'upsert') {
      for (let i = 0; i < op.rows.length; i += CHUNK) {
        const { error } = await supabase
          .from(op.table)
          .upsert(op.rows.slice(i, i + CHUNK), op.onConflict ? { onConflict: op.onConflict } : undefined);
        if (error) throw error;
      }
    } else if (op.t === 'delete') {
      const { error } = await supabase.from(op.table).delete().match(op.match);
      if (error) throw error;
    } else if (op.t === 'bill') {
      const s = op.snapshot;
      const { data, error } = await supabase
        .from('monthly_bills')
        .upsert(
          {
            year: s.year,
            month: s.month,
            month_amount: s.month_amount,
            running_days: s.running_days,
            total_students: s.total_students,
            total_billed_amount: s.total_payable,
            is_finalized: true,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'year,month' }
        )
        .select('id')
        .single();
      if (error) throw error;
      const billId = (data as any).id;
      const del = await supabase.from('monthly_bill_details').delete().eq('monthly_bill_id', billId);
      if (del.error) throw del.error;
      const rows = s.rows.map(r => ({
        monthly_bill_id: billId,
        student_id: r.student.id,
        student_name: r.name,
        roll_number: r.roll_number,
        gender: r.gender,
        month_amount: r.month_amount,
        running_days: r.running_days,
        absent_days: r.absent_days,
        deduct_days: r.deduct_days,
        eligible_days: r.eligible_days,
        deduction_amount: r.deduction_amount,
        payable_amount: r.payable_amount,
        breakfast_count: r.breakfast_count,
        lunch_count: r.lunch_count,
        dinner_count: r.dinner_count
      }));
      for (let i = 0; i < rows.length; i += CHUNK) {
        const ins = await supabase.from('monthly_bill_details').insert(rows.slice(i, i + CHUNK));
        if (ins.error) throw ins.error;
      }
    }
  }

  private async pull() {
    // Students — if the cloud roster is empty, this device seeds it.
    const remoteStudents = await fetchAll('students');
    if (remoteStudents.length) {
      const byRoll = new Map(this.students.map(s => [s.roll_number.toLowerCase(), s.id]));
      const remap = new Map<string, string>();
      this.students = remoteStudents.map((s: any) => {
        const localId = byRoll.get(String(s.roll_number).toLowerCase());
        if (localId && localId !== s.id) remap.set(localId, s.id);
        return {
          id: s.id,
          roll_number: s.roll_number,
          name: s.name,
          gender: s.gender || 'F',
          department: s.department,
          year: s.year,
          course: s.course || 'B.Tech',
          contact: s.contact || undefined,
          status: s.status || 'active',
          joined_at: s.joined_at,
          created_at: s.created_at,
          updated_at: s.updated_at
        };
      });
      if (remap.size) {
        Object.values(this.days).forEach(day => {
          const away: Record<string, MealMask> = {};
          Object.entries(day.away).forEach(([sid, mask]) => (away[remap.get(sid) || sid] = mask));
          day.away = away;
        });
      }
    } else if (this.students.length) {
      await this.send({ t: 'upsert', table: 'students', rows: this.students.map(studentRow) });
    }

    const remotePrices = await fetchAll('meal_costs');
    if (remotePrices.length) {
      this.mealPrices = remotePrices.map((c: any) => ({
        id: c.id,
        meal_type: c.meal_type,
        price: Number(c.price),
        effective_from: c.effective_from,
        created_at: c.created_at
      }));
    } else {
      await this.send({ t: 'upsert', table: 'meal_costs', rows: this.mealPrices.map(mealPriceRow) });
    }

    const remoteItems = await fetchAll('guest_items');
    if (remoteItems.length) {
      this.guestItems = remoteItems.map((i: any) => ({
        id: i.id,
        name: i.name,
        price: Number(i.price),
        effective_from: i.effective_from,
        status: i.status || 'active',
        created_at: i.created_at
      }));
    } else {
      await this.send({ t: 'upsert', table: 'guest_items', rows: this.guestItems.map(guestItemRow) });
    }

    const remoteLedger = await fetchAll('guest_ledger');
    if (remoteLedger.length) {
      this.ledger = remoteLedger
        .map((e: any) => ({
          id: e.id,
          token_item_id: e.guest_item_id,
          token_item_name: e.token_item_name,
          quantity: e.quantity,
          unit_price: Number(e.unit_price),
          total_price: Number(e.total_price),
          consumer_name: e.consumer_name,
          date: e.date,
          notes: e.notes || undefined,
          created_at: e.created_at
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (this.ledger.length) {
      await this.send({ t: 'upsert', table: 'guest_ledger', rows: this.ledger.map(ledgerRow) });
    }

    // Attendance: only the recent window, stored compactly.
    const now = new Date();
    const start = shiftMonth(now.getFullYear(), now.getMonth() + 1, -PULL_MONTHS_BACK);
    await this.loadAttendanceRange(`${monthKey(start.year, start.month)}-01`, null);

    // Finalised bills
    const bills = await fetchAll('monthly_bills', '*', q => q.eq('is_finalized', true));
    for (const b of bills) {
      const key = monthKey(b.year, b.month);
      if (this.snapshots[key]) continue;
      const details = await fetchAll('monthly_bill_details', '*', q => q.eq('monthly_bill_id', b.id));
      const byId = new Map(this.students.map(s => [s.id, s]));
      const rows: MonthlyHostelBillRow[] = details
        .sort((a: any, c: any) => String(a.roll_number).localeCompare(String(c.roll_number)))
        .map((d: any, i: number) => {
          const student =
            byId.get(d.student_id) ||
            ({ id: d.student_id, roll_number: d.roll_number, name: d.student_name, gender: d.gender } as Student);
          return {
            s_no: i + 1,
            student,
            roll_number: d.roll_number,
            name: d.student_name,
            gender: d.gender || 'F',
            month_amount: Number(d.month_amount),
            running_days: d.running_days,
            absent_days: d.absent_days,
            deduct_days: Number(d.deduct_days),
            eligible_days: Number(d.eligible_days),
            deduction_amount: Number(d.deduction_amount),
            payable_amount: Number(d.payable_amount),
            breakfast_count: d.breakfast_count,
            lunch_count: d.lunch_count,
            dinner_count: d.dinner_count
          };
        });
      this.snapshots[key] = {
        id: b.id,
        year: b.year,
        month: b.month,
        month_name: getMonthName(b.month),
        month_amount: Number(b.month_amount),
        running_days: b.running_days,
        total_students: b.total_students,
        total_payable: Number(b.total_billed_amount),
        is_finalized: true,
        finalized_at: b.updated_at,
        rows,
        created_at: b.created_at
      };
    }
  }

  /** Replace local attendance for [from, to] with what the cloud has. */
  private async loadAttendanceRange(from: string, to: string | null) {
    const rows = await fetchAll('daily_attendance', 'student_id,date,meal_type,status', q => {
      let r = q.gte('date', from);
      if (to) r = r.lte('date', to);
      return r.order('date').order('student_id').order('meal_type');
    });
    const fresh: Record<string, DayRecord> = {};
    const masks: Record<string, Record<string, MealMask>> = {};
    rows.forEach((r: any) => {
      const date = String(r.date).slice(0, 10);
      if (!fresh[date]) {
        fresh[date] = { recordedAt: this.days[date]?.recordedAt || new Date().toISOString(), away: {} };
        masks[date] = {};
      }
      const m = masks[date][r.student_id] ?? ALL_MEALS;
      masks[date][r.student_id] = r.status === 'absent' ? m & ~MEAL_BITS[r.meal_type as MealType] : m;
    });
    Object.entries(masks).forEach(([date, byStudent]) => {
      Object.entries(byStudent).forEach(([sid, mask]) => {
        if (mask !== ALL_MEALS) fresh[date].away[sid] = mask;
      });
    });
    const localOnly: string[] = [];
    Object.keys(this.days).forEach(date => {
      if (date < from || (to && date > to)) return;
      if (fresh[date]) delete this.days[date];
      else localOnly.push(date); // taken on this device but never reached the cloud
    });
    Object.assign(this.days, fresh);
    localOnly.forEach(date => this.pushWholeDay(date, 'admin'));
  }

  /** Bills for months older than the synced window need their attendance fetched first. */
  async ensureMonthLoaded(year: number, month: number) {
    if (!isSupabaseConfigured || this.outbox.length) return;
    const now = new Date();
    const start = shiftMonth(now.getFullYear(), now.getMonth() + 1, -PULL_MONTHS_BACK);
    if (monthKey(year, month) >= monthKey(start.year, start.month)) return;
    try {
      const from = `${monthKey(year, month)}-01`;
      const to = `${monthKey(year, month)}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`;
      await this.loadAttendanceRange(from, to);
      this.commit();
    } catch (e) {
      console.error('Could not load attendance for', year, month, e);
    }
  }

  // =========================================================================
  // STUDENTS
  // =========================================================================

  getStudents(params?: { search?: string; department?: string; year?: string; gender?: string; status?: string }) {
    let list = [...this.students];
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q));
    }
    if (params?.department && params.department !== 'all') list = list.filter(s => s.department === params.department);
    if (params?.year && params.year !== 'all') list = list.filter(s => s.year === params.year);
    if (params?.gender && params.gender !== 'all') list = list.filter(s => (s.gender || 'F') === params.gender);
    if (params?.status && params.status !== 'all') list = list.filter(s => s.status === params.status);
    return list.sort((a, b) => a.roll_number.localeCompare(b.roll_number));
  }

  getActiveStudents(): Student[] {
    return this.getStudents({ status: 'active' });
  }

  getStudent(id: string): Student | undefined {
    return this.students.find(s => s.id === id);
  }

  /** Distinct values actually present in the roster, for filter menus. */
  getStudentFacets(): { departments: string[]; years: string[]; courses: string[] } {
    const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort();
    return {
      departments: uniq(this.students.map(s => s.department)),
      years: uniq(this.students.map(s => s.year)),
      courses: uniq(this.students.map(s => s.course))
    };
  }

  getStudentByRollNumber(rollNumber: string): Student | undefined {
    const q = rollNumber.trim().toLowerCase();
    return this.students.find(s => s.roll_number.toLowerCase() === q);
  }

  /**
   * Roll-number-first search. Exact match, then roll numbers ending with the query
   * (staff usually type the last few digits), then any roll/name containing it.
   */
  searchStudents(query: string, opts?: { activeOnly?: boolean; limit?: number }): Student[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const pool = opts?.activeOnly ? this.students.filter(s => s.status === 'active') : this.students;
    const scored: { s: Student; score: number }[] = [];
    pool.forEach(s => {
      const roll = s.roll_number.toLowerCase();
      const name = s.name.toLowerCase();
      let score = -1;
      if (roll === q) score = 0;
      else if (roll.endsWith(q)) score = 1;
      else if (roll.includes(q)) score = 2;
      else if (name.startsWith(q) || name.includes(' ' + q)) score = 3;
      else if (name.includes(q)) score = 4;
      if (score >= 0) scored.push({ s, score });
    });
    scored.sort((a, b) => a.score - b.score || a.s.roll_number.localeCompare(b.s.roll_number));
    return scored.slice(0, opts?.limit ?? 20).map(x => x.s);
  }

  /** Kept for older call sites. */
  searchStudentsByPartialRoll(query: string): Student[] {
    return this.searchStudents(query);
  }

  addStudent(data: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Student {
    const roll = data.roll_number.trim().toUpperCase();
    if (!roll) throw new Error('Enter a roll number.');
    if (!data.name.trim()) throw new Error('Enter the student’s name.');
    if (this.getStudentByRollNumber(roll)) throw new Error(`${roll} is already on the roll.`);
    const now = new Date().toISOString();
    const student: Student = {
      ...data,
      roll_number: roll,
      name: data.name.trim(),
      id: newId(),
      gender: data.gender || 'F',
      status: data.status || 'active',
      joined_at: data.joined_at || getTodayString(),
      created_at: now,
      updated_at: now
    };
    this.students.push(student);
    this.commit();
    this.enqueue({ t: 'upsert', table: 'students', rows: [studentRow(student)] });
    return student;
  }

  updateStudent(id: string, updates: Partial<Student>): Student {
    const idx = this.students.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Student not found.');
    if (updates.roll_number) {
      const roll = updates.roll_number.trim().toUpperCase();
      const clash = this.getStudentByRollNumber(roll);
      if (clash && clash.id !== id) throw new Error(`${roll} already belongs to ${clash.name}.`);
      updates = { ...updates, roll_number: roll };
    }
    this.students[idx] = { ...this.students[idx], ...updates, id, updated_at: new Date().toISOString() };
    this.commit();
    this.enqueue({ t: 'upsert', table: 'students', rows: [studentRow(this.students[idx])] });
    return this.students[idx];
  }

  toggleStudentStatus(id: string, newStatus: StudentStatus): Student {
    return this.updateStudent(id, { status: newStatus });
  }

  /** Adds new roll numbers, skips ones already on the roll. */
  bulkImportStudents(rows: Array<Omit<Student, 'id' | 'created_at' | 'updated_at'>>): { added: Student[]; skipped: number } {
    const now = new Date().toISOString();
    const seen = new Set(this.students.map(s => s.roll_number.toLowerCase()));
    const added: Student[] = [];
    let skipped = 0;
    rows.forEach(r => {
      const roll = r.roll_number.trim().toUpperCase();
      if (!roll || !r.name.trim() || seen.has(roll.toLowerCase())) {
        skipped++;
        return;
      }
      seen.add(roll.toLowerCase());
      added.push({
        ...r,
        roll_number: roll,
        name: r.name.trim(),
        id: newId(),
        gender: r.gender || 'F',
        status: r.status || 'active',
        joined_at: r.joined_at || getTodayString(),
        created_at: now,
        updated_at: now
      });
    });
    if (added.length) {
      this.students.push(...added);
      this.commit();
      this.enqueue({ t: 'upsert', table: 'students', rows: added.map(studentRow) });
    }
    return { added, skipped };
  }

  // =========================================================================
  // MEAL PRICES
  // =========================================================================

  getMealPrices(): MealPrice[] {
    return [...this.mealPrices].sort(
      (a, b) => b.effective_from.localeCompare(a.effective_from) || b.created_at.localeCompare(a.created_at)
    );
  }

  getEffectiveMealPrice(mealType: MealType, dateStr?: string): number {
    const target = dateStr || getTodayString();
    const match = this.getMealPrices().find(p => p.meal_type === mealType && p.effective_from <= target);
    if (match) return match.price;
    const any = this.mealPrices.find(p => p.meal_type === mealType);
    return any ? any.price : 0;
  }

  updateMealPrice(mealType: MealType, newPrice: number, effectiveFrom?: string): MealPrice {
    if (!(newPrice >= 0)) throw new Error('Price must be zero or more.');
    const record: MealPrice = {
      id: newId(),
      meal_type: mealType,
      price: newPrice,
      effective_from: effectiveFrom || getTodayString(),
      created_at: new Date().toISOString()
    };
    this.mealPrices.push(record);
    this.commit();
    this.enqueue({ t: 'upsert', table: 'meal_costs', rows: [mealPriceRow(record)] });
    return record;
  }

  // =========================================================================
  // ATTENDANCE (exceptions only — everyone else ate all three meals)
  // =========================================================================

  getDay(date: string): DayRecord | undefined {
    return this.days[date];
  }

  isDayRecorded(date: string): boolean {
    return Boolean(this.days[date]);
  }

  /** Kept for older call sites. */
  hasAttendanceForDate(date: string): boolean {
    return this.isDayRecorded(date);
  }

  /** Meals a student ate that day. Unrecorded days read as all three. */
  getStudentMask(date: string, studentId: string): MealMask {
    return this.days[date]?.away[studentId] ?? ALL_MEALS;
  }

  getDayCounts(date: string): DayCounts {
    const active = this.students.filter(s => s.status === 'active');
    const away = this.days[date]?.away || {};
    const counts: DayCounts = { total: active.length, breakfast: 0, lunch: 0, dinner: 0, awayStudents: 0 };
    active.forEach(s => {
      const mask = away[s.id] ?? ALL_MEALS;
      if (mask !== ALL_MEALS) counts.awayStudents++;
      if (mask & 1) counts.breakfast++;
      if (mask & 2) counts.lunch++;
      if (mask & 4) counts.dinner++;
    });
    return counts;
  }

  /** Students with at least one missed meal that day, in roll order. */
  getAwayList(date: string): { student: Student; mask: MealMask }[] {
    const away = this.days[date]?.away || {};
    return Object.entries(away)
      .map(([sid, mask]) => ({ student: this.getStudent(sid)!, mask }))
      .filter(x => x.student && x.student.status === 'active')
      .sort((a, b) => a.student.roll_number.localeCompare(b.student.roll_number));
  }

  private pushWholeDay(date: string, markedBy: string) {
    const away = this.days[date]?.away || {};
    const rows = this.students
      .filter(s => s.status === 'active')
      .flatMap(s => maskToRows(s.id, date, away[s.id] ?? ALL_MEALS, markedBy));
    this.enqueue({ t: 'upsert', table: 'daily_attendance', rows, onConflict: 'student_id,date,meal_type' });
  }

  /** Mark the day as taken with whatever exceptions exist (none = everyone ate everything). */
  recordDay(date: string, markedBy = 'admin') {
    const existed = Boolean(this.days[date]);
    if (!existed) this.days[date] = { recordedAt: new Date().toISOString(), away: {} };
    this.commit();
    if (!existed) this.pushWholeDay(date, markedBy);
  }

  /** Set which meals one student ate. Records the day automatically if needed. */
  setStudentMeals(date: string, studentId: string, mask: MealMask, markedBy = 'admin') {
    const isNewDay = !this.days[date];
    if (isNewDay) this.days[date] = { recordedAt: new Date().toISOString(), away: {} };
    const day = this.days[date];
    if (mask === ALL_MEALS) delete day.away[studentId];
    else day.away[studentId] = mask;
    this.commit();
    if (isNewDay) this.pushWholeDay(date, markedBy);
    else
      this.enqueue({
        t: 'upsert',
        table: 'daily_attendance',
        rows: maskToRows(studentId, date, mask, markedBy),
        onConflict: 'student_id,date,meal_type'
      });
  }

  /** Legacy single-meal marker (student kiosk). */
  markAttendance(studentId: string, mealType: MealType, date: string, status: 'present' | 'absent', markedBy?: string) {
    const current = this.getStudentMask(date, studentId);
    const bit = MEAL_BITS[mealType];
    this.setStudentMeals(date, studentId, status === 'present' ? current | bit : current & ~bit, markedBy);
  }

  /** Copy the away list from the most recent recorded day before `date`. */
  copyAttendanceFromPreviousDay(date: string): { success: boolean; sourceDate: string; count: number } {
    const source = Object.keys(this.days)
      .filter(d => d < date)
      .sort()
      .pop();
    if (!source) return { success: false, sourceDate: '', count: 0 };
    const activeIds = new Set(this.students.filter(s => s.status === 'active').map(s => s.id));
    const away: Record<string, MealMask> = {};
    Object.entries(this.days[source].away).forEach(([sid, mask]) => {
      if (activeIds.has(sid)) away[sid] = mask;
    });
    this.days[date] = { recordedAt: new Date().toISOString(), away };
    this.commit();
    this.pushWholeDay(date, 'admin_copied');
    return { success: true, sourceDate: source, count: Object.keys(away).length };
  }

  /** Remove the day entirely (back to "not taken"). */
  clearDay(date: string) {
    if (!this.days[date]) return;
    delete this.days[date];
    this.commit();
    this.enqueue({ t: 'delete', table: 'daily_attendance', match: { date } });
  }

  /** Put a day back exactly as it was (used by undo). */
  restoreDay(date: string, day: DayRecord | undefined) {
    if (!day) return this.clearDay(date);
    this.days[date] = { recordedAt: day.recordedAt, away: { ...day.away } };
    this.commit();
    this.pushWholeDay(date, 'admin');
  }

  /**
   * Past days of a month (up to today) that nobody recorded. Days before the first
   * day attendance was ever taken don't count — the app wasn't in use yet.
   */
  getUnrecordedDays(year: number, month: number): string[] {
    const today = getTodayString();
    const first = Object.keys(this.days).sort()[0];
    if (!first) return [];
    const out: string[] = [];
    for (let d = 1; d <= getDaysInMonth(year, month); d++) {
      const date = toDateString(new Date(year, month - 1, d));
      if (date > today) break;
      if (date >= first && !this.days[date]) out.push(date);
    }
    return out;
  }

  /** Days in a month that were recorded, for calendar dots. */
  getRecordedDays(year: number, month: number): string[] {
    const prefix = monthKey(year, month);
    return Object.keys(this.days).filter(d => d.startsWith(prefix)).sort();
  }

  // =========================================================================
  // GUEST ITEMS
  // =========================================================================

  getTokenItems(opts?: { includeInactive?: boolean }): TokenItem[] {
    const list = opts?.includeInactive === false ? this.guestItems.filter(i => i.status === 'active') : this.guestItems;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }

  getGuestSelectableItems(date?: string): SelectableItem[] {
    const items = this.getTokenItems({ includeInactive: false }).map(i => ({
      id: i.id,
      name: i.name,
      price: i.price,
      type: 'item' as const
    }));
    const meals: SelectableItem[] = MEAL_ORDER.map(m => ({
      id: `meal-${m}`,
      name: `${m[0].toUpperCase()}${m.slice(1)} meal`,
      price: this.getEffectiveMealPrice(m, date),
      type: 'meal'
    }));
    return [...items, ...meals];
  }

  addTokenItem(name: string, price: number, effectiveFrom?: string): TokenItem {
    const clean = name.trim();
    if (!clean) throw new Error('Enter an item name.');
    if (!(price >= 0)) throw new Error('Price must be zero or more.');
    if (this.guestItems.some(i => i.name.toLowerCase() === clean.toLowerCase()))
      throw new Error(`${clean} is already on the list.`);
    const item: TokenItem = {
      id: newId(),
      name: clean,
      price,
      effective_from: effectiveFrom || getTodayString(),
      status: 'active',
      created_at: new Date().toISOString()
    };
    this.guestItems.push(item);
    this.commit();
    this.enqueue({ t: 'upsert', table: 'guest_items', rows: [guestItemRow(item)] });
    return item;
  }

  updateTokenItem(id: string, updates: Partial<TokenItem>): TokenItem {
    const idx = this.guestItems.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Item not found.');
    if (updates.price !== undefined && !(updates.price >= 0)) throw new Error('Price must be zero or more.');
    this.guestItems[idx] = { ...this.guestItems[idx], ...updates, id };
    this.commit();
    this.enqueue({ t: 'upsert', table: 'guest_items', rows: [guestItemRow(this.guestItems[idx])] });
    return this.guestItems[idx];
  }

  deleteTokenItem(id: string): void {
    this.guestItems = this.guestItems.filter(t => t.id !== id);
    this.commit();
    this.enqueue({ t: 'delete', table: 'guest_items', match: { id } });
  }

  // =========================================================================
  // GUEST LEDGER
  // =========================================================================

  /** Newest first. Optional exact date or YYYY-MM month prefix. */
  getTokenEntries(filter?: string): TokenEntry[] {
    const list = filter ? this.ledger.filter(e => e.date.startsWith(filter)) : this.ledger;
    return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }

  private resolveItem(itemId: string, date: string): { name: string; price: number } {
    const meal = MEAL_ORDER.find(m => itemId === `meal-${m}`);
    if (meal) return { name: `${meal[0].toUpperCase()}${meal.slice(1)} meal`, price: this.getEffectiveMealPrice(meal, date) };
    const item = this.guestItems.find(i => i.id === itemId);
    if (!item) throw new Error('That item is no longer on the price list.');
    return { name: item.name, price: item.price };
  }

  addTokenEntry(data: { token_item_id: string; quantity: number; consumer_name: string; date?: string; notes?: string }): TokenEntry {
    if (!data.consumer_name.trim()) throw new Error('Enter who the entry is for.');
    if (!Number.isInteger(data.quantity) || data.quantity <= 0) throw new Error('Quantity must be 1 or more.');
    const date = data.date || getTodayString();
    const { name, price } = this.resolveItem(data.token_item_id, date);
    const entry: TokenEntry = {
      id: newId(),
      token_item_id: data.token_item_id,
      token_item_name: name,
      quantity: data.quantity,
      unit_price: price,
      total_price: price * data.quantity,
      consumer_name: data.consumer_name.trim(),
      date,
      notes: data.notes?.trim() || undefined,
      created_at: new Date().toISOString()
    };
    this.ledger.unshift(entry);
    this.commit();
    this.enqueue({ t: 'upsert', table: 'guest_ledger', rows: [ledgerRow(entry)] });
    return entry;
  }

  updateTokenEntry(id: string, updates: Partial<TokenEntry>): TokenEntry {
    const idx = this.ledger.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Entry not found.');
    const current = this.ledger[idx];
    const qty = updates.quantity ?? current.quantity;
    if (!Number.isInteger(qty) || qty <= 0) throw new Error('Quantity must be 1 or more.');
    let name = current.token_item_name;
    let price = current.unit_price;
    if (updates.token_item_id && updates.token_item_id !== current.token_item_id) {
      const resolved = this.resolveItem(updates.token_item_id, updates.date || current.date);
      name = resolved.name;
      price = resolved.price;
    }
    const updated: TokenEntry = {
      ...current,
      ...updates,
      id,
      consumer_name: (updates.consumer_name ?? current.consumer_name).trim(),
      token_item_name: name,
      quantity: qty,
      unit_price: price,
      total_price: qty * price
    };
    this.ledger[idx] = updated;
    this.commit();
    this.enqueue({ t: 'upsert', table: 'guest_ledger', rows: [ledgerRow(updated)] });
    return updated;
  }

  deleteTokenEntry(id: string): TokenEntry | undefined {
    const entry = this.ledger.find(e => e.id === id);
    this.ledger = this.ledger.filter(e => e.id !== id);
    this.commit();
    this.enqueue({ t: 'delete', table: 'guest_ledger', match: { id } });
    return entry;
  }

  /** Put back a deleted entry (undo). */
  restoreTokenEntry(entry: TokenEntry) {
    if (this.ledger.some(e => e.id === entry.id)) return;
    this.ledger.unshift(entry);
    this.commit();
    this.enqueue({ t: 'upsert', table: 'guest_ledger', rows: [ledgerRow(entry)] });
  }

  /** Guest names, most recently used first. */
  getGuestNames(): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    this.getTokenEntries().forEach(e => {
      const k = e.consumer_name.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(e.consumer_name);
      }
    });
    return out;
  }

  /** Per-guest totals. Optional YYYY-MM or YYYY-MM-DD prefix. */
  getGuestSummaries(filter?: string): GuestSummary[] {
    const map = new Map<string, GuestSummary & { itemMap: Map<string, { quantity: number; amount: number }> }>();
    this.getTokenEntries(filter).forEach(e => {
      const key = e.consumer_name.toLowerCase();
      let g = map.get(key);
      if (!g) {
        g = { guest_name: e.consumer_name, total_entries: 0, total_amount: 0, latest_date: e.date, items_consumed: [], itemMap: new Map() };
        map.set(key, g);
      }
      g.total_entries++;
      g.total_amount += e.total_price;
      if (e.date > g.latest_date) g.latest_date = e.date;
      const itemName = e.token_item_name || 'Item';
      const it = g.itemMap.get(itemName) || { quantity: 0, amount: 0 };
      it.quantity += e.quantity;
      it.amount += e.total_price;
      g.itemMap.set(itemName, it);
    });
    return Array.from(map.values())
      .map(({ itemMap, ...g }) => ({
        ...g,
        items_consumed: Array.from(itemMap.entries()).map(([item_name, v]) => ({ item_name, ...v }))
      }))
      .sort((a, b) => b.total_amount - a.total_amount);
  }

  // =========================================================================
  // MONTHLY BILLS (formula from "W HOSTEL BILLS 2026.xlsx")
  // =========================================================================

  getDefaultMonthAmount(): number {
    return this.monthAmount;
  }

  setDefaultMonthAmount(amount: number) {
    if (!(amount > 0)) return;
    this.monthAmount = amount;
    this.commit();
  }

  getFinalizedSnapshot(year: number, month: number): MonthlyBillSnapshot | undefined {
    return this.snapshots[monthKey(year, month)];
  }

  /**
   * Absent day = a recorded day on which the student ate nothing.
   * Days nobody recorded are not counted against anyone.
   */
  getMonthlyHostelBills(year: number, month: number, customMonthAmount?: number): MonthlyBillSnapshot {
    const key = monthKey(year, month);
    if (this.snapshots[key]) return this.snapshots[key];

    const amount = customMonthAmount ?? this.monthAmount;
    const runningDays = getDaysInMonth(year, month);
    const recorded = this.getRecordedDays(year, month).map(d => this.days[d]);
    const rows: MonthlyHostelBillRow[] = [];
    let totalPayable = 0;

    this.getActiveStudents().forEach((st, idx) => {
      let absentDays = 0;
      let b = 0, l = 0, d = 0;
      recorded.forEach(day => {
        const mask = day.away[st.id] ?? ALL_MEALS;
        if (mask === 0) absentDays++;
        if (mask & 1) b++;
        if (mask & 2) l++;
        if (mask & 4) d++;
      });

      const allAbsent = absentDays === runningDays;
      const deductDays = !allAbsent && absentDays >= 10 ? Math.floor(absentDays / 2) : 0;
      let eligibleDays: number;
      if (allAbsent) eligibleDays = 0;
      else if (absentDays < 10) eligibleDays = runningDays - absentDays;
      else eligibleDays = runningDays - deductDays;

      let deduction = 0;
      if (allAbsent) deduction = amount;
      else if (deductDays >= 1) deduction = Math.round((amount / runningDays) * deductDays * 100) / 100;

      const payable = Math.max(0, Math.round((amount - deduction) * 100) / 100);
      totalPayable += payable;

      rows.push({
        s_no: idx + 1,
        student: st,
        roll_number: st.roll_number,
        name: st.name,
        gender: st.gender || 'F',
        month_amount: amount,
        running_days: runningDays,
        absent_days: absentDays,
        deduct_days: deductDays,
        eligible_days: eligibleDays,
        deduction_amount: deduction,
        payable_amount: payable,
        breakfast_count: b,
        lunch_count: l,
        dinner_count: d
      });
    });

    return {
      id: `bill-${key}`,
      year,
      month,
      month_name: getMonthName(month),
      month_amount: amount,
      running_days: runningDays,
      total_students: rows.length,
      total_payable: Math.round(totalPayable * 100) / 100,
      is_finalized: false,
      rows,
      created_at: new Date().toISOString()
    };
  }

  finalizeMonthlyBill(year: number, month: number, customMonthAmount?: number): MonthlyBillSnapshot {
    const key = monthKey(year, month);
    const bill = { ...this.getMonthlyHostelBills(year, month, customMonthAmount) };
    bill.is_finalized = true;
    bill.finalized_at = new Date().toISOString();
    this.snapshots[key] = bill;
    this.commit();
    this.enqueue({ t: 'bill', snapshot: bill });
    return bill;
  }

  getTokenMonthlyReport(year: number, month: number): TokenMonthlyReportRow[] {
    const entries = this.getTokenEntries(monthKey(year, month));
    const map = new Map<string, TokenMonthlyReportRow>();
    this.guestItems.forEach(item =>
      map.set(item.id, {
        token_item_id: item.id,
        item_name: item.name,
        unit_price: item.price,
        total_quantity: 0,
        total_amount: 0,
        daily_breakdown: {}
      })
    );
    entries.forEach(e => {
      let row = map.get(e.token_item_id);
      if (!row) {
        row = {
          token_item_id: e.token_item_id,
          item_name: e.token_item_name || 'Item',
          unit_price: e.unit_price,
          total_quantity: 0,
          total_amount: 0,
          daily_breakdown: {}
        };
        map.set(e.token_item_id, row);
      }
      row.total_quantity += e.quantity;
      row.total_amount += e.total_price;
      const day = row.daily_breakdown[e.date] || { quantity: 0, amount: 0 };
      day.quantity += e.quantity;
      day.amount += e.total_price;
      row.daily_breakdown[e.date] = day;
    });
    return Array.from(map.values());
  }
}

// ---------------------------------------------------------------------------
// v3 -> v4 migration (attendance rows -> compact day records)
// ---------------------------------------------------------------------------

function migrateLegacy(old: any): Partial<PersistedState> {
  const days: Record<string, DayRecord> = {};
  const masks: Record<string, Record<string, MealMask>> = {};
  (old.attendance || []).forEach((a: any) => {
    if (!days[a.date]) {
      days[a.date] = { recordedAt: a.created_at || new Date().toISOString(), away: {} };
      masks[a.date] = {};
    }
    const m = masks[a.date][a.student_id] ?? ALL_MEALS;
    masks[a.date][a.student_id] = a.status === 'absent' ? m & ~MEAL_BITS[a.meal_type as MealType] : m;
  });
  Object.entries(masks).forEach(([date, byStudent]) =>
    Object.entries(byStudent).forEach(([sid, mask]) => {
      if (mask !== ALL_MEALS) days[date].away[sid] = mask;
    })
  );
  return {
    students: old.students,
    mealPrices: old.mealPrices,
    guestItems: old.tokenItems,
    ledger: old.tokenEntries,
    snapshots: old.finalizedSnapshots || {},
    days
  };
}

export const localDb = new MessStore();
export type { MessStore };

