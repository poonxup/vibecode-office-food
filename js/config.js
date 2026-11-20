// ค่าคอนฟิกสาธารณะ (publishable key อ่านได้เฉพาะข้อมูลที่ RLS อนุญาต ปลอดภัยที่จะอยู่ฝั่งเบราว์เซอร์)
export const APP_NAME = "Office Food Ordering";
export const APP_VERSION = "1.2.0";          // เปลี่ยนทุกครั้งที่ Deploy
export const APP_STORY = "UC03";
export const SUPABASE_URL = "https://yhcjsgbffgabsmsybnle.supabase.co";
export const SUPABASE_KEY = "sb_publishable_lEGRtI6NGfCNwm1V96lWDw_omtbL7h3";

// ผู้ให้บริการล็อกอิน — Google เดินสาย OAuth + PKCE ไว้แล้ว แต่ยังปิดอยู่
// จนกว่าเจ้าของจะเปิด Google provider ใน Supabase Dashboard และใส่ OAuth client
// ระหว่างนี้ใช้ Email+Password กับบัญชีที่ผู้ดูแลสร้างให้ (signup ยังปิดตาม ACT-05)
export const AUTH_PROVIDERS = { google: false, password: true };
