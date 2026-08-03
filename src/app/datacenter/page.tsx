import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { getCustomers, getMenu, getMonthInputs, getPaymentsBetween } from "@/lib/server/data";
import { computeMonthStats, currentMonth } from "@/lib/billing";
import { endOfMonth, startOfMonth, todayKolkata } from "@/lib/utils";
import { DataCenterView } from "./DataCenterView";

export const dynamic = "force-dynamic";

export default async function DataCenterPage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();
  const { year, monthIndex } = currentMonth();
  const today = todayKolkata();

  const [customers, inputs, monthPayments, allPayments, menu] = await Promise.all([
    getCustomers(),
    getMonthInputs(year, monthIndex),
    getPaymentsBetween(startOfMonth(today), endOfMonth(today)),
    getPaymentsBetween("2000-01-01", today),
    getMenu(),
  ]);

  const stats = computeMonthStats(customers, inputs, year, monthIndex);
  const statsByCustomer = [...stats.values()].map((s) => ({
    customerId: s.customerId,
    delivered: s.delivered,
    skipped: s.skipped,
    extra: s.extra,
    due: s.due,
    paid: s.paid,
    pending: s.pending,
  }));

  return (
    <DataCenterView
      t={t}
      lang={lang}
      theme={theme}
      customers={customers}
      inputs={inputs}
      statsByCustomer={statsByCustomer}
      monthPayments={monthPayments}
      allPayments={allPayments.slice(0, 300)}
      menu={menu}
      initialYear={year}
      initialMonth={monthIndex}
    />
  );
}
