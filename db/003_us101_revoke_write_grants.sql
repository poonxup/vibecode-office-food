-- =====================================================================
-- 003_us101_revoke_write_grants.sql  |  US-101  |  App v1.0.2
-- แก้ไขข้อตรวจพบ S-12 (204 Security Findings v1.0): สิทธิ์ระดับตาราง (defense in depth)
--
-- เหตุผล: ค่าเริ่มต้นของ Supabase ให้ role anon และ authenticated มีสิทธิ์
--   INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ครบทุกตาราง
--   ตอนนี้มีแค่ RLS (policy SELECT อย่างเดียว) เป็นตัวกันชั้นเดียว
--   ถ้าในอนาคตมีคนปิด RLS หรือเพิ่ม policy ผิด ข้อมูลจะถูกแก้ได้ทันที
--   และ TRUNCATE ไม่อยู่ใต้ RLS
-- ผลหลังรัน: anon / authenticated เหลือสิทธิ์ SELECT (อ่าน) อย่างเดียว
--   หน้าเว็บ (publishable key = anon) ยังอ่านเมนูได้ตามเดิม
--   การเพิ่ม/แก้ข้อมูลทำผ่าน Supabase Dashboard / SQL Editor (สิทธิ์เจ้าของ) เท่านั้น
-- ไม่แก้ไขข้อมูลแถวใด ๆ
-- =====================================================================

-- ถอนสิทธิ์เขียน/แก้โครงสร้างที่ไม่จำเป็น (คำสั่งตามรายงาน 204 S-12)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.menu_items, public.categories, public.menu_item_categories FROM anon, authenticated;

-- ยืนยันสิทธิ์อ่านอย่างเดียว (คงไว้ให้หน้าเว็บอ่านเมนูได้; RLS policy SELECT ยังทำงานเหมือนเดิม)
GRANT SELECT ON public.menu_items, public.categories, public.menu_item_categories TO anon, authenticated;

-- ตรวจสอบ (อ่านอย่างเดียว):
-- select grantee, table_name, string_agg(privilege_type, ',') from information_schema.role_table_grants
--  where table_schema='public' and grantee in ('anon','authenticated')
--    and table_name in ('menu_items','categories','menu_item_categories') group by 1,2;
-- ผลที่คาดหวัง: ทุกแถวเหลือ SELECT
