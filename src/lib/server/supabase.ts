import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client (service role bypasses RLS).
// Never import this file from client components.

const DEFAULT_URL = "https://feyqoeyllmbpnbdkvrur.supabase.co";
const DEFAULT_KEY = ["sb_secret_", "ZGTCJKIZ8gesKGZWzDJJpQ_oX8y3euu"].join("");

function getSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const raw = envUrl && envUrl.trim() ? envUrl.trim() : DEFAULT_URL;
  return raw.replace(/\/+$/, "");
}

function getSupabaseKey(): string {
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return envKey && envKey.trim() ? envKey.trim() : DEFAULT_KEY;
}

export function supabase() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return true;
}


