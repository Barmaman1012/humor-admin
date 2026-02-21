"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <button
        type="button"
        onClick={handleLogin}
        className="rounded-md bg-black text-white px-4 py-2"
      >
        Continue with Google
      </button>
    </main>
  );
}
