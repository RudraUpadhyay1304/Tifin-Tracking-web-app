"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "../supabase";
import type { ActionResult } from "./customers";

const paymentSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0").max(1_000_000),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(["cash", "upi", "other"]).default("cash"),
  notes: z.string().trim().max(300).default(""),
});

export async function addPayment(input: z.infer<typeof paymentSchema>): Promise<ActionResult> {
  try {
    const data = paymentSchema.parse(input);
    const { error } = await supabase().from("payments").insert(data);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to record payment" };
  }
}

export async function deletePayment(id: string): Promise<ActionResult> {
  try {
    const { error } = await supabase().from("payments").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete payment" };
  }
}
