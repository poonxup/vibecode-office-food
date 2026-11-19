# US-101 — ความเสี่ยงที่ยอมรับ (Accepted Risks) และสถานะการแก้ไข

เจ้าของไฟล์: 202 Vibe Code Agent · อ้างอิง: 204 `US-101_active_security_test_v1.0.html`, 203 `US-101_test_results_run4_v1.0.html` · เวอร์ชันแอป: 1.0.3

## ความเสี่ยงที่ยอมรับ

| ID | รายละเอียด | เหตุผลที่ยอมรับ | ผู้ยอมรับ | วันที่ |
|---|---|---|---|---|
| OBS-04 / ACT-29 | ถ้าเรียก Supabase REST API (PostgREST) ตรง เช่น `?select=nosuchcol` จะยังได้ error ดิบ (เช่น 42703) ที่มีชื่อตารางหรือคอลัมน์ และ hint ของ GRANT | หน้าเว็บแสดงแค่ข้อความภาษาไทยทั่วไปแล้ว (SQLI-06, v1.0.3) และรายละเอียด log ที่ console.error เท่านั้น ส่วน error ที่ชั้น API เป็นพฤติกรรมมาตรฐานของ PostgREST ชื่อสคีมาก็รู้ได้จาก JS สาธารณะอยู่แล้ว ผู้ใช้ anon มีสิทธิ์อ่านอย่างเดียว (RLS + GRANT) และไม่มีข้อมูลลับ | 201 BA | 2026-11-19 |
| ACT-31 | CORS กว้าง: ไฟล์ static บน Vercel ตอบ `access-control-allow-origin: *` และ Supabase REST สะท้อน Origin ที่ส่งมา | ข้อมูลที่ได้คือเมนูสาธารณะแบบอ่านอย่างเดียว ไม่มี cookie หรือ credential ของผู้ใช้ จึงขโมยข้อมูลส่วนตัวผ่าน CORS ไม่ได้ ถ้าในอนาคตมีข้อมูลที่ต้องหวง ต้องจำกัด CORS ใหม่ | 201 BA | 2026-11-19 |

## รายการที่ต้องแก้ด้วยการตั้งค่า

| ID | รายละเอียด | สถานะ | หมายเหตุ |
|---|---|---|---|
| ACT-05 | Supabase Auth เปิดให้สมัครบัญชีเองได้ (`disable_signup:false`) ทั้งที่ US-101 ไม่ใช้ auth | **แก้แล้ว** (2026-11-19, แก้ด้วยการตั้งค่า) | เจ้าของโปรเจกต์ปิดการสมัครบัญชีเอง (self-signup) ใน Supabase Dashboard แล้ว ไม่ได้แก้โค้ดหรือข้อมูล 204 ยืนยันเมื่อ 2026-11-19 ประมาณ 16:13 น. (Asia/Bangkok): `GET /auth/v1/settings` ได้ `"disable_signup":true` และ `POST /auth/v1/signup` ได้ 422 `signup_disabled` (commit 2b08a56) 202 ตรวจซ้ำแบบ passive (`GET /auth/v1/settings` เท่านั้น ไม่เรียก signup) เมื่อ 2026-11-19 16:14 น. (Asia/Bangkok) ได้ `"disable_signup":true` |
| ACT-03 | การเปลี่ยนเส้นทาง http:// → https:// | **Blocked / Info** (ยังยืนยันไม่ได้) | เครื่องตรวจได้ 500 จาก proxy ขาออก 'Pingora' ไม่ใช่ Vercel จึงยังยืนยันไม่ได้ ต้องให้เจ้าของรัน `curl -I http://vibecode-office-food.vercel.app/` จากเครือข่ายของตัวเอง (คาดว่าได้ 308 ไป https) ทั้งนี้ *.vercel.app อยู่ใน HSTS preload เบราว์เซอร์จึงบังคับ HTTPS เอง |
