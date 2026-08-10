"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import type { T } from "@/lib/i18n";

const ICONS: Record<string, React.ReactNode> = {
  payments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 8h8M8 12h8M8 16h4" strokeLinecap="round" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
    </svg>
  ),
  finance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path d="M8 15l3-3 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4-4" strokeLinecap="round" />
    </svg>
  ),
  holidays: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  data: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18M3 15h18M9 3v18" strokeLinecap="round" />
    </svg>
  ),
};

export function MoreView({
  t,
  theme,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
}) {
  const items = [
    { href: "/payments", label: t.payments, icon: ICONS.payments },
    { href: "/menu", label: t.weeklyMenu, icon: ICONS.menu },
    { href: "/finance", label: t.finance, icon: ICONS.finance },
    { href: "/search", label: t.globalSearch, icon: ICONS.search },
    { href: "/holidays", label: t.holidays, icon: ICONS.holidays },
    { href: "/datacenter", label: t.dataCenter, icon: ICONS.data },
    { href: "/settings", label: t.settings, icon: ICONS.settings },
  ];

  return (
    <div className="rise">
      <TopBar t={t} title={t.more} theme={theme} />
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="pressable flex h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm text-orange-500"
          >
            {item.icon}
            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
