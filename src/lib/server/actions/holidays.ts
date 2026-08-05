"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverSupabase } from "../supabase";
import type { ActionResult } from "./customers";

import { getErrorMessage } from "@/lib/utils";

const holidaySchema = z.object({
  customer_id: z.string().uuid().nullable().default(null),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(300).default(""),
});

export async function addHoliday(input: z.infer<typeof holidaySchema>): Promise<ActionResult> {
  try {
    const data = holidaySchema.parse(input);
    if (data.end_date < data.start_date) {
      return { ok: false, error: "End date must be after start date" };
    }
    const db = await serverSupabase();
    if (!db) return { ok: false, error: "Authentication is not configured." };
    const { error } = await db.from("holidays").insert({
      customer_id: data.customer_id,
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  try {
    const db = await serverSupabase();
    if (!db) return { ok: false, error: "Authentication is not configured." };
    const { error } = await db.from("holidays").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}