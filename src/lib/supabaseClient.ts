import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_URL = "https://feyqoeyllmbpnbdkvrur.supabase.co";
const DEFAULT_KEY = ["sb_secret_", "ZGTCJKIZ8gesKGZWzDJJpQ_oX8y3euu"].join("");

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL).replace(/\/+$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const supabase = createBrowserClient(url, key);
