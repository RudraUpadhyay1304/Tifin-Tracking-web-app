"use client";

import { useEffect } from "react";
import { ensureAnonSession } from "@/lib/anon";

export function Providers() {
  useEffect(() => {
    ensureAnonSession().then((authenticated) => {
      if (authenticated && typeof window !== "undefined") {
        if (window.location.pathname === "/login" || window.location.pathname === "/") {
          window.location.href = "/dashboard";
        }
      }
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is best-effort */
      });
    }
  }, []);

  return null;
}
