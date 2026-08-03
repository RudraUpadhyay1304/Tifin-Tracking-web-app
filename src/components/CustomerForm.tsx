"use client";

import { useState, useTransition } from "react";
import { Button, Input, Modal, Select, Textarea } from "./ui";
import { addCustomer, updateCustomer } from "@/lib/server/actions/customers";
import type { Customer } from "@/types/db";
import { todayKolkata } from "@/lib/utils";
import type { T } from "@/lib/i18n";

export function CustomerForm({
  t,
  open,
  onClose,
  customer,
}: {
  t: T;
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
}) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [charge, setCharge] = useState(customer ? String(customer.monthly_charge) : "");
  const [joining, setJoining] = useState(customer?.joining_date ?? todayKolkata());
  const [status, setStatus] = useState(customer?.status ?? "active");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    if (!name.trim()) {
      setError(t.required);
      return;
    }
    const payload = {
      name,
      phone,
      address,
      monthly_charge: Number(charge || 0),
      joining_date: joining || null,
      status: status as "active" | "paused" | "inactive",
      notes,
    };
    startTransition(async () => {
      const res = customer
        ? await updateCustomer(customer.id, payload)
        : await addCustomer(payload);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={customer ? t.editCustomer : t.addNewCustomer}>
      <div className="space-y-3">
        <Input label={t.name} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input
          label={t.phone}
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          label={t.address}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Input
          label={`${t.monthlyCharge} (₹)`}
          inputMode="numeric"
          value={charge}
          onChange={(e) => setCharge(e.target.value)}
        />
        <Input
          label={t.joiningDate}
          type="date"
          value={joining ?? ""}
          onChange={(e) => setJoining(e.target.value)}
        />
        <Select label={t.status} value={status}           onChange={(e) => setStatus(e.target.value as "active" | "paused" | "inactive")}>
          <option value="active">{t.active}</option>
          <option value="paused">{t.paused}</option>
          <option value="inactive">{t.inactive}</option>
        </Select>
        <Textarea
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
