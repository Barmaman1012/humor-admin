import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSignOutButton } from "@/components/AdminSignOutButton";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/stats", label: "Stats" },
  { href: "/admin/admins", label: "Admins" },
  { href: "/admin/profiles", label: "Profiles" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/captions", label: "Captions" },
  { href: "/admin/caption-requests", label: "Caption Requests" },
  { href: "/admin/humor-flavors", label: "Humor Flavors" },
  { href: "/admin/humor-flavor-steps", label: "Humor Flavor Steps" },
  { href: "/admin/humor-mix", label: "Humor Mix" },
  { href: "/admin/caption-examples", label: "Caption Examples" },
  { href: "/admin/terms", label: "Terms" },
  { href: "/admin/llm-providers", label: "LLM Providers" },
  { href: "/admin/llm-models", label: "LLM Models" },
  { href: "/admin/llm-prompt-chains", label: "LLM Prompt Chains" },
  { href: "/admin/llm-responses", label: "LLM Responses" },
  { href: "/admin/allowed-signup-domains", label: "Allowed Signup Domains" },
  {
    href: "/admin/whitelist-email-addresses",
    label: "Whitelist Email Addresses",
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerComponentClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_superadmin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Admin
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Humor Admin
                </div>
                <div className="text-lg font-semibold text-slate-900">
                  Welcome back
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {user.email ?? "Unknown"}
                </div>
                <AdminSignOutButton />
              </div>
            </header>

            <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
