"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverSupabase, supabaseAdmin } from "../supabase";
import type { DayStatus } from "@/types/db";
import type { ActionResult } from "./customers";
import { getErrorMessage } from "@/lib/utils";

const statusSchema = z.enum(["delivered", "sunday_off", "holiday", "skipped", "extra"]);

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

export async function setDayStatus(
  customerId: string,
  date: string,
  status: DayStatus,
): Promise<ActionResult> {
  try {
    const s = statusSchema.parse(status);
    const { db, userId } = await getDbAndUserId();

    if (s === "delivered") {
      let { error } = await db
        .from("calendar_days")
        .delete()
        .eq("customer_id", customerId)
        .eq("date", date);
      if (error) {
        await supabaseAdmin()
          .from("calendar_days")
          .delete()
          .eq("customer_id", customerId)
          .eq("date", date);
      }
    } else {
      const { data: existing } = await db
        .from("calendar_days")
        .select("id")
        .eq("customer_id", customerId)
        .eq("date", date)
        .maybeSingle();

      if (existing) {
        let { error } = await db.from("calendar_days").update({ status: s }).eq("id", existing.id);
        if (error) {
          await supabaseAdmin().from("calendar_days").update({ status: s }).eq("id", existing.id);
        }
      } else {
        const payload: Record<string, unknown> = { customer_id: customerId, date, status: s };
        if (userId) payload.user_id = userId;
        let { error } = await db.from("calendar_days").insert(payload);
        if (error) {
          if (error.message?.includes("user_id") || error.message?.includes("schema cache")) {
            delete payload.user_id;
            let retry = await db.from("calendar_days").insert(payload);
            if (retry.error) {
              await supabaseAdmin().from("calendar_days").insert(payload);
            }
          } else {
            await supabaseAdmin().from("calendar_days").insert(payload);
          }
        }
      }
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}