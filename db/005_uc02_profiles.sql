-- =====================================================================
-- 005_uc02_profiles.sql  |  UC02  |  App v1.1.0
-- ตารางโปรไฟล์ผู้ใช้สำหรับเข้าสู่ระบบ (Social Login / Email+Password)
--   - public.profiles.id อ้างอิง auth.users(id) ลบผู้ใช้แล้วแถวโปรไฟล์ถูกลบตาม (CASCADE)
--   - เตรียมให้ UC03 ใช้: orders.user_id จะเท่ากับ profiles.id = auth.uid()
--     RPC บันทึกออเดอร์จะรับเฉพาะ menu_item_id + qty แล้วใช้ auth.uid() เป็นเจ้าของออเดอร์
--     (ยังไม่สร้างตาราง orders / RPC ในไฟล์นี้)
--   - ไม่แก้ข้อมูลเมนู baseline (menu_items)
-- =====================================================================

-- ---------- ตารางโปรไฟล์ ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email        text,
  created_at   timestamptz not null default now()
);

comment on table public.profiles is
  'โปรไฟล์ผู้ใช้ที่ล็อกอินแล้ว (UC02). id ตรงกับ auth.users.id และ auth.uid(). ใช้เป็นเจ้าของออเดอร์ใน UC03 (orders.user_id). anon อ่าน/เขียนไม่ได้; ผู้ใช้เห็นและแก้ได้เฉพาะแถวของตนเอง (แก้ได้เฉพาะ display_name)';
comment on column public.profiles.id is
  'รหัสผู้ใช้ (PK) อ้างอิง auth.users(id) ON DELETE CASCADE ค่าเดียวกับ auth.uid()';
comment on column public.profiles.display_name is
  'ชื่อที่แสดงบนหน้าเว็บ (คัดลอกจาก metadata ตอนสร้างบัญชี หรือตั้งภายหลังได้โดยเจ้าของแถวเท่านั้น)';
comment on column public.profiles.email is
  'อีเมลจากบัญชีล็อกอิน ซิงก์ตอนสร้างแถว ผู้ใช้ทั่วไปแก้คอลัมน์นี้ผ่าน API ไม่ได้';
comment on column public.profiles.created_at is
  'วันเวลาที่สร้างแถวโปรไฟล์ (ตั้งอัตโนมัติ)';

-- ---------- สิทธิ์ระดับตาราง (defense in depth นอกจาก RLS) ----------
alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

-- ---------- RLS: เห็นและแก้ได้เฉพาะแถวของตนเอง ----------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);
comment on policy "profiles_select_own" on public.profiles is
  'ผู้ใช้ที่ล็อกอินอ่านได้เฉพาะแถวที่ id = auth.uid(); anon ไม่มีสิทธิ์';

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
comment on policy "profiles_update_own" on public.profiles is
  'ผู้ใช้ที่ล็อกอินแก้ได้เฉพาะแถวของตนเอง (สิทธิ์ระดับคอลัมน์จำกัดแค่ display_name)';

-- ไม่มี policy INSERT/DELETE ให้ anon/authenticated
-- การสร้างแถวทำผ่าน trigger ฝั่งเซิร์ฟเวอร์ (security definer) เท่านั้น

-- ---------- สร้างโปรไฟล์อัตโนมัติเมื่อมีผู้ใช้ใหม่ ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Trigger หลังสร้างแถวใน auth.users: สร้างโปรไฟล์ใน public.profiles อัตโนมัติ (UC02). security definer + search_path ว่าง เพื่อไม่ให้เรียกจาก client โดยตรงได้ผลผิด';

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Backfill: บัญชีที่สร้างไว้แล้วก่อนมีตาราง/trigger (user A, user B ของ 203) ----------
insert into public.profiles (id, display_name, email)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    u.raw_user_meta_data ->> 'display_name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.email
from auth.users u
on conflict (id) do nothing;
