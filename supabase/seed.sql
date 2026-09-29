-- =======================================================
-- OPTIONAL SEED DATA (run after schema.sql)
-- The student roster is uploaded by the app on first sync from
-- supabase/students_seed.json, so it is not repeated here.
-- =======================================================

INSERT INTO public.meal_costs (meal_type, price, effective_from) VALUES
('breakfast', 30.00, '2026-01-01'),
('lunch', 50.00, '2026-01-01'),
('dinner', 40.00, '2026-01-01')
ON CONFLICT DO NOTHING;

INSERT INTO public.guest_items (name, price, effective_from, status) VALUES
('Tea', 10.00, '2026-01-01', 'active'),
('Coffee', 15.00, '2026-01-01', 'active'),
('Extra Chapati', 5.00, '2026-01-01', 'active'),
('Milk', 20.00, '2026-01-01', 'active'),
('Snack Box', 40.00, '2026-01-01', 'active'),
('VIP Guest Lunch Thali', 120.00, '2026-01-01', 'active')
ON CONFLICT DO NOTHING;
