import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { MoreView } from "./MoreView";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();

  return <MoreView t={t} lang={lang} theme={theme} />;
}
