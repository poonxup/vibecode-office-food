# supabase-js (vendor)

ไฟล์ `supabase.js` คือไลบรารี `@supabase/supabase-js` เวอร์ชัน **2.119.2** ที่รวมเป็นไฟล์ ESM เดียว
เพื่อให้ Content-Security-Policy `script-src 'self'` ใช้งานได้โดยไม่ต้องโหลดสคริปต์จาก CDN

สร้างไฟล์ใหม่ (เมื่อต้องการอัปเดตเวอร์ชันที่ปักหมุด):

```bash
npm install @supabase/supabase-js@2.119.2 esbuild
npx esbuild node_modules/@supabase/supabase-js/dist/index.mjs \
  --bundle --format=esm --platform=browser --minify --legal-comments=none \
  --banner:js='/*! @supabase/supabase-js v2.119.2 — vendored ESM for CSP script-src self */' \
  --outfile=js/vendor/supabase.js
```
