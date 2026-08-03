import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { getCustomers, getHolidays } from "@/lib/server/data";
import { HolidaysView } from "./HolidaysView";

export const dynamic = "force-dynamic";

export default async function HolidaysPage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();
  const [customers, holidays] = await Promise.all([getCustomers(), getHolidays()]);

  return <HolidaysView t={t} lang={lang} theme={theme} customers={customers} holidays={holidays} />;
}
