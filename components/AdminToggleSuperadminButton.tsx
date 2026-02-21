"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  profileId: string;
  isSuperadmin: boolean;
  isSelf: boolean;
};

export function AdminToggleSuperadminButton({
  profileId,
  isSuperadmin,
  isSelf,
}: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async () => {
    const nextValue = !isSuperadmin;

    if (isSelf && !nextValue) {
      const confirmed = window.confirm(
        "You are about to remove your own admin access. Continue?"
      );
      if (!confirmed) return;
    }

    setIsSaving(true);
    setStatus(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_superadmin: nextValue })
      .eq("id", profileId);

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus("Updated successfully. Refresh to see changes.");
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isSaving}
        className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
      >
        {isSuperadmin ? "Revoke" : "Grant"}
      </button>
      {status ? (
        <div className="text-xs text-slate-600">{status}</div>
      ) : null}
    </div>
  );
}
