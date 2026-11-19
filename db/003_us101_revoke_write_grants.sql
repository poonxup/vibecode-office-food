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

-- ---------------------------------------------------------------------
-- ส่วนที่ 2 (v1.0.2 deploy 2, 2026-11-19) — default privileges สำหรับตารางที่จะสร้างใหม่ในอนาคต
-- apply เป็น migration แยกชื่อ us101_revoke_default_write_privs
-- เหตุผล: ค่าเริ่มต้นของ Supabase ทำให้ตารางใหม่ใน schema public ให้สิทธิ์ arwdDxtm
--   (INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) กับ anon/authenticated อัตโนมัติ
--   คำสั่งนี้ทำให้ตารางใหม่ที่ role postgres สร้าง ได้สิทธิ์ anon/authenticated แค่ SELECT, REFERENCES, TRIGGER, MAINTAIN (rxtm)
--   (ไม่กระทบตารางที่มีอยู่แล้ว และไม่แก้ข้อมูล)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;
-- ผลตรวจ pg_default_acl หลังรัน (role postgres): anon=rxtm/postgres, authenticated=rxtm/postgres  ✔

-- ข้อจำกัด: role supabase_admin เปลี่ยนไม่ได้
--   ลองรัน: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;
--   ผล: ERROR 42501: permission denied to change default privileges
--   (role ที่ใช้รัน migration คือ postgres ซึ่งไม่ใช่ superuser และไม่ได้เป็นสมาชิกของ supabase_admin)
--   ค่าของ supabase_admin ยังเป็น anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin
--   มีผลเฉพาะตารางที่ supabase_admin สร้าง (ระบบ/ส่วนขยายของ Supabase) ไม่ใช่ตารางที่ทีมสร้างผ่าน migration/SQL Editor
--   ถ้าต้องการเปลี่ยน ต้องให้ Supabase support ดำเนินการ
-- แนวปฏิบัติ: ทุกครั้งที่สร้างตารางใหม่ ให้ REVOKE สิทธิ์เขียนจาก anon/authenticated แบบส่วนที่ 1 เสมอ
