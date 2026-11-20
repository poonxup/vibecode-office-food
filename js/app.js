import { APP_NAME, APP_VERSION, APP_STORY, SUPABASE_URL, SUPABASE_KEY, AUTH_PROVIDERS } from "./config.js";
import { createCart, addItem, lineTotal, totals, formatBaht } from "./cart.js";
import {
  consumeAuthCallback,
  getSession,
  onAuthChange,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  displayNameOf,
  isLoggedIn,
  requireAuth,
  authErrorMessage,
  clearAuthStorage,
} from "./auth.js";

export { requireAuth, getSession, isLoggedIn };

let cart = createCart();
let menu = [];
let currentSession = null;
let authBusy = false;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const MSG_LOAD_FAILED = "ไม่สามารถโหลดเมนูได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
const MSG_OFFLINE = "ไม่มีการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบแล้วลองใหม่";
const MSG_LOGIN_REQUIRED_ORDER = "กรุณาเข้าสู่ระบบก่อนยืนยันคำสั่งซื้อ";
const MSG_LOGIN_REQUIRED_HISTORY = "กรุณาเข้าสู่ระบบก่อนดูประวัติการสั่งซื้อ";
const MSG_UC03_CONFIRM = "การยืนยันสั่งซื้อจะเปิดใช้ในรอบถัดไป (UC03)";
const MSG_UC03_HISTORY = "หน้าประวัติการสั่งซื้อจะเปิดใช้ในรอบถัดไป (UC03)";
const MSG_GOOGLE_UNAVAILABLE = "การเข้าสู่ระบบด้วย Google ยังไม่พร้อมใช้งาน กรุณาเข้าสู่ระบบด้วยอีเมลในระหว่างนี้";

const GOOGLE_ICON = `<svg class="g-icon" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>`;

