# Office Food Ordering

Web App สั่งอาหารในออฟฟิศ: แสดงเมนู + ราคา (บาท) ให้เลือก และแสดงสรุปรายการที่สั่ง
เวอร์ชัน **1.2.0** (branch `uc03`, ยังไม่ขึ้น Production — Production ยังเป็น 1.1.0) — UC03 ยืนยันสั่งซื้อ + ประวัติการสั่งซื้อ; UC02 เข้าสู่ระบบ และ US-101 ยังใช้ได้เช่นเดิม

- Hosting: Vercel (static site, ไม่มี build) — project `vibecode-office-food`, team rattakorn-1187
- Database: Supabase project `vibecode-office-food` (ref `yhcjsgbffgabsmsybnle`, ap-southeast-1), schema `public`

## โครงสร้าง

```
index.html            หน้าเว็บหลัก (มีแถบเข้าสู่ระบบ, ปุ่มยืนยันสั่งซื้อแบบกันสถานะล็อกอิน)
styles.css            สไตล์ (responsive มือถือ ≥360px / เดสก์ท็อป)
js/config.js          ชื่อแอป, เวอร์ชัน, Supabase URL + publishable key, AUTH_PROVIDERS
js/auth.js            ล็อกอิน OAuth/PKCE + Email+Password, ออกจากระบบ, ตัวช่วย requireAuth สำหรับ UC03
js/vendor/            supabase-js 2.119.2 แบบไฟล์เดียว (CSP script-src 'self')
js/orders.js          UC03: เรียก RPC place_order, อ่านประวัติ/รายละเอียดบิล (RLS), จัดรูปแบบวันเวลา Asia/Bangkok, แปลง error เป็นข้อความไทย
js/cart.js            logic ตะกร้า (pure functions, ทดสอบด้วย Node ได้)
js/app.js             โหลดเมนูจาก Supabase REST, แสดงผล, ข้อความ error ภาษาไทย, UI ล็อกอิน
db/001_*.sql          โครงสร้างตารางเมนู + RLS + comment
db/002_*.sql          ข้อมูลตัวอย่าง (categories apply แล้ว, menu_items ไม่ apply)
db/003_*.sql          ถอนสิทธิ์เขียนจาก anon/authenticated (เหลือ SELECT) — v1.0.2
db/004_*.sql          RLS: menu_items อ่านได้เฉพาะ is_available = true; ปิดการอ่าน categories / menu_item_categories — v1.0.3
db/005_*.sql          ตาราง profiles + trigger + backfill บัญชีที่มีอยู่แล้ว — v1.1.0 UC02
db/006_*.sql          ตาราง orders, order_items + RLS + RPC place_order — v1.2.0 UC03
vercel.json           Security headers ทุก route (CSP แอป / CSP แยกสำหรับ /Design/*, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS)
.vercelignore         ไฟล์ที่ไม่ deploy (db/, Design/Test Case/scripts/, Design/Teaching/, tester/)
Design/               เอกสารโครงการ (Story, Data Model, Mock Data, Test Cases/Results, Bug Reports)
CHANGELOG.md          ประวัติเวอร์ชัน
```

## รันในเครื่อง

```bash
python3 -m http.server 8080   # แล้วเปิด http://localhost:8080
```

ทดสอบ logic: `node --input-type=module -e "import('./js/cart.js').then(m=>console.log(m.formatBaht(1250)))"`

## Deploy

