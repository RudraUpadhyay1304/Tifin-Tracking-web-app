import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { getSettings } from "@/lib/server/data";
import { SearchView } from "./SearchView";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();
  await getSettings();

  return <SearchView t={t} lang={lang} theme={theme} />;
}
