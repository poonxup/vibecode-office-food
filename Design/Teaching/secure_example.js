/**
 * =====================================================================
 * สำหรับการเรียนการสอนเท่านั้น (เวอร์ชันที่แก้ให้ปลอดภัยแล้ว)
 * TEACHING USE ONLY — counterpart of vulnerable_example.js
 * =====================================================================
 *
 * ไฟล์นี้คือเวอร์ชันเดียวกับ vulnerable_example.js ที่แก้จุด SQL Injection แล้ว
 * การแก้หลัก: ใช้ parameterized query (ค่าถูกส่งแยกจากคำสั่ง SQL)
 *
 * บริบท: API ค้นหาเมนูอาหารของแอป Office Food Ordering (US-101)
 * ตาราง: public.menu_items
 * คอลัมน์: id, name, price, category, image_url, is_available, sort_order
 *
 * ยังไม่ควรนำไฟล์นี้ไปต่อกับฐานข้อมูล Production ของวิชาโดยไม่จำเป็น
 * ให้อ่านคู่กับ SQLi_teaching_material.md
 * =====================================================================
 */

import express from "express";
import pg from "pg";

const app = express();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const MAX_QUERY_LENGTH = 100;

/**
 * GET /api/menu/search?q=...
 * ค้นหาเมนูตามชื่อ เฉพาะรายการที่ is_available = true
 *
 * ปลอดภัยเพราะ:
 *   1) คำสั่ง SQL คงที่ ใช้ $1 เป็นพารามิเตอร์
 *   2) ค่าค้นหาถูกส่งในอาเรย์ตัวที่สองของ pool.query ไม่ถูกต่อเป็นสตริงคำสั่ง
 *   3) มีการจำกัดความยาวอินพุตเป็นชั้นเสริม (ไม่ใช่ตัวแทนการผูกพารามิเตอร์)
 */
app.get("/api/menu/search", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();

    if (!q) {
      return res.status(400).json({ error: "กรุณาระบุคำค้นหา" });
    }
    if (q.length > MAX_QUERY_LENGTH) {
      return res.status(400).json({ error: "คำค้นหายาวเกินไป" });
    }

    // ปลอดภัย: $1 คือพารามิเตอร์ ค่าของ q ไม่กลายเป็นไวยากรณ์ SQL
    // แม้ผู้ใช้จะพิมพ์เครื่องหมาย ' หรือ -- ฐานข้อมูลจะถือว่าเป็นตัวอักษรในคำค้นหา
    const sql = `
      SELECT id, name, price, category, image_url, is_available
      FROM menu_items
      WHERE is_available = true
        AND name ILIKE '%' || $1 || '%'
      ORDER BY sort_order ASC, id ASC
    `;

    const result = await pool.query(sql, [q]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ค้นหาเมนูไม่สำเร็จ" });
  }
});

/**
 * แนวทางอื่นที่ปลอดภัยเมื่อใช้ Supabase / PostgREST client
 * (ไม่ได้รันในไฟล์นี้ แสดงไว้เพื่อการสอน)
 *
 *   const { data, error } = await supabase
 *     .from("menu_items")
 *     .select("id, name, price, category, image_url, is_available")
 *     .eq("is_available", true)
 *     .ilike("name", `%${q}%`)
 *     .order("sort_order", { ascending: true })
 *     .order("id", { ascending: true });
 *
 * ใช้เมธอดของ client เพื่อผูกค่า ห้ามประกอบ URL หรือ raw SQL จากอินพุตผู้ใช้เอง
 *
 * มาตรการเสริมด้านสิทธิ์ (ทำที่ฐานข้อมูล ไม่ใช่ในไฟล์นี้):
 *   - บัญชีที่แอปหน้าร้านใช้ควรมีสิทธิ์ SELECT บน menu_items เท่านั้น
 *   - ไม่เปิด raw SQL ให้ผู้ใช้ และไม่ใช้ service role บนเบราว์เซอร์
 */

app.listen(process.env.PORT || 3000);

export { app };
