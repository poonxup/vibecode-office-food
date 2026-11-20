# Data Model — Office Food Ordering (US-101 + UC02)

- เวอร์ชันเอกสาร: 1.1 (App v1.1.0, UC02) | ผู้จัดทำ: 202 Dev | วันที่: 2026-11-21
- Supabase project: `vibecode-office-food` (ref `yhcjsgbffgabsmsybnle`, region ap-southeast-1) | schema: `public` + `auth` (ผู้ใช้)
- ไฟล์ SQL: `db/001_us101_menu_schema.sql` (โครงสร้างเมนู), `db/002_us101_seed_sample.sql` (ข้อมูลตัวอย่าง), `db/003`–`db/004` (สิทธิ์/RLS เมนู), `db/005_uc02_profiles.sql` (โปรไฟล์ผู้ใช้ UC02)

## 1. ภาพรวม (ER Diagram)

```mermaid
erDiagram
    auth_users ||--|| profiles : "มีโปรไฟล์"
    menu_items ||--o{ menu_item_categories : "อยู่ในหมวด"
    categories ||--o{ menu_item_categories : "มีเมนู"
    auth_users {
        uuid id PK
        text email
        timestamptz email_confirmed_at
        jsonb raw_user_meta_data
    }
    profiles {
        uuid id PK_FK
        text display_name
        text email
        timestamptz created_at
    }
    menu_items {
        int id PK
        text name "บังคับ"
        numeric price "บาท > 0"
        text category "ไม่บังคับ (US-101 ใช้)"
        text image_url "ไม่บังคับ"
        bool is_available "default true"
        int sort_order "default 0"
        timestamptz created_at
        timestamptz updated_at
    }
    categories {
        serial id PK
        text code UK
        text name
        int sort_order
        bool is_active
        timestamptz created_at
        timestamptz updated_at
    }
    menu_item_categories {
        int menu_item_id PK,FK
        int category_id PK,FK
        timestamptz created_at
    }
```

ความสัมพันธ์: **menu_items ↔ categories เป็น Many-to-Many** ผ่านตารางเชื่อม `menu_item_categories`
(1 เมนูอยู่ได้หลายหมวด, 1 หมวดมีได้หลายเมนู) — เตรียมไว้สำหรับอนาคต

ความสัมพันธ์เพิ่ม (UC02): **`auth.users` (schema `auth`, จัดการโดย Supabase Auth) 1-1 กับ `public.profiles`** — `profiles.id` อ้างอิง `auth.users.id` และลบตามเมื่อลบบัญชี (ON DELETE CASCADE). ในแผนของ UC03 ตาราง `orders.user_id` จะอ้างอิง `auth.users(id)` ซึ่งมีค่าเดียวกับ `profiles.id` และ `auth.uid()` — ยังไม่สร้างในเวอร์ชันนี้

> **US-101 หน้าเว็บใช้เฉพาะตาราง `menu_items` (รวมคอลัมน์ข้อความ `category`)** ยังไม่อ่าน `categories` / `menu_item_categories`

## 2. ตาราง `menu_items` — เมนูอาหาร (ใช้งานจริง)

| คอลัมน์ | ชนิด | บังคับ | ค่าเริ่มต้น | ความหมาย / เงื่อนไข |
|---|---|---|---|---|
| id | integer (PK) | ✔ | – | รหัสเมนู กำหนดเอง ห้ามซ้ำ |
| name | text | ✔ | – | ชื่อเมนูที่แสดง |
| price | numeric(10,2) | ✔ | – | ราคาต่อหน่วย (บาท) ทศนิยม 2 ตำแหน่ง **ต้อง > 0** (CHECK) ใส่ 0/ติดลบจะถูกปฏิเสธ |
| category | text | – | null | หมวดแบบข้อความ เช่น ข้าว, เส้น แสดงบนการ์ดเมนู |
| image_url | text | – | null | URL รูปภาพ ว่าง/โหลดไม่ได้ → แสดงไอคอน 🍱 แทน |
| is_available | boolean | ✔ | true | **สถานะ:** `true` = มีขาย → แสดง ให้เลือกได้ / `false` = หมด/งดขาย → **ไม่แสดง** |
| sort_order | integer | ✔ | 0 | ลำดับแสดง ค่าน้อยแสดงก่อน (เท่ากันเรียงตาม id) |
| created_at | timestamptz | ✔ | now() | เวลาสร้างแถว |
| updated_at | timestamptz | ✔ | now() | เวลาแก้ไขล่าสุด (trigger `set_updated_at` อัปเดตอัตโนมัติ) |

หน้าเว็บดึงข้อมูลด้วย: `is_available = true` เรียง `sort_order asc, id asc`

## 3. ตาราง `categories` — หมวดหมู่ (อนาคต)

