"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverSupabase, supabaseAdmin } from "../supabase";
import { getErrorMessage } from "@/lib/utils";
import { smartInsert } from "./db-utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

function wrap<T>(fn: () => Promise<T>): Promise<ActionResult> {
  return fn()
    .then(() => ({ ok: true as const }))
    .catch((e: unknown) => ({
      ok: false as const,
      error: getErrorMessage(e),
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

    const payload: Record<string, unknown> = {
      ...data,
      joining_date: data.joining_date ?? null,
    };

    const res = await smartInsert("customers", payload);
    if (res.error) throw res.error;

    revalidatePath("/", "layout");
  });
}

export async function updateCustomer(
  id: string,
  input: z.infer<typeof customerSchema>,
): Promise<ActionResult> {
  return wrap(async () => {
    const data = customerSchema.parse(input);
    const db = (await serverSupabase()) ?? supabaseAdmin();
    const payload = { ...data, joining_date: data.joining_date ?? null };
    let { error } = await db.from("customers").update(payload).eq("id", id);
    if (error) {
      const adminRes = await supabaseAdmin().from("customers").update(payload).eq("id", id);
      if (adminRes.error) throw adminRes.error;
    }
    revalidatePath("/", "layout");
  });
}

export async function setCustomerStatus(
  id: string,
  status: "active" | "paused" | "inactive",
): Promise<ActionResult> {
  return wrap(async () => {
    const db = (await serverSupabase()) ?? supabaseAdmin();
    let { error } = await db.from("customers").update({ status }).eq("id", id);
    if (error) {
      const adminRes = await supabaseAdmin().from("customers").update({ status }).eq("id", id);
      if (adminRes.error) throw adminRes.error;
    }
    revalidatePath("/", "layout");
  });
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  return wrap(async () => {
    const db = (await serverSupabase()) ?? supabaseAdmin();
    let { error } = await db.from("customers").delete().eq("id", id);
    if (error) {
      const adminRes = await supabaseAdmin().from("customers").delete().eq("id", id);
      if (adminRes.error) throw adminRes.error;
    }
    revalidatePath("/", "layout");
  });
}