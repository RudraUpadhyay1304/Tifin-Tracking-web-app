import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { getCustomers, getMonthInputs, getSettings } from "@/lib/server/data";
import { computeMonthStats, currentMonth } from "@/lib/billing";
import { todayKolkata } from "@/lib/utils";
import { DashboardView } from "./DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();
  const { year, monthIndex } = currentMonth();
  const [settings, customers, inputs] = await Promise.all([
    getSettings(),
    getCustomers(),
    getMonthInputs(year, monthIndex),
  ]);

  const stats = computeMonthStats(customers, inputs, year, monthIndex);
  const today = todayKolkata();

  const totalPending = [...stats.values()].reduce((s, m) => s + m.pending, 0);
  const todayEarnings = inputs.payments
    .filter((p) => p.payment_date === today)
    .reduce((s, p) => s + p.amount, 0);
  const monthEarnings = inputs.payments.reduce((s, p) => s + p.amount, 0);
  const active = customers.filter((c) => c.status === "active");
  const expectedMonthly = active.reduce((s, c) => s + c.monthly_charge, 0);

  const upcomingHolidays = inputs.holidays
    .filter((h) => h.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 3);

  return (
    <DashboardView
      t={t}
      lang={lang}
      theme={theme}
      settings={settings}
      customers={customers}
      totalPending={totalPending}
      todayEarnings={todayEarnings}
      monthEarnings={monthEarnings}
      expectedMonthly={expectedMonthly}
      totalCustomers={customers.length}
      activeCustomers={active.length}
      upcomingHolidays={upcomingHolidays}
    />
  );
}
