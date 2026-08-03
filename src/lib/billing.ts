import type { CalendarDay, Customer, DayStatus, Holiday, Payment } from "@/types/db";
import { dateFromISO, endOfMonth, isoFromDate, monthGrid } from "./utils";

export interface MonthStats {
  customerId: string;
  delivered: number;
  skipped: number;
  extra: number;
  holiday: number;
  sundayOff: number;
  billableDays: number;
  dailyRate: number;
  due: number;
  paid: number;
  pending: number;
}

export interface MonthInputs {
  sundayOff: boolean;
  holidays: Holiday[];
  calendarRows: CalendarDay[];
  payments: Payment[];
}

/** What a day would be by default, before any manual override. */
export function defaultStatusFor(
  iso: string,
  sundayOff: boolean,
  holidays: Holiday[],
  customerId: string,
): DayStatus {
  const d = dateFromISO(iso);
  if (d.getDay() === 0 && sundayOff) return "sunday_off";
  const covered = holidays.some(
    (h) =>
      (h.customer_id === null || h.customer_id === customerId) &&
      iso >= h.start_date &&
      iso <= h.end_date,
  );
  if (covered) return "holiday";
  return "delivered";
}

/** Final status of a day for a customer (override wins, else the default). */
export function finalStatusFor(
  iso: string,
  customerId: string,
  inputs: MonthInputs,
): DayStatus {
  const row = inputs.calendarRows.find((r) => r.customer_id === customerId && r.date === iso);
  if (row) return row.status;
  return defaultStatusFor(iso, inputs.sundayOff, inputs.holidays, customerId);
}

/** How a cell status advances when the owner taps it. */
export const TAP_CYCLE: Record<DayStatus, DayStatus[]> = {
  delivered: ["skipped", "extra"],
  skipped: ["extra", "delivered"],
  extra: ["delivered", "skipped"],
  sunday_off: ["extra", "delivered", "skipped"],
  holiday: ["delivered", "skipped", "extra"],
};

export function nextStatus(current: DayStatus): DayStatus {
  return TAP_CYCLE[current][0];
}

export interface CustomerMonth {
  customer: Customer;
  stats: MonthStats;
}

/**
 * Compute per-customer billing stats for one month, from already-fetched
 * (batched) data — no N+1 queries.
 */
export function computeMonthStats(
  customers: Customer[],
  inputs: MonthInputs,
  year: number,
  monthIndex: number,
): Map<string, MonthStats> {
  const grid = monthGrid(year, monthIndex).filter((d) => d.inMonth);
  const byCustomer = new Map<string, MonthStats>();

  for (const c of customers) {
    const counts = { delivered: 0, skipped: 0, extra: 0, holiday: 0, sundayOff: 0 };
    for (const day of grid) {
      const s = finalStatusFor(day.iso, c.id, inputs);
      if (s === "delivered") counts.delivered++;
      else if (s === "skipped") counts.skipped++;
      else if (s === "extra") counts.extra++;
      else if (s === "holiday") counts.holiday++;
      else counts.sundayOff++;
    }
    const billableDays = grid.length - counts.holiday - counts.sundayOff;
    const dailyRate = billableDays > 0 ? c.monthly_charge / billableDays : 0;
    const due = Math.round(dailyRate * (counts.delivered + counts.extra));
    const monthStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const monthEnd = endOfMonth(monthStart);
    const paid = inputs.payments
      .filter(
        (p) =>
          p.customer_id === c.id && p.payment_date >= monthStart && p.payment_date <= monthEnd,
      )
      .reduce((sum, p) => sum + p.amount, 0);
    byCustomer.set(c.id, {
      customerId: c.id,
      ...counts,
      billableDays,
      dailyRate,
      due,
      paid,
      pending: Math.max(0, due - paid),
    });
  }
  return byCustomer;
}

/** Today's month as { year, monthIndex }. */
export function currentMonth(): { year: number; monthIndex: number } {
  const d = dateFromISO(isoFromDate(new Date()));
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}
