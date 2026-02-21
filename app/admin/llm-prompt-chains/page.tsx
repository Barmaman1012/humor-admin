import { AdminDataTable } from "@/components/AdminDataTable";
import {
  buildColumnOrder,
  formatColumnLabel,
  guessColumnType,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

const PREFERRED_COLUMNS = ["id", "name", "description", "created_at"];

export default async function AdminLlmPromptChainsPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("llm_prompt_chains")
    .select("*")
    .limit(200);

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
          LLM Prompt Chains
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Inspect prompt chain definitions used by the generator.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {error
          ? `Error loading prompt chains: ${error.message}`
          : `${rows.length} chain${rows.length === 1 ? "" : "s"}`}
      </div>

      <AdminDataTable rows={rows} columns={columns} />
    </div>
  );
}
