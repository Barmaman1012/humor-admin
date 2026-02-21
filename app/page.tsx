import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (profile?.is_superadmin) {
    redirect("/admin");
  }

  redirect("/login");
}
