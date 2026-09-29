-- =======================================================
-- SEED DATA FOR COLLEGE MESS MANAGEMENT SYSTEM
-- =======================================================

-- 1. SEED MEAL PRICES WITH HISTORICAL EFFECTIVE DATES
INSERT INTO public.meal_prices (meal_type, price, effective_from) VALUES
('breakfast', 35.00, '2026-01-01'),
('lunch', 65.00, '2026-01-01'),
('dinner', 55.00, '2026-01-01')
ON CONFLICT DO NOTHING;

-- 2. SEED TOKEN ITEMS
INSERT INTO public.token_items (name, price, effective_from, status) VALUES
('Special Tea / Coffee', 15.00, '2026-01-01', 'active'),
('Snack Box (Samosa + Muffin)', 40.00, '2026-01-01', 'active'),
('VIP Guest Lunch Thali', 120.00, '2026-01-01', 'active'),
('Evening Mineral Water (20L)', 70.00, '2026-01-01', 'active'),
('CRT Team Breakfast Coupon', 45.00, '2026-01-01', 'active')
ON CONFLICT DO NOTHING;

-- 3. SEED STUDENTS (REALISTIC COLLEGE DATABASE)
INSERT INTO public.students (roll_number, name, department, year, course, contact, status, joined_at) VALUES
('21CSE001', 'Aarav Sharma', 'Computer Science', '4th Year', 'B.Tech', '+91 9876543210', 'active', '2026-01-01'),
('21CSE002', 'Ananya Verma', 'Computer Science', '4th Year', 'B.Tech', '+91 9876543211', 'active', '2026-01-01'),
('22ECE015', 'Rohan Gupta', 'Electronics & Comm.', '3rd Year', 'B.Tech', '+91 9876543212', 'active', '2026-01-01'),
('22ECE018', 'Priya Patel', 'Electronics & Comm.', '3rd Year', 'B.Tech', '+91 9876543213', 'active', '2026-01-01'),
('23MECH005', 'Vikram Singh', 'Mechanical Engg.', '2nd Year', 'B.Tech', '+91 9876543214', 'active', '2026-01-01'),
('23MECH009', 'Sneha Reddy', 'Mechanical Engg.', '2nd Year', 'B.Tech', '+91 9876543215', 'active', '2026-01-01'),
('24CIVIL003', 'Rahul Nair', 'Civil Engg.', '1st Year', 'B.Tech', '+91 9876543216', 'active', '2026-01-10'),
('24CIVIL007', 'Kavya Joshi', 'Civil Engg.', '1st Year', 'B.Tech', '+91 9876543217', 'active', '2026-01-10'),
('23IT042', 'Aditya Kumar', 'Information Tech.', '2nd Year', 'B.Tech', '+91 9876543218', 'active', '2026-01-01'),
('22EEE011', 'Meera Deshmukh', 'Electrical Engg.', '3rd Year', 'B.Tech', '+91 9876543219', 'active', '2026-01-01'),
('21CSE088', 'Siddharth Rao', 'Computer Science', '4th Year', 'B.Tech', '+91 9876543220', 'inactive', '2026-01-01'),
('24MCA005', 'Divya Iyer', 'Computer Applications', '1st Year', 'MCA', '+91 9876543221', 'active', '2026-01-15')
ON CONFLICT DO NOTHING;
