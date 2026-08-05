import { supabaseAdmin } from "./supabase";

/**
 * Pushes CSV backups of all tables to the configured Google Sheets web app.
 * Runs entirely in the background — never on the user's request path.
 * Uses the service_role client (bypasses RLS) so every user's data is
 * included in the backup. No-op unless SHEETS_WEBHOOK_URL is set.
 */
export async function syncToSheets(): Promise<{ ok: boolean; error?: string }> {
  const webhook = process.env.SHEETS_WEBHOOK_URL;
  if (!webhook) return { ok: true };

  try {
    const db = supabaseAdmin();

    const [customers, calendar, payments, holidays, menu, settings] = await Promise.all([
      db.from("customers").select("*").order("name"),
      db.from("calendar_days").select("*").order("date", { ascending: false }),
      db.from("payments").select("*").order("payment_date", { ascending: false }),
      db.from("holidays").select("*"),
      db.from("menu").select("*").order("day_of_week"),
      db.from("settings").select("*").eq("id", true).single(),
    ]);

    const sheets = [
      {
        sheet: "Customers",
        rows: [
          ["Name", "Phone", "Address", "Monthly charge", "Joining date", "Status", "Notes"],
          ...(customers.data ?? []).map((c) => [
            c.name,
            c.phone,
            c.address,
            Number(c.monthly_charge),
            c.joining_date,
            c.status,
            c.notes,
          ]),
        ],
      },
      {
        sheet: "Calendar",
        rows: [
          ["Customer ID", "Date", "Status"],
          ...(calendar.data ?? []).map((r) => [r.customer_id, r.date, r.status]),
        ],
      },
      {
        sheet: "Payments",
        rows: [
          ["Customer ID", "Date", "Amount", "Method", "Notes"],
          ...(payments.data ?? []).map((p) => [
            p.customer_id,
            p.payment_date,
            Number(p.amount),
            p.method,
            p.notes,
          ]),
        ],
      },
      {
        sheet: "Holidays",
        rows: [
          ["Customer ID", "Start", "End", "Reason"],
          ...(holidays.data ?? []).map((h) => [h.customer_id, h.start_date, h.end_date, h.reason]),
        ],
      },
      {
        sheet: "Menu",
        rows: [
          ["Day", "Item"],
          ...(menu.data ?? []).map((m) => [m.day_of_week, m.item]),
        ],
      },
      {
        sheet: "Settings",
        rows: [
          ["Key", "Value"],
          ["Sunday off", settings.data?.sunday_off ?? ""],
          ["Business name", settings.data?.business_name ?? ""],
          ["Backup time (UTC)", new Date().toISOString()],
        ],
      },
    ];

    for (const sheet of sheets) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet: sheet.sheet, rows: sheet.rows }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        throw new Error(`Sheets webhook failed for ${sheet.sheet}: ${res.status}`);
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
