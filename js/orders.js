// orders.js — UC03 คำสั่งซื้อ: เรียก RPC / อ่านประวัติ / จัดรูปแบบ (ไม่ยุ่ง DOM เพื่อทดสอบด้วย Node ได้)
// ฝั่ง client ส่งแค่ menu_item_id + qty ; ราคา/ยอดรวม/เจ้าของบิล DB เป็นคนกำหนดเอง
import { formatBaht } from "./cart.js";

const ERR_DETAIL_MESSAGES = {
  UC03_NOT_LOGGED_IN: "กรุณาเข้าสู่ระบบก่อนยืนยันคำสั่งซื้อ",
  UC03_EMPTY_CART: "ตะกร้าว่าง กรุณาเลือกเมนูก่อนยืนยันสั่งซื้อ",
  UC03_BAD_ITEMS: "รายการสั่งซื้อไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
  UC03_BAD_QTY: "จำนวนที่สั่งต้องเป็นจำนวนเต็ม 1 ถึง 99 ต่อเมนู",
  UC03_ITEM_NOT_FOUND: "ไม่พบเมนูที่เลือก กรุณารีเฟรชหน้าแล้วเลือกใหม่",
  UC03_ITEM_UNAVAILABLE: "มีเมนูที่ไม่พร้อมจำหน่ายในขณะนี้",
};
export const MSG_ORDER_GENERIC = "บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
export const MSG_ORDER_OFFLINE = "ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
export const MSG_SESSION_EXPIRED = "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
export const MSG_HISTORY_FAILED = "โหลดประวัติการสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
export const MSG_ORDER_NOT_FOUND = "ไม่พบคำสั่งซื้อนี้";

/** รหัส error จาก RPC (details) -> ข้อความไทยที่เป็นมิตร ไม่เผยรายละเอียดระบบ */
export function orderErrorMessage(error) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return MSG_ORDER_OFFLINE;
  if (!error) return MSG_ORDER_GENERIC;
  const detail = String(error.details || error.detail || "");
  if (ERR_DETAIL_MESSAGES[detail]) return ERR_DETAIL_MESSAGES[detail];
  const text = String(error.message || "").toLowerCase();
  const status = Number(error.status || 0);
  if (status === 401 || status === 403 || error.code === "PGRST301" || text.includes("jwt")) return MSG_SESSION_EXPIRED;
  if (text.includes("failed to fetch") || text.includes("network")) return MSG_ORDER_OFFLINE;
  return MSG_ORDER_GENERIC;
}

/** แปลงตะกร้า -> payload ที่ส่งให้ RPC (เฉพาะ menu_item_id + qty) */
export function buildOrderPayload(cart) {
  return cart.lines.map((l) => ({ menu_item_id: Number(l.id), qty: Number(l.qty) }));
}

/** บันทึกคำสั่งซื้อผ่าน RPC place_order -> { orderId } หรือ { error } */
export async function placeOrder(supabase, cart) {
  const { data, error } = await supabase.rpc("place_order", { items: buildOrderPayload(cart) });
  if (error) return { error };
  return { orderId: data };
}

const ORDER_SELECT =
  "id,created_at,total,status,order_items(id,menu_item_id,name_snapshot,unit_price_snapshot,qty,line_total)";

function sortItems(order) {
  const items = (order.order_items || []).slice().sort((a, b) => a.id - b.id);
  return { ...order, order_items: items };
}

/** ประวัติของผู้ใช้ที่ล็อกอิน เรียงใหม่ -> เก่า (RLS จำกัดเฉพาะของตนเอง) */
export async function fetchOrders(supabase) {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) return { error };
  return { orders: (data || []).map(sortItems) };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s) => UUID_RE.test(String(s || ""));

/** รายละเอียดบิลเดียว — ไม่ใช่ของตนเอง/ไม่มี => order = null (RLS คืน 0 แถว) */
export async function fetchOrder(supabase, id) {
  if (!isUuid(id)) return { order: null };
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (error) return { error };
  return { order: data ? sortItems(data) : null };
}

/** วันเวลา Asia/Bangkok เช่น 21/11/2026 14:35:07 น. */
export function formatBangkok(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d).reduce((o, p) => { o[p.type] = p.value; return o; }, {});
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second} น.`;
}

export { formatBaht };
