"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverSupabase, supabaseAdmin } from "../supabase";
import type { ActionResult } from "./customers";
import { getErrorMessage } from "@/lib/utils";

const settingsSchema = z.object({
  sunday_off: z.boolean(),
  business_name: z.string().trim().max(60),
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

export async function saveSettings(
  input: z.infer<typeof settingsSchema>,
): Promise<ActionResult> {
  try {
    const data = settingsSchema.parse(input);
    const { db, userId } = await getDbAndUserId();
    const payload: Record<string, unknown> = { ...data };
    if (userId) payload.user_id = userId;

    let { error } = await db.from("settings").upsert(payload);
    if (error) {
      if (error.message?.includes("user_id") || error.message?.includes("schema cache")) {
        delete payload.user_id;
        let retry = await db.from("settings").upsert(payload);
        if (retry.error) {
          const adminRes = await supabaseAdmin().from("settings").upsert(payload);
          if (adminRes.error) throw adminRes.error;
        }
      } else {
        const adminRes = await supabaseAdmin().from("settings").upsert(payload);
        if (adminRes.error) throw adminRes.error;
      }
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}

export async function setLanguage(lang: "en" | "hi"): Promise<ActionResult> {
  const store = await cookies();
  store.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setTheme(theme: "light" | "dark"): Promise<ActionResult> {
  const store = await cookies();
  store.set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const db = await serverSupabase();
  if (db) {
    await db.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}