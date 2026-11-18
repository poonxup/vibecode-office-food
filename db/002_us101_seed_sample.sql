-- =====================================================================
-- 002_us101_seed_sample.sql  |  US-101  |  ข้อมูลตัวอย่าง (ทางเลือก)
-- สถานะ: ส่วน "categories" ถูก apply แล้วใน Supabase (migration us101_seed_categories)
--        ส่วน "menu_items" ยังไม่ถูก apply โดยตั้งใจ เพราะ 203 Tester จะ import Mock Data
--        ของตัวเอง (Design/data/menu_items.csv/.json, 12 แถว) และ AC1 เทียบกับข้อมูลนั้น
--        ใช้ส่วน menu_items นี้เฉพาะเมื่อต้องการข้อมูลตัวอย่างในเครื่อง/สภาพแวดล้อมอื่น
-- =====================================================================

-- หมวดหมู่ตัวอย่าง (APPLIED)
insert into public.categories (code, name, sort_order) values
  ('rice',   'ข้าว',        1),
  ('noodle', 'เส้น',        2),
  ('isan',   'อีสาน',       3),
  ('drink',  'เครื่องดื่ม', 4)
on conflict (code) do nothing;

-- เมนูตัวอย่าง 6 รายการ (NOT APPLIED ใน Production — ดูหมายเหตุด้านบน)
-- id 6 ตั้ง is_available = false เพื่อแสดงว่าเมนูหมดจะไม่แสดงบนหน้าเว็บ
insert into public.menu_items (id, name, price, category, image_url, is_available, sort_order) values
  (1, 'ข้าวกะเพราหมูสับไข่ดาว', 55.00, 'ข้าว',        null, true,  1),
  (2, 'ข้าวผัดกุ้ง',            65.00, 'ข้าว',        null, true,  2),
  (3, 'ผัดไทยกุ้งสด',           70.00, 'เส้น',        null, true,  3),
  (4, 'ส้มตำไทย',               45.50, 'อีสาน',       null, true,  4),
  (5, 'ชาไทยเย็น',              35.00, 'เครื่องดื่ม', null, true,  5),
  (6, 'ต้มยำกุ้ง (หมด)',        150.00,'อีสาน',       null, false, 6)
on conflict (id) do nothing;
