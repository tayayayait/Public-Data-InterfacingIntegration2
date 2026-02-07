import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createRequestId,
  errorResponse,
  maskAddress,
  parseJson,
  sleep,
  successResponse,
} from "../_shared/http.ts";

interface CrawlRequest {
  address: string;
  lat?: number;
  lng?: number;
  cortarNo?: string;
}

interface NaverComplexSummary {
  complexNo: string;
  complexName: string;
  address: string;
  dealPriceMin: number | null;
  dealPriceMax: number | null;
  articleCount: number | null;
  sourceUrl: string;
}

const requestHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Referer": "https://m.land.naver.com/",
};

function toNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function fetchJsonWithRetry(url: string, retries = 1): Promise<any> {
  let lastError: unknown = null;
  for (let i = 0; i <= retries; i += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, { headers: requestHeaders, signal: controller.signal });
      if (res.ok) return await res.json();
      lastError = new Error(`status:${res.status}`);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
    if (i < retries) await sleep(1_000);
  }
  throw lastError ?? new Error("unknown_upstream_error");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = createRequestId();

  try {
    const payload = await parseJson<CrawlRequest>(req);
    const address = payload.address?.trim();
    if (!address || address.length < 2 || address.length > 120) {
      return errorResponse("invalid_input", "address는 2~120자로 입력해주세요.", requestId, 400);
    }

    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return successResponse(
        {
          complexes: [] as NaverComplexSummary[],
          collectedAt: new Date().toISOString(),
          source: {
            id: "naver_land_summary",
            domain: "m.land.naver.com",
            url: "https://m.land.naver.com/",
          },
        },
        requestId,
      );
    }

    console.log(`[crawl-naver-land][${requestId}] start address=${maskAddress(address)}`);

    const clusterUrl = `https://m.land.naver.com/cluster/clusterList?view=atcl&rletTpCd=APT&tradTpCd=A1&z=15&lat=${lat}&lon=${lng}&cortarNo=${payload.cortarNo ?? ""}&btm=${lat - 0.01}&lft=${lng - 0.01}&top=${lat + 0.01}&rgt=${lng + 0.01}`;
    const clusterJson = await fetchJsonWithRetry(clusterUrl, 1);
    const clusters = Array.isArray(clusterJson?.result?.list) ? clusterJson.result.list.slice(0, 3) : [];

    const mapped = new Map<string, NaverComplexSummary>();

    for (let i = 0; i < clusters.length; i += 1) {
      const cluster = clusters[i];
      const lgeo = cluster?.lgeo;
      if (!lgeo) continue;

      if (i > 0) await sleep(1_000);

      const complexListUrl =
        `https://m.land.naver.com/cluster/ajax/complexList?itemId=${lgeo}&mapKey=&lgeo=${lgeo}&rletTpCd=APT&tradTpCd=A1&z=15&lat=${lat}&lon=${lng}`;
      let complexListJson: any;
      try {
        complexListJson = await fetchJsonWithRetry(complexListUrl, 1);
      } catch {
        continue;
      }

      const items = Array.isArray(complexListJson?.result?.list) ? complexListJson.result.list.slice(0, 8) : [];
      for (const item of items) {
        const complexNo = String(item.hscpNo ?? "").trim();
        if (!complexNo) continue;
        if (mapped.has(complexNo)) continue;

        mapped.set(complexNo, {
          complexNo,
          complexName: String(item.hscpNm ?? "").trim() || "Unknown",
          address: String(item.cortarAddress ?? address).trim(),
          dealPriceMin: toNumber(item.dealPrcMin),
          dealPriceMax: toNumber(item.dealPrcMax),
          articleCount: toNumber(item.atclCnt ?? item.rletCnt),
          sourceUrl: `https://new.land.naver.com/complexes/${complexNo}`,
        });
      }
    }

    return successResponse(
      {
        complexes: Array.from(mapped.values()),
        collectedAt: new Date().toISOString(),
        source: {
          id: "naver_land_summary",
          domain: "m.land.naver.com",
          url: "https://m.land.naver.com/",
        },
      },
      requestId,
    );
  } catch (error) {
    console.error(`[crawl-naver-land][${requestId}]`, error);
    return errorResponse("upstream_failed", "네이버 부동산 수집 중 오류가 발생했습니다.", requestId, 502);
  }
});
