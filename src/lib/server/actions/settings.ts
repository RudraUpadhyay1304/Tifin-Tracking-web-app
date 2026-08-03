"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { supabase } from "../supabase";
import type { ActionResult } from "./customers";

const settingsSchema = z.object({
  sunday_off: z.boolean(),
  business_name: z.string().trim().max(60),
});

export async function saveSettings(
  input: z.infer<typeof settingsSchema>,
): Promise<ActionResult> {
  try {
    const data = settingsSchema.parse(input);
    const { error } = await supabase()
      .from("settings")
      .update(data)
      .eq("id", true);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save settings" };
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