async function loadMenu() {
  showMenuState("loading");
  try {
    const url = `${SUPABASE_URL}/rest/v1/menu_items?select=id,name,price,category,image_url,is_available,sort_order&is_available=eq.true&order=sort_order.asc,id.asc`;
    const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!res.ok) {
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
    console.error("โหลดเมนูไม่สำเร็จ:", err && err.message, err && err.detail ? err.detail : "");
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

function renderSummary() {
  const t = totals(cart);
  $("sum-qty").textContent = `${t.qty} ชิ้น`;
  $("sum-total").textContent = formatBaht(t.amount);
  $("cart-badge").textContent = t.qty;
  const confirmBtn = $("btn-confirm");
  if (confirmBtn) confirmBtn.disabled = t.qty === 0;
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

function setAuthMessage(text, kind) {
  const box = document.getElementById("auth-msg");
  if (!box) return;
  if (!text) {
    box.hidden = true;
    box.textContent = "";
    return;
  }
  box.hidden = false;
  box.className = kind === "info" ? "auth-msg is-info" : "auth-msg";
  box.textContent = text;
}

function setOrderGuard(text) {
  const box = $("order-guard");
  if (!box) return;
  if (!text) {
    box.hidden = true;
    box.textContent = "";
    return;
  }
  box.hidden = false;
  box.textContent = text;
}

function showHistory(message) {
  const panel = $("history");
  $("history-msg").textContent = message;
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideHistory() {
  $("history").hidden = true;
}

function focusLogin() {
  const email = document.getElementById("auth-email");
  if (email) {
    email.focus();
    $("auth-bar").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  $("auth-bar").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAuthBar() {
  const root = $("auth-bar");
  const loggedIn = isLoggedIn(currentSession);
  const user = currentSession && currentSession.user;
  if (loggedIn && user) {
    const name = displayNameOf(user);
    const email = user.email || "";
    root.innerHTML = `
      <div class="auth-user">
        <p class="auth-hello">เข้าสู่ระบบแล้ว</p>
        <p class="auth-name">${esc(name)}</p>
        ${email && email !== name ? `<p class="auth-email">${esc(email)}</p>` : ""}
        <div class="auth-actions">
          <button type="button" class="btn-history" id="btn-history">ประวัติการสั่งซื้อ</button>
          <button type="button" class="btn-logout" id="btn-logout">ออกจากระบบ</button>
        </div>
        <p id="auth-msg" class="auth-msg" hidden></p>
      </div>`;
    $("btn-logout").addEventListener("click", onLogoutClick);
    $("btn-history").addEventListener("click", onHistoryClick);
    return;
  }
  const googleDisabled = !AUTH_PROVIDERS.google;
  root.innerHTML = `
    <div class="auth-guest">
      <p id="auth-msg" class="auth-msg" hidden></p>
      <button type="button" class="btn-google${googleDisabled ? " is-disabled" : ""}" id="btn-google" ${googleDisabled ? 'aria-disabled="true"' : ""}>
        ${GOOGLE_ICON}
        <span>เข้าสู่ระบบด้วย Google</span>
      </button>
      ${googleDisabled ? `<p class="google-note">ยังไม่พร้อมใช้งาน — ใช้ได้เมื่อเจ้าของเปิด Google OAuth</p>` : ""}
      ${AUTH_PROVIDERS.password ? `
      <form class="auth-form" id="auth-form" autocomplete="on">
        <label>อีเมล
          <input id="auth-email" name="email" type="email" inputmode="email" autocomplete="username" required>
        </label>
        <label>รหัสผ่าน
          <input id="auth-password" name="password" type="password" autocomplete="current-password" required>
        </label>
        <button type="submit" class="btn-login" id="btn-login">เข้าสู่ระบบ</button>
      </form>` : ""}
    </div>`;
  $("btn-google").addEventListener("click", onGoogleClick);
  const form = $("auth-form");
  if (form) form.addEventListener("submit", onPasswordSubmit);
}

async function onGoogleClick() {
  if (authBusy) return;
  if (!AUTH_PROVIDERS.google) {
    setAuthMessage(MSG_GOOGLE_UNAVAILABLE, "info");
    return;
  }
  authBusy = true;
  try {
    const { error } = await signInWithGoogle();
    if (error) {
      console.error("ล็อกอินด้วย Google ไม่สำเร็จ:", error.message);
      setAuthMessage(authErrorMessage(error, "google"));
    }
  } catch (err) {
    console.error("ล็อกอินด้วย Google ไม่สำเร็จ:", err && err.message);
    setAuthMessage(authErrorMessage(err, "google"));
  } finally {
    authBusy = false;
  }
}

async function onPasswordSubmit(event) {
  event.preventDefault();
  if (authBusy) return;
  const email = ($("auth-email") && $("auth-email").value || "").trim();
  const password = ($("auth-password") && $("auth-password").value) || "";
  if (!email || !password) {
    setAuthMessage("กรุณากรอกอีเมลและรหัสผ่าน");
    return;
  }
  authBusy = true;
  const btn = $("btn-login");
  if (btn) btn.disabled = true;
  try {
    const { data, error } = await signInWithPassword(email, password);
    if (error || !data || !data.session) {
      console.error("ล็อกอินด้วยอีเมลไม่สำเร็จ:", error && error.message);
      setAuthMessage(authErrorMessage(error));
      return;
    }
    currentSession = data.session;
    renderAuthBar();
    setOrderGuard("");
    hideHistory();
  } catch (err) {
    console.error("ล็อกอินด้วยอีเมลไม่สำเร็จ:", err && err.message);
    setAuthMessage(authErrorMessage(err));
  } finally {
    authBusy = false;
    const loginBtn = $("btn-login");
    if (loginBtn) loginBtn.disabled = false;
  }
}

async function onLogoutClick() {
  if (authBusy) return;
  authBusy = true;
  try {
    const { error } = await signOut();
    if (error) console.error("ออกจากระบบไม่สำเร็จ:", error.message);
    currentSession = null;
    clearAuthStorage();
    renderAuthBar();
    setOrderGuard("");
    hideHistory();
    if (error) setAuthMessage(authErrorMessage(error, "signout"));
  } catch (err) {
    currentSession = null;
    clearAuthStorage();
    renderAuthBar();
    console.error("ออกจากระบบไม่สำเร็จ:", err && err.message);
    setAuthMessage(authErrorMessage(err, "signout"));
  } finally {
    authBusy = false;
  }
}

async function onHistoryClick() {
  const session = await requireAuth();
  if (!session) {
    hideHistory();
    setOrderGuard(MSG_LOGIN_REQUIRED_HISTORY);
    setAuthMessage(MSG_LOGIN_REQUIRED_HISTORY, "info");
    focusLogin();
    return;
  }
  setOrderGuard("");
  showHistory(MSG_UC03_HISTORY);
}

async function onConfirmClick() {
  const t = totals(cart);
  if (t.qty === 0) return;
  const session = await requireAuth();
  if (!session) {
    setOrderGuard(MSG_LOGIN_REQUIRED_ORDER);
    setAuthMessage(MSG_LOGIN_REQUIRED_ORDER, "info");
    focusLogin();
    return;
  }
  setOrderGuard(MSG_UC03_CONFIRM);
}

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

function setupGuards() {
  $("btn-confirm").addEventListener("click", onConfirmClick);
  $("history-back").addEventListener("click", () => {
    hideHistory();
    $("menu-h").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

$("menu-grid").addEventListener("error", (e) => {
  const el = e.target;
  if (el instanceof HTMLImageElement && el.closest(".menu-card")) el.remove();
}, true);

$("app-name").textContent = APP_NAME;
$("app-version").textContent = `${APP_NAME} v${APP_VERSION} (${APP_STORY})`;
document.title = APP_NAME;
renderSummary();
setupCartPill();
setupGuards();
renderAuthBar();

async function bootAuth() {
  await consumeAuthCallback();
  currentSession = await getSession();
  renderAuthBar();
  onAuthChange((_event, session) => {
    currentSession = session;
    renderAuthBar();
  });
  window.addEventListener("pageshow", async () => {
    const session = await getSession();
    currentSession = session;
    renderAuthBar();
  });
}

bootAuth();

if (SUPABASE_URL.startsWith("__")) showMenuState("error", "ระบบยังตั้งค่าการเชื่อมต่อฐานข้อมูลไม่ครบ กรุณาแจ้งผู้ดูแล");
else loadMenu();
