"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { T } from "@/lib/i18n";

const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V21h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" strokeLinecap="round" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 15.4c1.8.6 2.9 2 3 4.6" strokeLinecap="round" />
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M12 3c.7 3.9 2.4 5.6 6.3 6.3-3.9.7-5.6 2.4-6.3 6.3-.7-3.9-2.4-5.6-6.3-6.3C9.6 8.6 11.3 6.9 12 3Z" strokeLinejoin="round" />
      <path d="M18.5 15.5c.35 1.9 1.1 2.65 3 3-1.9.35-2.65 1.1-3 3-.35-1.9-1.1-2.65-3-3 1.9-.35 2.65-1.1 3-3Z" strokeLinejoin="round" />
    </svg>
  ),
  data: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18M3 15h18M9 3v18" strokeLinecap="round" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  ),
};

export function BottomNav({ t }: { t: T }) {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const items = [
    { href: "/dashboard", label: t.home, icon: icons.home },
    { href: "/customers", label: t.customers, icon: icons.customers },
    { href: "/ai", label: t.ai, icon: icons.ai },
    { href: "/datacenter", label: t.data, icon: icons.data },
    { href: "/more", label: t.more, icon: icons.more },
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0e1626]/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 ${
                active ? "text-orange-500" : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
