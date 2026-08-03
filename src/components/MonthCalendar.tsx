"use client";

import { useState, useTransition } from "react";
import { finalStatusFor, nextStatus, type MonthInputs } from "@/lib/billing";
import { monthGrid, monthLabel, todayKolkata } from "@/lib/utils";
import { setDayStatus } from "@/lib/server/actions/calendar";
import type { Customer, DayStatus } from "@/types/db";
import type { T } from "@/lib/i18n";

const STATUS_STYLE: Record<DayStatus, string> = {
  delivered: "bg-green-500 text-white",
  skipped: "bg-rose-500 text-white",
  extra: "bg-violet-500 text-white",
  holiday: "bg-amber-400 text-white",
  sunday_off: "bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export function MonthCalendar({
  t,
  customer,
  year,
  monthIndex,
  inputs,
  onMonthChange,
  lang,
}: {
  t: T;
  customer: Customer;
  year: number;
  monthIndex: number;
  inputs: MonthInputs;
  onMonthChange: (year: number, monthIndex: number) => void;
  lang: "en" | "hi";
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Map<string, DayStatus>>(new Map());

  const grid = monthGrid(year, monthIndex);
  const dowLabels = lang === "hi"
    ? ["सो", "सोम", "मं", "बु", "गु", "शु", "श"]
    : ["M", "T", "W", "T", "F", "S", "S"];

  const statusOf = (iso: string) => optimistic.get(iso) ?? finalStatusFor(iso, customer.id, inputs);

  const tap = (iso: string, inMonth: boolean) => {
    if (!inMonth || pending) return;
    const current = statusOf(iso);
    const nxt = nextStatus(current);
    setOptimistic((prev) => {
      const next = new Map(prev);
      next.set(iso, nxt);
      return next;
    });
    startTransition(async () => {
      const res = await setDayStatus(customer.id, iso, nxt);
      if (!res.ok) {
        setOptimistic((prev) => {
          const next = new Map(prev);
          next.set(iso, current);
          return next;
        });
      }
    });
  };

  const prevMonth = () => {
    const y = monthIndex === 0 ? year - 1 : year;
    const m = monthIndex === 0 ? 11 : monthIndex - 1;
    onMonthChange(y, m);
  };
  const nextMonth = () => {
    const y = monthIndex === 11 ? year + 1 : year;
    const m = monthIndex === 11 ? 0 : monthIndex + 1;
    onMonthChange(y, m);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          aria-label="Previous"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {monthLabel(year, monthIndex, lang)}
        </div>
        <button
          onClick={nextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          aria-label="Next"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {dowLabels.map((d, i) => (
          <div key={i} className="py-1 text-[10px] font-bold uppercase text-slate-400">
            {d}
          </div>
        ))}
        {grid.map((day, i) => {
          const status = statusOf(day.iso);
          const isToday = day.iso === todayKolkata();
          return (
            <button
              key={i}
              onClick={() => tap(day.iso, day.inMonth)}
              disabled={!day.inMonth}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-[13px] font-semibold transition-transform active:scale-90 ${
                day.inMonth ? STATUS_STYLE[status] : "invisible"
              }`}
            >
              {day.day}
              {isToday && day.inMonth && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-white/80" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-green-500" /> {t.delivered}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-rose-500" /> {t.skipped}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-violet-500" /> {t.extraMeal}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-amber-400" /> {t.holiday}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-slate-300 dark:bg-slate-700" /> {t.sundayOff}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{t.tapToChange}</p>
    </div>
  );
}
