import { CaptionsTableClient } from "@/components/CaptionsTableClient";
import { pickFirstKey, type RowData } from "@/lib/admin/table-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TEXT_CANDIDATES = [
  "caption",
  "caption_text",
  "text",
  "body",
  "content",
];
const IMAGE_ID_CANDIDATES = [
  "image_id",
  "imageId",
  "image_uuid",
  "media_id",
];
const CREATED_CANDIDATES = [
  "created_at",
  "created_datetime_utc",
  "created_time",
  "inserted_at",
];

export default async function AdminCaptionsPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.from("captions").select("*").limit(100);
  const rows = (data ?? []) as RowData[];
  const sample = rows[0] ?? null;

  const textKey = pickFirstKey(sample, TEXT_CANDIDATES);
  const imageIdKey = pickFirstKey(sample, IMAGE_ID_CANDIDATES);
  const createdKey = pickFirstKey(sample, CREATED_CANDIDATES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Captions</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review caption text and related images.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {error
          ? `Error loading captions: ${error.message}`
          : `${rows.length} caption${rows.length === 1 ? "" : "s"}`}
      </div>

      <CaptionsTableClient
        rows={rows}
        textKey={textKey}
        imageIdKey={imageIdKey}
        createdKey={createdKey}
      />
    </div>
  );
}
