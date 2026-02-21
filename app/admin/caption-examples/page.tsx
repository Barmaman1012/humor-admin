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

const PREFERRED_COLUMNS = [
  "id",
  "caption",
  "image_id",
  "humor_flavor_id",
  "created_at",
];

export default async function AdminCaptionExamplesPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("caption_examples")
    .select("*")
    .limit(200);

  const rows = (data ?? []) as RowData[];
  const columnKeys = buildColumnOrder(rows, PREFERRED_COLUMNS);
  const displayKeys = columnKeys.length ? columnKeys : PREFERRED_COLUMNS;
  const columns = displayKeys.map((key) => ({
    key,
    label: formatColumnLabel(key),
    type: guessColumnType(key),
    maxLength: 200,
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
        <h1 className="text-2xl font-semibold text-slate-900">
          Caption Examples
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Curated caption examples available to the generator.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {error
          ? `Error loading caption examples: ${error.message}`
          : `${rows.length} example${rows.length === 1 ? "" : "s"}`}
      </div>

      <AdminDataTable
        rows={rows}
        columns={columns}
        createEnabled
        editEnabled
        deleteEnabled
        apiTable="caption_examples"
        createFields={fields}
        editFields={fields}
      />
    </div>
  );
}
