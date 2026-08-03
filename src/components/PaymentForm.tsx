"use client";

import { useState, useTransition } from "react";
import { Button, Input, Modal, Select } from "./ui";
import { addPayment } from "@/lib/server/actions/payments";
import type { Customer } from "@/types/db";
import { todayKolkata } from "@/lib/utils";
import type { T } from "@/lib/i18n";

export function PaymentForm({
  t,
  open,
  onClose,
  customers,
  presetCustomerId,
  presetAmount,
}: {
  t: T;
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  presetCustomerId?: string;
  presetAmount?: number;
}) {
  const [customerId, setCustomerId] = useState(presetCustomerId ?? customers[0]?.id ?? "");
  const [amount, setAmount] = useState(presetAmount ? String(presetAmount) : "");
  const [date, setDate] = useState(todayKolkata());
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    if (!customerId || !amount || Number(amount) <= 0) {
      setError(t.required);
      return;
    }
    startTransition(async () => {
      const res = await addPayment({
        customer_id: customerId,
        amount: Number(amount),
        payment_date: date,
        method: method as "cash" | "upi" | "other",
        notes,
      });
      if (!res.ok) setError(res.error);
      else {
        setAmount("");
        onClose();
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={t.recordPayment}>
      <div className="space-y-3">
        <Select label={t.paymentFor} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          label={`${t.amount} (₹)`}
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
        <Input label={t.today} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select label={t.method} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">{t.cash}</option>
          <option value="upi">{t.upi}</option>
          <option value="other">{t.other}</option>
        </Select>
        <Input
          label={`${t.notes} (${t.optional})`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t.cancel}
          </Button>
          <Button onClick={submit} disabled={pending} className="flex-[2]">
            {pending ? t.loading : t.save}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