| คอลัมน์ | ชนิด | ความหมาย |
|---|---|---|
| id | serial (PK) | รหัสหมวด รันอัตโนมัติ |
| code | text (UNIQUE) | รหัสย่อ เช่น rice, noodle, isan, drink |
| name | text | ชื่อที่แสดง เช่น ข้าว |
| sort_order | integer (0) | ลำดับแสดง |
| is_active | boolean (true) | **สถานะ:** `true` = ใช้งาน / `false` = ปิด (ซ่อน) |
| created_at / updated_at | timestamptz | เวลาสร้าง / แก้ไขล่าสุด (อัตโนมัติ) |

ข้อมูลตั้งต้นที่ใส่แล้ว: rice=ข้าว, noodle=เส้น, isan=อีสาน, drink=เครื่องดื่ม

## 4. ตาราง `menu_item_categories` — ตารางเชื่อม M:N (อนาคต)

| คอลัมน์ | ชนิด | ความหมาย |
|---|---|---|
| menu_item_id | integer FK → menu_items.id | ON DELETE CASCADE (ลบเมนู → ลบการผูกด้วย) |
| category_id | integer FK → categories.id | ON DELETE CASCADE (ลบหมวด → ลบการผูกด้วย) |
| created_at | timestamptz | เวลาที่ผูก |

PK = (menu_item_id, category_id) → ผูกเมนูกับหมวดเดิมซ้ำไม่ได้

## 5. ความปลอดภัย (RLS)

- เปิด Row Level Security ทั้ง 3 ตาราง
- Policy: `SELECT` อย่างเดียว สำหรับ role `anon`, `authenticated` (หน้าเว็บอ่านได้อย่างเดียว)
- (v1.0.3, `db/004`) `menu_items_read` ใช้ `using (is_available = true)`: ผ่าน REST เห็นเฉพาะเมนูที่มีขาย แถว false มองไม่เห็นเลย (เจ้าของโปรเจกต์ยังแก้/เปิด-ปิดได้ตามปกติ)
- (v1.0.3, `db/004`) `categories`, `menu_item_categories`: ลบ policy SELECT และ REVOKE SELECT จาก anon/authenticated (US-101 ยังไม่ใช้) — เมื่อมี Story ที่ใช้ M:N ให้ `GRANT SELECT ... TO anon, authenticated` และสร้าง policy SELECT ใหม่
- ไม่มี policy INSERT/UPDATE/DELETE → publishable key ในหน้าเว็บแก้ข้อมูลไม่ได้ (ทดสอบแล้ว: POST ได้ 401 / 42501)
- การเพิ่ม/แก้ข้อมูลทำผ่าน Supabase Dashboard หรือ SQL Editor (สิทธิ์เจ้าของโปรเจกต์)
- (v1.0.2, `db/003`) สิทธิ์ระดับตาราง: ถอน INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES จาก anon, authenticated เหลือ **SELECT อย่างเดียว** เป็นชั้นป้องกันที่สองนอกจาก RLS
- (v1.0.2 deploy 2) Default privileges: ตารางใหม่ที่ role `postgres` สร้างใน schema public (เช่นสร้างผ่าน migration/SQL Editor) จะ**ไม่ได้** INSERT/UPDATE/DELETE/TRUNCATE ให้ anon, authenticated อัตโนมัติอีกต่อไป (pg_default_acl: `anon=rxtm/postgres`, `authenticated=rxtm/postgres`)
- ข้อจำกัด: default privileges ของ role `supabase_admin` เปลี่ยนไม่ได้ (permission denied, 42501) ยังเป็น `arwdDxtm` — มีผลเฉพาะตารางที่ระบบ Supabase สร้างเอง
- แนวปฏิบัติ: สร้างตารางใหม่เมื่อไร ให้เปิด RLS และ REVOKE สิทธิ์เขียนจาก anon/authenticated ทุกครั้ง (ดู `db/003`)

## 6. วิธีแก้ไข / เพิ่มเมนู

Supabase Dashboard → Table Editor → `menu_items` แล้วแก้ไขได้เลย หรือใช้ SQL:

```sql
-- เพิ่มเมนู
insert into public.menu_items (id, name, price, category, image_url, is_available, sort_order)
values (13, 'ข้าวไข่เจียว', 40.00, 'ข้าว', null, true, 13);
-- ทำให้เมนูหมด (ซ่อนจากหน้าเว็บ)
update public.menu_items set is_available = false where id = 13;
-- เปลี่ยนราคา
update public.menu_items set price = 45.00 where id = 13;
```

นำเข้าจาก CSV: Table Editor → `menu_items` → Insert → Import data from CSV (หัวคอลัมน์ตาม `Design/data/menu_items.csv`)

