import { AdminDataTable } from "@/components/AdminDataTable";
import {
  buildColumnOrder,
  formatColumnLabel,
  guessColumnType,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

const PREFERRED_COLUMNS = ["id", "humor_flavor_id", "caption_count", "updated_at"];

export default async function AdminHumorMixPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("humor_flavor_mix")
    .select("*")
    .limit(200);

  const rows = (data ?? []) as RowData[];
  const columnKeys = buildColumnOrder(rows, PREFERRED_COLUMNS);
  const displayKeys = columnKeys.length ? columnKeys : PREFERRED_COLUMNS;
  const columns = displayKeys.map((key) => ({
    key,
    label: formatColumnLabel(key),
    type: guessColumnType(key),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Humor Mix</h1>
        <p className="mt-1 text-sm text-slate-600">
          Adjust caption counts and flavor weighting.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {error
          ? `Error loading mix: ${error.message}`
          : `${rows.length} row${rows.length === 1 ? "" : "s"}`}
      </div>

      <AdminDataTable
        rows={rows}
        columns={columns}
        editEnabled
        apiTable="humor_flavor_mix"
        editFields={[
          {
            key: "humor_flavor_id",
            label: "Humor Flavor ID",
            type: "text",
          },
          {
            key: "caption_count",
            label: "Caption Count",
            type: "number",
          },
        ]}
      />
    </div>
  );
}
