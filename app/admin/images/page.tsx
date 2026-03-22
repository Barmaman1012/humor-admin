import { AdminImagesClient } from "@/components/AdminImagesClient";
import { pickFirstKey, type RowData } from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

const CREATED_CANDIDATES = [
  "created_datetime_utc",
  "created_at",
  "created_time",
  "inserted_at",
];

export default async function AdminImagesPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data: sampleRows } = await supabase.from("images").select("*").limit(1);
  const sample = (sampleRows?.[0] ?? null) as RowData | null;
  const createdKey = pickFirstKey(sample, CREATED_CANDIDATES);

  const query = supabase.from("images").select("*");
  const { data, error } = createdKey
    ? await query.order(createdKey, { ascending: false })
    : await query.limit(200);
  const rows = (data ?? []) as RowData[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Images</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create, review, update, and delete image records.
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
