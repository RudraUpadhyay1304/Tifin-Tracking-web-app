import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { Chat } from "@/components/Chat";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();

  return <Chat t={t} lang={lang} theme={theme} />;
}
