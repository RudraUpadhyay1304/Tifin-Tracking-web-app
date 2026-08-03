"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Card, EmptyState } from "@/components/ui";
import { inr, initials } from "@/lib/utils";
import type { Customer } from "@/types/db";
import type { T } from "@/lib/i18n";

export function SearchView({
  t,
  theme,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    timer.current = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        setResults(await res.json());
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <div>
      <TopBar t={t} title={t.globalSearch} theme={theme} />

      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchByName}
          autoFocus
          className="h-13 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131c31] px-4 pr-4 text-[15px] outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      {loading && <p className="py-4 text-center text-sm text-slate-400">{t.loading}</p>}
      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <EmptyState icon="🔍" text={t.noResults} />
      )}

      <ul className="space-y-3">
        {results.map((c) => (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`}>
              <Card className="flex items-center gap-3 p-3.5 active:bg-slate-50 dark:active:bg-white/5 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 text-sm font-bold">
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {[c.phone, c.address].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-700 dark:text-slate-200">
                  {inr(c.monthly_charge)}
                </p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
