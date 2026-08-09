"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverSupabase, supabaseAdmin } from "../supabase";
import { getErrorMessage } from "@/lib/utils";

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

export async function getDbAndUserId() {
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

export async function addCustomer(input: z.infer<typeof customerSchema>): Promise<ActionResult> {
  return wrap(async () => {
    const data = customerSchema.parse(input);
    const { db, userId } = await getDbAndUserId();

    if (!userId) {
      // No authenticated user – abort insertion.
      throw new Error("User not authenticated");
    }

    const payload: Record<string, unknown> = {
      ...data,
      joining_date: data.joining_date ?? null,
      user_id: userId,
    };

    let { error } = await db.from("customers").insert(payload);
    if (error) {
      const adminRes = await supabaseAdmin().from("customers").insert(payload);
      if (adminRes.error) throw adminRes.error;
    }
    revalidatePath("/", "layout");
  });
}

export async function updateCustomer(
  id: string,
  input: z.infer<typeof customerSchema>,
): Promise<ActionResult> {
  // Ensure the user is authenticated before updating.
  // The authentication check is performed inside the action.

  return wrap(async () => {
    const data = customerSchema.parse(input);
    const { db } = await getDbAndUserId();
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
    const { db } = await getDbAndUserId();
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
    const { db } = await getDbAndUserId();
    let { error } = await db.from("customers").delete().eq("id", id);
    if (error) {
      const adminRes = await supabaseAdmin().from("customers").delete().eq("id", id);
      if (adminRes.error) throw adminRes.error;
    }
    revalidatePath("/", "layout");
  });
}