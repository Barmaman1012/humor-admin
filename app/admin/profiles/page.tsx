import { AdminDataTable } from "@/components/AdminDataTable";
import {
  buildColumnOrder,
  formatColumnLabel,
  guessColumnType,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

const PREFERRED_COLUMNS = [
  "id",
  "email",
  "display_name",
  "first_name",
  "last_name",
  "is_superadmin",
  "created_at",
  "created_datetime_utc",
];

export default async function AdminProfilesPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase.from("profiles").select("*").limit(200);

  const rows = (data ?? []) as RowData[];
  const columnKeys = buildColumnOrder(rows, PREFERRED_COLUMNS).filter(
    (key) => key !== "is_matrix_admin"
  );
  const displayKeys = columnKeys.length
    ? columnKeys
    : PREFERRED_COLUMNS.filter((key) => key !== "is_matrix_admin");
  const columns = displayKeys.map((key) => ({
    key,
    label: formatColumnLabel(key),
    type: guessColumnType(key),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Profiles</h1>
        <p className="mt-1 text-sm text-slate-600">
          Read-only view of user profiles from the profiles table.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {error
          ? `Error loading profiles: ${error.message}`
          : `${rows.length} profile${rows.length === 1 ? "" : "s"}`}
      </div>

      <AdminDataTable rows={rows} columns={columns} />
    </div>
  );
}
