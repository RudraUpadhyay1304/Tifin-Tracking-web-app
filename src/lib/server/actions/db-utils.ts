import { serverSupabase, supabaseAdmin } from "../supabase";

function cleanPayload(p: unknown): unknown {
  if (Array.isArray(p)) return p.map((item) => cleanPayload(item));
  if (p && typeof p === "object") {
    const { user_id, ...rest } = p as Record<string, unknown>;
    return rest;
  }
  return p;
}

function isSchemaError(err: any): boolean {
  if (!err) return false;
  return (
    err.code === "PGRST204" ||
    err.code === "PGRST205" ||
    String(err.message || "").includes("user_id") ||
    String(err.message || "").includes("schema cache")
  );
}

export async function smartInsert(table: string, payload: Record<string, unknown> | Record<string, unknown>[]) {
  const db = (await serverSupabase()) ?? supabaseAdmin();
  let res = await db.from(table).insert(payload as any);
  if (!res.error) return res;

  if (isSchemaError(res.error)) {
    const fallbackPayload = cleanPayload(payload);
    let retryDb = await db.from(table).insert(fallbackPayload as any);
    if (!retryDb.error) return retryDb;
    return await supabaseAdmin().from(table).insert(fallbackPayload as any);
  }

  const adminRes = await supabaseAdmin().from(table).insert(payload as any);
  if (adminRes.error && isSchemaError(adminRes.error)) {
    const fallbackPayload = cleanPayload(payload);
    return await supabaseAdmin().from(table).insert(fallbackPayload as any);
  }
  return adminRes;
}

export async function smartUpsert(table: string, payload: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
  const db = (await serverSupabase()) ?? supabaseAdmin();
  let res = await db.from(table).upsert(payload as any, options);
  if (!res.error) return res;

  if (isSchemaError(res.error)) {
    const fallbackPayload = cleanPayload(payload);
    const fallbackOptions = options ? { ...options } : undefined;
    if (fallbackOptions && fallbackOptions.onConflict?.includes("user_id")) {
      delete fallbackOptions.onConflict;
    }
    let retryDb = await db.from(table).upsert(fallbackPayload as any, fallbackOptions);
    if (!retryDb.error) return retryDb;
    return await supabaseAdmin().from(table).upsert(fallbackPayload as any, fallbackOptions);
  }

  const adminRes = await supabaseAdmin().from(table).upsert(payload as any, options);
  if (adminRes.error && isSchemaError(adminRes.error)) {
    const fallbackPayload = cleanPayload(payload);
    const fallbackOptions = options ? { ...options } : undefined;
    if (fallbackOptions && fallbackOptions.onConflict?.includes("user_id")) {
      delete fallbackOptions.onConflict;
    }
    return await supabaseAdmin().from(table).upsert(fallbackPayload as any, fallbackOptions);
  }
  return adminRes;
}
