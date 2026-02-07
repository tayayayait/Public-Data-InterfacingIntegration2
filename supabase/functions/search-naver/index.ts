import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";
import {
  corsHeaders,
  createRequestId,
  errorResponse,
  parseJson,
  sanitizeSearchQuery,
  sha256Hex,
  successResponse,
} from "../_shared/http.ts";

interface SearchNaverRequest {
  query: string;
  display?: number;
  sort?: "sim" | "date";
  target?: "web" | "news";
}

interface NaverSearchResult {
  title: string;
  link: string;
  originalLink?: string | null;
  description: string;
  pubDate?: string | null;
}

async function logSearchHistory(params: {
  query: string;
  resultsCount: number;
  clientIpHash: string;
  isBlocked: boolean;
  blockedReason?: string;
  source: string;
}) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  await fetch(`${SUPABASE_URL}/rest/v1/search_history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      query: params.query,
      results_count: params.resultsCount,
      filters: { source: params.source },
      client_ip_hash: params.clientIpHash,
      is_blocked: params.isBlocked,
      blocked_reason: params.blockedReason ?? null,
    }),
  }).catch(() => {
    // Logging failure should not break search response.
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = createRequestId();

  try {
    const body = await parseJson<SearchNaverRequest>(req);
    const query = sanitizeSearchQuery(body.query ?? "");
    const display = Math.min(Math.max(Number(body.display ?? 10), 1), 10);
    const sort = body.sort === "date" ? "date" : "sim";
    const target = body.target === "news" ? "news" : "web";
    const sourceId = target === "news" ? "naver_news_search" : "naver_web_search";

    const { clientKey, isMember } = getClientIdentity(req);
    const rateRule = isMember ? { dailyLimit: 50, cooldownSec: 5 } : { dailyLimit: 15, cooldownSec: 10 };
    const rate = checkRateLimit(clientKey, rateRule);
    const ipHash = await sha256Hex(clientKey);

    if (!rate.allowed) {
      await logSearchHistory({
        query,
        resultsCount: 0,
        clientIpHash: ipHash,
        isBlocked: true,
        blockedReason: `wait:${rate.waitSeconds}`,
        source: sourceId,
      });

      return errorResponse(
        "rate_limited",
        `요청 제한에 도달했습니다. ${rate.waitSeconds}초 후 다시 시도해주세요.`,
        requestId,
        429,
        {
          waitSeconds: rate.waitSeconds,
          remainingDaily: rate.remainingDaily,
        },
      );
    }

    const NAVER_CLIENT_ID = Deno.env.get("NAVER_CLIENT_ID");
    const NAVER_CLIENT_SECRET = Deno.env.get("NAVER_CLIENT_SECRET");
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      return errorResponse(
        "config_missing",
        "필수 환경변수(NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)가 설정되지 않았습니다.",
        requestId,
        500,
      );
    }

    const endpointUrl = target === "news"
      ? "https://openapi.naver.com/v1/search/news.json"
      : "https://openapi.naver.com/v1/search/webkr.json";
    const searchUrl = new URL(endpointUrl);
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("display", String(display));
    searchUrl.searchParams.set("sort", sort);

    const response = await fetch(searchUrl.toString(), {
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[search-naver][${requestId}] upstream=${response.status} body=${errText}`);
      return errorResponse("upstream_failed", `Naver API 오류(${response.status})`, requestId, 502);
    }

    const data = await response.json();
    const items: NaverSearchResult[] = (data.items || []).map((item: any) => ({
      title: String(item.title || "").replace(/<\/?b>/g, ""),
      link: String(item.link || ""),
      originalLink: target === "news" ? (String(item.originallink || "").trim() || null) : null,
      description: String(item.description || "").replace(/<\/?b>/g, ""),
      pubDate: item.pubDate ?? null,
    }));

    await logSearchHistory({
      query,
      resultsCount: items.length,
      clientIpHash: ipHash,
      isBlocked: false,
      source: sourceId,
    });

    return successResponse(
      {
        total: Number(data.total || 0),
        start: Number(data.start || 1),
        display: Number(data.display || display),
        items,
        source: {
          id: sourceId,
          domain: "openapi.naver.com",
          url: endpointUrl,
        },
      },
      requestId,
      200,
      {
        remainingDaily: rate.remainingDaily,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "검색 중 오류가 발생했습니다.";
    if (message.includes("검색어")) {
      return errorResponse("invalid_input", message, requestId, 400);
    }
    return errorResponse("internal_error", message, requestId, 500);
  }
});
