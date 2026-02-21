import {
  formatDateValue,
  formatValue,
  pickFirstKey,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

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
const URL_CANDIDATES = ["url", "cdn_url", "image_url", "path"];

type CountResult = {
  label: string;
  count: number | null;
  error?: string | null;
};

export default async function AdminStatsPage() {
  const supabase = await createSupabaseServerComponentClient();

  const getCount = async (table: string, label: string): Promise<CountResult> => {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    return {
      label,
      count: error ? null : count ?? 0,
      error: error?.message ?? null,
    };
  };

  const [profilesCount, imagesCount, captionsCount] = await Promise.all([
    getCount("profiles", "Total profiles"),
    getCount("images", "Total images"),
    getCount("captions", "Total captions"),
  ]);

  const { data: imageSample, error: imageSampleError } = await supabase
    .from("images")
    .select("*")
    .limit(1);

  const sample = (imageSample?.[0] ?? null) as RowData | null;
  const createdKey = pickFirstKey(sample, CREATED_CANDIDATES);
  const userKey = pickFirstKey(sample, USER_CANDIDATES);
  const urlKey = pickFirstKey(sample, URL_CANDIDATES);

  const { data: recentImages, error: recentImagesError } = createdKey
    ? await supabase
        .from("images")
        .select("*")
        .order(createdKey, { ascending: false })
        .limit(10)
    : await supabase.from("images").select("*").limit(10);

  const { data: topUserImages, error: topUsersError } = userKey
    ? await supabase
        .from("images")
        .select(userKey)
        .limit(1000)
    : { data: null, error: null };

  const topUsers = userKey
    ? (() => {
        const counts = new Map<string, number>();
        for (const row of (topUserImages ?? []) as unknown as RowData[]) {
          const value = row[userKey];
          if (value === null || value === undefined) continue;
          const key = String(value);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return Array.from(counts.entries())
          .map(([key, count]) => ({ key, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      })()
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Stats</h1>
        <p className="mt-1 text-sm text-slate-600">
          Snapshot of user growth and recent activity.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[profilesCount, imagesCount, captionsCount].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {item.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {item.error ? "—" : item.count}
            </div>
            {item.error ? (
              <div className="mt-2 text-xs text-rose-600">
                {item.error}
              </div>
            ) : null}
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent images
            </h2>
            <div className="text-xs text-slate-500">
              {createdKey ? `Ordered by ${createdKey}` : "Unsorted"}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentImagesError ? (
                  <tr>
                    <td
                      className="px-3 py-4 text-sm text-rose-600"
                      colSpan={4}
                    >
                      Error loading images: {recentImagesError.message}
                    </td>
                  </tr>
                ) : (recentImages ?? []).length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-4 text-sm text-slate-500"
                      colSpan={4}
                    >
                      No images found.
                    </td>
                  </tr>
                ) : (
                  (recentImages ?? []).map((row: RowData, index: number) => (
                    <tr key={String(row.id ?? index)}>
                      <td className="px-3 py-2 text-slate-700">
                        {formatValue(row.id)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {userKey ? formatValue(row[userKey]) : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {createdKey ? formatDateValue(row[createdKey]) : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {urlKey ? formatValue(row[urlKey]) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Top users by images
            </h2>
            <div className="text-xs text-slate-500">
              {userKey ? `Grouped by ${userKey}` : "No user column"}
            </div>
          </div>
          <div className="mt-4">
            {!userKey ? (
              <div className="text-sm text-slate-500">
                No user column detected in images table.
              </div>
            ) : topUsersError ? (
              <div className="text-sm text-rose-600">
                Error loading top users: {topUsersError.message}
              </div>
            ) : topUsers.length === 0 ? (
              <div className="text-sm text-slate-500">No data available.</div>
            ) : (
              <ul className="space-y-2">
                {topUsers.map((row, index) => (
                  <li
                    key={String(row.key ?? index)}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700">
                      {formatValue(row.key)}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatValue(row.count)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {imageSampleError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Error inspecting images schema: {imageSampleError.message}
        </div>
      ) : null}
    </div>
  );
}
