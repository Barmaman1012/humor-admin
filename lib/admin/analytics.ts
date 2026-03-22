import { pickFirstKey, truncateText, type RowData } from "@/lib/admin/table-helpers";

export const SCORE_CANDIDATES = [
  "likes",
  "like_count",
  "score",
  "rating",
  "total_likes",
];

export const CAPTION_TEXT_CANDIDATES = ["caption", "text", "content", "body"];
export const CAPTION_IMAGE_ID_CANDIDATES = ["image_id", "imageId"];
export const CAPTION_FLAVOR_ID_CANDIDATES = [
  "humor_flavor_id",
  "flavor_id",
  "humorFlavorId",
];
export const IMAGE_URL_CANDIDATES = ["url", "cdn_url", "image_url", "path"];

const STOP_WORDS = new Set([
  "and",
  "if",
  "is",
  "are",
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "this",
  "that",
  "it",
  "you",
  "we",
  "they",
  "i",
  "he",
  "she",
  "them",
  "was",
  "were",
  "be",
  "been",
  "being",
  "at",
  "by",
  "from",
  "as",
  "or",
  "but",
  "not",
]);

export type AnalyticsFieldMap = {
  scoreKey: string | null;
  textKey: string | null;
  imageIdKey: string | null;
  flavorIdKey: string | null;
  imageUrlKey: string | null;
};

export type TopCaption = {
  id: string;
  text: string;
  score: number;
  imageId: string | null;
  flavorId: string | null;
  imageUrl: string | null;
};

export type TopImage = {
  imageId: string;
  imageUrl: string | null;
  averageScore: number;
  bestScore: number;
  captionCount: number;
  topCaptionText: string | null;
};

export type WordInsight = {
  word: string;
  averageScore: number;
  mentions: number;
};

export type LengthInsight = {
  label: string;
  averageScore: number;
  captionCount: number;
  averageWords: number;
};

export function detectAnalyticsFields(
  captionSample: RowData | null,
  imageSample: RowData | null
): AnalyticsFieldMap {
  return {
    scoreKey: pickFirstKey(captionSample, SCORE_CANDIDATES),
    textKey: pickFirstKey(captionSample, CAPTION_TEXT_CANDIDATES),
    imageIdKey: pickFirstKey(captionSample, CAPTION_IMAGE_ID_CANDIDATES),
    flavorIdKey: pickFirstKey(captionSample, CAPTION_FLAVOR_ID_CANDIDATES),
    imageUrlKey: pickFirstKey(imageSample, IMAGE_URL_CANDIDATES),
  };
}

