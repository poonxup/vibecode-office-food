# UC02 — Social Login · Test Cases v1.0 (203, draft 2026-11-21)
อ้างอิง: req UC02 v1.0 (ข้อความ 201, 2026-11-21) · baseline เมนู data v1.0 = 12 แถว / available 10 / รวม 1,781.25 (ต้องไม่เปลี่ยน)
Test data: user A, user B (บัญชี mockup ตาม provider ที่ 202 เลือก) · ทดสอบบน Production URL หลังยืนยัน APP_VERSION + commit
สถานะ provider: TBD (Google → GitHub → Email+Password โดย admin) — TC ที่ต้องใช้บัญชี OAuth จริงจะ Blocked หากไม่มีบัญชีทดสอบ

| TC | AC | ประเภท | ขั้นตอน | ผลที่คาดหวัง |
|---|---|---|---|---|
| UC02-01 | 1 | ปกติ | เปิดหน้าแรกแบบยังไม่ล็อกอิน | มีปุ่ม "เข้าสู่ระบบด้วย Google" (หรือ provider ที่เลือก) ไม่มีชื่อผู้ใช้ |
| UC02-02 | 1,4 | ปกติ | กดปุ่ม Google ดู request ไป authorize | ไป Supabase `/auth/v1/authorize?provider=...` แล้ว redirect ไป provider มี `state`, `code_challenge`, `code_challenge_method=S256`, redirect_uri เป็นโดเมนเรา |
| UC02-03 | 1 | ปกติ | ล็อกอิน user A สำเร็จ | แสดงชื่อ/อีเมล A + ปุ่ม "ออกจากระบบ" |
| UC02-04 | 4 | ปกติ | หลัง callback ตรวจ URL และ history | ไม่มี `access_token`, `refresh_token`, `code` ค้างใน URL/history |
| UC02-05 | 2 | ปกติ | ไม่ล็อกอิน ทำ TC-01..TC-17 ของ US-101 | US-101 regression ผ่านทั้งหมด |
| UC02-06 | 2 | ปกติ | ล็อกอินแล้ว ทำ US-101 regression | ผ่านทั้งหมด ตะกร้า/ยอดรวมถูกต้อง |
| UC02-07 | 2 | ไม่ล็อกอิน | กด "ยืนยันสั่งซื้อ" / เปิดหน้าประวัติ | ถูกขอให้ล็อกอิน ไม่บันทึกออเดอร์ |
| UC02-08 | 3 | ปกติ | ล็อกอินแล้วกดออกจากระบบ | กลับเป็นสถานะไม่ล็อกอิน storage ไม่มี session |
| UC02-09 | 3 | ย้อนกลับ | หลัง logout กด Back แล้ว Refresh | ยังไม่ล็อกอิน เข้าหน้าประวัติไม่ได้ |
| UC02-10 | 3 | token เดิม | เก็บ access token ก่อน logout แล้วเรียก REST/RPC ที่ต้องล็อกอินหลัง logout | refresh token ใช้ไม่ได้ (revoked); บันทึกพฤติกรรม access token จนหมดอายุเป็นข้อสังเกต |
| UC02-11 | 3 | refresh | ล็อกอินแล้ว refresh หน้า | ยังล็อกอินอยู่ (session ไม่หายเอง) และตะกร้าเป็น 0.00 ตาม BA-C2 |
| UC02-12 | 4 | key | ตรวจ JS/HTML ที่เสิร์ฟทั้งหมด | ไม่มี service_role / secret key / client secret มีเฉพาะ publishable key |
| UC02-13 | 4 | CSP | ตรวจ header CSP | เพิ่มเฉพาะโดเมนที่จำเป็น (Supabase/provider) ไม่มี `unsafe-inline`/`*` ใน script-src; ไม่มี CSP violation ระหว่าง flow |
| UC02-14 | 4 | redirect ไม่ถูกต้อง | เรียก authorize ด้วย `redirect_to=https://evil.example` | ไม่ redirect ไปโดเมนนอก allowlist |
| UC02-15 | 4 | ข้อมูลผิด | เปิด callback ด้วย `code` ปลอม/ใช้ซ้ำ | ล็อกอินไม่สำเร็จ แสดงข้อความทั่วไป ไม่มี error ดิบ |
| UC02-16 | 5 | signup | `GET /auth/v1/settings`, `POST /auth/v1/signup` | `disable_signup:true`, signup ได้ 422 signup_disabled |
| UC02-17 | 5 | provider | ตรวจ `external` ใน settings | เปิดเฉพาะ provider ที่เลือก (+email เฉพาะถ้า BA อนุมัติแบบ admin-created) |
| UC02-18 | 1 | ข้อมูลยาว/พิเศษ | ผู้ใช้ชื่อยาวหรือมี `<b>&` | แสดงแบบ escape ไม่ล้นที่ 360px |
| UC02-19 | 1,3 | ซ้ำ | กดปุ่มล็อกอิน 2 ครั้งเร็วๆ / logout 2 ครั้ง | ไม่ error, สถานะถูกต้อง |
| UC02-20 | 1 | 360px | flow ล็อกอิน/ออกบนมือถือ 360x740 | ปุ่มไม่ทับยอดรวม ไม่ล้นแนวนอน |
| UC02-21 | 1 | console | ทุก flow | ไม่มี console error/CSP violation |
| UC02-22 | — | baseline | ก่อน/หลังรอบทดสอบ | menu_items 12/10/1,781.25 |