หน้าเว็บอ่านข้อมูลใหม่ทุกครั้งที่โหลดหน้า (ไม่ต้อง Deploy ใหม่)

## 7. แผนใช้ Many-to-Many ในอนาคต

เมื่อมี Story เช่น "กรองเมนูตามหมวด" หรือ "1 เมนูอยู่หลายหมวด (เช่น ทั้ง 'ข้าว' และ 'เมนูแนะนำ')":

```sql
-- ผูกเมนู id 1 กับหมวด rice
insert into public.menu_item_categories (menu_item_id, category_id)
select 1, id from public.categories where code = 'rice';
```

ฝั่งเว็บดึงผ่าน PostgREST: `/rest/v1/menu_items?select=*,categories(code,name)&is_available=eq.true`
แล้วค่อยเลิกใช้คอลัมน์ `menu_items.category` (ต้องเป็น Story ใหม่ที่ BA อนุมัติ)

## 8. ข้อมูลทดสอบ

- `db/002_us101_seed_sample.sql`: ส่วน categories **apply แล้ว**; ส่วน menu_items 6 แถว **ไม่ได้ apply โดยตั้งใจ**
- `menu_items` ใน Production ว่างไว้ให้ 203 Tester import Mock Data (`Design/data/menu_items.csv/.json`, 12 แถว) เพื่อใช้เทียบ AC1
- รายการที่ผู้ใช้เลือก (ตะกร้า) **ไม่เก็บในฐานข้อมูล** เก็บใน memory ของหน้าเว็บเท่านั้น รีเฟรชแล้วล้าง (BA-C2)

## 9. ตาราง `profiles` — โปรไฟล์ผู้ใช้ (UC02)

สร้างด้วย `db/005_uc02_profiles.sql` (migration `uc02_profiles`) เพื่อเก็บชื่อที่แสดงและอีเมลของผู้ใช้ที่ล็อกอินแล้ว

| คอลัมน์ | ชนิด | บังคับ | ค่าเริ่มต้น | ความหมาย / เงื่อนไข |
|---|---|---|---|---|
| id | uuid (PK, FK → auth.users.id) | ✔ | – | รหัสผู้ใช้ ค่าเดียวกับ `auth.uid()` ลบผู้ใช้แล้วแถวนี้ถูกลบตาม (CASCADE) |
| display_name | text | – | จาก metadata / ส่วนหน้าของอีเมล | ชื่อที่แสดงบนหน้าเว็บ |
| email | text | – | จาก `auth.users.email` | อีเมลของบัญชี ซิงก์ตอนสร้างแถว |
| created_at | timestamptz | ✔ | now() | เวลาที่สร้างโปรไฟล์ |

- Trigger `on_auth_user_created` บน `auth.users` เรียกฟังก์ชัน `public.handle_new_user()` (SECURITY DEFINER, `search_path` ว่าง) เพื่อสร้างแถวอัตโนมัติเมื่อมีผู้ใช้ใหม่
- Migration เดียวกัน **backfill** โปรไฟล์ให้บัญชีที่มีอยู่แล้ว (บัญชีทดสอบ user A / user B ที่ 203 สร้างไว้ก่อนมีตาราง)
- RLS: ผู้ใช้ที่ล็อกอิน (`authenticated`) `SELECT` / `UPDATE` ได้เฉพาะแถว `id = auth.uid()` — การอัปเดตจำกัดที่คอลัมน์ `display_name` เท่านั้น
- `anon` ไม่มีสิทธิ์ใด ๆ (REVOKE ALL) — เรียก REST โดยไม่ล็อกอินต้องไม่ได้ข้อมูล
- ไม่มี policy INSERT/DELETE ให้ client; การสร้างแถวทำผ่าน trigger ฝั่งเซิร์ฟเวอร์เท่านั้น
- รายละเอียดบัญชีทดสอบ (อีเมล, user_id) อยู่ใน `Design/data/UC02_mock_accounts_v1.0.md` (รหัสผ่านไม่อยู่ใน repo)

## 10. ตาราง `orders` และ `order_items` — คำสั่งซื้อ (UC03)

สร้างด้วย `db/006_uc03_orders.sql` (migration `uc03_orders`)

**`orders`** — หัวบิล 1 แถว = 1 คำสั่งซื้อ

| คอลัมน์ | ชนิด | บังคับ | ค่าเริ่มต้น | ความหมาย / เงื่อนไข |
|---|---|---|---|---|
| id | uuid (PK) | ✔ | gen_random_uuid() | รหัสบิล (สุ่ม เดายาก) |
| user_id | uuid (FK → auth.users.id, ON DELETE CASCADE) | ✔ | – | เจ้าของบิล = `auth.uid()` ที่ RPC ใส่ให้เอง (ค่าเดียวกับ profiles.id) |
| created_at | timestamptz | ✔ | now() | เวลาที่บันทึก (หน้าเว็บแสดง Asia/Bangkok) |
| total | numeric(10,2) | ✔ | – | ยอดรวมบิล = ผลรวม `line_total` คำนวณใน DB (CHECK > 0) |
| status | text | ✔ | `confirmed` | CHECK ใน (`confirmed`, `preparing`, `completed`, `cancelled`) ดูตารางด้านล่าง |

