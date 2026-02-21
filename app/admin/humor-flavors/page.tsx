import { AdminDataTable } from "@/components/AdminDataTable";
import {
  buildColumnOrder,
  formatColumnLabel,
  guessColumnType,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

const PREFERRED_COLUMNS = ["id", "name", "slug", "created_at"];

export default async function AdminHumorFlavorsPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("humor_flavors")
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
        <h1 className="text-2xl font-semibold text-slate-900">Humor Flavors</h1>
        <p className="mt-1 text-sm text-slate-600">
          Reference list of humor flavor categories.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {error
          ? `Error loading humor flavors: ${error.message}`
          : `${rows.length} flavor${rows.length === 1 ? "" : "s"}`}
      </div>

      <AdminDataTable rows={rows} columns={columns} />
    </div>
  );
}
