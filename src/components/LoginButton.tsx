"use client";

import { useState } from "react";
import { createClient, clientConfigured } from "@/lib/supabase/client";
import type { T } from "@/lib/i18n";

export function LoginButton({ t }: { t: T }) {
  const [busy, setBusy] = useState(false);

  if (!clientConfigured()) return null;

  const onLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setBusy(false);
    } catch {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onLogin}
      disabled={busy}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-white text-[15px] font-semibold text-slate-700 shadow-sm border border-slate-200 active:bg-slate-50 disabled:opacity-40"
    >
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
        />
        <path
          fill="#FF3D00"
          d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 40.2 44 36 44 24c0-1.3-.1-2.6-.4-3.9z"
        />
      </svg>
      {busy ? t.loading : t.signInGoogle}
    </button>
  );
}