| status | ความหมาย | ใช้ใน UC03 |
|---|---|---|
| confirmed | ยืนยันสั่งซื้อแล้ว (ค่าเริ่มต้น) | ✔ ค่าเดียวที่ใช้ |
| preparing | กำลังเตรียมอาหาร | สำรองอนาคต |
| completed | ส่งมอบแล้ว | สำรองอนาคต |
| cancelled | ยกเลิก | สำรองอนาคต |

(UC03-OD1: ชุดค่านี้เป็นข้อเสนอของ 202 รอ 201 ยืนยัน; UC03 ไม่มี workflow เปลี่ยนสถานะ)

**`order_items`** — รายการในบิล (ความสัมพันธ์ M:N ระหว่างบิลกับเมนู)

| คอลัมน์ | ชนิด | บังคับ | ความหมาย / เงื่อนไข |
|---|---|---|---|
| id | bigint identity (PK) | ✔ | ลำดับการบันทึก ใช้เรียงรายการในบิล |
| order_id | uuid (FK → orders.id, ON DELETE CASCADE) | ✔ | บิลที่รายการนี้อยู่ |
| menu_item_id | integer (FK → menu_items.id, ON DELETE RESTRICT) | ✔ | เมนูที่สั่ง (เมนูที่เคยถูกสั่งลบไม่ได้ ให้ตั้ง `is_available=false`) |
| name_snapshot | text | ✔ | ชื่อเมนู ณ เวลาสั่ง |
| unit_price_snapshot | numeric(10,2) | ✔ | ราคาต่อหน่วย ณ เวลาสั่ง (CHECK > 0) |
| qty | integer | ✔ | จำนวน CHECK 1–99 |
| line_total | numeric(10,2) | ✔ | CHECK = `unit_price_snapshot * qty` |

ข้อจำกัดเพิ่ม: UNIQUE (`order_id`, `menu_item_id`) — เมนูเดียวกันในบิลเดียวมี 1 บรรทัด (RPC รวมบรรทัดซ้ำให้). Index: `orders(user_id, created_at desc)`, `order_items(order_id)`, `order_items(menu_item_id)`

**RPC `public.place_order(items jsonb) returns uuid`** (ชื่อกำหนดตาม UC03-OD2)
- รับ `[{"menu_item_id": <int>, "qty": <int 1-99>}, ...]` เท่านั้น ฟิลด์อื่น (price, total, user_id ฯลฯ) ถูกละเลย
- SECURITY DEFINER, `search_path = public`; EXECUTE เฉพาะ `authenticated` (REVOKE จาก public/anon)
- `user_id = auth.uid()` (ไม่ล็อกอิน → ปฏิเสธ); DB อ่านราคา/ชื่อจาก `menu_items` แล้ว snapshot + คำนวณ `line_total`/`total` เอง
- ปฏิเสธทั้งบิล (ไม่มีแถวค้าง) เมื่อ: ตะกร้าว่าง, items ไม่ใช่ array หรือเกิน 50 บรรทัด, qty ไม่ใช่จำนวนเต็ม 1–99 (รวม 0, ลบ, ทศนิยม, ข้อความ), เมนูไม่มีจริง, เมนู `is_available = false`
- Error: SQLSTATE `P0001` + `DETAIL` เป็นรหัส `UC03_NOT_LOGGED_IN | UC03_EMPTY_CART | UC03_BAD_ITEMS | UC03_BAD_QTY | UC03_ITEM_NOT_FOUND | UC03_ITEM_UNAVAILABLE` หน้าเว็บแปลงเป็นข้อความไทยที่เป็นมิตร

**สิทธิ์และ RLS:** RLS เปิดทั้งสองตาราง; `authenticated` มีเฉพาะ `SELECT` — `orders` เห็นแถวที่ `user_id = auth.uid()`, `order_items` เห็นเฉพาะรายการของบิลที่เป็นของตน; `anon` ไม่มีสิทธิ์ใด ๆ (REVOKE ALL); ไม่มี INSERT/UPDATE/DELETE ตรงให้ client (เขียนผ่าน RPC เท่านั้น)

**เส้นทางหน้าเว็บ (UC03-OD4):** `#history` = ประวัติ, `#order/<uuid>` = รายละเอียดบิล (ต้องล็อกอิน; บิลที่ไม่ใช่ของตนจะได้ผลเหมือนไม่มีบิล)
