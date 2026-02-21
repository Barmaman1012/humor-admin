import { NextResponse } from "next/server";
import { createSupabaseServerRouteClient } from "@/lib/supabase/server-route";

const TABLE_CONFIG: Record<
  string,
  {
    create: boolean;
    update: boolean;
    delete: boolean;
    updateFields?: string[];
  }
> = {
  images: { create: true, update: true, delete: true },
  caption_examples: { create: true, update: true, delete: true },
  terms: { create: true, update: true, delete: true },
  llm_models: { create: true, update: true, delete: true },
  llm_providers: { create: true, update: true, delete: true },
  allowed_signup_domains: { create: true, update: true, delete: true },
  whitelist_email_addresses: { create: true, update: true, delete: true },
  humor_flavor_mix: {
    create: false,
    update: true,
    delete: false,
    updateFields: ["caption_count", "humor_flavor_id"],
  },
};

const ID_PATTERN = /^[A-Za-z0-9-_]+$/;

async function requireSuperadmin() {
  const supabase = createSupabaseServerRouteClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_superadmin) {
    return { response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return { supabase };
}

function sanitizeUpdate(table: string, payload: Record<string, unknown>) {
  const config = TABLE_CONFIG[table];
  if (!config?.updateFields?.length) return payload;
  const allowed = new Set(config.updateFields);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowed.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function PATCH(
  request: Request,
  { params }: { params: { table: string; id: string } }
) {
  const table = params.table;
  const config = TABLE_CONFIG[table];
  if (!config) {
    return NextResponse.json({ error: "Table not allowed." }, { status: 404 });
  }
  if (!config.update) {
    return NextResponse.json({ error: "Update not allowed." }, { status: 405 });
  }

  const id = params.id;
  if (!id || !ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireSuperadmin();
  if ("response" in auth) return auth.response;

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const values = sanitizeUpdate(table, payload as Record<string, unknown>);
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from(table)
    .update(values)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { table: string; id: string } }
) {
  const table = params.table;
  const config = TABLE_CONFIG[table];
  if (!config) {
    return NextResponse.json({ error: "Table not allowed." }, { status: 404 });
  }
  if (!config.delete) {
    return NextResponse.json({ error: "Delete not allowed." }, { status: 405 });
  }

  const id = params.id;
  if (!id || !ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireSuperadmin();
  if ("response" in auth) return auth.response;

  const { error } = await auth.supabase.from(table).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
