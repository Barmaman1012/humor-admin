import { AdminDataTable } from "@/components/AdminDataTable";
import {
  buildColumnOrder,
  formatColumnLabel,
  guessColumnType,
  guessFormFieldType,
  isEditableColumn,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

const PREFERRED_COLUMNS = ["id", "term", "definition", "created_at"];

export default async function AdminTermsPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase.from("terms").select("*").limit(200);

  const rows = (data ?? []) as RowData[];
  const columnKeys = buildColumnOrder(rows, PREFERRED_COLUMNS);
  const displayKeys = columnKeys.length ? columnKeys : PREFERRED_COLUMNS;
  const columns = displayKeys.map((key) => ({
    key,
    label: formatColumnLabel(key),
    type: guessColumnType(key),
    maxLength: 240,
  }));
  const editableKeys = displayKeys.filter(isEditableColumn);
  const fields = editableKeys.map((key) => ({
    key,
    label: formatColumnLabel(key),
    type: guessFormFieldType(key, guessColumnType(key)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Terms</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage glossary entries and definitions.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {error
          ? `Error loading terms: ${error.message}`
          : `${rows.length} term${rows.length === 1 ? "" : "s"}`}
      </div>

      <AdminDataTable
        rows={rows}
        columns={columns}
        createEnabled
        editEnabled
        deleteEnabled
        apiTable="terms"
        createFields={fields}
        editFields={fields}
      />
    </div>
  );
}
