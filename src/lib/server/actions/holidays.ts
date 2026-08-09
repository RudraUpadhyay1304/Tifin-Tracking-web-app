"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverSupabase, supabaseAdmin } from "../supabase";
import type { ActionResult } from "./customers";
import { getErrorMessage } from "@/lib/utils";

const holidaySchema = z.object({
  customer_id: z.string().uuid().nullable().default(null),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(300).default(""),
});

async function getDbAndUserId() {
  const db = await serverSupabase();
  let userId: string | null = null;
  if (db) {
    try {
      const { data } = await db.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      userId = null;
    }
  }
  return { db: db ?? supabaseAdmin(), userId };
}

export async function addHoliday(input: z.infer<typeof holidaySchema>): Promise<ActionResult> {
  try {
    const data = holidaySchema.parse(input);
    if (data.end_date < data.start_date) {
      return { ok: false, error: "End date must be after start date" };
    }
    const { db, userId } = await getDbAndUserId();
    const payload: Record<string, unknown> = {
      customer_id: data.customer_id,
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason,
    };

    let { error } = await db.from("holidays").insert(payload);
    if (error) {
      const adminRes = await supabaseAdmin().from("holidays").insert(payload);
      if (adminRes.error) throw adminRes.error;
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  try {
    const { db } = await getDbAndUserId();
    let { error } = await db.from("holidays").delete().eq("id", id);
    if (error) {
      const adminRes = await supabaseAdmin().from("holidays").delete().eq("id", id);
      if (adminRes.error) throw adminRes.error;
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}