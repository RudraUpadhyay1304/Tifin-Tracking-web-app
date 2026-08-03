import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { getCustomers, getMonthInputs } from "@/lib/server/data";
import { computeMonthStats, currentMonth } from "@/lib/billing";
import { CustomersView } from "./CustomersView";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();
  const { year, monthIndex } = currentMonth();
  const [customers, inputs] = await Promise.all([
    getCustomers(),
    getMonthInputs(year, monthIndex),
  ]);
  const stats = computeMonthStats(customers, inputs, year, monthIndex);

  return (
    <CustomersView
      t={t}
      lang={lang}
      theme={theme}
      customers={customers.map((c) => ({
        ...c,
        pending: stats.get(c.id)?.pending ?? 0,
        due: stats.get(c.id)?.due ?? 0,
        paid: stats.get(c.id)?.paid ?? 0,
      }))}
    />
  );
}
