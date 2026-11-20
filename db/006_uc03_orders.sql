-- =====================================================================
-- 006_uc03_orders.sql  |  UC03 ประวัติการสั่งซื้อ  |  App v1.2.0
-- ตารางคำสั่งซื้อ + RPC บันทึกคำสั่งซื้อ
--   - public.orders       : หัวบิล (1 แถว = 1 คำสั่งซื้อของผู้ใช้ 1 คน)
--   - public.order_items  : รายการในบิล (M:N ระหว่าง orders กับ menu_items พร้อม snapshot ชื่อ/ราคา)
--   - public.place_order(items jsonb) : ทางเดียวที่บันทึกคำสั่งซื้อได้ (SECURITY DEFINER)
-- หลักการ: client ส่งแค่ menu_item_id + qty ; user_id, ราคา, ยอดรวม DB เป็นคนกำหนดเอง
-- ไม่แก้ menu_items / profiles (baseline US-101: 12 แถว / 10 available / 1,781.25)
-- =====================================================================

-- ---------- 1) orders ----------
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  total       numeric(10,2) not null check (total > 0),
  status      text not null default 'confirmed'
              check (status in ('confirmed', 'preparing', 'completed', 'cancelled'))
);

comment on table public.orders is
  'หัวบิลคำสั่งซื้อ (UC03). 1 แถว = 1 คำสั่งซื้อของผู้ใช้ 1 คน. สร้างได้ทาง RPC public.place_order เท่านั้น (client INSERT/UPDATE/DELETE ตรงไม่ได้). ผู้ใช้อ่านได้เฉพาะแถวที่ user_id = auth.uid() (RLS). anon เข้าไม่ถึง';
comment on column public.orders.id is
  'รหัสคำสั่งซื้อ (UUID สุ่ม, PK) สร้างโดยฐานข้อมูล เดาไม่ได้';
comment on column public.orders.user_id is
  'เจ้าของคำสั่งซื้อ อ้างอิง auth.users(id) ON DELETE CASCADE (ค่าเดียวกับ auth.uid() / profiles.id). RPC ใส่ค่านี้จาก auth.uid() เอง ไม่รับจาก client';
comment on column public.orders.created_at is
  'วันเวลาที่บันทึกคำสั่งซื้อ (timestamptz เก็บเป็น UTC; หน้าเว็บแสดงเป็นเวลา Asia/Bangkok). ใช้เรียงประวัติจากใหม่ไปเก่า';
comment on column public.orders.total is
  'ยอดรวมบิล (บาท, 2 ตำแหน่ง) = ผลรวม order_items.line_total คำนวณโดย RPC จากราคาเมนูจริง ไม่ใช้ค่าจาก client';
comment on column public.orders.status is
  'สถานะคำสั่งซื้อ (UC03-OD1: 202 เสนอชุดค่า ให้ 201 ยืนยัน). confirmed = ยืนยันสั่งซื้อแล้ว (ค่าเริ่มต้น และเป็นค่าเดียวที่ UC03 ใช้); preparing = กำลังเตรียมอาหาร (สำรองอนาคต); completed = ส่งมอบแล้ว (สำรองอนาคต); cancelled = ยกเลิก (สำรองอนาคต). UC03 ยังไม่มี workflow เปลี่ยนสถานะ';

create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);
comment on index public.orders_user_created_idx is
  'เร่งการดึงประวัติของผู้ใช้คนหนึ่ง เรียงใหม่→เก่า';

-- ---------- 2) order_items ----------
create table if not exists public.order_items (
  id                  bigint generated always as identity primary key,
  order_id            uuid not null references public.orders (id) on delete cascade,
  menu_item_id        integer not null references public.menu_items (id) on delete restrict,
  name_snapshot       text not null,
  unit_price_snapshot numeric(10,2) not null check (unit_price_snapshot > 0),
  qty                 integer not null check (qty > 0 and qty <= 99),
  line_total          numeric(10,2) not null,
  constraint order_items_line_total_chk check (line_total = unit_price_snapshot * qty),
  constraint order_items_order_menu_uniq unique (order_id, menu_item_id)
);

comment on table public.order_items is
  'รายการอาหารในบิล (UC03). ความสัมพันธ์ M:N: 1 บิลมีหลายเมนู และ 1 เมนูอยู่ได้หลายบิล. ชื่อและราคาถูก snapshot ณ เวลาสั่ง เปลี่ยนเมนูภายหลังไม่กระทบประวัติ. สร้างผ่าน RPC place_order เท่านั้น. ผู้ใช้อ่านได้เฉพาะรายการของบิลตนเอง (RLS). anon เข้าไม่ถึง';
