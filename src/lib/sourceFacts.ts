import type { PropertySourceFact } from "@/types";

export interface NaverNewsItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string | null;
  originalLink?: string | null;
}

function clampInt(value: unknown, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.trunc(num)));
}

function pickNewsUrl(item: NaverNewsItem): string {
  return String(item.originalLink || item.link || "").trim();
}

function buildNewsSummary(item: NaverNewsItem): string {
  const pub = (item.pubDate ?? "").trim();
  const desc = String(item.description || "").trim();
  if (pub && desc) return `${pub}\n${desc}`;
  if (pub) return pub;
  if (desc) return desc;
  return String(item.title || "").trim();
}

/**
 * Builds SourceFacts from Naver news items:
 * - naver_news_digest (1)
 * - naver_news_1..N (up to maxItems)
 *
 * Deduplication is performed by final URL (originalLink first).
 */
export function buildNaverNewsSourceFacts(args: {
  items: NaverNewsItem[];
  query: string;
  collectedAt: string;
  maxItems?: number;
}): PropertySourceFact[] {
  const maxItems = clampInt(args.maxItems ?? 5, 1, 5);
  const query = String(args.query || "").trim();
  const collectedAt = String(args.collectedAt || "").trim() || new Date().toISOString();

  const picked: NaverNewsItem[] = [];
  const seen = new Set<string>();

  for (const item of args.items ?? []) {
    const url = pickNewsUrl(item);
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    picked.push(item);
    if (picked.length >= maxItems) break;
  }

  if (picked.length === 0) return [];

  const headlines = picked
    .map((i) => String(i.title || "").trim())
    .filter(Boolean)
    .slice(0, maxItems);

  const digestSummaryLines: string[] = [
    "네이버 뉴스 검색 헤드라인 요약",
    `query: ${query || "(unknown)"}`,
    `collectedAt: ${collectedAt}`,
    "",
    "headlines:",
    ...headlines.map((t) => `- ${t}`),
  ];

  const facts: PropertySourceFact[] = [
    {
      id: "naver_news_digest",
      title: "네이버 뉴스 헤드라인 요약",
      url: "https://openapi.naver.com/v1/search/news.json",
      summary: digestSummaryLines.join("\n").trim(),
    },
  ];

  picked.forEach((item, idx) => {
    const url = pickNewsUrl(item);
    const title = String(item.title || "").trim() || `네이버 뉴스 ${idx + 1}`;
    const summary = buildNewsSummary(item) || title;
    facts.push({
      id: `naver_news_${idx + 1}`,
      title,
      url,
      summary,
    });
  });

  return facts;
}

