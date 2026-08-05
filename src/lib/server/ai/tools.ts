import { z } from "zod";
import { serverSupabase } from "../supabase";
import {
  getCustomers,
  getHolidays,
  getMenu,
  getPaymentsBetween,
  getSettings,
} from "../data";
import { computeMonthStats } from "@/lib/billing";
import { endOfMonth, inr, startOfMonth, todayKolkata } from "@/lib/utils";
import type { DayStatus } from "@/types/db";

/* ---------------- JSON schemas for Gemini function calling ---------------- */

const dateStr = { type: "string", description: "Date as YYYY-MM-DD" };
const monthStr = {
  type: "string",
  description: "Month as YYYY-MM (e.g. 2026-08). Defaults to current month.",
};

const NAME = { type: "string", description: "Exact or partial customer name" };

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

/* ---------------- Helpers ---------------- */

function monthRange(monthArg?: string): { start: string; end: string } {
  const m = monthArg && /^\d{4}-\d{2}$/.test(monthArg) ? monthArg : todayKolkata().slice(0, 7);
  return { start: `${m}-01`, end: endOfMonth(`${m}-01`) };
}

async function findCustomer(name: string): Promise<{ id: string; name: string } | null> {
  const customers = await getCustomers();
  const n = name.trim().toLowerCase();
  return (
    customers.find((c) => c.name.toLowerCase() === n) ??
    customers.find((c) => c.name.toLowerCase().includes(n)) ??
    null
  );
}

async function loadMonthSummary(monthArg?: string) {
  const { start } = monthRange(monthArg);
  const year = Number(start.slice(0, 4));
  const monthIndex = Number(start.slice(5, 7)) - 1;
  const db = await serverSupabase();
  const [customers, settings, holidays, rows, payments] = await Promise.all([
    getCustomers(),
    getSettings(),
    getHolidays(),
    db
      ? db
          .from("calendar_days")
          .select("*")
          .gte("date", startOfMonth(start))
          .lte("date", endOfMonth(start))
      : Promise.resolve({ data: [] }),
    getPaymentsBetween(startOfMonth(start), endOfMonth(start)),
  ]);
  const inputs = {
    sundayOff: settings.sunday_off,
    holidays,
    calendarRows: (rows.data ?? []).map((r) => ({
      id: String(r.id),
      customer_id: String(r.customer_id),
      date: String(r.date),
      status: r.status as DayStatus,
    })),
    payments,
  };
  const stats = computeMonthStats(customers, inputs, year, monthIndex);
  return { customers, stats, inputs, start };
}

/* ---------------- Tool implementations ---------------- */

const statsTool: ToolDef = {
  name: "get_stats",
  description:
    "Get business statistics: total customers, active customers, total pending dues, this month earnings and expected monthly income. Optionally for a specific month.",
  parameters: { type: "object", properties: { month: monthStr }, required: [] },
  async execute(args) {
    const { start } = monthRange(args.month as string | undefined);
    const { customers, stats } = await loadMonthSummary(start);
    const total = [...stats.values()].reduce((s, m) => s + m.pending, 0);
    const paid = [...stats.values()].reduce((s, m) => s + m.paid, 0);
    const expected = customers.filter((c) => c.status === "active").reduce((s, c) => s + c.monthly_charge, 0);
    return `Month ${start}: total customers ${customers.length}, active ${customers.filter((c) => c.status === "active").length}, collections ${inr(paid)}, pending dues ${inr(total)}, expected monthly income ${inr(expected)}.`;
  },
};

const listCustomersTool: ToolDef = {
  name: "list_customers",
  description:
    "List customers, optionally filtered by name/phone/address search query. Returns name, phone, monthly charge, status and pending dues.",
  parameters: { type: "object", properties: { query: { type: "string", description: "Search text (optional)" } }, required: [] },
  async execute(args) {
    let customers = await getCustomers();
    const q = (args.query as string | undefined)?.trim().toLowerCase();
    if (q) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.address.toLowerCase().includes(q),
      );
    }
    if (customers.length === 0) return "No customers found.";
    const { stats } = await loadMonthSummary();
    return customers
      .slice(0, 15)
      .map(
        (c) =>
          `${c.name} (${c.status}), ${inr(c.monthly_charge)}/mo, phone ${c.phone || "—"}, pending ${inr(stats.get(c.id)?.pending ?? 0)}`,
      )
      .join("\n");
  },
};

