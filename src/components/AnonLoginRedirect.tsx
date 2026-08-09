"use client";

import { useEffect, useState } from "react";
import { ensureAnonSession } from "@/lib/anon";

export function AnonLoginRedirect() {
  const [statusText, setStatusText] = useState("Opening your private workspace...");

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const ok = await ensureAnonSession();
      if (!isMounted) return;

      if (ok) {
        window.location.href = "/dashboard";
      } else {
        setStatusText("Setting up workspace...");
        setTimeout(async () => {
          const retryOk = await ensureAnonSession();
          if (retryOk && isMounted) {
            window.location.href = "/dashboard";
          }
        }, 1500);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full max-w-sm text-center">
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm font-medium text-orange-800 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300">
        <svg className="h-4 w-4 animate-spin text-orange-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>{statusText}</span>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
        Your data is private and separate. Only you can see your workspace.
      </p>
    </div>
  );
}
