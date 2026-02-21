import { AdminImagesClient } from "@/components/AdminImagesClient";
import { type RowData } from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export default async function AdminImagesPage() {
  const supabase = await createSupabaseServerComponentClient();

  const { data, error } = await supabase.from("images").select("*").limit(50);
  const rows = (data ?? []) as RowData[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Images</h1>
        <p className="mt-1 text-sm text-slate-600">
          Latest image uploads and metadata.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {error
          ? `Error loading images: ${error.message}`
          : `${rows.length} image${rows.length === 1 ? "" : "s"}`}
      </div>

      <AdminImagesClient rows={rows} />
    </div>
  );
}
