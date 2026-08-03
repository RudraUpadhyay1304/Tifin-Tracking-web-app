import { NextRequest, NextResponse } from "next/server";
import { syncToSheets } from "@/lib/server/sheets";

export const dynamic = "force-dynamic";

/**
 * Background Google Sheets backup. Called by Vercel Cron (see vercel.json)
 * or manually with ?secret=CRON_SECRET. Never part of the user request path.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.nextUrl.searchParams.get("secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncToSheets();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
