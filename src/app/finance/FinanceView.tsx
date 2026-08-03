"use client";

import { useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { BarChart } from "@/components/BarChart";
import { Card, SectionTitle, StatCard } from "@/components/ui";
import { downloadCSV, downloadExcel, endOfMonth, inr } from "@/lib/utils";
import type { Customer, Payment } from "@/types/db";
import type { T } from "@/lib/i18n";

interface MonthTotal {
  year: number;
  month: number;
  start: string;
  total: number;
}

export function FinanceView({
  t,
  lang,
  theme,
  customers,
  payments,
  monthly,
  pendingTotal,
  topPending,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
  customers: Customer[];
  payments: Payment[];
  monthly: MonthTotal[];
  currentYear: number;
  currentMonth: number;
  pendingTotal: number;
  topPending: { name: string; pending: number }[];
}) {
  const [selected, setSelected] = useState(5);

  const selectedMonth = monthly[selected];
  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  const dailyData = useMemo(() => {
    const start = selectedMonth.start;
    const end = endOfMonth(start);
    const map = new Map<string, number>();
    for (const p of payments) {
      if (p.payment_date >= start && p.payment_date <= end) {
        map.set(p.payment_date, (map.get(p.payment_date) ?? 0) + p.amount);
      }
    }
    const days = Number(end.slice(8, 10));
    const data: { label: string; value: number }[] = [];
    for (let d = 1; d <= days; d++) {
      const iso = `${start.slice(0, 8)}${String(d).padStart(2, "0")}`;
      data.push({ label: String(d), value: Math.round(map.get(iso) ?? 0) });
    }
    return data;
  }, [selectedMonth, payments]);

  const trendData = monthly.map((m) => ({
    label: new Date(m.year, m.month, 1).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
      month: "short",
    }),
    value: m.total,
  }));

  const collectionsTotal = useMemo(
    () => monthly.reduce((s, m) => s + m.total, 0),
    [monthly],
  );

  const monthIncome = selectedMonth.total;

  const exportCSV = () => {
    downloadCSV("payments.csv", [
      ["Date", "Customer", "Amount", "Method", "Notes"],
      ...payments.map((p) => [
        p.payment_date,
        nameOf(p.customer_id),
        p.amount,
        p.method,
        p.notes,
      ]),
    ]);
  };

  const exportExcel = () => {
    downloadExcel("payments.xls", [
      ["Date", "Customer", "Amount", "Method", "Notes"],
      ...payments.map((p) => [
        p.payment_date,
        nameOf(p.customer_id),
        p.amount,
        p.method,
        p.notes,
      ]),
    ]);
  };

  return (
    <div>
      <TopBar t={t} title={t.finance} theme={theme} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t.monthEarnings} value={inr(monthIncome)} accent />
        <StatCard label={t.pendingPayments} value={inr(pendingTotal)} />
        <StatCard label={t.collections} value={inr(collectionsTotal)} sub={t.last6Months} />
        <StatCard
          label={t.expectedMonthlyIncome}
          value={inr(customers.filter((c) => c.status === "active").reduce((s, c) => s + c.monthly_charge, 0))}
        />
      </div>

      <SectionTitle>{t.dailyIncome}</SectionTitle>
      <Card>
        <div className="mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {monthly.map((m, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                selected === i
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {new Date(m.year, m.month, 1).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
                month: "short",
                year: "2-digit",
              })}
            </button>
          ))}
        </div>
        <BarChart data={dailyData} height={150} />
      </Card>

      <SectionTitle>{t.monthlyTrend}</SectionTitle>
      <Card>
        <BarChart data={trendData} height={120} color="#10b981" />
      </Card>

      <SectionTitle>{t.topPending}</SectionTitle>
      <Card>
        {topPending.filter((x) => x.pending > 0).length === 0 ? (
          <p className="py-2 text-center text-sm text-slate-400">—</p>
        ) : (
          <ul className="space-y-2.5">
            {topPending
              .filter((x) => x.pending > 0)
              .map((x, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {x.name}
                  </span>
                  <span className="text-sm font-bold text-red-500">{inr(x.pending)}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={exportCSV}
          className="h-12 rounded-2xl bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 font-semibold text-sm text-slate-700 dark:text-slate-200"
        >
          {t.exportCSV}
        </button>
        <button
          onClick={exportExcel}
          className="h-12 rounded-2xl bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 font-semibold text-sm text-slate-700 dark:text-slate-200"
        >
          {t.exportExcel}
        </button>
      </div>
    </div>
  );
}
