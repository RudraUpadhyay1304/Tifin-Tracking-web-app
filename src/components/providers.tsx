"use client";

import { useEffect } from "react";
import { ensureAnonSession } from "@/lib/anon";

export function Providers() {
  useEffect(() => {
    ensureAnonSession();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is best-effort */
      });
    }
  }, []);

  return null;
}
