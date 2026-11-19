import { APP_NAME, APP_VERSION, APP_STORY, SUPABASE_URL, SUPABASE_KEY } from "./config.js";
import { createCart, addItem, lineTotal, totals, formatBaht } from "./cart.js";

let cart = createCart();
let menu = [];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// อ่านเมนูจาก Supabase ตาราง menu_items เฉพาะ is_available = true เรียงตาม sort_order (AC1)
// v1.0.3 (SQLI-06): ข้อความ error ดิบจาก PostgREST/Supabase (อาจมีชื่อคอลัมน์/ชนิดข้อมูล) ห้ามแสดงบนหน้าจอ
//   ผู้ใช้เห็นเฉพาะข้อความภาษาไทยแบบทั่วไป รายละเอียดเขียนลง console.error เท่านั้น
const MSG_LOAD_FAILED = "ไม่สามารถโหลดเมนูได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
const MSG_OFFLINE = "ไม่มีการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบแล้วลองใหม่";

async function loadMenu() {
  showMenuState("loading");
  try {
    const url = `${SUPABASE_URL}/rest/v1/menu_items?select=id,name,price,category,image_url,is_available,sort_order&is_available=eq.true&order=sort_order.asc,id.asc`;
    const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!res.ok) {
      // เก็บรายละเอียดจากเซิร์ฟเวอร์ไว้ใน error เพื่อ log เท่านั้น (ไม่ส่งต่อไปที่ DOM)
      let detail = "";
      try { detail = await res.text(); } catch { /* ignore */ }
      const e = new Error(`HTTP ${res.status}`);
      e.detail = detail;
      throw e;
    }
    const data = await res.json();
    if (!Array.isArray(data)) throw Object.assign(new Error("รูปแบบข้อมูลไม่ถูกต้อง"), { detail: JSON.stringify(data) });
    menu = data;
    if (menu.length === 0) return showMenuState("empty");
    renderMenu();
  } catch (err) {
    // รายละเอียด (สถานะ HTTP / ข้อความจาก PostgREST) ไปที่ console.error เท่านั้น
    console.error("โหลดเมนูไม่สำเร็จ:", err && err.message, err && err.detail ? err.detail : "");
    // หน้าจอแสดงเฉพาะข้อความทั่วไปที่กำหนดไว้ ไม่ใช้ข้อความจาก err
    showMenuState("error", navigator.onLine === false ? MSG_OFFLINE : MSG_LOAD_FAILED);
  }
}

function showMenuState(state, msg) {
  const box = $("menu-state");
  $("menu-grid").innerHTML = "";
  box.hidden = false;
  if (state === "loading") box.innerHTML = `<div class="spinner"></div><p>กำลังโหลดเมนู...</p>`;
  if (state === "empty") box.innerHTML = `<p class="state-title">ยังไม่มีเมนูให้เลือกในขณะนี้</p><p>กรุณาลองใหม่ภายหลัง</p>`;
  if (state === "error") box.innerHTML = `<p class="state-title">⚠️ ${esc(msg)}</p><button class="btn-retry" id="retry">ลองใหม่</button>`;
  if (state === "error") $("retry").addEventListener("click", loadMenu);
}

function renderMenu() {
  $("menu-state").hidden = true;
  $("menu-grid").innerHTML = menu.map((m) => `
    <button class="menu-card" data-id="${esc(m.id)}" aria-label="เลือก ${esc(m.name)} ราคา ${esc(formatBaht(m.price))}">
      ${m.image_url ? `<img src="${esc(m.image_url)}" alt="" loading="lazy">` : `<div class="img-ph">🍱</div>`}
      <span class="menu-cat">${esc(m.category || "")}</span>
      <span class="menu-name">${esc(m.name)}</span>
      <span class="menu-price">${esc(formatBaht(m.price))}</span>
      <span class="menu-add">+ เลือก</span>
    </button>`).join("");
  $("menu-grid").querySelectorAll(".menu-card").forEach((el) => {
    el.addEventListener("click", () => {
      const item = menu.find((m) => String(m.id) === el.dataset.id);
      if (!item) return;
      cart = addItem(cart, item);
      el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
      renderSummary();
    });
  });
}

// AC4–AC6: สรุปรายการ ราคาต่อหน่วย x จำนวน = ราคารวมบรรทัด, จำนวนรวม, ราคารวม
function renderSummary() {
  const t = totals(cart);
  $("sum-qty").textContent = `${t.qty} ชิ้น`;
  $("sum-total").textContent = formatBaht(t.amount);
  $("cart-badge").textContent = t.qty;
  if (cart.lines.length === 0) {
    $("sum-lines").innerHTML = `<li class="empty">ยังไม่มีรายการ</li>`;
    return;
  }
  $("sum-lines").innerHTML = cart.lines.map((l) => `
    <li class="line" data-id="${esc(l.id)}">
      <span class="line-name">${esc(l.name)}</span>
      <span class="line-calc">${esc(formatBaht(l.price))} x <b class="line-qty">${l.qty}</b></span>
      <span class="line-total">${esc(formatBaht(lineTotal(l)))}</span>
    </li>`).join("");
}

// S-04/S-16 (v1.0.2): ย้าย onerror แบบ inline ออกจาก HTML มาผูกด้วย addEventListener (รองรับ CSP ที่ไม่อนุญาต inline script)
// รูปเมนูโหลดไม่ได้ -> เอา <img> ออก (พฤติกรรมเดิม) ใช้ capture เพราะ event 'error' ของรูปไม่ bubble
$("menu-grid").addEventListener("error", (e) => {
  const el = e.target;
  if (el instanceof HTMLImageElement && el.closest(".menu-card")) el.remove();
}, true);

// BUG-001: ซ่อนปุ่มลอย 🛒 เมื่อส่วนสรุปรายการ (#summary) อยู่บนจอ เพื่อไม่ให้บังจำนวนรวม/ราคารวม
function setupCartPill() {
  const pill = document.querySelector(".cart-pill");
  const summary = $("summary");
  if (!pill || !summary || !("IntersectionObserver" in window)) return;
  new IntersectionObserver((entries) => {
    const visible = entries.some((e) => e.isIntersecting);
    pill.classList.toggle("is-hidden", visible);
    pill.setAttribute("aria-hidden", visible ? "true" : "false");
    pill.tabIndex = visible ? -1 : 0;
  }, { threshold: 0 }).observe(summary);
}

$("app-name").textContent = APP_NAME;
$("app-version").textContent = `${APP_NAME} v${APP_VERSION} (${APP_STORY})`;
document.title = APP_NAME;
renderSummary();
setupCartPill();
if (SUPABASE_URL.startsWith("__")) showMenuState("error", "ระบบยังตั้งค่าการเชื่อมต่อฐานข้อมูลไม่ครบ กรุณาแจ้งผู้ดูแล");
else loadMenu();
