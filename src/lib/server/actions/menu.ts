"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverSupabase, supabaseAdmin } from "../supabase";
import type { ActionResult } from "./customers";
import { getErrorMessage } from "@/lib/utils";

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
    const { db } = await getDbAndUserId();
    const rows = data.items;
    let { error } = await db.from("menu").upsert(rows);
    if (error) {
      await supabaseAdmin().from("menu").upsert(rows);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}