# Changelog

## v1.0.2 — 2026-11-19 — US-101 security fixes (ตามรายงาน 204 Security Findings v1.0) — ไม่มีการเปลี่ยน feature/AC
- S-12: db/003_us101_revoke_write_grants.sql — REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES จาก anon/authenticated ทั้ง 3 ตาราง เหลือ SELECT อย่างเดียว (apply แล้ว, ไม่แก้ข้อมูล)
- S-04/S-16: ย้าย onerror แบบ inline ของรูปเมนูไปผูกด้วย addEventListener ใน js/app.js (พฤติกรรมเดิม: รูปโหลดไม่ได้ -> เอารูปออก); ปุ่ม "ลองใหม่" ใช้ addEventListener
- S-04/S-05/S-06: vercel.json เพิ่ม headers ทุก route: Content-Security-Policy (frame-ancestors 'none'), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera=(), microphone=(), geolocation=(); คง HSTS
- S-14: .vercelignore ไม่ deploy Design/Test Case/scripts/ (ยังอยู่ใน git) และ tester/; Design/Security/ เผยแพร่บน Production
- deploy 2 (2026-11-19, ยังเป็น v1.0.2 ไม่มีการแก้โค้ดแอป):
  - ไม่ deploy db/ ขึ้น Production อีกต่อไป (ยังอยู่ใน git) — .vercelignore
  - db/003 ส่วนที่ 2: ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated (migration us101_revoke_default_write_privs); role supabase_admin เปลี่ยนไม่ได้ (permission denied) บันทึกไว้ใน SQL
  - vercel.json: CSP แยกสำหรับ /Design/* (script-src 'none'; style-src อนุญาต 'unsafe-inline' ให้รายงาน HTML แสดงสไตล์ได้) หน้าแอปใช้ CSP เดิม; header อื่นเหมือนเดิมทุก route

## v1.0.1 — 2026-11-18 — US-101 fix round 1 (req v1.1)
- BUG-001 (AC7/TC-16, Low): ปุ่มลอย 🛒 บนจอมือถือ (≤820px) บังจำนวนรวม/ราคารวมในสรุป → ซ่อนปุ่มอัตโนมัติเมื่อส่วนสรุป (#summary) อยู่บนจอ (IntersectionObserver) แสดงกลับเมื่อเลื่อนออก; ตรวจที่ 360/390/1280px ไม่มีตำแหน่งเลื่อนใดที่ปุ่มบังยอดรวม
- js/app.js: log เมื่อโหลดเมนูไม่สำเร็จเปลี่ยนจาก console.warn เป็น console.error
- เผยแพร่โฟลเดอร์ Design/ ทั้งหมด (Story, Data Model, Test Cases/Results, Bug Reports, evidence, data) บน URL Production

## v1.0.0 — 2026-11-18 — US-101 (req v1.1)
- หน้าเมนูอาหาร: อ่านจาก Supabase `menu_items` เฉพาะ `is_available = true` เรียงตาม `sort_order, id` (AC1)
- เลือกเมนู: กดครั้งแรก = 1, กดซ้ำเพิ่มในบรรทัดเดิม, 1 เมนู = 1 บรรทัด (AC2–AC4)
- สรุป: ราคาต่อหน่วย x จำนวน = ราคารวมบรรทัด, จำนวนชิ้นรวม, ราคารวมทั้งหมด (AC5); ว่าง = "ยังไม่มีรายการ" 0.00 บาท (AC6)
- BA-C1: ราคาแสดงทศนิยม 2 ตำแหน่ง + คอมมาคั่นหลักพัน เช่น 45.50 บาท, 1,250.00 บาท
- BA-C2: ตะกร้าเก็บใน memory เท่านั้น (ไม่ใช้ localStorage) รีเฟรชแล้วล้าง
- Responsive มือถือ ≥360px / เดสก์ท็อป, ข้อความ error ภาษาไทย, footer แสดงชื่อแอป + เวอร์ชัน
- DB: `menu_items` (CHECK price > 0), `categories`, `menu_item_categories` (M:N, อนาคต), RLS อ่านอย่างเดียว
- Seed: categories 4 แถว; menu_items ไม่ seed (203 Tester import Mock Data เอง)
