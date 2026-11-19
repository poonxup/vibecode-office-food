# Office Food Ordering

Web App สั่งอาหารในออฟฟิศ: แสดงเมนู + ราคา (บาท) ให้เลือก และแสดงสรุปรายการที่สั่ง
เวอร์ชัน **1.0.3** — US-101 (req v1.1) + security fixes

- Hosting: Vercel (static site, ไม่มี build) — project `vibecode-office-food`, team rattakorn-1187
- Database: Supabase project `vibecode-office-food` (ref `yhcjsgbffgabsmsybnle`, ap-southeast-1), schema `public`

## โครงสร้าง

```
index.html            หน้าเว็บหลัก
styles.css            สไตล์ (responsive มือถือ ≥360px / เดสก์ท็อป)
js/config.js          ชื่อแอป, เวอร์ชัน, Supabase URL + publishable key (ปลอดภัยฝั่งเบราว์เซอร์, RLS อ่านอย่างเดียว)
js/cart.js            logic ตะกร้า (pure functions, ทดสอบด้วย Node ได้)
js/app.js             โหลดเมนูจาก Supabase REST, แสดงผล, ข้อความ error ภาษาไทย
db/001_*.sql          โครงสร้างตาราง + RLS + comment
db/002_*.sql          ข้อมูลตัวอย่าง (categories apply แล้ว, menu_items ไม่ apply)
db/003_*.sql          ถอนสิทธิ์เขียนจาก anon/authenticated (เหลือ SELECT) — v1.0.2
db/004_*.sql          RLS: menu_items อ่านได้เฉพาะ is_available = true; ปิดการอ่าน categories / menu_item_categories — v1.0.3
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

## ฐานข้อมูล

ดูรายละเอียดใน `Design/Data_Model.md` — แก้/เพิ่มเมนูที่ตาราง `menu_items` ผ่าน Supabase Dashboard ได้ทันที ไม่ต้อง Deploy ใหม่
