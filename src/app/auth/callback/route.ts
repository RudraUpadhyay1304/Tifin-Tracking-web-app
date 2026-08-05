import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

// Called by Supabase after Google OAuth. Exchanges the code for a session and,
// for a brand-new user, seeds an empty settings + weekly menu row set so their
// personal (isolated) workspace is ready to use.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await serverSupabase();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        await seedNewUser(supabase);
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

async function seedNewUser(supabase: NonNullable<Awaited<ReturnType<typeof serverSupabase>>>) {
  try {
    await supabase
      .from("settings")
      .upsert(
        { sunday_off: true, business_name: "My Tiffin Service" },
        { onConflict: "user_id" },
      );

    await supabase
      .from("menu")
      .upsert(
        [0, 1, 2, 3, 4, 5, 6].map((day_of_week) => ({ day_of_week, item: "" })),
        { onConflict: "user_id,day_of_week" },
      );
  } catch (e) {
    // Non-fatal: getSettings()/getMenu() fall back to defaults if seeding failed.
    console.error("seedNewUser error:", e);
  }
}