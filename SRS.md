# 📋 Software Requirements Specification (SRS)

## Document Control
* **Project Name**: College Canteen & Hostel Mess Management System (MMS)
* **Client / Domain**: Educational Institution Canteen & Hostel Administration (Avanthi Institute Specification)
* **Author / Developer**: NYTLabs Engineering Team
* **Version**: 1.0.0
* **Date**: September 2026

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) document defines the complete functional, non-functional, and technical requirements for the **College Canteen & Hostel Mess Management System (MMS)**. It serves as the authoritative specification for developers, database administrators, and institutional stakeholders.

### 1.2 Scope
The MMS software is an end-to-end web platform designed to automate:
1. Daily student mess attendance tracking (Breakfast, Lunch, Dinner).
2. Guest ledger entry and token billing.
3. Meal pricing & guest item cost management.
4. Student master directory management with bulk seed importing.
5. Monthly hostel bill generation and deduction calculations.
6. Counter in-charge quick verification & student self-service kiosks.
7. Real-time synchronization with Supabase cloud database.

---

## 2. Overall Description

### 2.1 User Interfaces & Navigation
The application features a modern, responsive interface built with Tailwind CSS. Navigation is streamlined into two core sections on the sidebar:
1. **Daily Attendance**
2. **Guest Ledger**
3. **Cost Management**

Additional administrative utility modules include **Dashboard**, **Student Master**, **Monthly Bills**, **Reports**, **In-Charge Quick Scanner**, and **Student Self-Portal**.

### 2.2 User Roles & Authorization

| Role | Access Level | Responsibilities |
| :--- | :--- | :--- |
| **System Admin** | Full Access | Manage attendance, guest ledger, meal prices, student seed records, finalize monthly bills, export excel registers. |
| **Mess In-Charge** | Counter Scanner | Quick student roll number lookup and instant meal marking on the counter. |
| **Student Kiosk** | Self-Service | Check daily mess status and self-mark meal attendance. |

---

## 3. Functional Requirements

### FR-1: Daily Attendance Management
* **FR-1.1**: The system shall allow the admin to manage attendance for today's date or any historical date selected via a date picker.
* **FR-1.2**: By default, **Breakfast**, **Lunch**, and **Dinner** shall be selected (`Present`) for all active students upon initializing attendance for a new date.
* **FR-1.3**: The admin shall be able to customize meal status (`Breakfast`, `Lunch`, `Dinner`) individually per student.
* **FR-1.4**: The system shall support a **Copy Previous Day** feature to duplicate the most recent attendance record into today's roster.
* **FR-1.5**: Saving or modifying attendance records shall trigger an animated Toast notification (`success`, `info`, or `error`).

### FR-2: Guest Ledger & Token System
* **FR-2.1**: The system shall enable recording guest token transactions including consumer name, token item, quantity, date, unit price, and total price.
* **FR-2.2**: The guest ledger shall support standard token items (e.g., Tea, Coffee, Snack Box, VIP Lunch Thali) as well as regular student meal tokens (Breakfast Meal, Lunch Meal, Dinner Meal).
* **FR-2.3**: The system shall calculate total price dynamically: $\text{Total Price} = \text{Unit Price} \times \text{Quantity}$.
* **FR-2.4**: The system shall provide consumer-grouped summaries listing total billable amounts per department or guest group.

### FR-3: Cost Management
* **FR-3.1**: The system shall allow updating prices for standard meals (**Breakfast**, **Lunch**, **Dinner**) with effective start dates.
* **FR-3.2**: The system shall support creating new guest items (e.g., `Sp Dinner` - ₹70), updating item prices, and toggling item status (`active` / `inactive`).
* **FR-3.3**: All cost modifications shall immediately reflect in the Guest Ledger item selector and persist to the Supabase `guest_items` and `meal_costs` database tables.

### FR-4: Student Master & Seed Data System
* **FR-4.1**: The system shall store student records with fields: `id`, `roll_number`, `name`, `gender`, `department`, `year`, `course`, `status`, `joined_at`.
* **FR-4.2**: The system shall seed 393 hostel students pre-extracted from the official dataset (`W HOSTEL BILLS 2026.xlsx`).
* **FR-4.3**: The system shall support bulk import via JSON or CSV files with roll number uniqueness enforcement.
* **FR-4.4**: The system shall allow searching by roll number/name and filtering by department, year, gender, and status.

