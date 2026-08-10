"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setTheme } from "@/lib/server/actions/settings";
import type { T } from "@/lib/i18n";

export function TopBar({
  t,
  title,
  theme,
  back,
}: {
  t: T;
  title: string;
  theme: "light" | "dark";
  back?: boolean;
}) {
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const toggleTheme = () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `theme=${next}; path=/; max-age=31536000`;
    startTransition(async () => {
      await setTheme(next);
    });
  };

  const iconBtn =
    "pressable flex h-10 w-10 items-center justify-center rounded-full bg-[var(--card)] text-slate-600 dark:text-slate-300 shadow-sm border border-[var(--line)]";

  return (
    <header className="mb-4 flex h-12 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {back && (
          <button
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push("/dashboard");
            }}
            className={`${iconBtn} shrink-0`}
            aria-label={t.close}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/search" className={iconBtn} aria-label={t.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4-4" strokeLinecap="round" />
          </svg>
        </Link>
        <button onClick={toggleTheme} className={iconBtn} aria-label={t.darkMode}>
          {currentTheme === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
