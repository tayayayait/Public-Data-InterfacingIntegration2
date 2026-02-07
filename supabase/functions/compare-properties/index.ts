import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createRequestId,
  errorResponse,
  parseJson,
  successResponse,
} from "../_shared/http.ts";

interface CompareRequest {
  address: string;
  lawdCd: string;        // 지역코드 5자리
  targetAreaM2: number;  // 타겟 면적
  targetUnitPrice?: number; // 타겟 단가 (비교용)
  dealYmd?: string;      // 조회 시작 년월 (기본: 3개월 전)
}

interface ComparisonProperty {
  address: string;
  aptName: string;
  areaM2: number;
  floor: number;
  amount: number;         // 거래가 (만원)
  unitPrice: number;      // 단가 (원/㎡)
  tradeDate: string;
}

interface ComparisonResult {
  targetProperty: {
    address: string;
    areaM2: number;
    unitPrice: number | null;
  };
  comparisons: ComparisonProperty[];
  statistics: {
    count: number;
    avgUnitPrice: number;
    minUnitPrice: number;
    maxUnitPrice: number;
    medianUnitPrice: number;
    percentile: number | null;  // 타겟이 비교군 대비 몇 %인지
  };
  recommendation: string;
}

// 타임아웃 fetch
async function timeoutFetch(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// XML 파싱 (여러 거래 내역 추출)
function parseTradeListXml(xml: string, targetAreaM2: number): ComparisonProperty[] {
  const results: ComparisonProperty[] = [];
  
  // <item> 태그 찾기
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);
  if (!itemMatches) return results;
  
  for (const itemXml of itemMatches) {
    const getValue = (tag: string): string | null => {
      const match = itemXml.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*</${tag}>`));
      return match ? match[1].trim() : null;
    };
    
    const areaStr = getValue("excluUseAr") || getValue("전용면적");
    const amountStr = getValue("dealAmount") || getValue("거래금액");
    const yearStr = getValue("dealYear") || getValue("년");
    const monthStr = getValue("dealMonth") || getValue("월");
    const dayStr = getValue("dealDay") || getValue("일");
    const aptName = getValue("aptNm") || getValue("아파트") || "알 수 없음";
    const floorStr = getValue("floor") || getValue("층");
    const dongStr = getValue("umdNm") || getValue("법정동") || "";
    
    const areaM2 = parseFloat(areaStr ?? "0");
    const amount = parseInt((amountStr ?? "0").replace(/,/g, ""), 10);
    const floor = parseInt(floorStr ?? "0", 10);
    
    // 유사 면적 필터링 (±20%)
    if (areaM2 > 0 && amount > 0) {
      const lowerBound = targetAreaM2 * 0.8;
      const upperBound = targetAreaM2 * 1.2;
      
      if (areaM2 >= lowerBound && areaM2 <= upperBound) {
        const unitPrice = Math.round((amount * 10000) / areaM2); // 만원 → 원
        const tradeDate = `${yearStr || ""}${(monthStr || "").padStart(2, "0")}${(dayStr || "").padStart(2, "0")}`;
        
        results.push({
          address: dongStr,
          aptName,
          areaM2,
          floor,
          amount,
          unitPrice,
          tradeDate,
        });
      }
    }
  }
  
  return results;
}

// 중앙값 계산
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// 백분위 계산 (타겟이 비교군 대비 몇 %)
function percentileRank(arr: number[], value: number): number {
  if (arr.length === 0) return 50;
  const belowCount = arr.filter(x => x < value).length;
  return Math.round((belowCount / arr.length) * 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = createRequestId();

  try {
    const payload = await parseJson<CompareRequest>(req);
    const { address, lawdCd, targetAreaM2, targetUnitPrice, dealYmd } = payload;

    if (!lawdCd || !targetAreaM2) {
      return errorResponse("invalid_input", "lawdCd와 targetAreaM2가 필요합니다.", requestId, 400);
    }

    const GOV_DATA_KEY = Deno.env.get("GOV_DATA_KEY");
    if (!GOV_DATA_KEY) {
      return errorResponse("config_missing", "GOV_DATA_KEY가 설정되지 않았습니다.", requestId, 500);
    }

    // 기본값: 3개월 전부터 조회
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const defaultDealYmd = `${threeMonthsAgo.getFullYear()}${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}`;
    const queryDealYmd = dealYmd || defaultDealYmd;

    console.log(`[compare-properties][${requestId}] lawdCd=${lawdCd}, area=${targetAreaM2}, dealYmd=${queryDealYmd}`);

    // 여러 달 조회 (3개월)
    const allComparisons: ComparisonProperty[] = [];
    
    for (let i = 0; i < 3; i++) {
      const date = new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth() + i, 1);
      const monthYmd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      const params = new URLSearchParams({
        serviceKey: GOV_DATA_KEY,
        LAWD_CD: lawdCd,
        DEAL_YMD: monthYmd,
        pageNo: "1",
        numOfRows: "100",
      });
      
      const url = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade?${params.toString()}`;
      
      try {
        const res = await timeoutFetch(url, 15000);
        if (res.ok) {
          const xml = await res.text();
          const parsed = parseTradeListXml(xml, targetAreaM2);
          allComparisons.push(...parsed);
          console.log(`[compare-properties][${requestId}] ${monthYmd}: ${parsed.length} items found`);
        }
      } catch (e) {
        console.error(`[compare-properties][${requestId}] ${monthYmd} fetch error:`, e);
      }
    }

    // 통계 계산
    const unitPrices = allComparisons.map(c => c.unitPrice);
    
    const statistics = {
      count: allComparisons.length,
      avgUnitPrice: unitPrices.length > 0 
        ? Math.round(unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length) 
        : 0,
      minUnitPrice: unitPrices.length > 0 ? Math.min(...unitPrices) : 0,
      maxUnitPrice: unitPrices.length > 0 ? Math.max(...unitPrices) : 0,
      medianUnitPrice: Math.round(median(unitPrices)),
      percentile: targetUnitPrice ? percentileRank(unitPrices, targetUnitPrice) : null,
    };

    // 추천 문구 생성
    let recommendation = "";
    if (targetUnitPrice && statistics.count > 0) {
      const percentile = statistics.percentile!;
      if (percentile < 25) {
        recommendation = "비교군 대비 저렴한 편입니다. 추가 조사를 권장합니다.";
      } else if (percentile < 50) {
        recommendation = "비교군 평균 이하 가격대입니다.";
      } else if (percentile < 75) {
        recommendation = "비교군 평균 수준의 가격대입니다.";
      } else {
        recommendation = "비교군 대비 높은 가격대입니다. 프리미엄 요소를 확인하세요.";
      }
    } else if (statistics.count === 0) {
      recommendation = "유사 물건 거래 이력이 부족합니다. 인근 지역을 확대하여 조사를 권장합니다.";
    }

    const result: ComparisonResult = {
      targetProperty: {
        address,
        areaM2: targetAreaM2,
        unitPrice: targetUnitPrice ?? null,
      },
      comparisons: allComparisons.slice(0, 10), // 상위 10개만 반환
      statistics,
      recommendation,
    };

    return successResponse(result, requestId);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[compare-properties][${requestId}] ERROR:`, message);
    return errorResponse("internal_error", `비교군 분석 오류: ${message}`, requestId, 500);
  }
});