comment on column public.order_items.id is
  'รหัสแถว (identity) ใช้เรียงรายการในบิลตามลำดับที่บันทึก';
comment on column public.order_items.order_id is
  'บิลที่รายการนี้อยู่ อ้างอิง orders(id) ON DELETE CASCADE';
comment on column public.order_items.menu_item_id is
  'เมนูที่สั่ง อ้างอิง menu_items(id) ON DELETE RESTRICT (เมนูที่เคยถูกสั่งแล้วลบไม่ได้ ให้ตั้ง is_available = false แทน)';
comment on column public.order_items.name_snapshot is
  'ชื่อเมนู ณ เวลาที่สั่ง (คัดลอกจาก menu_items.name โดย RPC)';
comment on column public.order_items.unit_price_snapshot is
  'ราคาต่อหน่วย ณ เวลาที่สั่ง (คัดลอกจาก menu_items.price โดย RPC ไม่ใช้ราคาจาก client)';
comment on column public.order_items.qty is
  'จำนวนที่สั่ง จำนวนเต็ม 1–99 ต่อเมนู';
comment on column public.order_items.line_total is
  'ยอดรวมบรรทัด = unit_price_snapshot x qty (มี CHECK บังคับให้ตรงเสมอ)';

create index if not exists order_items_order_idx
  on public.order_items (order_id);
comment on index public.order_items_order_idx is
  'เร่งการดึงรายการของบิล';
create index if not exists order_items_menu_item_idx
  on public.order_items (menu_item_id);
comment on index public.order_items_menu_item_idx is
  'รองรับ FK menu_item_id และรายงานอนาคต (เมนูขายดี)';

-- ---------- 3) สิทธิ์ระดับตาราง + RLS ----------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.order_items from public, anon, authenticated;
grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
-- ไม่ให้ INSERT/UPDATE/DELETE แก่ anon/authenticated: เขียนผ่าน place_order (SECURITY DEFINER) เท่านั้น

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = (select auth.uid())
    )
  );

