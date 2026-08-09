"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverSupabase, supabaseAdmin } from "../supabase";
import type { DayStatus } from "@/types/db";
import type { ActionResult } from "./customers";
import { getErrorMessage } from "@/lib/utils";
import { smartInsert } from "./db-utils";

const statusSchema = z.enum(["delivered", "sunday_off", "holiday", "skipped", "extra"]);

export async function setDayStatus(
  customerId: string,
  date: string,
  status: DayStatus,
): Promise<ActionResult> {
  try {
    const s = statusSchema.parse(status);
    const db = (await serverSupabase()) ?? supabaseAdmin();

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
        const res = await smartInsert("calendar_days", payload);
        if (res.error) throw res.error;
      }
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}