"use client";

import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_URL = "https://feyqoeyllmbpnbdkvrur.supabase.co";

const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL).replace(/\/+$/, "");
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function clientConfigured(): boolean {
  return Boolean(URL && ANON);
}

export function createClient() {
  return createBrowserClient(URL, ANON);
}