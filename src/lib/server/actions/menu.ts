"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverSupabase, supabaseAdmin } from "../supabase";
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

export async function saveMenu(items: { day_of_week: number; item: string }[]): Promise<ActionResult> {
  try {
    const data = menuSchema.parse({ items });
    const { userId } = await getDbAndUserId();
    const rows = userId ? data.items.map((item) => ({ ...item, user_id: userId })) : data.items;

    const res = await smartUpsert("menu", rows, { onConflict: userId ? "user_id,day_of_week" : "day_of_week" });
    if (res.error) throw res.error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}