### FR-5: Monthly Billing Engine
* **FR-5.1**: The system shall calculate monthly mess bills for a selected year and month based on total running days in the month.
* **FR-5.2**: The billing calculation shall apply the official hostel formula:
  $$\text{Deduct Days} = \max(0, \text{Absent Days} - \text{Allowed Days})$$
  $$\text{Deduction Amount} = \frac{\text{Month Amount}}{\text{Running Days}} \times \text{Deduct Days}$$
  $$\text{Payable Amount} = \text{Month Amount} - \text{Deduction Amount}$$
* **FR-5.3**: The system shall support finalization of monthly bill snapshots to lock billing records.
* **FR-5.4**: The system shall export monthly billing reports to Microsoft Excel (`.xlsx`) matching the official institute register layout.

### FR-6: In-Charge Scanner & Student Self-Portal
* **FR-6.1**: The In-Charge portal shall allow searching students by typing or scanning partial roll numbers and displaying today's meal status.
* **FR-6.2**: The Student Self-Portal shall allow students to enter their roll number and mark meal presence for the day.

### FR-7: Admin Authentication
* **FR-7.1**: Admin login shall authenticate via username/password against the auth backend service.
* **FR-7.2**: Passwords shall not be exposed in frontend assets.

### FR-8: Supabase Cloud Database Integration
* **FR-8.1**: The system shall store persistent data in Supabase PostgreSQL tables: `students`, `meal_costs`, `daily_attendance`, `guest_items`, `guest_ledger`, `monthly_bills`, `monthly_bill_details`.
* **FR-8.2**: The system shall fall back gracefully to local storage in case of temporary network disruption.

---

## 4. Database Schema Specification

### 4.1 Table Definitions (DDL Summary)

#### `public.students`
* `id`: UUID (Primary Key)
* `roll_number`: VARCHAR(50) UNIQUE NOT NULL
* `name`: VARCHAR(255) NOT NULL
* `gender`: VARCHAR(10) DEFAULT 'F'
* `department`: VARCHAR(100) NOT NULL
* `year`: VARCHAR(50) NOT NULL
* `course`: VARCHAR(50) DEFAULT 'B.Tech'
* `status`: VARCHAR(20) DEFAULT 'active'
* `joined_at`: DATE

#### `public.meal_costs`
* `id`: UUID (Primary Key)
* `meal_type`: VARCHAR(20) CHECK (`breakfast`, `lunch`, `dinner`)
* `price`: DECIMAL(10,2) NOT NULL
* `effective_from`: DATE NOT NULL

#### `public.daily_attendance`
* `id`: UUID (Primary Key)
* `student_id`: UUID Foreign Key -> `students(id)`
* `date`: DATE NOT NULL
* `meal_type`: VARCHAR(20) CHECK (`breakfast`, `lunch`, `dinner`)
* `status`: VARCHAR(20) CHECK (`present`, `absent`)
* `marked_by`: VARCHAR(100)

#### `public.guest_items`
* `id`: UUID (Primary Key)
* `name`: VARCHAR(150) NOT NULL
* `price`: DECIMAL(10,2) NOT NULL
* `effective_from`: DATE NOT NULL
* `status`: VARCHAR(20) DEFAULT 'active'

#### `public.guest_ledger`
* `id`: UUID (Primary Key)
* `guest_item_id`: VARCHAR(100)
* `token_item_name`: VARCHAR(150) NOT NULL
* `quantity`: INTEGER NOT NULL
* `unit_price`: DECIMAL(10,2) NOT NULL
* `total_price`: DECIMAL(10,2) NOT NULL
* `consumer_name`: VARCHAR(255) NOT NULL
* `date`: DATE NOT NULL

---

## 5. Non-Functional Requirements

### 5.1 Performance
* **Page Load Time**: Initial load within < 1.5 seconds.
* **Filter & Search**: Client-side filtering shall execute in < 50ms across 500+ records.
* **Excel Export**: Monthly register Excel file generation shall execute in < 2 seconds.

### 5.2 Security
* All API requests to Supabase utilize HTTPS with standard Anon key header authentication.
* Sensitive environment variables are excluded from version control via `.gitignore`.

### 5.3 Reliability & Availability
* Local memory and `localStorage` cache ensure complete feature availability even during transient connection drops.

---

## 6. Verification & Validation
* All pages compile with 0 TypeScript warnings/errors (`npx tsc --noEmit`).
* Production build verified via Next.js compiler (`npm run build`).
* Supabase database schema verified and seeded with 393 active student records.