Deploy อัตโนมัติจาก GitHub: push เข้า branch `main` ของ `poonxup/vibecode-office-food` แล้ว Vercel Git integration
จะ deploy ขึ้น Production (project `vibecode-office-food`, https://vibecode-office-food.vercel.app) เอง — ไม่มีขั้นตอน build
และไม่ต้อง deploy ผ่าน Vercel API อีกต่อไป

1. แก้ `APP_VERSION` ใน `js/config.js` และเพิ่มบันทึกใน `CHANGELOG.md` (ถ้าแก้แค่เอกสาร ไม่ต้องเปลี่ยนเวอร์ชัน)
2. ตรวจ secret ก่อน commit (ห้ามมี service_role key)
3. commit แล้ว `git push origin main` → ตรวจสถานะ deployment บน Vercel ให้เป็น READY

หมายเหตุ:
- Git deploy ใช้ `.vercelignore` จึงไม่ deploy `tester/`, `db/`, `Design/Test Case/scripts/`, `Design/Teaching/` (ยังเก็บใน git)
- Git deploy ของ commit 33a339a เคยล้มเหลว (errorCode `git_info_fail`) เพราะ Vercel GitHub App ยังไม่มีสิทธิ์เข้าถึง repo — แก้แล้ว (เจ้าของให้สิทธิ์ 2026-11-19)

## ความปลอดภัย (v1.0.2)

- CSP ไม่อนุญาต inline script: ห้ามใส่ `onclick=`/`onerror=` หรือ `<script>` แบบ inline ใน HTML ให้ผูก event ใน `js/app.js` ด้วย `addEventListener`
- ถ้าเพิ่มโดเมนภายนอก (API, ฟอนต์, สคริปต์) ต้องแก้ CSP ใน `vercel.json`
- ฐานข้อมูล: หน้าเว็บอ่านได้อย่างเดียว ทั้งระดับ RLS และระดับ GRANT
- (v1.0.3) anon อ่านได้เฉพาะเมนูที่ is_available = true (บังคับที่ RLS) และอ่าน categories / menu_item_categories ไม่ได้
- (v1.0.3) ห้ามแสดงข้อความ error ดิบจากเซิร์ฟเวอร์บนหน้าจอ ให้ใช้ข้อความไทยทั่วไป และ log รายละเอียดที่ console.error
- ความเสี่ยงที่ยอมรับและรายการที่รอแก้ด้วยการตั้งค่า: ดู `Design/Security/US-101_accepted_risks.md`
- (v1.1.0) ล็อกอินใช้ publishable key + PKCE เท่านั้น ห้ามใส่ service_role ในโค้ดฝั่ง client; ตาราง `profiles` อ่านได้เฉพาะเจ้าของแถว และ anon เข้าไม่ถึง


## เข้าสู่ระบบ (UC02)

ทางที่ใช้งานได้ในเวอร์ชันนี้คือ **Email+Password** ด้วยบัญชีที่ผู้ดูแลสร้างให้ (ไม่เปิดสมัครเอง, ACT-05 ยังปิด)

- ดูเมนูและใช้สรุปรายการได้โดยไม่ต้องล็อกอิน (พฤติกรรม US-101 เหมือนเดิม)
- ปุ่ม "เข้าสู่ระบบด้วย Google" มีและเดินสาย OAuth 2.0 + PKCE ไว้แล้ว แต่ยังไม่พร้อมจนกว่าเจ้าของจะเปิด Google provider ใน Supabase Dashboard
- หลังล็อกอินแสดงชื่อ/อีเมลและปุ่มออกจากระบบ; ออกจากระบบแล้วเซสชันถูกยกเลิกจริง
- ปุ่ม "ยืนยันสั่งซื้อ" และ "ประวัติการสั่งซื้อ" ต้องล็อกอินก่อน (ยังไม่บันทึกออเดอร์ — อยู่ใน UC03)
- บัญชีทดสอบ: ดู `Design/data/UC02_mock_accounts_v1.0.md` (รหัสผ่านไม่อยู่ใน repo)

วิธีเปิด Google OAuth เมื่อเจ้าของพร้อม (แล้วตั้ง `AUTH_PROVIDERS.google = true` ใน `js/config.js` แล้ว push):

1. Google Cloud Console → สร้าง OAuth Client ชนิด Web application
2. Authorized JavaScript origins: `https://yhcjsgbffgabsmsybnle.supabase.co`
3. Authorized redirect URIs: `https://yhcjsgbffgabsmsybnle.supabase.co/auth/v1/callback`
4. Supabase Dashboard → Authentication → Providers → Google: เปิดแล้วใส่ Client ID / Secret
5. Authentication → URL Configuration: Site URL = `https://vibecode-office-food.vercel.app` และอนุญาต Redirect เฉพาะโดเมนของเรา (`https://vibecode-office-food.vercel.app/**` และ Vercel Preview ของโปรเจกต์นี้)
6. คง "Allow new users to sign up" ปิดไว้ตาม ACT-05

## ฐานข้อมูล

ดูรายละเอียดใน `Design/Data_Model.md` — แก้/เพิ่มเมนูที่ตาราง `menu_items` ผ่าน Supabase Dashboard ได้ทันที ไม่ต้อง Deploy ใหม่

## ยืนยันสั่งซื้อและประวัติ (UC03, v1.2.0)
- ปุ่ม "ยืนยันสั่งซื้อ" ในสรุปรายการ: ต้องล็อกอิน, ปิดเมื่อตะกร้าว่าง, บันทึกผ่าน RPC `place_order` เท่านั้น (ส่งแค่ `menu_item_id` + `qty`; ราคา/ยอดรวม/เจ้าของบิล DB กำหนดเอง)
- ประวัติ: ปุ่ม "ประวัติการสั่งซื้อ" หลังล็อกอิน (`#history`), รายละเอียดบิล `#order/<uuid>`
- Security: RLS ตาม `auth.uid()`, anon ไม่มีสิทธิ์ orders/order_items, ไม่มี INSERT/UPDATE/DELETE ตรง — รายละเอียดใน `Design/Data_Model.md` หัวข้อ 10
