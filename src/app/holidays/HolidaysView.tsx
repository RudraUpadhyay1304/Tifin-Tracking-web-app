"use client";

import { useState, useTransition } from "react";
import { TopBar } from "@/components/TopBar";
import { Badge, Button, Card, EmptyState, Segmented } from "@/components/ui";
import { HolidayForm } from "@/components/HolidayForm";
import { deleteHoliday } from "@/lib/server/actions/holidays";
import { prettyDate, todayKolkata } from "@/lib/utils";
import type { Customer, Holiday } from "@/types/db";
import type { T } from "@/lib/i18n";

export function HolidaysView({
  t,
  lang,
  theme,
  customers,
  holidays,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
  customers: Customer[];
  holidays: Holiday[];
}) {
  const [tab, setTab] = useState("upcoming");
  const [showAdd, setShowAdd] = useState(false);
  const [busy, startTransition] = useTransition();
  const today = todayKolkata();

  const list = holidays
    .filter((h) => (tab === "upcoming" ? h.end_date >= today : h.end_date < today))
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  const nameOf = (id: string | null) =>
    id === null ? t.globalHoliday : customers.find((c) => c.id === id)?.name ?? "—";

  const remove = (id: string) => {
    startTransition(async () => {
      await deleteHoliday(id);
    });
  };

  return (
    <div>
      <TopBar t={t} title={t.holidays} theme={theme} back />

      <div className="mb-4">
        <Segmented
          options={[
            { value: "upcoming", label: t.upcoming },
            { value: "past", label: t.past },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState icon="🗓️" text={t.noHolidaysMsg} />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {nameOf(h.customer_id)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {prettyDate(h.start_date, lang)} – {prettyDate(h.end_date, lang)}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </p>
                </div>
                <Badge color="orange">
                  {h.end_date >= today ? t.upcoming : t.past}
                </Badge>
                <button
                  onClick={() => remove(h.id)}
                  disabled={busy}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:text-red-500 dark:text-slate-600"
                  aria-label={t.delete}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5">
                    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 13a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l.8-13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-5">
        <Button block onClick={() => setShowAdd(true)}>
          + {t.addHoliday}
        </Button>
      </div>

      <HolidayForm t={t} open={showAdd} onClose={() => setShowAdd(false)} customers={customers} />
    </div>
  );
}
