"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "../supabase";
import type { DayStatus } from "@/types/db";
import type { ActionResult } from "./customers";

const statusSchema = z.enum(["delivered", "sunday_off", "holiday", "skipped", "extra"]);

/**
 * Set one day's status. `status === "delivered"` and the day has no stored row
 * means "reset to default" — the row is deleted. Otherwise the row is upserted.
 */
export async function setDayStatus(
  customerId: string,
  date: string,
  status: DayStatus,
): Promise<ActionResult> {
  try {
    const s = statusSchema.parse(status);
    if (s === "delivered") {
      await supabase()
        .from("calendar_days")
        .delete()
        .eq("customer_id", customerId)
        .eq("date", date);
    } else {
      const { data: existing } = await supabase()
        .from("calendar_days")
        .select("id")
        .eq("customer_id", customerId)
        .eq("date", date)
        .maybeSingle();
      if (existing) {
        await supabase().from("calendar_days").update({ status: s }).eq("id", existing.id);
      } else {
        await supabase()
          .from("calendar_days")
          .insert({ customer_id: customerId, date, status: s });
      }
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update day" };
  }
}
