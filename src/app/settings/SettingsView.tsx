"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Button, Card, Input, SectionTitle, Toggle } from "@/components/ui";
import {
  saveSettings,
  setLanguage,
  setTheme,
  signOut,
} from "@/lib/server/actions/settings";
import type { Settings } from "@/types/db";
import type { T } from "@/lib/i18n";
import type { ServerUser } from "@/lib/server/supabase";

export function SettingsView({
  t,
  lang,
  theme,
  settings,
  user,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
  settings: Settings;
  user: ServerUser | null;
}) {
  const router = useRouter();
  const [sundayOff, setSundayOff] = useState(settings.sunday_off);
  const [businessName, setBusinessName] = useState(settings.business_name);
  const [dark, setDark] = useState(theme === "dark");
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();

  const changeLang = (l: "en" | "hi") => {
    startTransition(async () => {
      await setLanguage(l);
      router.refresh();
    });
  };

  const changeTheme = (v: boolean) => {
    setDark(v);
    const next = v ? "dark" : "light";
    document.documentElement.classList.toggle("dark", v);
    document.cookie = `theme=${next}; path=/; max-age=31536000`;
    startTransition(async () => {
      await setTheme(next);
    });
  };

  const toggleSundayOff = (v: boolean) => {
    setSundayOff(v);
    setSaved(false);
    startTransition(async () => {
      const res = await saveSettings({ sunday_off: v, business_name: businessName });
      if (res.ok) setSaved(true);
    });
  };

  const saveBusiness = () => {
    startTransition(async () => {
      const res = await saveSettings({ sunday_off: sundayOff, business_name: businessName });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  };

  return (
    <div>
      <TopBar t={t} title={t.settings} theme={theme} />

      <SectionTitle>{t.language}</SectionTitle>
      <Card className="flex gap-3">
        <Button
          variant={lang === "en" ? "primary" : "secondary"}
          onClick={() => changeLang("en")}
          className="flex-1"
        >
          {t.english}
        </Button>
        <Button
          variant={lang === "hi" ? "primary" : "secondary"}
          onClick={() => changeLang("hi")}
          className="flex-1"
        >
          {t.hindi}
        </Button>
      </Card>

      <SectionTitle>{t.about}</SectionTitle>
      <Card className="space-y-4">
        {user && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t.signedInAs}
              </p>
              <p className="text-xs text-slate-400">{user.email ?? user.name}</p>
            </div>
            <Button variant="secondary" onClick={() => startTransition(() => signOut())}>
              {t.signOut}
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.darkMode}</p>
          </div>
          <Toggle checked={dark} onChange={changeTheme} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.sundayOff}</p>
            <p className="text-xs text-slate-400">{t.sundayOffDesc}</p>
          </div>
          <Toggle checked={sundayOff} onChange={toggleSundayOff} />
        </div>
        <div>
          <Input
            label={t.businessName}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
          <div className="mt-3">
            <Button onClick={saveBusiness} disabled={busy} block>
              {saved ? t.saved : t.save}
            </Button>
          </div>
        </div>
      </Card>

      <p className="mt-8 text-center text-xs text-slate-400">
        Tiffin Manager · v0.1
      </p>
    </div>
  );
}
