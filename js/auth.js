// auth.js — สถานะการล็อกอิน (UC02) และตัวช่วยให้ UC03 ใช้ต่อ
// ใช้ supabase-js แบบ vendor (PKCE, flowType 'pkce') ไม่มี secret ฝั่ง client
import { createClient } from "./vendor/supabase.js";
import { SUPABASE_URL, SUPABASE_KEY, AUTH_PROVIDERS } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

const MSG_OFFLINE = "ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
const MSG_GENERIC = "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const MSG_BAD_CREDENTIALS = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
const MSG_GOOGLE_UNAVAILABLE = "การเข้าสู่ระบบด้วย Google ยังไม่พร้อมใช้งาน กรุณาเข้าสู่ระบบด้วยอีเมลในระหว่างนี้";
const MSG_UNCONFIRMED = "บัญชียังไม่ได้ยืนยันอีเมล กรุณาติดต่อผู้ดูแลระบบ";
const MSG_SIGNOUT_FAILED = "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

export { AUTH_PROVIDERS };

export function displayNameOf(user) {
  if (!user) return "";
  const meta = user.user_metadata || {};
  return meta.full_name || meta.name || meta.display_name || user.email || "";
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("อ่านเซสชันไม่สำเร็จ:", error.message);
    return null;
  }
  return data.session ?? null;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export function isLoggedIn(session) {
  return Boolean(session && session.user);
}

/** สำหรับ UC03: คืนค่า session ถ้าล็อกอินแล้ว มิฉะนั้นคืนค่า null */
export async function requireAuth() {
  const session = await getSession();
  return session?.user ? session : null;
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => data.subscription.unsubscribe();
}

function isAuthParamName(name) {
  return (
    name === "code" ||
    name === "state" ||
    name === "error" ||
    name === "error_description" ||
    name === "error_code" ||
    name === "access_token" ||
    name === "refresh_token" ||
    name === "expires_in" ||
    name === "expires_at" ||
    name === "token_type" ||
    name === "provider_token" ||
    name === "provider_refresh_token" ||
    name === "type"
  );
}

function stripAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  let dirty = false;
  const names = [...url.searchParams.keys()];
  for (const name of names) {
    if (isAuthParamName(name)) {
      url.searchParams.delete(name);
      dirty = true;
    }
  }
  let hash = url.hash;
  if (hash && hash.length > 1) {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (raw.includes("=") && !raw.startsWith("summary") && !raw.startsWith("history") && !raw.startsWith("menu")) {
      const hp = new URLSearchParams(raw);
      let hashDirty = false;
      const hNames = [...hp.keys()];
      for (const name of hNames) {
        if (isAuthParamName(name)) {
          hp.delete(name);
          hashDirty = true;
        }
      }
      if (hashDirty) {
        const leftover = hp.toString();
        url.hash = leftover ? `#${leftover}` : "";
        dirty = true;
      }
    }
  }
  if (dirty) {
    const clean = `${url.pathname}${url.search}${url.hash}`;
    history.replaceState({}, document.title, clean);
  }
}

/** รอให้ supabase-js แลก code แล้วลบ token/code ออกจาก URL (AC9) */
export async function consumeAuthCallback() {
  const url = new URL(window.location.href);
  const hashRaw = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = hashRaw.includes("=") ? new URLSearchParams(hashRaw) : new URLSearchParams();
  const pending =
    url.searchParams.has("code") ||
    url.searchParams.has("error") ||
    url.searchParams.has("access_token") ||
    url.searchParams.has("refresh_token") ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    hashParams.has("code") ||
    hashParams.has("error");
  if (pending) {
    await supabase.auth.getSession();
  }
  stripAuthParamsFromUrl();
}

/** เดินสาย OAuth 2.0 + PKCE (Google) — redirectTo เป็น origin ปัจจุบันเท่านั้น */
export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });
}

export async function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function clearAuthStorage() {
  const sweep = (store) => {
    if (!store) return;
    const keys = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key) continue;
      const lower = key.toLowerCase();
      if (
        key.startsWith("sb-") ||
        lower.includes("code-verifier") ||
        lower.includes("code_verifier") ||
        lower.startsWith("supabase.auth")
      ) {
        keys.push(key);
      }
    }
    keys.forEach((key) => store.removeItem(key));
  };
  try {
    sweep(window.localStorage);
    sweep(window.sessionStorage);
  } catch (err) {
    console.error("ล้างที่เก็บเซสชันไม่สำเร็จ:", err && err.message);
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: "global" });
  clearAuthStorage();
  return { error };
}

export function authErrorMessage(error, context) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return MSG_OFFLINE;
  if (!error && context === "google-unavailable") return MSG_GOOGLE_UNAVAILABLE;
  if (!error) return MSG_GENERIC;
  const message = String(error.message || error.error_description || "").toLowerCase();
  const code = String(error.code || error.error_code || error.name || "").toLowerCase();
  if (code === "authretryablefetcherror" || message.includes("failed to fetch") || message.includes("network")) {
    return MSG_OFFLINE;
  }
  if (
    code === "invalid_credentials" ||
    message.includes("invalid login") ||
    message.includes("invalid_credentials") ||
    message.includes("invalid email or password")
  ) {
    return MSG_BAD_CREDENTIALS;
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return MSG_UNCONFIRMED;
  }
  if (
    context === "google" ||
    context === "google-unavailable" ||
    code === "provider_disabled" ||
    message.includes("provider is not enabled") ||
    message.includes("unsupported provider")
  ) {
    return MSG_GOOGLE_UNAVAILABLE;
  }
  if (context === "signout") return MSG_SIGNOUT_FAILED;
  return MSG_GENERIC;
}
