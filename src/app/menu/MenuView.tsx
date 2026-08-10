"use client";

import { useState, useTransition } from "react";
import { TopBar } from "@/components/TopBar";
import { Button, Card } from "@/components/ui";
import { saveMenu } from "@/lib/server/actions/menu";
import type { MenuItem } from "@/types/db";
import type { T } from "@/lib/i18n";

const DAY_LABEL_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function MenuView({
  t,
  theme,
  menu,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
  menu: MenuItem[];
}) {
  const [items, setItems] = useState<MenuItem[]>(menu);
  const [saved, setSaved] = useState(false);
  const [busy, startTransition] = useTransition();

  const setItem = (day: number, item: string) => {
    setItems((prev) => prev.map((m) => (m.day_of_week === day ? { ...m, item } : m)));
    setSaved(false);
  };

  const save = () => {
    startTransition(async () => {
      const res = await saveMenu(items);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  return (
    <div>
      <TopBar t={t} title={t.weeklyMenu} theme={theme} />

      <Card>
        <ul className="space-y-2.5">
          {items.map((m) => (
            <li key={m.day_of_week} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm font-bold text-slate-700 dark:text-slate-200">
                {t[DAY_LABEL_KEYS[m.day_of_week]]}
              </span>
              <input
                value={m.item}
                onChange={(e) => setItem(m.day_of_week, e.target.value)}
                placeholder={t.menuItemPlaceholder}
                className="h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 text-base text-slate-900 dark:text-slate-100 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-shadow"
              />
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-5">
        <Button block onClick={save} disabled={busy}>
          {busy ? t.loading : saved ? t.saved : t.save}
        </Button>
      </div>
    </div>
  );
}
