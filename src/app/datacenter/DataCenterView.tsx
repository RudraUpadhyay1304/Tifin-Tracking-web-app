"use client";

import { useMemo, useState, useTransition } from "react";
import { TopBar } from "@/components/TopBar";
import { Button, Card, EmptyState, Segmented } from "@/components/ui";
import { BarChart } from "@/components/BarChart";
import { setDayStatus } from "@/lib/server/actions/calendar";
import { deleteCustomer, updateCustomer } from "@/lib/server/actions/customers";
import { deletePayment } from "@/lib/server/actions/payments";
import { saveMenu } from "@/lib/server/actions/menu";
import { loadDataCenterMonth } from "@/lib/server/actions/read";
import { finalStatusFor, nextStatus, type MonthInputs } from "@/lib/billing";
import {
  downloadCSV,
  downloadExcel,
  endOfMonth,
  inr,
  monthGrid,
  monthLabel,
  prettyDate,
} from "@/lib/utils";
import type { Customer, DayStatus, MenuItem, Payment } from "@/types/db";
import type { T } from "@/lib/i18n";

export interface StatsRow {
  customerId: string;
  delivered: number;
  skipped: number;
  extra: number;
  due: number;
  paid: number;
  pending: number;
}

const CELL_STYLE: Record<DayStatus, string> = {
  delivered: "bg-green-500",
  skipped: "bg-rose-500",
  extra: "bg-violet-500",
  holiday: "bg-amber-400",
  sunday_off: "bg-slate-300 dark:bg-slate-600",
};