const getCustomerTool: ToolDef = {
  name: "get_customer",
  description: "Get full details of one customer: phone, address, charge, joining date, status, notes and pending dues.",
  parameters: { type: "object", properties: { name: NAME }, required: ["name"] },
  async execute(args) {
    const c = await findCustomer(String(args.name));
    if (!c) return `Customer "${args.name}" not found.`;
    const customers = await getCustomers();
    const full = customers.find((x) => x.id === c.id);
    const { stats } = await loadMonthSummary();
    const s = stats.get(c.id);
    return `${full?.name}: phone ${full?.phone || "—"}, address ${full?.address || "—"}, charge ${inr(full?.monthly_charge ?? 0)}/mo, joined ${full?.joining_date || "—"}, status ${full?.status}, notes ${full?.notes || "—"}. This month: delivered ${s?.delivered ?? 0}, skipped ${s?.skipped ?? 0}, extra ${s?.extra ?? 0}, due ${inr(s?.due ?? 0)}, paid ${inr(s?.paid ?? 0)}, pending ${inr(s?.pending ?? 0)}.`;
  },
};

const monthSummaryTool: ToolDef = {
  name: "get_month_summary",
  description:
    "Per-customer summary for a month: delivered/skipped/extra days, due, paid and pending. Use for questions like 'who skipped meals this week/month', 'how many holidays', attendance questions.",
  parameters: { type: "object", properties: { month: monthStr }, required: [] },
  async execute(args) {
    const { customers, stats, start } = await loadMonthSummary(args.month as string | undefined);
    const active = customers.filter((c) => c.status === "active");
    const skippers = [...stats.values()].filter((s) => s.skipped > 0).sort((a, b) => b.skipped - a.skipped);
    const holidaysCovered = new Set(
      (await getHolidays())
        .filter((h) => h.customer_id === null && h.end_date >= start.slice(0, 7) + "-01" && h.start_date <= endOfMonth(start.slice(0, 7) + "-01"))
        .flatMap((h) => {
          const out: string[] = [];
          const d = new Date(h.start_date);
          const end = new Date(h.end_date);
          while (d <= end) {
            out.push(d.toISOString().slice(0, 10));
            d.setDate(d.getDate() + 1);
          }
          return out;
        }),
    );
    const lines = [
      `Month ${start}: ${active.length} active customers.`,
      `Skipped meals: ${skippers.map((s) => `${customers.find((c) => c.id === s.customerId)?.name} (${s.skipped})`).join(", ") || "none"}.`,
      `Extra meals: ${[...stats.values()].filter((s) => s.extra > 0).map((s) => `${customers.find((c) => c.id === s.customerId)?.name} (${s.extra})`).join(", ") || "none"}.`,
      `Global holidays this month: ${holidaysCovered.size} day(s).`,
      `Total pending: ${inr([...stats.values()].reduce((s, m) => s + m.pending, 0))}.`,
    ];
    return lines.join("\n");
  },
};

const paymentsTool: ToolDef = {
  name: "get_payments",
  description: "Get recent payments, optionally for one customer or a month. Use for 'how much did I earn', 'who paid this month'.",
  parameters: {
    type: "object",
    properties: { customer: NAME, month: monthStr, limit: { type: "number", description: "Max rows (default 20)" } },
    required: [],
  },
  async execute(args) {
    const { start, end } = monthRange(args.month as string | undefined);
    const payments = await getPaymentsBetween(start, end);
    const limit = Math.min(Math.max(Number(args.limit ?? 20), 1), 50);
    const customers = await getCustomers();
    let list = payments;
    if (args.customer) {
      const c = await findCustomer(String(args.customer));
      if (!c) return `Customer "${args.customer}" not found.`;
      list = list.filter((p) => p.customer_id === c.id);
    }
    const total = list.reduce((s, p) => s + p.amount, 0);
    const sorted = [...list].sort((a, b) => b.payment_date.localeCompare(a.payment_date)).slice(0, limit);
    const detail = sorted.map((p) => `${p.payment_date} ${customers.find((c) => c.id === p.customer_id)?.name}: ${inr(p.amount)} (${p.method})`).join("\n");
    return `Month ${start}: total collected ${inr(total)} from ${list.length} payment(s).\n${detail}`;
  },
};

const menuTool: ToolDef = {
  name: "get_menu",
  description: "Get the current weekly menu.",
  parameters: { type: "object", properties: {}, required: [] },
  async execute() {
    const menu = await getMenu();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return menu.map((m) => `${days[m.day_of_week]}: ${m.item || "—"}`).join("\n");
  },
};

