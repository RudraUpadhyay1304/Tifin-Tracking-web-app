"use client";

import { useState, useTransition } from "react";
import { Button, Input, Modal, Select } from "./ui";
import { addHoliday } from "@/lib/server/actions/holidays";
import { todayKolkata } from "@/lib/utils";
import type { Customer } from "@/types/db";
import type { T } from "@/lib/i18n";

export function HolidayForm({
  t,
  open,
  onClose,
  customers,
  presetCustomerId,
}: {
  t: T;
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  presetCustomerId?: string;
}) {
  const [scope, setScope] = useState(presetCustomerId ? "customer" : "global");
  const [customerId, setCustomerId] = useState(presetCustomerId ?? customers[0]?.id ?? "");
  const [start, setStart] = useState(todayKolkata());
  const [end, setEnd] = useState(todayKolkata());
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    if (scope === "customer" && !customerId) {
      setError(t.required);
      return;
    }
    startTransition(async () => {
      const res = await addHoliday({
        customer_id: scope === "customer" ? customerId : null,
        start_date: start,
        end_date: end,
        reason,
      });
      if (!res.ok) setError(res.error);
      else {
        setReason("");
        onClose();
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={t.addHoliday}>
      <div className="space-y-3">
        <Select label={t.scope} value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="global">{t.globalHoliday}</option>
          <option value="customer">{t.customerHoliday}</option>
        </Select>
        {scope === "customer" && (
          <Select label={t.customers} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <Input label={t.startDate} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input label={t.endDate} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Input
          label={`${t.reason} (${t.optional})`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
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
