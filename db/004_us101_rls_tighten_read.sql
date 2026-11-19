-- =====================================================================
-- 004_us101_rls_tighten_read.sql  |  US-101  |  App v1.0.3
-- แก้ข้อตรวจพบของ 204 (US-101_web_security_review_v1.0 / US-101_sqli_test_v1.0)
--   AUTHZ-01 (WSR-12/WSR-32): policy อ่าน menu_items เดิมใช้ using (true)
--     anon อ่านเมนูที่ซ่อน (is_available = false) ได้ผ่าน REST โดยตรง แม้หน้าเว็บจะกรองออก
--     -> บังคับเงื่อนไขฝั่งเซิร์ฟเวอร์: anon/authenticated อ่านได้เฉพาะแถว is_available = true
--   AUTHZ-02 (WSR-13): categories / menu_item_categories ยังไม่ถูกใช้ใน UI ของ US-101
--     -> ลบ policy SELECT และถอนสิทธิ์ SELECT ของ anon/authenticated (REST จะตอบ 401/permission denied)
--     เมื่อมี Story ที่ต้องใช้ M:N ค่อย GRANT SELECT + สร้าง policy ใหม่ (ดู Design/Data_Model.md)
-- คง RLS เปิดไว้ทุกตาราง | ไม่แก้ข้อมูลแถวใด ๆ
-- หมายเหตุ: การเปิด/ปิด is_available ด้วยสิทธิ์เจ้าของ (Dashboard/SQL Editor, เช่น TC-19/TC-20 ของ 203)
--   ยังทำได้ตามปกติ เพราะ policy นี้จำกัดเฉพาะ role anon/authenticated
-- =====================================================================

-- ---------- AUTHZ-01: menu_items อ่านได้เฉพาะเมนูที่มีขาย ----------
drop policy if exists "menu_items_read" on public.menu_items;
create policy "menu_items_read" on public.menu_items
  for select to anon, authenticated
  using (is_available = true);
comment on policy "menu_items_read" on public.menu_items is
  'อ่านอย่างเดียว (anon, authenticated) เฉพาะแถว is_available = true (มีขาย). แถว false (หมด/งดขาย) มองไม่เห็นผ่าน REST — v1.0.3 AUTHZ-01';

-- ---------- AUTHZ-02: ปิดการอ่านตารางที่ US-101 ยังไม่ใช้ ----------
drop policy if exists "categories_read" on public.categories;
drop policy if exists "menu_item_categories_read" on public.menu_item_categories;
revoke select on public.categories, public.menu_item_categories from anon, authenticated;

-- RLS ยังเปิดอยู่ (ยืนยันซ้ำ ไม่มีผลถ้าเปิดอยู่แล้ว)
alter table public.menu_items           enable row level security;
alter table public.categories           enable row level security;
alter table public.menu_item_categories enable row level security;

-- ตรวจสอบ (อ่านอย่างเดียว):
-- select tablename, policyname, roles, cmd, qual from pg_policies where schemaname='public';
--   ผลที่คาดหวัง: เหลือ menu_items_read (qual = (is_available = true)) เท่านั้น
-- select grantee, table_name, privilege_type from information_schema.role_table_grants
--  where table_schema='public' and grantee in ('anon','authenticated');
--   ผลที่คาดหวัง: anon/authenticated มีแค่ SELECT บน menu_items
