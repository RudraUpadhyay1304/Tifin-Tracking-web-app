import { supabase } from "./supabase";
import type {
  CalendarDay,
  Customer,
  DayStatus,
  Holiday,
  MenuItem,
  Payment,
  Settings,
} from "@/types/db";
import { endOfMonth, startOfMonth } from "../utils";

export async function getSettings(): Promise<Settings> {
  let { data, error } = await supabase()
    .from("settings")
    .select("*")
    .eq("id", true)
    .single();

  if (error && error.code === "PGRST116") {
    const { data: inserted, error: insertError } = await supabase()
      .from("settings")
      .insert({ id: true })
      .select()
      .single();
    if (!insertError && inserted) {
      data = inserted;
      error = null;
    } else {
      return {
        id: true,
        sunday_off: true,
        business_name: "My Tiffin Service",
      };
    }
  }

  if (error || !data) throw new Error("Failed to load settings");
  return {
    id: true,
    sunday_off: data.sunday_off,
    business_name: data.business_name,
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase()
    .from("customers")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error("Failed to load customers");
  return (data ?? []).map(serializeCustomer);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase()
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Failed to load customer");
  return data ? serializeCustomer(data) : null;
}

function serializeCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    monthly_charge: Number(row.monthly_charge ?? 0),
    joining_date: row.joining_date ? String(row.joining_date) : null,
    status: row.status as Customer["status"],
    notes: String(row.notes ?? ""),
    created_at: String(row.created_at),
  };
}

export async function getHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase()
    .from("holidays")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) throw new Error("Failed to load holidays");
  return (data ?? []).map((h) => ({
    id: String(h.id),
    customer_id: h.customer_id ? String(h.customer_id) : null,
    start_date: String(h.start_date),
    end_date: String(h.end_date),
    reason: String(h.reason ?? ""),
  }));
}

export async function getMenu(): Promise<MenuItem[]> {
  const { data, error } = await supabase().from("menu").select("*");
  if (error) throw new Error("Failed to load menu");
  const map = new Map<number, string>();
  for (const row of data ?? []) map.set(Number(row.day_of_week), String(row.item ?? ""));
  return [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day_of_week: d, item: map.get(d) ?? "" }));
}

export async function getPaymentsBetween(startIso: string, endIso: string): Promise<Payment[]> {
  const { data, error } = await supabase()
    .from("payments")
    .select("*")
    .gte("payment_date", startIso)
    .lte("payment_date", endIso)
    .order("payment_date", { ascending: false });
  if (error) throw new Error("Failed to load payments");
  return (data ?? []).map((p) => ({
    id: String(p.id),
    customer_id: String(p.customer_id),
    amount: Number(p.amount),
    payment_date: String(p.payment_date),
    method: p.method as Payment["method"],
    notes: String(p.notes ?? ""),
  }));
}

export async function getPaymentsForCustomer(customerId: string, limit = 100): Promise<Payment[]> {
  const { data, error } = await supabase()
    .from("payments")
    .select("*")
    .eq("customer_id", customerId)
    .order("payment_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Failed to load payments");
  return (data ?? []).map((p) => ({
    id: String(p.id),
    customer_id: String(p.customer_id),
    amount: Number(p.amount),
    payment_date: String(p.payment_date),
    method: p.method as Payment["method"],
    notes: String(p.notes ?? ""),
  }));
}

export interface MonthInputs {
  sundayOff: boolean;
  holidays: Holiday[];
  calendarRows: CalendarDay[];
  payments: Payment[];
}

export async function getMonthInputs(year: number, monthIndex: number): Promise<MonthInputs> {
  const startIso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const [settings, holidays, rows, payments] = await Promise.all([
    getSettings(),
    getHolidays(),
    supabase()
      .from("calendar_days")
      .select("*")
      .gte("date", startOfMonth(startIso))
      .lte("date", endOfMonth(startIso)),
    getPaymentsBetween(startOfMonth(startIso), endOfMonth(startIso)),
  ]);
  return {
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
}

export async function getCalendarMonth(customerId: string, year: number, monthIndex: number) {
  const startIso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const { data, error } = await supabase()
    .from("calendar_days")
    .select("*")
    .eq("customer_id", customerId)
    .gte("date", startOfMonth(startIso))
    .lte("date", endOfMonth(startIso));
  if (error) throw new Error("Failed to load calendar");
  return (data ?? []).map((r) => ({
    id: String(r.id),
    customer_id: String(r.customer_id),
    date: String(r.date),
    status: r.status as DayStatus,
  }));
}

export async function searchCustomers(q: string, limit = 20): Promise<Customer[]> {
  const term = q.trim();
  if (!term) return [];
  const { data, error } = await supabase()
    .from("customers")
    .select("*")
    .or(`name.ilike.%${term}%,phone.ilike.%${term}%,address.ilike.%${term}%`)
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw new Error("Search failed");
  return (data ?? []).map(serializeCustomer);
}

export async function getDailyEarnings(startIso: string, endIso: string) {
  const { data, error } = await supabase()
    .from("payments")
    .select("payment_date, amount")
    .gte("payment_date", startIso)
    .lte("payment_date", endIso);
  if (error) throw new Error("Failed to load earnings");
  const map = new Map<string, number>();
  for (const p of data ?? []) {
    const d = String(p.payment_date);
    map.set(d, (map.get(d) ?? 0) + Number(p.amount));
  }
  return map;
}
