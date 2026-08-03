"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Card, StatCard, SectionTitle, Badge } from "@/components/ui";
import { CustomerForm } from "@/components/CustomerForm";
import { PaymentForm } from "@/components/PaymentForm";
import { HolidayForm } from "@/components/HolidayForm";
import { inr, prettyDate } from "@/lib/utils";
import type { Customer, Holiday, Settings } from "@/types/db";
import type { T } from "@/lib/i18n";

export function DashboardView({
  t,
  lang,
  theme,
  settings,
  customers,
  totalPending,
  todayEarnings,
  monthEarnings,
  expectedMonthly,
  totalCustomers,
  activeCustomers,
  upcomingHolidays,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
  settings: Settings;
  customers: Customer[];
  totalPending: number;
  todayEarnings: number;
  monthEarnings: number;
  expectedMonthly: number;
  totalCustomers: number;
  activeCustomers: number;
  upcomingHolidays: Holiday[];
}) {
  const [showCustomer, setShowCustomer] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showHoliday, setShowHoliday] = useState(false);

  const actions = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      ),
      label: t.addCustomer,
      onClick: () => setShowCustomer(true),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          <rect x="4" y="3" width="16" height="18" rx="3" />
          <path d="M8 8h8M8 12h8M8 16h4" strokeLinecap="round" />
        </svg>
      ),
      label: t.recordPayment,
      onClick: () => setShowPayment(true),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
        </svg>
      ),
      label: t.markHoliday,
      onClick: () => setShowHoliday(true),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
        </svg>
      ),
      label: t.updateMenu,
      href: "/menu",
    },
  ];

  return (
    <div>
      <TopBar t={t} title={settings.business_name || t.appName} theme={theme} />
      <h2 className="mb-3 text-2xl font-extrabold text-slate-900 dark:text-white">
        {t.today} 🍱
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t.todayEarnings} value={inr(todayEarnings)} accent />
        <StatCard label={t.monthEarnings} value={inr(monthEarnings)} />
        <StatCard label={t.totalCustomers} value={totalCustomers} sub={`${t.active}: ${activeCustomers}`} />
        <StatCard
          label={t.pendingPayments}
          value={inr(totalPending)}
          sub={t.expectedMonthlyIncome + " " + inr(expectedMonthly)}
        />
      </div>

      <SectionTitle>{t.quickActions}</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a, i) => (
          <div key={i}>
            {a.href ? (
              <Link href={a.href}>
                <QuickAction icon={a.icon} label={a.label} />
              </Link>
            ) : (
              <button onClick={a.onClick} className="w-full">
                <QuickAction icon={a.icon} label={a.label} />
              </button>
            )}
          </div>
        ))}
      </div>

      <SectionTitle>{t.upcomingHolidays}</SectionTitle>
      <Card>
        {upcomingHolidays.length === 0 ? (
          <p className="py-2 text-center text-sm text-slate-400">{t.noHolidays}</p>
        ) : (
          <ul className="space-y-3">
            {upcomingHolidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {h.customer_id === null ? t.globalHoliday : customers.find((c) => c.id === h.customer_id)?.name ?? "—"}
                  </p>
                  {h.reason && <p className="truncate text-xs text-slate-400">{h.reason}</p>}
                </div>
                <Badge color="orange">
                  {prettyDate(h.start_date, lang)}
                  {h.end_date !== h.start_date && " – " + prettyDate(h.end_date, lang)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <CustomerForm t={t} open={showCustomer} onClose={() => setShowCustomer(false)} />
      <PaymentForm
        t={t}
        open={showPayment}
        onClose={() => setShowPayment(false)}
        customers={customers}
      />
      <HolidayForm
        t={t}
        open={showHoliday}
        onClose={() => setShowHoliday(false)}
        customers={customers}
      />
    </div>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-white dark:bg-[#131c31] border border-slate-100 dark:border-slate-800 shadow-sm text-orange-500 active:scale-95 transition-transform">
      {icon}
      <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  );
}