export function getNumericValue(row: RowData, key: string | null): number | null {
  if (!key) return null;
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function getStringValue(row: RowData, key: string | null): string | null {
  if (!key) return null;
  const value = row[key];
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function buildImageUrlMap(
  images: RowData[],
  imageUrlKey: string | null
): Map<string, string> {
  const map = new Map<string, string>();
  if (!imageUrlKey) return map;

  for (const row of images) {
    const id = row.id;
    const url = getStringValue(row, imageUrlKey);
    if (id !== null && id !== undefined && url) {
      map.set(String(id), url);
    }
  }

  return map;
}

export function buildTopCaptions(
  captions: RowData[],
  fields: AnalyticsFieldMap,
  imageUrlMap: Map<string, string>
): TopCaption[] {
  if (!fields.scoreKey || !fields.textKey) return [];

  return captions
    .map((row) => {
      const score = getNumericValue(row, fields.scoreKey);
      const text = getStringValue(row, fields.textKey);
      const imageId = getStringValue(row, fields.imageIdKey);
      return {
        id: String(row.id ?? ""),
        text: text ?? "",
        score,
        imageId,
        flavorId: getStringValue(row, fields.flavorIdKey),
        imageUrl: imageId ? imageUrlMap.get(imageId) ?? null : null,
      };
    })
    .filter((row): row is TopCaption => Boolean(row.text) && row.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function buildTopImages(
  captions: RowData[],
  fields: AnalyticsFieldMap,
  imageUrlMap: Map<string, string>
): TopImage[] {
  if (!fields.scoreKey || !fields.textKey || !fields.imageIdKey) return [];

  const groups = new Map<
    string,
    { scores: number[]; bestScore: number; topCaptionText: string | null }
  >();

  for (const row of captions) {
    const imageId = getStringValue(row, fields.imageIdKey);
    const score = getNumericValue(row, fields.scoreKey);
    if (!imageId || score === null) continue;

    const current = groups.get(imageId) ?? {
      scores: [],
      bestScore: Number.NEGATIVE_INFINITY,
      topCaptionText: null,
    };

    current.scores.push(score);
    if (score > current.bestScore) {
      current.bestScore = score;
      current.topCaptionText = getStringValue(row, fields.textKey);
    }
    groups.set(imageId, current);
  }

  return Array.from(groups.entries())
    .map(([imageId, group]) => ({
      imageId,
      imageUrl: imageUrlMap.get(imageId) ?? null,
      averageScore:
        group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length,
      bestScore: group.bestScore,
      captionCount: group.scores.length,
      topCaptionText: group.topCaptionText
        ? truncateText(group.topCaptionText, 100)
        : null,
    }))
    .sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return b.bestScore - a.bestScore;
    })
    .slice(0, 6);
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

export function buildWordInsights(
  captions: RowData[],
  fields: AnalyticsFieldMap
): { winningWords: WordInsight[]; underperformingWords: WordInsight[] } {
  if (!fields.scoreKey || !fields.textKey) {
    return { winningWords: [], underperformingWords: [] };
  }

  const scoresByWord = new Map<string, number[]>();

  for (const row of captions) {
    const score = getNumericValue(row, fields.scoreKey);
    const text = getStringValue(row, fields.textKey);
    if (score === null || !text) continue;

    const uniqueWords = new Set(tokenize(text));
    for (const word of uniqueWords) {
      const scores = scoresByWord.get(word) ?? [];
      scores.push(score);
      scoresByWord.set(word, scores);
    }
  }

  const insights = Array.from(scoresByWord.entries())
    .filter(([, scores]) => scores.length >= 3)
    .map(([word, scores]) => ({
      word,
      averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      mentions: scores.length,
    }))
    .sort((a, b) => b.averageScore - a.averageScore);

  return {
    winningWords: insights.slice(0, 12),
    underperformingWords: [...insights]
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 12),
  };
}

export function buildCaptionLengthInsights(
  captions: RowData[],
  fields: AnalyticsFieldMap
): LengthInsight[] {
  if (!fields.scoreKey || !fields.textKey) return [];

  type LengthBucketKey = "short" | "medium" | "long";

  const buckets = {
    short: { scores: [] as number[], words: [] as number[] },
    medium: { scores: [] as number[], words: [] as number[] },
    long: { scores: [] as number[], words: [] as number[] },
  } satisfies Record<LengthBucketKey, { scores: number[]; words: number[] }>;

  for (const row of captions) {
    const score = getNumericValue(row, fields.scoreKey);
    const text = getStringValue(row, fields.textKey);
    if (score === null || !text) continue;

    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const bucket: LengthBucketKey =
      words < 8 ? "short" : words < 16 ? "medium" : "long";

    buckets[bucket].scores.push(score);
    buckets[bucket].words.push(words);
  }

  const bucketDefinitions = [
    { key: "short", label: "Short" },
    { key: "medium", label: "Medium" },
    { key: "long", label: "Long" },
  ] as const;

  const insights: LengthInsight[] = [];

  for (const { key, label } of bucketDefinitions) {
      const scores = buckets[key].scores;
      const words = buckets[key].words;
      if (scores.length === 0) continue;

      insights.push({
        label,
        averageScore:
          scores.reduce((sum: number, score: number) => sum + score, 0) /
          scores.length,
        captionCount: scores.length,
        averageWords:
          words.reduce((sum: number, count: number) => sum + count, 0) /
          words.length,
      });
  }

  return insights;
}
