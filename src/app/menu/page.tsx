import { serverLang, serverT, serverTheme } from "@/lib/server/lang";
import { getMenu } from "@/lib/server/data";
import { MenuView } from "./MenuView";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const t = await serverT();
  const lang = await serverLang();
  const theme = await serverTheme();
  const menu = await getMenu();

  return <MenuView t={t} lang={lang} theme={theme} menu={menu} />;
}
