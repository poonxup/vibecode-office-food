-- =====================================================================
-- 001_us101_menu_schema.sql  |  US-101 (req v1.1)  |  App v1.0.0
-- โครงสร้างข้อมูลเมนูอาหาร Office Food Ordering
--   - public.menu_items            : ตารางเมนู (ใช้จริงใน US-101)
--   - public.categories            : หมวดหมู่ (เตรียมไว้สำหรับอนาคต)
--   - public.menu_item_categories  : ตารางเชื่อม Many-to-Many เมนู <-> หมวดหมู่ (อนาคต)
-- หมายเหตุ: UI ของ US-101 ใช้คอลัมน์ menu_items.category (ข้อความ) เท่านั้น
-- =====================================================================

-- ---------- ฟังก์ชันอัปเดต updated_at อัตโนมัติ ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
comment on function public.set_updated_at() is
  'Trigger function: ตั้งค่า updated_at = เวลาปัจจุบัน ทุกครั้งที่มีการแก้ไขแถว (UPDATE)';

-- ---------- 1) menu_items ----------
create table if not exists public.menu_items (
  id            integer primary key,
  name          text    not null,
  price         numeric(10,2) not null check (price > 0),
  category      text,
  image_url     text,
  is_available  boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.menu_items is
  'เมนูอาหารที่แสดงให้พนักงานเลือก (US-101). หน้าเว็บแสดงเฉพาะแถวที่ is_available = true เรียงตาม sort_order แล้วตาม id. แก้ไข/เพิ่มเมนูได้ที่ตารางนี้โดยตรง (หน้าเว็บอ่านอย่างเดียว)';
comment on column public.menu_items.id is
  'รหัสเมนู (Primary Key, จำนวนเต็ม) กำหนดเองได้ ห้ามซ้ำ';
comment on column public.menu_items.name is
  'ชื่อเมนูที่แสดงบนหน้าเว็บ (บังคับกรอก)';
comment on column public.menu_items.price is
  'ราคาต่อหน่วย หน่วยเป็นบาท ทศนิยมได้ 2 ตำแหน่ง. เงื่อนไข: ต้องมากกว่า 0 (CHECK price > 0) ถ้าใส่ 0 หรือติดลบฐานข้อมูลจะปฏิเสธ';
comment on column public.menu_items.category is
  'หมวดหมู่แบบข้อความ (ไม่บังคับ) เช่น ข้าว, เส้น, อีสาน, เครื่องดื่ม. US-101 แสดงค่านี้บนการ์ดเมนู. ในอนาคตจะใช้ตาราง categories + menu_item_categories แทน (1 เมนูอยู่ได้หลายหมวด)';
comment on column public.menu_items.image_url is
  'URL รูปภาพเมนู (ไม่บังคับ). ถ้าว่างหรือโหลดรูปไม่ได้ หน้าเว็บจะแสดงไอคอนแทน';
comment on column public.menu_items.is_available is
  'สถานะการขาย: true = มีขาย (แสดงบนหน้าเว็บ ให้เลือกได้), false = หมด/งดขาย (ไม่แสดงบนหน้าเว็บ). ค่าเริ่มต้น true';
comment on column public.menu_items.sort_order is
  'ลำดับการแสดงผล ค่าน้อยแสดงก่อน (ถ้าเท่ากันเรียงตาม id). ค่าเริ่มต้น 0';
comment on column public.menu_items.created_at is
  'วันเวลาที่สร้างแถว (ตั้งอัตโนมัติ)';
comment on column public.menu_items.updated_at is
  'วันเวลาที่แก้ไขล่าสุด (trigger set_updated_at อัปเดตให้อัตโนมัติ)';

drop trigger if exists trg_menu_items_updated_at on public.menu_items;
create trigger trg_menu_items_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create index if not exists idx_menu_items_available_sort
  on public.menu_items (is_available, sort_order, id);

-- ---------- 2) categories (อนาคต) ----------
create table if not exists public.categories (
  id          serial primary key,
  code        text not null unique,
  name        text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.categories is
  'หมวดหมู่เมนู (เตรียมไว้สำหรับ Story ในอนาคต เช่น กรองตามหมวด). US-101 ยังไม่ใช้ในหน้าเว็บ';
comment on column public.categories.id is 'รหัสหมวดหมู่ (Primary Key, รันอัตโนมัติ)';
comment on column public.categories.code is 'รหัสย่อภาษาอังกฤษ ห้ามซ้ำ เช่น rice, noodle, isan, drink';
comment on column public.categories.name is 'ชื่อหมวดหมู่ที่แสดง เช่น ข้าว, เส้น';
comment on column public.categories.sort_order is 'ลำดับการแสดงผล ค่าน้อยแสดงก่อน';
comment on column public.categories.is_active is
  'สถานะหมวดหมู่: true = ใช้งาน (แสดง), false = ปิดใช้งาน (ซ่อน). ค่าเริ่มต้น true';
comment on column public.categories.created_at is 'วันเวลาที่สร้างแถว';
comment on column public.categories.updated_at is 'วันเวลาที่แก้ไขล่าสุด (อัปเดตอัตโนมัติ)';

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------- 3) menu_item_categories (ตารางเชื่อม M:N, อนาคต) ----------
create table if not exists public.menu_item_categories (
  menu_item_id  integer not null references public.menu_items(id) on delete cascade,
  category_id   integer not null references public.categories(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (menu_item_id, category_id)
);
comment on table public.menu_item_categories is
  'ตารางเชื่อม Many-to-Many: 1 เมนูอยู่ได้หลายหมวดหมู่ และ 1 หมวดหมู่มีได้หลายเมนู. 1 แถว = เมนูนี้อยู่ในหมวดนี้. ลบเมนูหรือหมวดหมู่แล้วแถวเชื่อมถูกลบตาม (ON DELETE CASCADE). US-101 ยังไม่ใช้';
comment on column public.menu_item_categories.menu_item_id is 'อ้างอิง menu_items.id (ลบเมนู -> ลบแถวนี้ด้วย)';
comment on column public.menu_item_categories.category_id is 'อ้างอิง categories.id (ลบหมวด -> ลบแถวนี้ด้วย)';
comment on column public.menu_item_categories.created_at is 'วันเวลาที่ผูกเมนูกับหมวดหมู่';

create index if not exists idx_menu_item_categories_category
  on public.menu_item_categories (category_id);

-- ---------- RLS: อ่านอย่างเดียวสำหรับ anon / authenticated ----------
alter table public.menu_items           enable row level security;
alter table public.categories           enable row level security;
alter table public.menu_item_categories enable row level security;

drop policy if exists "menu_items_read" on public.menu_items;
create policy "menu_items_read" on public.menu_items
  for select to anon, authenticated using (true);

drop policy if exists "categories_read" on public.categories;
create policy "categories_read" on public.categories
  for select to anon, authenticated using (true);

drop policy if exists "menu_item_categories_read" on public.menu_item_categories;
create policy "menu_item_categories_read" on public.menu_item_categories
  for select to anon, authenticated using (true);
-- ไม่มี policy สำหรับ INSERT/UPDATE/DELETE => หน้าเว็บ (publishable key) แก้ข้อมูลไม่ได้
-- การเพิ่ม/แก้เมนู ทำผ่าน Supabase Dashboard (Table Editor) หรือ SQL Editor
