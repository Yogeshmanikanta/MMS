# 🍱 College Hostel & Canteen Mess Management System (MMS)

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-black?style=for-the-badge&logo=vercel)

A comprehensive, state-of-the-art **College & Hostel Canteen Management System** built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL)**. 

Designed specifically for educational institutions (referenced from **Avanthi Institute of Engineering & Technology** specification and *W HOSTEL BILLS 2026* dataset), this platform streamlines daily mess attendance, guest token billing, meal pricing adjustments, student record imports, and monthly hostel bill calculations.

---

## 🌟 Key Modules & Features

### 1. 📅 Daily Attendance Management
* **Today & Historical Tracking**: Manage daily mess attendance for today or any selected past/future date.
* **Smart Default Selection**: By default, **Breakfast, Lunch, and Dinner** are pre-selected (`Present`) for all active students to save administrative time.
* **Custom Meal Overrides**: Admin can toggle individual meals (`Breakfast`, `Lunch`, `Dinner`) for any student with instant status updates.
* **Copy Previous Day**: One-click functionality to copy attendance records from the previous day into today's roster.
* **Toast Feedback**: Real-time animated popup alerts upon saving, copying, or resetting attendance.

### 2. 🧾 Guest Ledger & Token System
* **VIP & Guest Item Billing**: Track food items consumed by guests, staff, or department visitors (e.g., Tea, Coffee, Special Dinner, Snack Box, VIP Lunch Thali).
* **Meal Token Integration**: Option to bill standard student meals (`Breakfast Meal`, `Lunch Meal`, `Dinner Meal`) directly into the Guest Ledger.
* **Consumer-Wise Summaries**: Group ledger records by consumer name (e.g., *Principal Office Guests*, *Exam Cell Visitors*) with total item counts and payable amounts.
* **Add/Edit/Delete**: Full CRUD operations for token entries with real-time price calculation (`Unit Price × Quantity`).

### 3. 💰 Cost Management
* **Meal Pricing Control**: Dynamically adjust rates for standard meals (**Breakfast**, **Lunch**, **Dinner**) with effective start dates.
* **Guest Item Catalog**: Add new items (e.g., `Sp Dinner - ₹70`), edit existing prices, or deactivate outdated menu items.
* **Live Supabase Sync**: Any price change or new menu item added immediately syncs to the Supabase cloud database (`guest_items` and `meal_costs` tables).

### 4. 👥 Student Master & Seed Data System
* **Pre-Seeded Roster**: Comes pre-populated with **395 active female hostel students** extracted directly from the official excel file (`W HOSTEL BILLS 2026.xlsx`).
* **Search & Multi-Filter**: Search by Roll Number or Name; filter by Department (ECE, CSE, EEE, Mechanical, Civil), Academic Year (1st, 2nd, 3rd Year), and Status (Active/Inactive).
* **Bulk JSON & CSV Import**: Import hundreds of student records with automatic roll number deduplication.
* **Status Toggling**: Easily activate or deactivate student mess privileges.

### 5. 📊 Monthly Billing Engine
* **Hostel Bill Calculation**: Automatically calculates monthly bills per student based on total running days in the month, absent days, and deduction formulas.
* **Deduction Formula**:
  $$\text{Deduct Days} = \max(0, \text{Absent Days} - \text{Allowed Days})$$
  $$\text{Payable Amount} = \text{Month Base Amount} - \left( \frac{\text{Month Base Amount}}{\text{Running Days}} \times \text{Deduct Days} \right)$$
* **Snapshot & Finalization**: Freeze monthly billing summaries to prevent accidental retroactive edits.
* **Excel Export**: One-click download of the complete monthly billing register matching the official hostel layout (`W HOSTEL BILLS 2026.xlsx`).

### 6. ⚡ Fast In-Charge Scanner & Student Self-Service Portal
* **In-Charge Quick Scanner**: Fast roll number lookup for mess staff to instantly check mess status and mark meals on the counter.
* **Student Self-Portal**: Dedicated student kiosk screen for self-attendance marking and meal status verification.

### 7. 🔐 Admin Authentication
* Secure Admin Login page matching the portal's light zinc design system.
* Client-side session management with protected route authorization.

### 8. ☁️ Supabase Cloud Integration & Failover Cache
* **PostgreSQL Storage**: Powered by Supabase cloud tables (`students`, `daily_attendance`, `guest_items`, `guest_ledger`, `meal_costs`, `monthly_bills`, `monthly_bill_details`).
* **Offline Resiliency**: In-memory local cache with `localStorage` fallback ensures zero downtime even during intermittent network drops.

---

## 🛠️ Technology Stack

* **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Database**: [Supabase (PostgreSQL)](https://supabase.com/)
* **State & Query Management**: TanStack React Query + LocalDataStore Architecture
* **Icons**: [Lucide React](https://lucide.dev/)
* **Excel Engine**: ExcelJS (Full cell formatting & export)
* **Deployment**: [Vercel](https://vercel.com/)

---

## 📁 Repository Structure

```text
MMS/
├── app/
│   ├── (dashboard)/
│   │   ├── attendance/         # Daily Attendance Page
│   │   ├── cost-management/    # Meal & Guest Item Price Management
│   │   ├── dashboard/          # Metrics & Analytics Dashboard
│   │   ├── guest-ledger/       # Guest Ledger & Token Billing
│   │   ├── in-charge/          # Counter In-Charge Quick Scanner
│   │   ├── monthly-bills/      # Monthly Billing Engine
│   │   ├── reports/            # Exportable Reports & Summaries
│   │   ├── students/           # Student Master Directory & Import
│   │   └── tokens/             # Token History & Items
│   ├── api/auth/               # Authentication Routes
│   ├── login/                  # Admin Login Page
│   ├── student-self/           # Student Self Kiosk
│   ├── globals.css             # Tailwind & Design System Tokens
│   ├── layout.tsx              # Root Layout
│   └── providers.tsx           # Global Providers & Toast Context
├── components/
│   ├── header.tsx              # Portal Top Header
│   ├── sidebar.tsx             # Main Navigation Sidebar
│   ├── toast.tsx               # Reusable Animated Toast Notifications
│   └── footer.tsx              # Footer Component
├── lib/
│   ├── db.ts                   # Unified Data Store & Supabase Sync Engine
│   ├── supabase.ts             # Supabase Client Initialization
│   ├── types.ts                # TypeScript Interfaces & Schemas
│   └── excel-export.ts         # ExcelJS Report Generator
├── supabase/
│   ├── schema.sql              # PostgreSQL DDL Schema Script
│   └── students_seed.json      # 395 Pre-seeded Student Master Records
├── README.md                   # Project Overview & Guide
└── SRS.md                      # Software Requirements Specification
```

---

## 🚀 Getting Started

### Prerequisites
* Node.js v18.0.0 or higher
* npm or yarn
* Supabase Account & Project

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Yogeshmanikanta/MMS.git
   cd MMS
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
   ```

4. **Setup Database Schema in Supabase**:
   - Open your Supabase Dashboard → **SQL Editor**.
   - Copy and run the script from [`supabase/schema.sql`](file:///c:/Users/yoges/NTYLabsProjects/MMS/supabase/schema.sql).

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License & Attribution

Developed for **Avanthi Institute / Canteen & Hostel Mess Management System (MMS)**.  
Built by **NYTLabs**. All rights reserved.
