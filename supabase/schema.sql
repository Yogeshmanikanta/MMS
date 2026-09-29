-- ============================================================================
-- CANTEEN & HOSTEL MESS MANAGEMENT SYSTEM (MMS) DATABASE SCHEMA
-- Based on Avanthi Institute / W Hostel Bills Specification
-- ============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STUDENTS MASTER TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) DEFAULT 'F',
    department VARCHAR(100) NOT NULL,
    year VARCHAR(50) NOT NULL,
    course VARCHAR(50) DEFAULT 'B.Tech',
    contact VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    joined_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast roll number lookup
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON public.students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- 2. MEAL COSTS (HISTORICAL PRICING TABLE)
CREATE TABLE IF NOT EXISTS public.meal_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_costs_effective ON public.meal_costs(meal_type, effective_from DESC);

-- 3. DAILY ATTENDANCE TABLE (REFERENCES STUDENTS)
CREATE TABLE IF NOT EXISTS public.daily_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent')),
    marked_by VARCHAR(100) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, date, meal_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON public.daily_attendance(date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_student_date ON public.daily_attendance(student_id, date);

-- 4. GUEST LEDGER ITEMS
CREATE TABLE IF NOT EXISTS public.guest_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. GUEST LEDGER ENTRIES
CREATE TABLE IF NOT EXISTS public.guest_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_item_id VARCHAR(100) NOT NULL,
    token_item_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    consumer_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_ledger_consumer ON public.guest_ledger(consumer_name);
CREATE INDEX IF NOT EXISTS idx_guest_ledger_date ON public.guest_ledger(date);

-- 6. MONTHLY BILLS (HEADER / SNAPSHOT TABLE)
CREATE TABLE IF NOT EXISTS public.monthly_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    month_amount DECIMAL(10, 2) DEFAULT 2500.00,
    running_days INTEGER NOT NULL,
    total_students INTEGER DEFAULT 0,
    total_billed_amount DECIMAL(12, 2) DEFAULT 0.00,
    is_finalized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(year, month)
);

-- 7. MONTHLY BILL DETAILS (MATCHING "W HOSTEL BILLS 2026.xlsx")
CREATE TABLE IF NOT EXISTS public.monthly_bill_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monthly_bill_id UUID NOT NULL REFERENCES public.monthly_bills(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    roll_number VARCHAR(50) NOT NULL,
    gender VARCHAR(10) DEFAULT 'F',
    month_amount DECIMAL(10, 2) DEFAULT 2500.00,
    running_days INTEGER NOT NULL,
    absent_days INTEGER DEFAULT 0,
    deduct_days DECIMAL(10, 2) DEFAULT 0.00,
    eligible_days DECIMAL(10, 2) DEFAULT 0.00,
    deduction_amount DECIMAL(10, 2) DEFAULT 0.00,
    payable_amount DECIMAL(10, 2) DEFAULT 0.00,
    breakfast_count INTEGER DEFAULT 0,
    lunch_count INTEGER DEFAULT 0,
    dinner_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(monthly_bill_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_bill_details_bill ON public.monthly_bill_details(monthly_bill_id);
CREATE INDEX IF NOT EXISTS idx_monthly_bill_details_student ON public.monthly_bill_details(student_id);

-- DISABLE ROW LEVEL SECURITY FOR ALL TABLES FOR ANON / CLIENT ACCESS
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_bill_details DISABLE ROW LEVEL SECURITY;

