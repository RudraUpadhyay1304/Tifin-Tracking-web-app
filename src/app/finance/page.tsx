import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { getCustomers, getMonthInputs, getPaymentsBetween } from "@/lib/server/data";
import { computeMonthStats, currentMonth } from "@/lib/billing";
import { addDays, endOfMonth, startOfMonth, todayKolkata } from "@/lib/utils";
import { FinanceView } from "./FinanceView";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();
  const today = todayKolkata();
  const { year, monthIndex } = currentMonth();

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const sixMonthsAgo = startOfMonth(addDays(monthStart, -180));

  const [customers, payments6m, inputs] = await Promise.all([
    getCustomers(),
    getPaymentsBetween(sixMonthsAgo, monthEnd),
    getMonthInputs(year, monthIndex),
  ]);

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, monthIndex - 5 + i, 1);
    const start = startOfMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
    );
    const total = payments6m
      .filter((p) => p.payment_date >= start && p.payment_date <= endOfMonth(start))
      .reduce((s, p) => s + p.amount, 0);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      start,
      total,
    };
  });

  const stats = computeMonthStats(customers, inputs, year, monthIndex);
  const pendingTotal = [...stats.values()].reduce((s, m) => s + m.pending, 0);
  const topPending = [...stats.values()]
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 5)
    .map((m) => ({ name: customers.find((c) => c.id === m.customerId)?.name ?? "—", pending: m.pending }));

  return (
    <FinanceView
      t={t}
      lang={lang}
      theme={theme}
      customers={customers}
      payments={payments6m}
      monthly={monthly}
      currentYear={year}
      currentMonth={monthIndex}
      pendingTotal={pendingTotal}
      topPending={topPending}
    />
  );
}
