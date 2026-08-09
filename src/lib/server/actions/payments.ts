"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverSupabase, supabaseAdmin } from "../supabase";
import type { ActionResult } from "./customers";
import { getErrorMessage } from "@/lib/utils";
import { smartInsert } from "./db-utils";

const paymentSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0").max(1_000_000),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(["cash", "upi", "other"]).default("cash"),
  notes: z.string().trim().max(300).default(""),
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

export async function addPayment(input: z.infer<typeof paymentSchema>): Promise<ActionResult> {
  try {
    const data = paymentSchema.parse(input);
    const { userId } = await getDbAndUserId();
    const payload: Record<string, unknown> = { ...data };
    if (userId) payload.user_id = userId;

    const res = await smartInsert("payments", payload);
    if (res.error) throw res.error;

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}

export async function deletePayment(id: string): Promise<ActionResult> {
  try {
    const { db } = await getDbAndUserId();
    let { error } = await db.from("payments").delete().eq("id", id);
    if (error) {
      const adminRes = await supabaseAdmin().from("payments").delete().eq("id", id);
      if (adminRes.error) throw adminRes.error;
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}