-- ---------- 4) RPC: place_order ----------
-- รับ: items = [{"menu_item_id": 1, "qty": 2}, ...]  (ฟิลด์อื่น เช่น price/total/user_id ถูกละเลย)
-- คืน: uuid ของคำสั่งซื้อใหม่
-- ข้อผิดพลาด: SQLSTATE P0001 + DETAIL เป็นรหัส (ให้หน้าเว็บแปลงเป็นข้อความไทยที่เป็นมิตร)
--   UC03_NOT_LOGGED_IN, UC03_EMPTY_CART, UC03_BAD_ITEMS, UC03_BAD_QTY,
--   UC03_ITEM_NOT_FOUND, UC03_ITEM_UNAVAILABLE
create or replace function public.place_order(items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_elem      jsonb;
  v_id_j      jsonb;
  v_qty_j     jsonb;
  v_ids       integer[] := '{}';
  v_qtys      integer[] := '{}';
  v_id_n      numeric;
  v_qty_n     numeric;
  v_i         integer;
  v_pos       integer;
  v_cnt       integer;
  v_order_id  uuid;
  v_total     numeric(10,2);
begin
  if v_uid is null then
    raise exception 'กรุณาเข้าสู่ระบบก่อนยืนยันคำสั่งซื้อ' using errcode = 'P0001', detail = 'UC03_NOT_LOGGED_IN';
  end if;

  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'รูปแบบรายการสั่งซื้อไม่ถูกต้อง' using errcode = 'P0001', detail = 'UC03_BAD_ITEMS';
  end if;
  v_cnt := jsonb_array_length(items);
  if v_cnt = 0 then
    raise exception 'ตะกร้าว่าง กรุณาเลือกเมนูก่อนยืนยันสั่งซื้อ' using errcode = 'P0001', detail = 'UC03_EMPTY_CART';
  end if;
  if v_cnt > 50 then
    raise exception 'รายการสั่งซื้อมากเกินไป' using errcode = 'P0001', detail = 'UC03_BAD_ITEMS';
  end if;

  -- ตรวจรูปแบบทุกบรรทัด (ยอมรับเฉพาะตัวเลขจำนวนเต็ม ไม่รับข้อความ/ทศนิยม/ค่าว่าง) แล้วรวมบรรทัดที่เมนูซ้ำกัน
  for v_elem in select * from jsonb_array_elements(items) loop
    if jsonb_typeof(v_elem) <> 'object' then
      raise exception 'รูปแบบรายการสั่งซื้อไม่ถูกต้อง' using errcode = 'P0001', detail = 'UC03_BAD_ITEMS';
    end if;
    v_id_j  := v_elem -> 'menu_item_id';
    v_qty_j := v_elem -> 'qty';
    if v_id_j is null or jsonb_typeof(v_id_j) <> 'number' then
      raise exception 'รูปแบบรายการสั่งซื้อไม่ถูกต้อง' using errcode = 'P0001', detail = 'UC03_BAD_ITEMS';
    end if;
    if v_qty_j is null or jsonb_typeof(v_qty_j) <> 'number' then
      raise exception 'จำนวนที่สั่งไม่ถูกต้อง' using errcode = 'P0001', detail = 'UC03_BAD_QTY';
    end if;
    v_id_n  := (v_id_j  #>> '{}')::numeric;
    v_qty_n := (v_qty_j #>> '{}')::numeric;
    if v_id_n <> trunc(v_id_n) or v_id_n < 1 or v_id_n > 2147483647 then
      raise exception 'ไม่พบเมนูที่เลือก' using errcode = 'P0001', detail = 'UC03_ITEM_NOT_FOUND';
    end if;
    if v_qty_n <> trunc(v_qty_n) or v_qty_n < 1 or v_qty_n > 99 then
      raise exception 'จำนวนที่สั่งต้องเป็นจำนวนเต็ม 1 ถึง 99' using errcode = 'P0001', detail = 'UC03_BAD_QTY';
    end if;
    v_pos := array_position(v_ids, v_id_n::integer);
    if v_pos is null then
      v_ids  := v_ids  || v_id_n::integer;
      v_qtys := v_qtys || v_qty_n::integer;
    else
      v_qtys[v_pos] := v_qtys[v_pos] + v_qty_n::integer;
      if v_qtys[v_pos] > 99 then
        raise exception 'จำนวนที่สั่งต้องเป็นจำนวนเต็ม 1 ถึง 99' using errcode = 'P0001', detail = 'UC03_BAD_QTY';
      end if;
    end if;
  end loop;

  -- ล็อกแถวเมนูกันราคา/สถานะเปลี่ยนระหว่างทำรายการ แล้วตรวจว่ามีอยู่จริงและพร้อมขายทุกรายการ
  perform 1 from public.menu_items where id = any (v_ids) for share;
  select count(*) into v_cnt from public.menu_items where id = any (v_ids);
  if v_cnt <> coalesce(array_length(v_ids, 1), 0) then
    raise exception 'ไม่พบเมนูที่เลือก' using errcode = 'P0001', detail = 'UC03_ITEM_NOT_FOUND';
  end if;
  if exists (select 1 from public.menu_items where id = any (v_ids) and is_available is not true) then
    raise exception 'มีเมนูที่ไม่พร้อมจำหน่ายในขณะนี้' using errcode = 'P0001', detail = 'UC03_ITEM_UNAVAILABLE';
  end if;

  -- สร้างบิล (ยอดรวมคำนวณจากราคาจริงในฐานข้อมูล)
  select sum(m.price * q.qty) into v_total
  from unnest(v_ids, v_qtys) as q(id, qty)
  join public.menu_items m on m.id = q.id;

  insert into public.orders (user_id, total, status)
  values (v_uid, v_total, 'confirmed')
  returning id into v_order_id;

  insert into public.order_items (order_id, menu_item_id, name_snapshot, unit_price_snapshot, qty, line_total)
  select v_order_id, m.id, m.name, m.price, q.qty, m.price * q.qty
  from unnest(v_ids, v_qtys) with ordinality as q(id, qty, ord)
  join public.menu_items m on m.id = q.id
  order by q.ord;

  return v_order_id;
end;
$$;

comment on function public.place_order(jsonb) is
  'UC03: บันทึกคำสั่งซื้อของผู้ใช้ที่ล็อกอิน (เรียกได้เฉพาะ authenticated). รับ items = [{menu_item_id, qty}] เท่านั้น; user_id = auth.uid(); DB อ่านราคา/ชื่อจาก menu_items แล้ว snapshot + คำนวณ line_total/total เอง; ฟิลด์อื่นที่ client ส่งมา (price, total, user_id) ถูกละเลย; ปฏิเสธตะกร้าว่าง, qty ไม่ใช่จำนวนเต็ม 1-99, เมนูไม่มีจริง, เมนู is_available=false (ทั้งบิลถูกยกเลิก ไม่มีแถวค้าง); คืน uuid ของคำสั่งซื้อ';

revoke all on function public.place_order(jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to authenticated;
