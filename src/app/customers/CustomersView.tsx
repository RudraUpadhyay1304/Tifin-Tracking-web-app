"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Badge, Button, EmptyState, Card } from "@/components/ui";
import { CustomerForm } from "@/components/CustomerForm";
import { inr, initials } from "@/lib/utils";
import type { CustomerWithMeta } from "@/types/db";
import type { T } from "@/lib/i18n";

export function CustomersView({
  t,
  theme,
  customers,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
  customers: CustomerWithMeta[];
}) {
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q),
    );
  }, [customers, query]);

  const statusColor = (s: string) =>
    s === "active" ? "green" : s === "paused" ? "orange" : "slate";

  return (
    <div className="rise">
      <TopBar t={t} title={t.customers} theme={theme} />

      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchByName}
          className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] pl-11 pr-4 text-base text-slate-900 dark:text-slate-100 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-shadow"
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4-4" strokeLinecap="round" />
        </svg>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="👥" text={query ? t.noResults : t.noCustomers} />
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link href={`/customers/${c.id}`}>
                <Card className="pressable flex items-center gap-3 p-3.5 active:bg-slate-50 dark:active:bg-white/5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 text-sm font-bold">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">
                        {c.name}
                      </p>
                      <Badge color={statusColor(c.status) as "green" | "orange" | "slate"}>
                        {c.status === "active" ? t.active : c.status === "paused" ? t.paused : t.inactive}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-slate-400">
                      {[c.phone, c.address].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {inr(c.monthly_charge)}
                      <span className="text-[10px] font-medium text-slate-400">/mo</span>
                    </p>
                    {c.pending > 0 && (
                      <p className="text-xs font-semibold text-red-500">{t.pending}: {inr(c.pending)}</p>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        <Button block onClick={() => setShowAdd(true)}>
          + {t.addCustomer}
        </Button>
      </div>

      <CustomerForm t={t} open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
