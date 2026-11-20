# UC02 Mock Accounts — data v1.1 (203, 2026-11-21 05:35 UTC+7)
ตาม D-UC02-01 (201): admin สร้างบัญชี Email+Password ไว้ใช้คู่กับ OAuth และ signup ยังปิดอยู่ (ACT-05)
วิธีสร้าง: owner SQL insert เข้า auth.users และ auth.identities ด้วย email_confirmed (bcrypt hash สร้างบนเครื่อง ส่งไปแค่ hash)
รหัสผ่าน: **ไม่อยู่ใน repo** อยู่ใน `/workspace/vibecode/tester/.env.test` บนเครื่อง (สิทธิ์ 600; `tester/` อยู่ใน .gitignore)

| บัญชี | email | user_id | full_name | ทดสอบ |
|---|---|---|---|---|
| user A | uc02.user.a@example.com | a8d807b4-7b9b-4b44-ad93-dbd2dfc716fd | Mock User A | password grant ได้ token ✅ |
| user B | uc02.user.b@example.com | a75d00df-9adb-4313-aee9-4043e6aee29d | Mock User B | password grant ได้ token ✅ |

ยืนยันแล้ว: รหัสผิดได้ 400 invalid_credentials · `/auth/v1/signup` ได้ 422 · settings `disable_signup:true`, external มีเฉพาะ email=true
Baseline: auth.users มีบัญชี mock 2 คน · menu_items 12/10/1,781.25 ไม่เปลี่ยน · ออเดอร์ตัวอย่าง (UC03) จะเพิ่มเป็น data v1.2 หลังจาก 202 สร้างตาราง
