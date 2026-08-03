import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { getSettings } from "@/lib/server/data";
import { SettingsView } from "./SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();
  const settings = await getSettings();

  return <SettingsView t={t} lang={lang} theme={theme} settings={settings} />;
}
