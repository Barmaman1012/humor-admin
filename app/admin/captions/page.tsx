import { AdminDataTable } from "@/components/AdminDataTable";
import {
  buildColumnOrder,
  formatColumnLabel,
  guessColumnType,
  pickFirstKey,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

const PREFERRED_COLUMNS = ["id", "caption", "image_id", "created_at", "user_id"];
const CREATED_CANDIDATES = [
  "created_at",
  "created_datetime_utc",
  "created_time",
  "inserted_at",
];

export default async function AdminCaptionsPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data: sampleRows } = await supabase.from("captions").select("*").limit(1);
  const sample = (sampleRows?.[0] ?? null) as RowData | null;
  const createdKey = pickFirstKey(sample, CREATED_CANDIDATES);

  const query = supabase.from("captions").select("*");
  const { data, error } = createdKey
    ? await query.order(createdKey, { ascending: false }).limit(200)
    : await query.limit(200);
  const rows = (data ?? []) as RowData[];
  const columnKeys = buildColumnOrder(rows, PREFERRED_COLUMNS);
  const displayKeys = columnKeys.length ? columnKeys : PREFERRED_COLUMNS;
  const columns = displayKeys.map((key) => ({
    key,
    label: formatColumnLabel(key),
    type: guessColumnType(key),
    maxLength: 200,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Captions</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review caption text and related images.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {error
          ? `Error loading captions: ${error.message}`
          : `${rows.length} caption${rows.length === 1 ? "" : "s"}`}
      </div>

      <AdminDataTable
        rows={rows}
        columns={columns}
        enableSearch
        searchPlaceholder="Search captions..."
      />
    </div>
  );
}
