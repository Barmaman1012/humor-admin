import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { url, anonKey } = getSupabaseEnv();
  const response = NextResponse.redirect(new URL("/admin", request.url));
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
