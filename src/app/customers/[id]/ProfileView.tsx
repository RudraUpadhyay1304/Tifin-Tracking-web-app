"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Badge, Button, Card, Modal, SectionTitle } from "@/components/ui";
import { CustomerForm } from "@/components/CustomerForm";
import { PaymentForm } from "@/components/PaymentForm";
import { HolidayForm } from "@/components/HolidayForm";
import { MonthCalendar } from "@/components/MonthCalendar";
import { setCustomerStatus, deleteCustomer } from "@/lib/server/actions/customers";
import { loadMonthData } from "@/lib/server/actions/read";
import { inr, initials, prettyDate } from "@/lib/utils";
import type { Customer, Payment } from "@/types/db";
import type { MonthInputs, MonthStats } from "@/lib/billing";
import type { T } from "@/lib/i18n";

export function ProfileView({
  t,
  lang,
  theme,
  customer,
  initialYear,
  initialMonth,
  inputs,
  stats,
  payments,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
  customer: Customer;
  initialYear: number;
  initialMonth: number;
  inputs: MonthInputs;
  stats: MonthStats | null;
  payments: Payment[];
}) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [monthInputs, setMonthInputs] = useState(inputs);
  const [monthStats, setMonthStats] = useState(stats);
  const [paymentsList, setPayments] = useState(payments);
  const [showEdit, setShowEdit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showHoliday, setShowHoliday] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  const onMonthChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    startTransition(async () => {
      const data = await loadMonthData(customer.id, y, m);
      if (data.inputs) setMonthInputs(data.inputs);
      if (data.stats) setMonthStats(data.stats);
      if (data.payments) setPayments(data.payments);
    });
  };

  const toggleStatus = () => {
    const next = customer.status === "active" ? "paused" : "active";
    startTransition(async () => {
      const res = await setCustomerStatus(customer.id, next);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const res = await deleteCustomer(customer.id);
      if (res.ok) router.replace("/customers");
      else setError(res.error);
    });
  };

  const statusColor =
    customer.status === "active" ? "green" : customer.status === "paused" ? "orange" : "slate";

  return (
    <div>
      <TopBar t={t} title={customer.name} theme={theme} back />

      <Card className="mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 text-lg font-bold">
            {initials(customer.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                {customer.name}
              </h2>
              <Badge color={statusColor as "green" | "orange" | "slate"}>
                {customer.status === "active" ? t.active : customer.status === "paused" ? t.paused : t.inactive}
              </Badge>
            </div>
            {customer.phone && <p className="text-sm text-slate-500 dark:text-slate-400">📞 {customer.phone}</p>}
            {customer.address && <p className="text-sm text-slate-500 dark:text-slate-400">📍 {customer.address}</p>}
            {customer.joining_date && (
              <p className="mt-0.5 text-xs text-slate-400">
                {t.joiningDate}: {prettyDate(customer.joining_date, lang)}
              </p>
            )}
          </div>
          <p className="shrink-0 text-base font-extrabold text-slate-900 dark:text-white">
            {inr(customer.monthly_charge)}
            <span className="text-[10px] font-medium text-slate-400">/mo</span>
          </p>
        </div>
        {customer.notes && (
          <p className="mt-3 rounded-xl bg-slate-50 dark:bg-white/5 p-3 text-sm text-slate-500 dark:text-slate-400">
            {customer.notes}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label={t.daysDelivered} value={monthStats?.delivered ?? 0} color="text-green-600" />
        <MiniStat label={t.daysSkipped} value={monthStats?.skipped ?? 0} color="text-rose-500" />
        <MiniStat label={t.daysExtra} value={monthStats?.extra ?? 0} color="text-violet-500" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <MiniStat label={t.dueThisMonth} value={inr(monthStats?.due ?? 0)} color="text-slate-800 dark:text-slate-100" />
        <MiniStat label={t.payments} value={inr(monthStats?.paid ?? 0)} color="text-green-600" />
        <MiniStat label={t.pending} value={inr(monthStats?.pending ?? 0)} color="text-red-500" />
      </div>

      <SectionTitle>{t.month}</SectionTitle>
      <Card>
        <MonthCalendar
          t={t}
          customer={customer}
          year={year}
          monthIndex={month}
          inputs={monthInputs}
          onMonthChange={onMonthChange}
          lang={lang}
        />
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => setShowEdit(true)}>
          {t.edit}
        </Button>
        <Button onClick={() => setShowPayment(true)}>{t.addPayment}</Button>
        <Button variant="secondary" onClick={() => setShowHoliday(true)}>
          {t.pauseCustomer}
        </Button>
        <Button variant="secondary" onClick={toggleStatus} disabled={busy}>
          {customer.status === "active" ? t.pause : t.resume}
        </Button>
      </div>
      <div className="mt-3">
        <Button variant="danger" onClick={() => setShowDelete(true)} className="w-full" disabled={busy}>
          {t.deleteCustomer}
        </Button>
      </div>

      {paymentsList.length > 0 && (
        <>
          <SectionTitle>{t.payments}</SectionTitle>
          <Card>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {paymentsList.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {inr(p.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {prettyDate(p.payment_date, lang)} · {p.method === "cash" ? t.cash : p.method === "upi" ? t.upi : t.other}
                    </p>
                  </div>
                  <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-1 text-xs font-bold text-green-700 dark:text-green-300">
                    +{inr(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}

      <CustomerForm t={t} open={showEdit} onClose={() => setShowEdit(false)} customer={customer} />
      <PaymentForm
        t={t}
        open={showPayment}
        onClose={() => setShowPayment(false)}
        customers={[customer]}
        presetCustomerId={customer.id}
      />
      <HolidayForm
        t={t}
        open={showHoliday}
        onClose={() => setShowHoliday(false)}
        customers={[customer]}
        presetCustomerId={customer.id}
      />

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title={t.deleteCustomer}>
        <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">{t.deleteCustomerConfirm}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowDelete(false)} className="flex-1">
            {t.cancel}
          </Button>
          <Button variant="danger" onClick={confirmDelete} className="flex-1" disabled={busy}>
            {busy ? t.loading : t.delete}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#131c31] border border-slate-100 dark:border-slate-800 p-3 text-center shadow-sm">
      <div className={`text-base font-extrabold ${color}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}
