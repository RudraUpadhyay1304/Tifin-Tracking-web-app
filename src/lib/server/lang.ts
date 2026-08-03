import { cookies } from "next/headers";
import { dict, type Lang, type T } from "../i18n";

export const LANGS: Lang[] = ["en", "hi"];

export function getLangFromCookie(value: string | undefined): Lang {
  return value === "hi" ? "hi" : "en";
}

export async function serverLang(): Promise<Lang> {
  const store = await cookies();
  return getLangFromCookie(store.get("lang")?.value);
}

export async function serverTheme(): Promise<"light" | "dark"> {
  const store = await cookies();
  return store.get("theme")?.value === "dark" ? "dark" : "light";
}

export async function serverT(): Promise<T> {
  return dict[await serverLang()];
}
