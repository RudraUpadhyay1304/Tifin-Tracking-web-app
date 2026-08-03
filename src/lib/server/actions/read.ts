"use server";

import { z } from "zod";
import {
  getCalendarMonth,
  getCustomers,
  getHolidays,
  getMonthInputs,
  getPaymentsForCustomer,
  getSettings,
  type MonthInputs,
} from "../data";
import { computeMonthStats } from "@/lib/billing";

const monthParams = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(0).max(11),
});

const customerMonthParams = monthParams.extend({
  customer_id: z.string().uuid(),
});

/** Read-only helper so client components can load another month's data. */
export async function loadMonthData(customerId: string, year: number, monthIndex: number) {
  const { customer_id, year: y, month: m } = customerMonthParams.parse({
    customer_id: customerId,
    year,
    month: monthIndex,
  });
  const [settings, holidays, rows, payments] = await Promise.all([
    getSettings(),
    getHolidays(),
    getCalendarMonth(customer_id, y, m),
    getPaymentsForCustomer(customer_id),
  ]);
  const inputs: MonthInputs = {
    sundayOff: settings.sunday_off,
    holidays,
    calendarRows: rows,
    payments: payments.filter(
      (p) => p.payment_date >= `${y}-${String(m + 1).padStart(2, "0")}-01`,
    ),
  };
  const customers = await getCustomers();
  const customer = customers.find((c) => c.id === customer_id);
  const stats = customer
    ? computeMonthStats([customer], inputs, y, m).get(customer_id)
    : undefined;
  return {
    inputs,
    stats: stats ?? null,
    payments: payments.slice(0, 30),
    customer,
  };
}

/** Read-only: full month inputs + per-customer stats for the Data Center. */
export async function loadDataCenterMonth(year: number, monthIndex: number) {
  const { year: y, month: m } = monthParams.parse({ year, month: monthIndex });
  const [customers, inputs] = await Promise.all([getCustomers(), getMonthInputs(y, m)]);
  const stats = computeMonthStats(customers, inputs, y, m);
  return {
    customers,
    inputs,
    statsByCustomer: [...stats.values()].map((s) => ({
      customerId: s.customerId,
      delivered: s.delivered,
      skipped: s.skipped,
      extra: s.extra,
      due: s.due,
      paid: s.paid,
      pending: s.pending,
    })),
  };
}
