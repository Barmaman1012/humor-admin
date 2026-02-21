import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/server-route";

const TABLE_CONFIG: Record<
  string,
  { create: boolean; update: boolean; delete: boolean }
> = {
  images: { create: true, update: true, delete: true },
  caption_examples: { create: true, update: true, delete: true },
  terms: { create: true, update: true, delete: true },
  llm_models: { create: true, update: true, delete: true },
  llm_providers: { create: true, update: true, delete: true },
  allowed_signup_domains: { create: true, update: true, delete: true },
  whitelist_email_addresses: { create: true, update: true, delete: true },
  humor_flavor_mix: { create: false, update: true, delete: false },
};

const TABLE_WHITELIST = new Set(Object.keys(TABLE_CONFIG));

function applyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  return to;
}

async function requireSuperadmin(request: NextRequest, response: NextResponse) {
  const supabase = createSupabaseRouteClient(request, response);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    return {
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_superadmin) {
    return {
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { supabase };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  const response = NextResponse.next();
  const { table } = await context.params;
  if (!TABLE_WHITELIST.has(table)) {
    return NextResponse.json({ error: "Table not allowed." }, { status: 404 });
  }

  const auth = await requireSuperadmin(request, response);
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase.from(table).select("*").limit(200);
  if (error) {
    return applyCookies(
      response,
      NextResponse.json({ error: error.message }, { status: 400 })
    );
  }
  return applyCookies(response, NextResponse.json({ data }));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  const response = NextResponse.next();
  const { table } = await context.params;
  const config = TABLE_CONFIG[table];
  if (!config) {
    return NextResponse.json({ error: "Table not allowed." }, { status: 404 });
  }
  if (!config.create) {
    return NextResponse.json({ error: "Create not allowed." }, { status: 405 });
  }

  const auth = await requireSuperadmin(request, response);
  if ("response" in auth) return auth.response;

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from(table)
    .insert(payload)
    .select("*");

  if (error) {
    return applyCookies(
      response,
      NextResponse.json({ error: error.message }, { status: 400 })
    );
  }

  return applyCookies(response, NextResponse.json({ data }));
}
