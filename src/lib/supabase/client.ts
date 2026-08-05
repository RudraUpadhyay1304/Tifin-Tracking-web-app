"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client used only for starting Google OAuth and signing out.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function clientConfigured(): boolean {
  return Boolean(URL && ANON);
}

export function createClient() {
  return createBrowserClient(URL, ANON);
}