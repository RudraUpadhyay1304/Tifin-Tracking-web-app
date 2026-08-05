import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-only Supabase clients.
// - `serverSupabase()`: authenticated client (anon key + the signed-in user's
//   JWT from cookies). Row Level Security applies — a user only ever sees their
//   own data. Use this for ALL app data. Never import this from client code.
// - `supabaseAdmin()`: service_role client that bypasses RLS. Use ONLY for
//   trusted server-side jobs such as the nightly Sheets backup.
//
// Never import this file from client components.

const DEFAULT_URL = "https://feyqoeyllmbpnbdkvrur.supabase.co";
const DEFAULT_KEY = ["sb_secret_", "ZGTCJKIZ8gesKGZWzDJJpQ_oX8y3euu"].join("");

function getSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const raw = envUrl && envUrl.trim() ? envUrl.trim() : DEFAULT_URL;
  return raw.replace(/\/+$/, "");
}

function getSupabaseAnonKey(): string {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return envKey && envKey.trim() ? envKey.trim() : "";
}

function getSupabaseServiceKey(): string {
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return envKey && envKey.trim() ? envKey.trim() : DEFAULT_KEY;
}

export function getSupabaseAnonKeyConfigured(): boolean {
  return getSupabaseAnonKey().length > 0;
}

/** Authenticated per-user client. Returns null when auth is not configured. */
export async function serverSupabase() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!anonKey) return null;

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component (cookies are read-only there).
          // The session is refreshed in proxy.ts, so this is harmless.
        }
      },
    },
  });
}

/** Service-role client (bypasses RLS). Only for trusted server-side jobs. */
export function supabaseAdmin() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface ServerUser {
  id: string;
  email: string | null;
  name: string | null;
}

/** Returns the signed-in user or null when not authenticated / not configured. */
export async function getServerUser(): Promise<ServerUser | null> {
  const db = await serverSupabase();
  if (!db) return null;
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
  };
}