const holidaysTool: ToolDef = {
  name: "get_holidays",
  description: "List holidays and customer pauses.",
  parameters: { type: "object", properties: { upcoming_only: { type: "boolean" } }, required: [] },
  async execute(args) {
    const holidays = await getHolidays();
    const customers = await getCustomers();
    const today = todayKolkata();
    const list = args.upcoming_only ? holidays.filter((h) => h.end_date >= today) : holidays;
    if (list.length === 0) return "No holidays or pauses.";
    return list
      .slice(0, 20)
      .map((h) => {
        const who = h.customer_id === null ? "all customers" : customers.find((c) => c.id === h.customer_id)?.name ?? "?";
        return `${h.start_date} to ${h.end_date}: ${who}${h.reason ? ` (${h.reason})` : ""}`;
      })
      .join("\n");
  },
};

/* ---------------- write tools ---------------- */

const addCustomerTool: ToolDef = {
  name: "add_customer",
  description: "Add a new customer with name, optional phone/address/notes, monthly charge (₹) and optional joining date.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      phone: { type: "string" },
      address: { type: "string" },
      monthly_charge: { type: "number", description: "Monthly charge in rupees" },
      joining_date: dateStr,
      notes: { type: "string" },
    },
    required: ["name", "monthly_charge"],
  },
  async execute(args) {
    const schema = z.object({
      name: z.string().min(1),
      phone: z.string().optional().default(""),
      address: z.string().optional().default(""),
      monthly_charge: z.number().min(0),
      joining_date: z.string().optional().nullable(),
      notes: z.string().optional().default(""),
    });
    const data = schema.parse(args);
    const db = await serverSupabase();
    if (!db) throw new Error("Authentication is not configured.");
    const { error } = await db.from("customers").insert({
      ...data,
      joining_date: data.joining_date ?? todayKolkata(),
      status: "active",
    });
    if (error) throw error;
    return `Added customer ${data.name} with ${inr(data.monthly_charge)}/mo charge.`;
  },
};

const updateCustomerTool: ToolDef = {
  name: "update_customer",
  description: "Update a customer: change charge, status (active/paused/inactive), phone, address or notes. Find the customer by name.",
  parameters: {
    type: "object",
    properties: {
      name: NAME,
      monthly_charge: { type: "number" },
      status: { type: "string", enum: ["active", "paused", "inactive"] },
      phone: { type: "string" },
      address: { type: "string" },
      notes: { type: "string" },
    },
    required: ["name"],
  },
  async execute(args) {
    const c = await findCustomer(String(args.name));
    if (!c) throw new Error(`Customer "${args.name}" not found.`);
    const update: Record<string, unknown> = {};
    for (const key of ["monthly_charge", "status", "phone", "address", "notes"] as const) {
      if (args[key] !== undefined) update[key] = args[key];
    }
    const db = await serverSupabase();
    if (!db) throw new Error("Authentication is not configured.");
    const { error } = await db.from("customers").update(update).eq("id", c.id);
    if (error) throw error;
    return `Updated ${c.name}: ${Object.keys(update).join(", ")}.`;
  },
};

const deleteCustomerTool: ToolDef = {
  name: "delete_customer",
  description: "Permanently delete a customer and their entire history (calendar, payments, pauses).",
  parameters: { type: "object", properties: { name: NAME }, required: ["name"] },
  async execute(args) {
    const c = await findCustomer(String(args.name));
    if (!c) throw new Error(`Customer "${args.name}" not found.`);
    const db = await serverSupabase();
    if (!db) throw new Error("Authentication is not configured.");
    const { error } = await db.from("customers").delete().eq("id", c.id);
    if (error) throw error;
    return `Deleted customer ${c.name}.`;
  },
};

const recordPaymentTool: ToolDef = {
  name: "record_payment",
  description: "Record a payment received from a customer. Amount in rupees. Date defaults to today.",
  parameters: {
    type: "object",
    properties: {
      customer: NAME,
      amount: { type: "number", description: "Amount in rupees, must be positive" },
      date: dateStr,
      method: { type: "string", enum: ["cash", "upi", "other"] },
      notes: { type: "string" },
    },
    required: ["customer", "amount"],
  },
  async execute(args) {
    const c = await findCustomer(String(args.customer));
    if (!c) throw new Error(`Customer "${args.customer}" not found.`);
    const amount = Number(args.amount);
    if (!(amount > 0)) throw new Error("Amount must be positive.");
    const db = await serverSupabase();
    if (!db) throw new Error("Authentication is not configured.");
    const { error } = await db.from("payments").insert({
      customer_id: c.id,
      amount,
      payment_date: (args.date as string | undefined) ?? todayKolkata(),
      method: (args.method as string | undefined) ?? "cash",
      notes: String(args.notes ?? ""),
    });
    if (error) throw error;
    return `Recorded ${inr(amount)} payment from ${c.name}.`;
  },
};

