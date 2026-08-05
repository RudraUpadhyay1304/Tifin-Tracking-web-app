"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverSupabase } from "../supabase";
import type { ActionResult } from "./customers";

import { getErrorMessage } from "@/lib/utils";

const settingsSchema = z.object({
  sunday_off: z.boolean(),
  business_name: z.string().trim().max(60),
});

export async function saveSettings(
  input: z.infer<typeof settingsSchema>,
): Promise<ActionResult> {
  try {
    const data = settingsSchema.parse(input);
    const db = await serverSupabase();
    if (!db) return { ok: false, error: "Authentication is not configured." };
    const { error } = await db.from("settings").update(data);
    if (error) throw error;
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