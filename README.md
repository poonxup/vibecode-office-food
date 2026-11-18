# Office Food Ordering

Web App สั่งอาหารในออฟฟิศ: แสดงเมนู + ราคา (บาท) ให้เลือก และแสดงสรุปรายการที่สั่ง
เวอร์ชัน **1.0.0** — US-101 (req v1.1)

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
Design/               เอกสารโครงการ (Story, Data Model, Mock Data, Test Cases/Results, Bug Reports)
CHANGELOG.md          ประวัติเวอร์ชัน
```

## รันในเครื่อง

```bash
python3 -m http.server 8080   # แล้วเปิด http://localhost:8080
```

ทดสอบ logic: `node --input-type=module -e "import('./js/cart.js').then(m=>console.log(m.formatBaht(1250)))"`

## Deploy

1. แก้ `APP_VERSION` ใน `js/config.js` และเพิ่มบันทึกใน `CHANGELOG.md`
2. commit ใน git
3. Deploy ไฟล์ทั้งหมด (รวม `Design/`) ขึ้น Vercel project `vibecode-office-food` target production
   (เช่น `vercel deploy --prod` หรือ Vercel API) — ไม่มีขั้นตอน build

## ฐานข้อมูล

ดูรายละเอียดใน `Design/Data_Model.md` — แก้/เพิ่มเมนูที่ตาราง `menu_items` ผ่าน Supabase Dashboard ได้ทันที ไม่ต้อง Deploy ใหม่