const addHolidayTool: ToolDef = {
  name: "add_holiday",
  description:
    "Add a holiday or pause. If customer is omitted it is a global holiday (all customers off). If customer is given, only that customer is paused for the range. Excluded from billing.",
  parameters: {
    type: "object",
    properties: {
      customer: { type: "string", description: "Customer name (optional). Omit for a global holiday." },
      start_date: dateStr,
      end_date: dateStr,
      reason: { type: "string" },
    },
    required: ["start_date", "end_date"],
  },
  async execute(args) {
    const start = String(args.start_date);
    const end = String(args.end_date);
    if (end < start) throw new Error("End date must be after start date.");
    let customerId: string | null = null;
    if (args.customer) {
      const c = await findCustomer(String(args.customer));
      if (!c) throw new Error(`Customer "${args.customer}" not found.`);
      customerId = c.id;
    }
    const db = await serverSupabase();
    if (!db) throw new Error("Authentication is not configured.");
    const { error } = await db.from("holidays").insert({
      customer_id: customerId,
      start_date: start,
      end_date: end,
      reason: String(args.reason ?? ""),
    });
    if (error) throw error;
    return `Marked ${customerId ? "pause for customer" : "global holiday"} from ${start} to ${end}${args.reason ? ` (${args.reason})` : ""}.`;
  },
};

const setDayStatusTool: ToolDef = {
  name: "set_day_status",
  description:
    "Set one customer's meal status for one day: delivered, skipped, extra (extra meal), holiday, sunday_off.",
  parameters: {
    type: "object",
    properties: {
      customer: NAME,
      date: dateStr,
      status: { type: "string", enum: ["delivered", "skipped", "extra", "holiday", "sunday_off"] },
    },
    required: ["customer", "date", "status"],
  },
  async execute(args) {
    const c = await findCustomer(String(args.customer));
    if (!c) throw new Error(`Customer "${args.customer}" not found.`);
    const status = String(args.status);
    const date = String(args.date);
    const db = await serverSupabase();
    if (!db) throw new Error("Authentication is not configured.");
    if (status === "delivered") {
      await db.from("calendar_days").delete().eq("customer_id", c.id).eq("date", date);
    } else {
      const { data: existing } = await db
        .from("calendar_days")
        .select("id")
        .eq("customer_id", c.id)
        .eq("date", date)
        .maybeSingle();
      if (existing) {
        await db.from("calendar_days").update({ status }).eq("id", existing.id);
      } else {
        await db.from("calendar_days").insert({ customer_id: c.id, date, status });
      }
    }
    return `Set ${c.name} ${date} to ${status}.`;
  },
};

const updateMenuTool: ToolDef = {
  name: "update_menu",
  description: "Update one day's menu item. day is one of: monday, tuesday, wednesday, thursday, friday, saturday, sunday.",
  parameters: {
    type: "object",
    properties: {
      day: { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
      item: { type: "string" },
    },
    required: ["day", "item"],
  },
  async execute(args) {
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const dow = dayMap[String(args.day).toLowerCase()];
    if (dow === undefined) throw new Error("Invalid day.");
    const db = await serverSupabase();
    if (!db) throw new Error("Authentication is not configured.");
    const { error } = await db
      .from("menu")
      .upsert({ day_of_week: dow, item: String(args.item) }, { onConflict: "user_id,day_of_week" });
    if (error) throw error;
    return `Updated ${args.day} menu to "${args.item}".`;
  },
};

/* ---------------- registry ---------------- */

export const TOOLS: ToolDef[] = [
  statsTool,
  listCustomersTool,
  getCustomerTool,
  monthSummaryTool,
  paymentsTool,
  menuTool,
  holidaysTool,
  addCustomerTool,
  updateCustomerTool,
  deleteCustomerTool,
  recordPaymentTool,
  addHolidayTool,
  setDayStatusTool,
  updateMenuTool,
];

export function toolByName(name: string): ToolDef | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

export const WRITE_TOOLS = new Set([
  "add_customer",
  "update_customer",
  "delete_customer",
  "record_payment",
  "add_holiday",
  "set_day_status",
  "update_menu",
]);

export function functionDeclarations() {
  return TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

export function openAiTools() {
  return TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
