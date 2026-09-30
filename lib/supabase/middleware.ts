import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const protectedRoute = process.env.NEXT_PUBLIC_TEAM_WORKSPACES_ENABLED === "true"
    && ["/", "/staff", "/cycles", "/reports", "/team"].includes(request.nextUrl.pathname);
  function requireLogin(source: NextResponse) {
    const target = new URL("/login", request.url);
    target.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(target);
    source.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  // If Supabase isn't configured, skip the auth refresh and pass through.
  // Without this guard createServerClient throws "Your project's URL and Key
  // are required", crashing the edge middleware on every route (500
  // MIDDLEWARE_INVOCATION_FAILED).
  if (!url || !anonKey) {
    return protectedRoute ? requireLogin(supabaseResponse) : supabaseResponse;
  }

  try {
    let response = supabaseResponse;
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // Refresh session so it doesn't expire while user is active
    const { data: { user }, error } = await supabase.auth.getUser();
    if (protectedRoute && (error || !user)) return requireLogin(response);
    if (protectedRoute) response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    // Never let an auth hiccup crash the entire edge middleware
    return protectedRoute ? requireLogin(supabaseResponse) : supabaseResponse;
  }
}
