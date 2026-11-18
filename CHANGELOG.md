# Changelog

## v1.0.0 — 2026-11-18 — US-101 (req v1.1)
- หน้าเมนูอาหาร: อ่านจาก Supabase `menu_items` เฉพาะ `is_available = true` เรียงตาม `sort_order, id` (AC1)
- เลือกเมนู: กดครั้งแรก = 1, กดซ้ำเพิ่มในบรรทัดเดิม, 1 เมนู = 1 บรรทัด (AC2–AC4)
- สรุป: ราคาต่อหน่วย x จำนวน = ราคารวมบรรทัด, จำนวนชิ้นรวม, ราคารวมทั้งหมด (AC5); ว่าง = "ยังไม่มีรายการ" 0.00 บาท (AC6)
- BA-C1: ราคาแสดงทศนิยม 2 ตำแหน่ง + คอมมาคั่นหลักพัน เช่น 45.50 บาท, 1,250.00 บาท
- BA-C2: ตะกร้าเก็บใน memory เท่านั้น (ไม่ใช้ localStorage) รีเฟรชแล้วล้าง
- Responsive มือถือ ≥360px / เดสก์ท็อป, ข้อความ error ภาษาไทย, footer แสดงชื่อแอป + เวอร์ชัน
- DB: `menu_items` (CHECK price > 0), `categories`, `menu_item_categories` (M:N, อนาคต), RLS อ่านอย่างเดียว
- Seed: categories 4 แถว; menu_items ไม่ seed (203 Tester import Mock Data เอง)
