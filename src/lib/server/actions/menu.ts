"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./customers";
import { getErrorMessage } from "@/lib/utils";
import { smartUpsert } from "./db-utils";

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
    const res = await smartUpsert("menu", data.items, { onConflict: "day_of_week" });
    if (res.error) throw res.error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}