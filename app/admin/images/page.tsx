import {
  formatDateValue,
  formatValue,
  pickFirstKey,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const URL_CANDIDATES = ["url", "cdn_url", "image_url", "path"];
const CREATED_CANDIDATES = [
  "created_at",
  "created_datetime_utc",
  "created_time",
  "inserted_at",
];
const USER_CANDIDATES = [
  "user_id",
  "profile_id",
  "owner_id",
  "created_by",
];

export default async function AdminImagesPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.from("images").select("*").limit(50);
  const rows = (data ?? []) as RowData[];

  const sample = rows[0] ?? null;
  const urlKey = pickFirstKey(sample, URL_CANDIDATES);
  const createdKey = pickFirstKey(sample, CREATED_CANDIDATES);
  const userKey = pickFirstKey(sample, USER_CANDIDATES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Images</h1>
        <p className="mt-1 text-sm text-slate-600">
          Latest image uploads and metadata.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 text-sm text-slate-600">
          {error
            ? `Error loading images: ${error.message}`
            : `${rows.length} image${rows.length === 1 ? "" : "s"}`}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-slate-500"
                    colSpan={4}
                  >
                    No images found.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const urlValue = urlKey ? String(row[urlKey] ?? "") : "";
                  const showImage = urlValue.startsWith("http");

                  return (
                    <tr key={String(row.id ?? index)}>
                      <td className="px-4 py-3">
                        {urlKey ? (
                          showImage ? (
                            <img
                              src={urlValue}
                              alt="Image"
                              className="h-14 w-14 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="text-xs text-slate-500">
                              {urlValue ? "URL not previewable" : "—"}
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-slate-500">No URL</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatValue(row.id)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {userKey ? formatValue(row[userKey]) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {createdKey ? formatDateValue(row[createdKey]) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
