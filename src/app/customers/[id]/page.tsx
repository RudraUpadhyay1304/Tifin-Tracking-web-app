import { notFound } from "next/navigation";
import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { getCustomer, getCalendarMonth, getHolidays, getSettings, getPaymentsForCustomer } from "@/lib/server/data";
import { computeMonthStats, currentMonth, type MonthInputs } from "@/lib/billing";
import { ProfileView } from "./ProfileView";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();
  const { year, monthIndex } = currentMonth();

  const customer = await getCustomer(id);
  if (!customer) notFound();

  const [settings, holidays, rows, payments] = await Promise.all([
    getSettings(),
    getHolidays(),
    getCalendarMonth(id, year, monthIndex),
    getPaymentsForCustomer(id),
  ]);

  const inputs: MonthInputs = {
    sundayOff: settings.sunday_off,
    holidays,
    calendarRows: rows,
    payments: payments.filter(
      (p) => p.payment_date >= `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`,
    ),
  };
  const stats = computeMonthStats([customer], inputs, year, monthIndex).get(id) ?? null;

  return (
    <ProfileView
      t={t}
      lang={lang}
      theme={theme}
      customer={customer}
      initialYear={year}
      initialMonth={monthIndex}
      inputs={inputs}
      stats={stats}
      payments={payments.slice(0, 30)}
    />
  );
}
