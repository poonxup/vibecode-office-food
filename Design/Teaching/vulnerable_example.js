/**
 * =====================================================================
 * สำหรับการเรียนการสอนเท่านั้น — ห้ามนำไป deploy จริง
 * TEACHING USE ONLY — DO NOT DEPLOY THIS FILE
 * =====================================================================
 *
 * ไฟล์นี้จงใจมีช่องโหว่ SQL Injection 1 จุด
 * เพื่อให้นักศึกษาเปรียบเทียบกับ secure_example.js
 *
 * บริบท: API ค้นหาเมนูอาหารของแอป Office Food Ordering (US-101)
 * ตาราง: public.menu_items
 * คอลัมน์: id, name, price, category, image_url, is_available, sort_order
 *
 * ห้าม:
 *   - นำไป deploy บนอินเทอร์เน็ต หรือต่อกับฐานข้อมูลจริงของโปรเจกต์ / Production
 *   - นำไปใช้โจมตีระบบใด ๆ
 *
 * ให้อ่านคู่กับ SQLi_teaching_material.md และดูเวอร์ชันที่แก้แล้วใน secure_example.js
 * =====================================================================
 */

import express from "express";
import pg from "pg";

const app = express();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/menu/search?q=...
 * ตั้งใจให้ค้นหาเมนูตามชื่อ เฉพาะรายการที่ is_available = true
 *
 * ⚠️ ช่องโหว่ SQL Injection อยู่ที่บรรทัดที่ประกอบตัวแปร sql ด้านล่าง
 *    ค่า q จากผู้ใช้ถูกต่อเข้าไปในสตริงคำสั่งโดยตรง
 *    ทำให้ผู้ใช้กำหนดไวยากรณ์ SQL ได้ ไม่ใช่แค่คำค้นหา
 */
app.get("/api/menu/search", async (req, res) => {
  try {
    const q = req.query.q ?? "";

    // ⚠️ VULNERABLE (จุดช่องโหว่เดียวในไฟล์นี้):
    // ต่อสตริง SQL ด้วยค่าจากผู้ใช้ — ห้ามเขียนแบบนี้ในงานจริง
    const sql = `
      SELECT id, name, price, category, image_url, is_available
      FROM menu_items
      WHERE is_available = true
        AND name ILIKE '%${q}%'
      ORDER BY sort_order ASC, id ASC
    `;

    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ค้นหาเมนูไม่สำเร็จ" });
  }
});

app.listen(process.env.PORT || 3000);

export { app };
