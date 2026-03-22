import Link from "next/link";
import {
  formatDateValue,
  pickFirstKey,
  truncateText,
  type RowData,
} from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

const CREATED_CANDIDATES = [
  "created_at",
  "created_datetime_utc",
  "created_time",
  "inserted_at",
];

const PROFILE_LABEL_CANDIDATES = [
  "display_name",
  "email",
  "first_name",
  "last_name",
];

const IMAGE_URL_CANDIDATES = ["url", "cdn_url", "image_url", "path"];
const CAPTION_TEXT_CANDIDATES = ["caption", "text", "content", "body"];
const FLAVOR_NAME_CANDIDATES = ["name", "title", "flavor", "label"];

type StatCard = {
  label: string;
  count: number | null;
  href?: string;
  error?: string | null;
};

type ActivityEntry = {
  key: string;
  type: string;
  createdAt: string | null;
  title: string;
  detail: string;
};

function getProfileTitle(row: RowData) {
  const fullName = [row.first_name, row.last_name]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ");
  if (fullName) return fullName;

  const labelKey = pickFirstKey(row, PROFILE_LABEL_CANDIDATES);
  if (labelKey) return String(row[labelKey]);
  return `Profile ${String(row.id ?? "")}`.trim();
}

function getImageTitle(row: RowData) {
  const urlKey = pickFirstKey(row, IMAGE_URL_CANDIDATES);
  const url = urlKey ? String(row[urlKey] ?? "") : "";
  return url ? truncateText(url, 60) : `Image ${String(row.id ?? "")}`.trim();
}

function getCaptionTitle(row: RowData) {
  const textKey = pickFirstKey(row, CAPTION_TEXT_CANDIDATES);
  const text = textKey ? String(row[textKey] ?? "") : "";
  return text ? truncateText(text, 100) : `Caption ${String(row.id ?? "")}`.trim();
}

function getFlavorTitle(row: RowData) {
  const nameKey = pickFirstKey(row, FLAVOR_NAME_CANDIDATES);
  const name = nameKey ? String(row[nameKey] ?? "") : "";
  return name ? truncateText(name, 80) : `Flavor ${String(row.id ?? "")}`.trim();
}

async function getTableCount(table: string, label: string, href?: string) {
  const supabase = await createSupabaseServerComponentClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  return {
    label,
    count: error ? null : count ?? 0,
    href,
    error: error?.message ?? null,
  } satisfies StatCard;
}

async function getRecentActivityForTable(
  table: string,
  type: string
): Promise<ActivityEntry[]> {
  const supabase = await createSupabaseServerComponentClient();
  const { data: sampleRows, error: sampleError } = await supabase
    .from(table)
    .select("*")
    .limit(1);

  if (sampleError) return [];

  const sample = (sampleRows?.[0] ?? null) as RowData | null;
  const createdKey = pickFirstKey(sample, CREATED_CANDIDATES);
  if (!createdKey) return [];

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(createdKey, { ascending: false })
    .limit(5);

  if (error || !data) return [];

  return (data as RowData[]).map((row, index) => {
    const base = {
      key: `${table}-${String(row.id ?? index)}`,
      type,
      createdAt: row[createdKey] ? String(row[createdKey]) : null,
    };

    if (table === "profiles") {
      return {
        ...base,
        title: getProfileTitle(row),
        detail: row.email ? String(row.email) : String(row.id ?? "—"),
      };
    }

    if (table === "images") {
      return {
        ...base,
        title: getImageTitle(row),
        detail: row.profile_id ? `Profile ${String(row.profile_id)}` : String(row.id ?? "—"),
      };
    }

    if (table === "captions") {
      return {
        ...base,
        title: getCaptionTitle(row),
        detail: row.image_id ? `Image ${String(row.image_id)}` : String(row.id ?? "—"),
      };
    }

    return {
      ...base,
      title: getFlavorTitle(row),
      detail: String(row.id ?? "—"),
    };
  });
}

export async function AdminDashboard() {
  const [profilesCount, imagesCount, captionsCount, flavorsCount, recentGroups] =
    await Promise.all([
      getTableCount("profiles", "Total profiles", "/admin/profiles"),
      getTableCount("images", "Total images", "/admin/images"),
      getTableCount("captions", "Total captions", "/admin/captions"),
      getTableCount("humor_flavors", "Total flavors", "/admin/humor-flavors"),
      Promise.all([
        getRecentActivityForTable("profiles", "Profile"),
        getRecentActivityForTable("images", "Image"),
        getRecentActivityForTable("captions", "Caption"),
        getRecentActivityForTable("humor_flavors", "Flavor"),
      ]),
    ]);

  const stats = [profilesCount, imagesCount, captionsCount, flavorsCount];
  const recentActivity = recentGroups
    .flat()
    .filter((item) => item.createdAt)
    .sort((a, b) => {
      const left = new Date(b.createdAt ?? "").getTime();
      const right = new Date(a.createdAt ?? "").getTime();
      return left - right;
    })
    .slice(0, 12);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-slate-50 p-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Humor Admin Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Totals and recent admin-facing activity across profiles, images,
          captions, and humor flavors.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const content = (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </div>
              <div className="mt-3 text-3xl font-semibold text-slate-900">
                {item.error ? "—" : item.count}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {item.error ? item.error : "View details"}
              </div>
            </>
          );

          return item.href && !item.error ? (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
            >
              {content}
            </Link>
          ) : (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              {content}
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent activity
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Latest rows detected across the main admin tables.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {recentActivity.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No recent activity was available.
              </div>
            ) : (
              recentActivity.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.type}
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      {item.title}
                    </div>
                    <div className="text-sm text-slate-600">{item.detail}</div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {formatDateValue(item.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quick links</h2>
          <div className="mt-4 grid gap-3">
            {[
              { href: "/admin/stats", label: "Stats" },
              { href: "/admin/profiles", label: "Profiles" },
              { href: "/admin/images", label: "Images" },
              { href: "/admin/captions", label: "Captions" },
              { href: "/admin/admins", label: "Admins" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
