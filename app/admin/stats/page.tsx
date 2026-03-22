import Link from "next/link";
import {
  buildCaptionLengthInsights,
  buildImageUrlMap,
  buildTopCaptions,
  buildTopImages,
  buildWordInsights,
  detectAnalyticsFields,
} from "@/lib/admin/analytics";
import { type RowData } from "@/lib/admin/table-helpers";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function Thumbnail({ url, label }: { url: string | null; label: string }) {
  if (!url) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        No image
      </div>
    );
  }

  return (
    <div
      aria-label={label}
      className="h-24 w-24 rounded-2xl border border-slate-200 bg-slate-100 bg-cover bg-center shadow-inner"
      style={{ backgroundImage: `url("${url.replace(/"/g, '\\"')}")` }}
    />
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

export default async function AdminStatsPage() {
  const supabase = await createSupabaseServerComponentClient();

  const [{ data: captionSampleRows, error: captionSampleError }, { data: imageSampleRows }] =
    await Promise.all([
      supabase.from("captions").select("*").limit(1),
      supabase.from("images").select("*").limit(1),
    ]);

  const captionSample = (captionSampleRows?.[0] ?? null) as RowData | null;
  const imageSample = (imageSampleRows?.[0] ?? null) as RowData | null;
  const fields = detectAnalyticsFields(captionSample, imageSample);

  const [{ data: captionsData, error: captionsError }, { data: imagesData, error: imagesError }] =
    await Promise.all([
      supabase.from("captions").select("*").limit(1000),
      supabase.from("images").select("*").limit(1000),
    ]);

  const captions = (captionsData ?? []) as RowData[];
  const images = (imagesData ?? []) as RowData[];
  const imageUrlMap = buildImageUrlMap(images, fields.imageUrlKey);
  const topCaptions = buildTopCaptions(captions, fields, imageUrlMap);
  const topImages = buildTopImages(captions, fields, imageUrlMap);
  const { winningWords, underperformingWords } = buildWordInsights(captions, fields);
  const lengthInsights = buildCaptionLengthInsights(captions, fields);
  const maxLengthScore = Math.max(...lengthInsights.map((item) => item.averageScore), 0);

  const hasScoreField = Boolean(fields.scoreKey);
  const hasTextField = Boolean(fields.textKey);
  const hasImageGrouping = Boolean(fields.imageIdKey);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-amber-100 via-white to-sky-100 p-8 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="inline-flex rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Humor Analytics
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950">
              Humor Analytics
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
              This page highlights what performs best across captions and images
              so you can spot strong creative patterns instead of scanning raw rows.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/admin/captions"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Review captions
              </Link>
              <Link
                href="/admin/images"
                className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                Review images
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              {
                label: "Caption rows analyzed",
                value: String(captions.length),
                help: captionsError ? captionsError.message : "Up to 1000 recent rows",
              },
              {
                label: "Score field",
                value: fields.scoreKey ?? "Unavailable",
                help: "Best matching numeric performance field",
              },
              {
                label: "Caption text field",
                value: fields.textKey ?? "Unavailable",
                help: "Used for top caption and word analysis",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {item.value}
                </div>
                <div className="mt-1 text-xs text-slate-600">{item.help}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(captionSampleError || captionsError || imagesError) && (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
          {captionSampleError?.message ?? captionsError?.message ?? imagesError?.message}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Featured
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                Top captions
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Highest-scoring captions ranked by the best available performance field.
              </p>
            </div>
            {fields.scoreKey ? (
              <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Ranked by {fields.scoreKey}
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4">
            {!hasScoreField || !hasTextField ? (
              <EmptyState
                title="Top captions unavailable"
                description="A numeric score field or caption text field was not found on the captions table, so ranking could not be computed safely."
              />
            ) : topCaptions.length === 0 ? (
              <EmptyState
                title="No ranked captions yet"
                description="Caption rows were found, but there were not enough rows with both text and numeric performance values."
              />
            ) : (
              topCaptions.map((caption, index) => (
                <article
                  key={`${caption.id}-${index}`}
                  className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-gradient-to-r from-white to-amber-50 p-5 shadow-sm md:grid-cols-[auto_1fr]"
                >
                  <Thumbnail
                    url={caption.imageUrl}
                    label={`Image for caption ${caption.id}`}
                  />
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        #{index + 1}
                      </div>
                      <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        Score {formatScore(caption.score)}
                      </div>
                      {caption.flavorId ? (
                        <div className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                          Flavor {caption.flavorId}
                        </div>
                      ) : null}
                      {caption.imageId ? (
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          Image {caption.imageId}
                        </div>
                      ) : null}
                    </div>
                    <p className="max-w-3xl text-base leading-7 text-slate-900">
                      {caption.text}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Signals
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Caption length insights
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            A quick read on whether shorter or longer captions perform better.
          </p>

          <div className="mt-6 space-y-4">
            {!hasScoreField || !hasTextField ? (
              <EmptyState
                title="Length insights unavailable"
                description="Caption length analysis needs both text and numeric score data."
              />
            ) : lengthInsights.length === 0 ? (
              <EmptyState
                title="No bucketed data"
                description="There were not enough caption rows with both text and score values to compute caption-length buckets."
              />
            ) : (
              lengthInsights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {item.label}
                      </div>
                      <div className="text-xs text-slate-500">
                        Avg. {item.averageWords.toFixed(1)} words across {item.captionCount} captions
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-slate-950">
                      {formatScore(item.averageScore)}
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-slate-900 to-amber-500"
                      style={{
                        width: `${maxLengthScore > 0 ? (item.averageScore / maxLengthScore) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Visuals
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Top images
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Images ranked by average caption performance, with best caption score
              and caption count where the relationship exists.
            </p>
          </div>
          {fields.imageIdKey ? (
            <div className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              Grouped by {fields.imageIdKey}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!hasScoreField || !hasImageGrouping ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                title="Top images unavailable"
                description="Image rankings need a numeric score field on captions and an image relationship such as image_id."
              />
            </div>
          ) : topImages.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                title="No image performance groups"
                description="The captions table did not contain enough image-linked scored rows to compute image-level rankings."
              />
            </div>
          ) : (
            topImages.map((image, index) => (
              <article
                key={`${image.imageId}-${index}`}
                className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-b from-white to-sky-50 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <Thumbnail
                    url={image.imageUrl}
                    label={`Image ${image.imageId}`}
                  />
                  <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    #{index + 1}
                  </div>
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-950">
                  Image {image.imageId}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                    Avg {formatScore(image.averageScore)}
                  </div>
                  <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    Best {formatScore(image.bestScore)}
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {image.captionCount} captions
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {image.topCaptionText
                    ? image.topCaptionText
                    : "No top caption preview was available for this image."}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Language
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                Winning words
              </h2>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
              High average score
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!hasScoreField || !hasTextField ? (
              <EmptyState
                title="Word analysis unavailable"
                description="Winning words need both caption text and numeric performance values."
              />
            ) : winningWords.length === 0 ? (
              <EmptyState
                title="Not enough recurring words"
                description="Words must appear in at least a few scored captions before they are included in this comparison."
              />
            ) : (
              winningWords.map((item) => (
                <div
                  key={item.word}
                  className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="text-sm font-semibold text-slate-950">
                    {item.word}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Avg {formatScore(item.averageScore)} across {item.mentions} captions
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-rose-200 bg-gradient-to-b from-rose-50 to-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                Language
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                Underperforming words
              </h2>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700">
              Low average score
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!hasScoreField || !hasTextField ? (
              <EmptyState
                title="Word analysis unavailable"
                description="Underperforming word analysis needs both caption text and numeric performance values."
              />
            ) : underperformingWords.length === 0 ? (
              <EmptyState
                title="Not enough recurring words"
                description="Words must appear in at least a few scored captions before they are included in this comparison."
              />
            ) : (
              underperformingWords.map((item) => (
                <div
                  key={item.word}
                  className="rounded-2xl border border-rose-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="text-sm font-semibold text-slate-950">
                    {item.word}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Avg {formatScore(item.averageScore)} across {item.mentions} captions
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-950 px-6 py-5 text-slate-100 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              label: "Image URL field",
              value: fields.imageUrlKey ?? "Unavailable",
            },
            {
              label: "Image relation field",
              value: fields.imageIdKey ?? "Unavailable",
            },
            {
              label: "Flavor field",
              value: fields.flavorIdKey ?? "Unavailable",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-white/5 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {item.label}
              </div>
              <div className="mt-2 text-sm font-semibold text-white">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
