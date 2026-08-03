import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { getCustomers, getPaymentsBetween } from "@/lib/server/data";
import { endOfMonth, startOfMonth, todayKolkata } from "@/lib/utils";
import { PaymentsView } from "./PaymentsView";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();
  const today = todayKolkata();
  const [customers, monthPayments, allPayments] = await Promise.all([
    getCustomers(),
    getPaymentsBetween(startOfMonth(today), endOfMonth(today)),
    getPaymentsBetween("2000-01-01", today),
  ]);

  return (
    <PaymentsView
      t={t}
      lang={lang}
      theme={theme}
      customers={customers}
      monthPayments={monthPayments}
      allPayments={allPayments.slice(0, 300)}
    />
  );
}
