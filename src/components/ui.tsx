"use client";

import { useEffect, type ReactNode } from "react";

/* ---------- Button ---------- */
export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
  block,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  block?: boolean;
}) {
  const styles = {
    primary:
      "bg-orange-500 text-white active:bg-orange-600 shadow-sm shadow-orange-500/30",
    secondary:
      "bg-white dark:bg-[#1a2540] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 active:bg-slate-50 dark:active:bg-[#202c4d]",
    danger: "bg-red-500 text-white active:bg-red-600 shadow-sm shadow-red-500/30",
    ghost: "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`h-12 rounded-2xl px-4 text-[15px] font-semibold transition-colors disabled:opacity-40 ${
        block ? "w-full" : ""
      } ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------- Card ---------- */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-[var(--card)] p-4 shadow-sm border border-slate-100 dark:border-slate-800 ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- Stat card ---------- */
export function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3.5 ${
        accent
          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-500/30"
          : "bg-[var(--card)] border border-slate-100 dark:border-slate-800 shadow-sm"
      }`}
    >
      <div
        className={`text-[11px] font-medium uppercase tracking-wide ${
          accent ? "text-orange-100" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${accent ? "text-white" : ""}`}>{value}</div>
      {sub && (
        <div
          className={`mt-0.5 text-xs ${accent ? "text-orange-100" : "text-slate-500 dark:text-slate-400"}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/* ---------- Inputs ---------- */
const fieldBase =
  "w-full h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2540] px-4 text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20";

export function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
      <input {...props} className={fieldBase} />
    </label>
  );
}

export function Textarea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
      <textarea {...props} className={`${fieldBase} h-24 py-3`} />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
      <select {...props} className={fieldBase}>
        {children}
      </select>
    </label>
  );
}

/* ---------- Toggle ---------- */
export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 rounded-full transition-colors ${
        checked ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
          checked ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

/* ---------- Badge ---------- */
export function Badge({
  children,
  color = "slate",
}: {
  children: ReactNode;
  color?: "slate" | "green" | "orange" | "red" | "blue";
}) {
  const styles = {
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  }[color];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      {children}
    </span>
  );
}

/* ---------- Bottom sheet / modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white dark:bg-[#131c31] p-5 pb-8 shadow-2xl sm:rounded-3xl sm:pb-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />
        {title && (
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------- Segmented tabs ---------- */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            value === o.value
              ? "bg-white dark:bg-[#1a2540] text-orange-600 dark:text-orange-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, text }: { icon?: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {icon && <div className="mb-2 text-3xl">{icon}</div>}
      <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

/* ---------- Spinner ---------- */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-orange-500 ${className}`}
    />
  );
}

/* ---------- Section title ---------- */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {children}
    </h2>
  );
}
