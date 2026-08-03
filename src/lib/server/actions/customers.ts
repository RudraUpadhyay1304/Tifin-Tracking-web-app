"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "../supabase";

export type ActionResult = { ok: true } | { ok: false; error: string };

function wrap<T>(fn: () => Promise<T>): Promise<ActionResult> {
  return fn()
    .then(() => ({ ok: true as const }))
    .catch((e: unknown) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    }));
}

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  phone: z.string().trim().max(20).default(""),
  address: z.string().trim().max(200).default(""),
  monthly_charge: z.coerce.number().min(0).max(1_000_000).default(0),
  joining_date: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)),
  status: z.enum(["active", "paused", "inactive"]).default("active"),
  notes: z.string().trim().max(1000).default(""),
});

export async function addCustomer(input: z.infer<typeof customerSchema>): Promise<ActionResult> {
  return wrap(async () => {
    const data = customerSchema.parse(input);
    const { error } = await supabase().from("customers").insert({
      ...data,
      joining_date: data.joining_date ?? null,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
  });
}

export async function updateCustomer(
  id: string,
  input: z.infer<typeof customerSchema>,
): Promise<ActionResult> {
  return wrap(async () => {
    const data = customerSchema.parse(input);
    const { error } = await supabase()
      .from("customers")
      .update({ ...data, joining_date: data.joining_date ?? null })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/", "layout");
  });
}

export async function setCustomerStatus(
  id: string,
  status: "active" | "paused" | "inactive",
): Promise<ActionResult> {
  return wrap(async () => {
    const { error } = await supabase().from("customers").update({ status }).eq("id", id);
    if (error) throw error;
    revalidatePath("/", "layout");
  });
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  return wrap(async () => {
    const { error } = await supabase().from("customers").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/", "layout");
  });
}
