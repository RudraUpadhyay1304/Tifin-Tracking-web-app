import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_URL = "https://feyqoeyllmbpnbdkvrur.supabase.co";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL).replace(/\/+$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createBrowserClient(url, key || "placeholder");