export function DataCenterView({
  t,
  lang,
  theme,
  customers,
  inputs,
  statsByCustomer,
  monthPayments,
  allPayments,
  menu,
  initialYear,
  initialMonth,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
  customers: Customer[];
  inputs: MonthInputs;
  statsByCustomer: StatsRow[];
  monthPayments: Payment[];
  allPayments: Payment[];
  menu: MenuItem[];
  initialYear: number;
  initialMonth: number;
}) {
  const [tab, setTab] = useState("customers");
  return (
    <div>
      <TopBar t={t} title={t.dataCenter} theme={theme} />
      <div className="mb-4">
        <Segmented
          options={[
            { value: "customers", label: t.tabCustomers },
            { value: "calendar", label: t.tabCalendar },
            { value: "payments", label: t.tabPayments },
            { value: "menu", label: t.tabMenu },
            { value: "analytics", label: t.tabAnalytics },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "customers" && (
        <CustomersTab t={t} lang={lang} customers={customers} statsByCustomer={statsByCustomer} />
      )}
      {tab === "calendar" && (
        <CalendarTab
          t={t}
          lang={lang}
          customers={customers}
          initialYear={initialYear}
          initialMonth={initialMonth}
          initialInputs={inputs}
        />
      )}
      {tab === "payments" && (
        <PaymentsTab t={t} lang={lang} customers={customers} monthPayments={monthPayments} allPayments={allPayments} />
      )}
      {tab === "menu" && <MenuTab t={t} menu={menu} />}
      {tab === "analytics" && (
        <AnalyticsTab
          t={t}
          lang={lang}
          customers={customers}
          statsByCustomer={statsByCustomer}
          monthPayments={monthPayments}
          year={initialYear}
          month={initialMonth}
        />
      )}
    </div>
  );
}

/* ---------------- Customers tab ---------------- */
function CustomersTab({
  t,
  customers,
  statsByCustomer,
}: {
  t: T;
  lang: "en" | "hi";
  customers: Customer[];
  statsByCustomer: StatsRow[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [busy, startTransition] = useTransition();

  const pendingOf = (id: string) => statsByCustomer.find((s) => s.customerId === id)?.pending ?? 0;
  const dueOf = (id: string) => statsByCustomer.find((s) => s.customerId === id)?.due ?? 0;

  const rows = useMemo(() => {
    const pendingOf = (id: string) =>
      statsByCustomer.find((s) => s.customerId === id)?.pending ?? 0;
    const q = query.trim().toLowerCase();
    const filtered = customers.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q),
    );
    return filtered.sort((a, b) => {
      if (sort === "charge") return b.monthly_charge - a.monthly_charge;
      if (sort === "pending") return pendingOf(b.id) - pendingOf(a.id);
      return a.name.localeCompare(b.name);
    });
  }, [customers, query, sort, statsByCustomer]);

  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    pending: statsByCustomer.reduce((s, x) => s + x.pending, 0),
    income: customers.filter((c) => c.status === "active").reduce((s, c) => s + c.monthly_charge, 0),
  };

  const editCharge = (id: string, value: string) => {
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    startTransition(async () => {
      await updateCustomer(id, {
        name: c.name,
        phone: c.phone,
        address: c.address,
        monthly_charge: Number(value || 0),
        joining_date: c.joining_date,
        status: c.status,
        notes: c.notes,
      });
    });
  };

  const editStatus = (id: string, status: string) => {
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    startTransition(async () => {
      await updateCustomer(id, {
        name: c.name,
        phone: c.phone,
        address: c.address,
        monthly_charge: c.monthly_charge,
        joining_date: c.joining_date,
        status: status as Customer["status"],
        notes: c.notes,
      });
    });
  };

  const remove = (id: string) => {
    if (!confirm(`Delete?`)) return;
    startTransition(async () => {
      await deleteCustomer(id);
    });
  };

  const exportData = (excel: boolean) => {
    const rowsData = [
      ["Name", "Phone", "Address", "Monthly charge", "Status", "Due", "Paid", "Pending"],
      ...rows.map((c) => [
        c.name,
        c.phone,
        c.address,
        c.monthly_charge,
        c.status,
        dueOf(c.id),
        statsByCustomer.find((s) => s.customerId === c.id)?.paid ?? 0,
        pendingOf(c.id),
      ]),
    ];
    if (excel) downloadExcel("customers.xls", rowsData);
    else downloadCSV("customers.csv", rowsData);
  };

  return (
    <div>
      <div className="mb-3 grid grid-cols-4 gap-2 text-center">
        <Stat label={t.statsTotal} value={String(stats.total)} />
        <Stat label={t.statsActive} value={String(stats.active)} />
        <Stat label={t.statsPending} value={inr(stats.pending)} red />
        <Stat label={t.statsIncome} value={inr(stats.income)} />
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          className="h-10 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm outline-none focus:border-orange-400"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm outline-none"
        >
          <option value="name">{t.name}</option>
          <option value="charge">{t.monthlyCharge}</option>
          <option value="pending">{t.pending}</option>
        </select>
        <button onClick={() => exportData(false)} className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
          CSV
        </button>
        <button onClick={() => exportData(true)} className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
          XLS
        </button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="sticky top-0 bg-[var(--card)]">
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2.5">{t.name}</th>
              <th className="px-2 py-2.5">₹/mo</th>
              <th className="px-2 py-2.5">{t.status}</th>
              <th className="px-2 py-2.5">{t.pending}</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((c) => {
              const pending = pendingOf(c.id);
              return (
                <tr key={c.id} className={pending > 0 ? "bg-red-50/60 dark:bg-red-950/20" : ""}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</p>
                    <p className="text-[11px] text-slate-400">{c.phone || c.address || "—"}</p>
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      defaultValue={c.monthly_charge}
                      inputMode="numeric"
                      onBlur={(e) => e.target.value !== String(c.monthly_charge) && editCharge(c.id, e.target.value)}
                      className="w-16 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus:border-orange-400"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <select
                      value={c.status}
                      onChange={(e) => editStatus(c.id, e.target.value)}
                      disabled={busy}
                      className={`rounded-full border-0 px-2 py-1 text-xs font-semibold ${
                        c.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : c.status === "paused"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      <option value="active">{t.active}</option>
                      <option value="paused">{t.paused}</option>
                      <option value="inactive">{t.inactive}</option>
                    </select>
                  </td>
                  <td className={`px-2 py-2.5 font-bold ${pending > 0 ? "text-red-500" : "text-green-600"}`}>
                    {inr(pending)}
                  </td>
                  <td className="px-2 py-2.5">
                    <button onClick={() => remove(c.id)} className="text-slate-300 hover:text-red-500" aria-label={t.delete}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 13a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l.8-13" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------- Calendar tab (daily register) ---------------- */
function CalendarTab({
  t,
  lang,
  customers,
  initialYear,
  initialMonth,
  initialInputs,
}: {
  t: T;
  lang: "en" | "hi";
  customers: Customer[];
  initialYear: number;
  initialMonth: number;
  initialInputs: MonthInputs;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [inputs, setInputs] = useState(initialInputs);
  const [optimistic, setOptimistic] = useState<Map<string, DayStatus>>(new Map());
  const [busy, startTransition] = useTransition();

  const active = customers.filter((c) => c.status !== "inactive");
  const grid = monthGrid(year, month).filter((d) => d.inMonth);

  const statusOf = (cid: string, iso: string) =>
    optimistic.get(cid + iso) ?? finalStatusFor(iso, cid, inputs);

  const tap = (cid: string, iso: string) => {
    const current = statusOf(cid, iso);
    const nxt = nextStatus(current);
    setOptimistic((prev) => new Map(prev).set(cid + iso, nxt));
    startTransition(async () => {
      const res = await setDayStatus(cid, iso, nxt);
      if (!res.ok) {
        setOptimistic((prev) => {
          const next = new Map(prev);
          next.set(cid + iso, current);
          return next;
        });
      }
    });
  };

  const changeMonth = (delta: number) => {
    const m = month + delta;
    const y = m < 0 ? year - 1 : m > 11 ? year + 1 : year;
    const mm = ((m % 12) + 12) % 12;
    setYear(y);
    setMonth(mm);
    setOptimistic(new Map());
    startTransition(async () => {
      const data = await loadDataCenterMonth(y, mm);
      setInputs(data.inputs);
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          ←
        </button>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {monthLabel(year, month, lang)}
        </p>
        <button onClick={() => changeMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          →
        </button>
      </div>
      {busy && <p className="mb-2 text-center text-xs text-slate-400">{t.loading}</p>}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--card)] px-3 py-2 text-left text-[11px] uppercase text-slate-400 shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                {t.name}
              </th>
              {grid.map((d, i) => (
                <th
                  key={i}
                  className={`px-0.5 py-1.5 text-center text-[9px] font-bold ${
                    d.dow === 0 ? "text-rose-400" : "text-slate-400"
                  }`}
                >
                  {d.day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {active.map((c) => (
              <tr key={c.id}>
                <td className="sticky left-0 z-10 max-w-[110px] truncate bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                  {c.name}
                </td>
                {grid.map((d, i) => (
                  <td key={i} className="px-0.5 py-1 text-center">
                    <button
                      onClick={() => tap(c.id, d.iso)}
                      className={`h-4.5 w-4.5 rounded ${CELL_STYLE[statusOf(c.id, d.iso)]} active:scale-125 transition-transform`}
                      aria-label={d.iso}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-2 text-[11px] text-slate-400">{t.tapToChange}</p>
    </div>
  );
}

/* ---------------- Payments tab ---------------- */
function PaymentsTab({
  t,
  lang,
  customers,
  monthPayments,
  allPayments,
}: {
  t: T;
  lang: "en" | "hi";
  customers: Customer[];
  monthPayments: Payment[];
  allPayments: Payment[];
}) {
  const [filter, setFilter] = useState("month");
  const [busy, startTransition] = useTransition();
  const list = filter === "month" ? monthPayments : allPayments;
  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";
  const total = list.reduce((s, p) => s + p.amount, 0);

  const remove = (id: string) => {
    if (!confirm(`${t.deletePaymentConfirm}`)) return;
    startTransition(async () => {
      await deletePayment(id);
    });
  };

  const exportData = (excel: boolean) => {
    const rows = [
      ["Date", "Customer", "Amount", "Method", "Notes"],
      ...list.map((p) => [p.payment_date, nameOf(p.customer_id), p.amount, p.method, p.notes]),
    ];
    if (excel) downloadExcel("payments.xls", rows);
    else downloadCSV("payments.csv", rows);
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm outline-none"
        >
          <option value="month">{t.thisMonth}</option>
          <option value="all">{t.all}</option>
        </select>
        <p className="text-sm font-bold text-green-600">{inr(total)}</p>
        <button onClick={() => exportData(false)} className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">CSV</button>
        <button onClick={() => exportData(true)} className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">XLS</button>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="💸" text={t.noPayments} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-[var(--card)]">
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2.5">{t.today}</th>
                <th className="px-2 py-2.5">{t.name}</th>
                <th className="px-2 py-2.5">{t.amount}</th>
                <th className="px-2 py-2.5">{t.method}</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{prettyDate(p.payment_date, lang)}</td>
                  <td className="px-2 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{nameOf(p.customer_id)}</td>
                  <td className="px-2 py-2.5 font-bold text-green-600">+{inr(p.amount)}</td>
                  <td className="px-2 py-2.5 text-xs text-slate-400">{p.method}</td>
                  <td className="px-2 py-2.5">
                    <button onClick={() => remove(p.id)} disabled={busy} className="text-slate-300 hover:text-red-500" aria-label={t.delete}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 13a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l.8-13" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Menu tab ---------------- */
function MenuTab({ t, menu }: { t: T; menu: MenuItem[] }) {
  const [items, setItems] = useState(menu);
  const [busy, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

  const save = () => {
    startTransition(async () => {
      const res = await saveMenu(items);
      if (res.ok) setSaved(true);
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">{t.weeklyMenu}</p>
        <Button onClick={save} disabled={busy} className="h-9 px-4 text-sm">
          {saved ? t.saved : t.save}
        </Button>
      </div>
      <Card className="p-0">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((m) => (
              <tr key={m.day_of_week}>
                <td className="w-24 px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t[days[m.day_of_week]]}
                </td>
                <td className="px-2 py-2.5">
                  <input
                    value={m.item}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) => (x.day_of_week === m.day_of_week ? { ...x, item: e.target.value } : x)),
                      )
                    }
                    placeholder={t.menuItemPlaceholder}
                    className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm outline-none focus:border-orange-400"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------- Analytics tab ---------------- */
function AnalyticsTab({
  t,
  customers,
  statsByCustomer,
  monthPayments,
  year,
  month,
}: {
  t: T;
  lang: "en" | "hi";
  customers: Customer[];
  statsByCustomer: StatsRow[];
  monthPayments: Payment[];
  year: number;
  month: number;
}) {
  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  const dailyData = useMemo(() => {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const end = endOfMonth(start);
    const map = new Map<string, number>();
    for (const p of monthPayments) map.set(p.payment_date, (map.get(p.payment_date) ?? 0) + p.amount);
    const days = Number(end.slice(8, 10));
    return Array.from({ length: days }, (_, i) => ({
      label: String(i + 1),
      value: Math.round(map.get(`${start.slice(0, 8)}${String(i + 1).padStart(2, "0")}`) ?? 0),
    }));
  }, [monthPayments, year, month]);

  const sorted = [...statsByCustomer].sort((a, b) => b.pending - a.pending);
  const totalPending = sorted.reduce((s, x) => s + x.pending, 0);
  const totalDue = sorted.reduce((s, x) => s + x.due, 0);
  const totalPaid = sorted.reduce((s, x) => s + x.paid, 0);

  const exportData = (excel: boolean) => {
    const rows = [
      ["Customer", "Delivered", "Skipped", "Extra", "Due", "Paid", "Pending"],
      ...sorted.map((s) => [nameOf(s.customerId), s.delivered, s.skipped, s.extra, s.due, s.paid, s.pending]),
    ];
    if (excel) downloadExcel(`analytics-${year}-${month + 1}.xls`, rows);
    else downloadCSV(`analytics-${year}-${month + 1}.csv`, rows);
  };

  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <Stat label={t.statsIncome} value={inr(totalPaid)} />
        <Stat label={t.statsPending} value={inr(totalPending)} red />
        <Stat label={t.dueThisMonth} value={inr(totalDue)} />
      </div>

      <Card className="mb-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t.dailyIncome}</p>
        <BarChart data={dailyData} height={130} />
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-[var(--card)]">
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2.5">{t.name}</th>
              <th className="px-2 py-2.5">✓</th>
              <th className="px-2 py-2.5">✗</th>
              <th className="px-2 py-2.5">+1</th>
              <th className="px-2 py-2.5">{t.dueThisMonth}</th>
              <th className="px-2 py-2.5">{t.payments}</th>
              <th className="px-2 py-2.5">{t.pending}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.map((s) => (
              <tr key={s.customerId} className={s.pending > 0 ? "bg-red-50/60 dark:bg-red-950/20" : ""}>
                <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-100">{nameOf(s.customerId)}</td>
                <td className="px-2 py-2.5 text-green-600">{s.delivered}</td>
                <td className="px-2 py-2.5 text-rose-500">{s.skipped}</td>
                <td className="px-2 py-2.5 text-violet-500">{s.extra}</td>
                <td className="px-2 py-2.5">{inr(s.due)}</td>
                <td className="px-2 py-2.5 text-green-600">{inr(s.paid)}</td>
                <td className={`px-2 py-2.5 font-bold ${s.pending > 0 ? "text-red-500" : "text-green-600"}`}>{inr(s.pending)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-3 flex gap-3">
        <button onClick={() => exportData(false)} className="h-11 flex-1 rounded-xl bg-[var(--card)] border border-[var(--line)] text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t.exportCSV}
        </button>
        <button onClick={() => exportData(true)} className="h-11 flex-1 rounded-xl bg-[var(--card)] border border-[var(--line)] text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t.exportExcel}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="rounded-2xl bg-[var(--card)] border border-[var(--line)] p-2.5 shadow-sm">
      <p className={`text-sm font-extrabold ${red ? "text-red-500" : "text-slate-800 dark:text-slate-100"}`}>{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
