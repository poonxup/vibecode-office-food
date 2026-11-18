// cart.js — logic ล้วน (ไม่ยุ่ง DOM) ทดสอบได้ด้วย Node
// รายการที่เลือกเก็บใน state ของเบราว์เซอร์เท่านั้น (US-101: ไม่บันทึก DB)
// state รูปแบบ: { lines: [ { id, name, price, qty } ] }  1 เมนู = 1 บรรทัด

export function createCart() {
  return { lines: [] };
}

// AC2/AC3: กดครั้งแรกได้ qty 1, กดซ้ำเพิ่มบรรทัดเดิมทีละ 1 (ไม่สร้างบรรทัดซ้ำ)
export function addItem(cart, item) {
  const existing = cart.lines.find((l) => l.id === item.id);
  if (existing) {
    return {
      lines: cart.lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + 1 } : l)),
    };
  }
  return {
    lines: [...cart.lines, { id: item.id, name: item.name, price: Number(item.price), qty: 1 }],
  };
}

// AC5: ราคารวมบรรทัด = price x qty (คำนวณเป็นสตางค์เพื่อตัดปัญหาทศนิยม)
export function lineTotal(line) {
  return Math.round(Number(line.price) * 100) * line.qty / 100;
}

export function totals(cart) {
  const qty = cart.lines.reduce((s, l) => s + l.qty, 0);
  const satang = cart.lines.reduce((s, l) => s + Math.round(Number(l.price) * 100) * l.qty, 0);
  return { qty, amount: satang / 100 };
}

export function formatBaht(n) {
  // BA-C1 (req v1.1): ทศนิยม 2 ตำแหน่งเสมอ + คอมมาคั่นหลักพัน เช่น 45.50 บาท, 1,250.00 บาท
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " บาท";
}
