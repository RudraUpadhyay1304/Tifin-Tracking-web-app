import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Route protection + session refresh (formerly "middleware").
// - Refreshes the Supabase session cookie on every request so users stay
//   logged in automatically (no repeated sign-in).
// - Redirects unauthenticated visitors to /login.
// - Redirects signed-in users away from /login and / straight to /dashboard.

const DEFAULT_URL = "https://feyqoeyllmbpnbdkvrur.supabase.co";

function supabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (envUrl && envUrl.trim() ? envUrl.trim() : DEFAULT_URL).replace(/\/+$/, "");
}

export async function proxy(request: NextRequest) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  // Public / unauthenticated paths (auth flow + cron backup).
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/sync") ||
    pathname === "/favicon.ico";

  let response = NextResponse.next({ request: { headers: request.headers } });

  // Auth isn't configured yet — pass everything through so users can still see
  // the /login page with a helpful setup message.
  if (!anonKey || !anonKey.trim()) {
    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl(), anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!isPublic) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // Signed in — send them to their own dashboard.
  if (pathname === "/login" || pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|apple-icon-180.png|icon-192.png|icon-512.png|icon.svg|sw.js|.*\\.svg).*)",
  ],
};