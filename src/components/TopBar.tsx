"use client";

import Link from "next/link";
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

  const toggleTheme = () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `theme=${next}; path=/; max-age=31536000`;
    startTransition(async () => {
      await setTheme(next);
    });
  };

  return (
    <header className="mb-4 flex h-12 items-center justify-between">
      <div className="flex min-w-0 items-center gap-2">
        {back && (
          <Link
            href="/dashboard"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-[#131c31] text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-800"
            aria-label={t.close}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
        <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/search"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#131c31] text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-800"
          aria-label={t.search}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4-4" strokeLinecap="round" />
          </svg>
        </Link>
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#131c31] text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-800"
          aria-label={t.darkMode}
        >
          {currentTheme === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
