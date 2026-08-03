"use client";

import { useMemo, useState, useTransition } from "react";
import { TopBar } from "@/components/TopBar";
import { Button, Card, EmptyState, Modal, Segmented } from "@/components/ui";
import { PaymentForm } from "@/components/PaymentForm";
import { deletePayment } from "@/lib/server/actions/payments";
import { inr, prettyDate } from "@/lib/utils";
import type { Customer, Payment } from "@/types/db";
import type { T } from "@/lib/i18n";

export function PaymentsView({
  t,
  lang,
  theme,
  customers,
  monthPayments,
  allPayments,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
  customers: Customer[];
  monthPayments: Payment[];
  allPayments: Payment[];
}) {
  const [tab, setTab] = useState("month");
  const [showAdd, setShowAdd] = useState(false);
  const [toDelete, setToDelete] = useState<Payment | null>(null);
  const [busy, startTransition] = useTransition();

  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";
  const list = tab === "month" ? monthPayments : allPayments;

  const total = useMemo(() => list.reduce((s, p) => s + p.amount, 0), [list]);

  const confirmDelete = () => {
    if (!toDelete) return;
    startTransition(async () => {
      const res = await deletePayment(toDelete.id);
      if (res.ok) {
        setToDelete(null);
      }
    });
  };

  return (
    <div>
      <TopBar t={t} title={t.payments} theme={theme} />

      <div className="mb-4">
        <Segmented
          options={[
            { value: "month", label: t.thisMonth },
            { value: "all", label: t.all },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        {t.income} {tab === "month" ? t.thisMonth : t.all}:{" "}
        <span className="font-bold text-green-600">{inr(total)}</span>
      </p>

      {list.length === 0 ? (
        <EmptyState icon="💸" text={t.noPayments} />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {nameOf(p.customer_id)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {prettyDate(p.payment_date, lang)} ·{" "}
                    {p.method === "cash" ? t.cash : p.method === "upi" ? t.upi : t.other}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <p className="font-bold text-green-600">+{inr(p.amount)}</p>
                <button
                  onClick={() => setToDelete(p)}
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
          + {t.recordPayment}
        </Button>
      </div>

      <PaymentForm
        t={t}
        open={showAdd}
        onClose={() => setShowAdd(false)}
        customers={customers}
      />

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title={t.deletePayment}>
        <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">{t.deletePaymentConfirm}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setToDelete(null)} className="flex-1">
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
