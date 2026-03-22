import { AdminToggleSuperadminButton } from "@/components/AdminToggleSuperadminButton";
import {
  buildColumnOrder,
  formatValue,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export default async function AdminsPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_superadmin", true);

  const rows = (data ?? []) as RowData[];
  const preferredColumns = [
    "id",
    "created_datetime_utc",
    "modified_datetime_utc",
    "first_name",
    "last_name",
    "email",
    "is_superadmin",
    "is_in_study",
  ];
  const columns = buildColumnOrder(rows, preferredColumns);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admins</h1>
        <p className="mt-1 text-sm text-slate-600">
          Superadmins with full access to Humor Admin.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 text-sm text-slate-600">
          {error
            ? `Error loading profiles: ${error.message}`
            : `${rows.length} superadmin${rows.length === 1 ? "" : "s"}`}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3">
                    {column}
                  </th>
                ))}
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-slate-500"
                    colSpan={columns.length + 1}
                  >
                    No superadmins found.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={String(row.id ?? index)}>
                    {columns.map((column) => (
                      <td key={column} className="px-4 py-3 text-slate-700">
                        {formatValue(row[column])}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <AdminToggleSuperadminButton
                        profileId={String(row.id)}
                        isSuperadmin={Boolean(row.is_superadmin)}
                        isSelf={Boolean(user?.id && row.id === user.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
