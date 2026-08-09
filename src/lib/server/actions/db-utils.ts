import { serverSupabase, supabaseAdmin } from "../supabase";

export async function smartInsert(table: string, payload: Record<string, unknown> | Record<string, unknown>[]) {
  const db = (await serverSupabase()) ?? supabaseAdmin();
  let res = await db.from(table).insert(payload as any);
  if (!res.error) return res;

  return await supabaseAdmin().from(table).insert(payload as any);
}

export async function smartUpsert(
  table: string,
  payload: Record<string, unknown> | Record<string, unknown>[],
  options?: { onConflict?: string; ignoreDuplicates?: boolean },
) {
  const db = (await serverSupabase()) ?? supabaseAdmin();
  let res = await db.from(table).upsert(payload as any, options);
  if (!res.error) return res;

  return await supabaseAdmin().from(table).upsert(payload as any, options);
}
