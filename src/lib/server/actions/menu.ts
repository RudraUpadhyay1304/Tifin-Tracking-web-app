"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "../supabase";
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
    for (const m of data.items) {
      await supabase()
        .from("menu")
        .upsert({ day_of_week: m.day_of_week, item: m.item }, { onConflict: "day_of_week" });
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save menu" };
  }
}
