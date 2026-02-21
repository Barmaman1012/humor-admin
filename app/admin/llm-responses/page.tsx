import { AdminDataTable } from "@/components/AdminDataTable";
import {
  buildColumnOrder,
  formatColumnLabel,
  guessColumnType,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

const PREFERRED_COLUMNS = ["id", "prompt_chain_id", "created_at", "status"];

export default async function AdminLlmResponsesPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("llm_responses")
    .select("*")
    .limit(200);

  const tableMissing =
    error?.code === "42P01" ||
    error?.message?.includes("does not exist") ||
    error?.message?.includes("relation");

  const rows = (data ?? []) as RowData[];
  const columnKeys = buildColumnOrder(rows, PREFERRED_COLUMNS);
  const displayKeys = columnKeys.length ? columnKeys : PREFERRED_COLUMNS;
  const columns = displayKeys.map((key) => ({
    key,
    label: formatColumnLabel(key),
    type: guessColumnType(key),
    maxLength: 220,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          LLM Responses
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Read-only log of model responses.
        </p>
      </div>

      {tableMissing ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          The `llm_responses` table was not found in this environment.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {error
              ? `Error loading responses: ${error.message}`
              : `${rows.length} response${rows.length === 1 ? "" : "s"}`}
          </div>

          <AdminDataTable rows={rows} columns={columns} />
        </>
      )}
    </div>
  );
}
