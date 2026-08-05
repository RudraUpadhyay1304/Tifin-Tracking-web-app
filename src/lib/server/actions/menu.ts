"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverSupabase } from "../supabase";
import type { ActionResult } from "./customers";

const menuSchema = z.object({
  items: z
    .array(
      z.object({
        day_of_week: z.number().int().min(0).max(6),
        item: z.string().trim().max(100),
      }),
    )
    .length(7),
});

export async function saveMenu(items: { day_of_week: number; item: string }[]): Promise<ActionResult> {
  try {
    const data = menuSchema.parse({ items });
    const db = await serverSupabase();
    if (!db) return { ok: false, error: "Authentication is not configured." };
    await db
      .from("menu")
      .upsert(data.items, { onConflict: "user_id,day_of_week" });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save menu" };
  }
}