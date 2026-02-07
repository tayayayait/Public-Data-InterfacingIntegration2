import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createRequestId,
  errorResponse,
  maskAddress,
  parseJson,
  successResponse,
} from "../_shared/http.ts";

interface SearchPropertyRequest {
  address: string;
  sigunguCd?: string;
  bjdongCd?: string;
  bun?: string;
  ji?: string;
  pnu?: string;
}

interface BuildingSpecs {
  area: number;
  floor: number;
  structure: string;
  builtYear: number | null;
  representativeArea?: number | null;
}

interface LandInfo {
  jimok: string | null;
  landArea: number | null;
}

function timeoutFetch(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function normalizeCode(value: string | undefined, size: number): string | undefined {
  if (!value) return undefined;
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly.length === size ? digitsOnly : undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = createRequestId();

  try {
    const payload = await parseJson<SearchPropertyRequest>(req);
    const address = payload.address?.trim();
    if (!address || address.length < 2) {
      return errorResponse("invalid_input", "address는 2자 이상이어야 합니다.", requestId, 400);
    }

    const GOV_DATA_KEY = Deno.env.get("GOV_DATA_KEY");
    const VWORLD_KEY = Deno.env.get("VWORLD_KEY");
    if (!GOV_DATA_KEY || !VWORLD_KEY) {
      return errorResponse(
        "config_missing",
        "필수 환경변수(GOV_DATA_KEY, VWORLD_KEY)가 설정되지 않았습니다.",
        requestId,
        500,
      );
    }

    const sigunguCd = normalizeCode(payload.sigunguCd, 5) ?? "11680";
    const bjdongCd = normalizeCode(payload.bjdongCd, 5) ?? "10300";
    const bun = normalizeCode(payload.bun, 4) ?? "0001";
    const ji = normalizeCode(payload.ji, 4) ?? "0000";

    console.log(`[search-property][${requestId}] start address=${maskAddress(address)}`);

    let building: BuildingSpecs = {
      area: 0,
      floor: 0,
      structure: "Unknown",
      builtYear: null,
    };

    const buildingParams = new URLSearchParams({
      serviceKey: GOV_DATA_KEY,
      sigunguCd,
      bjdongCd,
      bun,
      ji,
      numOfRows: "1",
      _type: "json",
    });

    const buildingUrl =
      `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?${buildingParams.toString()}`;
    console.log(`[search-property][${requestId}] fetching building data: ${buildingUrl.replace(GOV_DATA_KEY, "***")}`);
    
    // 타임아웃을 30초로 늘림 (공공데이터 포털이 느릴 때가 많음)
    const buildingRes = await timeoutFetch(buildingUrl, 30_000);
    if (!buildingRes.ok) {
      console.error(`[search-property][${requestId}] building API failed: ${buildingRes.status} ${buildingRes.statusText}`);
      // return errorResponse(
      //   "upstream_failed",
      //   `건축물대장 API 오류(${buildingRes.status})`,
      //   requestId,
      //   502,
      // );
      // 에러를 던지지 않고 빈 값으로 진행 (건축물대장이 없더라도 토지정보는 조회 시도)
    }

    let buildingItem = null;
    if (buildingRes.ok) {
        try {
            const buildingJson = await buildingRes.json();
             buildingItem = Array.isArray(buildingJson?.response?.body?.items?.item)
              ? buildingJson.response.body.items.item[0]
              : buildingJson?.response?.body?.items?.item;
             console.log(`[search-property][${requestId}] building data received:`, buildingItem ? "found" : "not found");
        } catch (e) {
             console.error(`[search-property][${requestId}] failed to parse building json`, e);
        }
    }


    if (buildingItem) {
      const builtYearRaw = String(buildingItem.useAprDay || buildingItem.crtnDay || "").slice(0, 4);
      const builtYear = Number(builtYearRaw);
      building = {
        area: Number(buildingItem.totArea || buildingItem.archArea || 0),
        floor: Number(buildingItem.grndFlrCnt || 0),
        structure: String(buildingItem.strctCdNm || "Unknown"),
        builtYear: Number.isFinite(builtYear) && builtYear > 1800 ? builtYear : null,
      };
    }

    // --- [New] Unit Area Calculation (Mode) ---
    // Fetch individual unit areas to determine the "standard" area (mode) for the building.
    // This solves the issue where building.area is the total floor area (e.g., 11114m2).
    let representativeArea: number | null = null;
    try {
       const unitParams = new URLSearchParams({
        serviceKey: GOV_DATA_KEY,
        sigunguCd,
        bjdongCd,
        bun,
        ji,
        numOfRows: "500", // Fetch enough units to get a good sample
        _type: "json",
      });
      const unitUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?${unitParams.toString()}`;
      console.log(`[search-property][${requestId}] fetching unit data: ${unitUrl.replace(GOV_DATA_KEY, "***")}`);

      const unitRes = await timeoutFetch(unitUrl, 15_000); // 15s timeout
      if (unitRes.ok) {
        const unitJson = await unitRes.json();
        const items = Array.isArray(unitJson?.response?.body?.items?.item)
          ? unitJson.response.body.items.item
          : (unitJson?.response?.body?.items?.item ? [unitJson.response.body.items.item] : []);
        
        if (items.length > 0) {
          // Extract exclusive areas (area) - Strictly filter for '1' (Exclusive) based on user guide (Operation 6)
          // If the field is missing/undefined, we might fallback, but for now strict is safer to avoid Common Area pollution.
          const exclusiveItems = items.filter((item: any) => String(item.exposPubuseGbCd) === "1");
          const targetItems = exclusiveItems.length > 0 ? exclusiveItems : items; // Fallback if no specific code found (e.g. data anomaly)

          const areas = targetItems.map((item: any) => Number(item.area || item.exposPubuseArea || 0)).filter((a: number) => a > 0);
          
          if (areas.length > 0) {
            // Calculate Mode (Most frequent value)
            const frequency: Record<number, number> = {};
            let maxFreq = 0;
            let mode = areas[0];

            for (const a of areas) {
              const rounded = Math.round(a * 10) / 10; // Round to 1 decimal place (e.g. 84.9 -> 84.9)
              frequency[rounded] = (frequency[rounded] || 0) + 1;
              if (frequency[rounded] > maxFreq) {
                maxFreq = frequency[rounded];
                mode = rounded;
              }
            }
            representativeArea = mode;
            console.log(`[search-property][${requestId}] Unit Area Mode: ${mode}m2 (from ${areas.length} units)`);
          }
        }
      } else {
         console.warn(`[search-property][${requestId}] unit API failed: ${unitRes.status}`);
      }
    } catch (e) {
      console.error(`[search-property][${requestId}] unit fetch error`, e);
    }
    // ------------------------------------------

    let land: LandInfo = { jimok: null, landArea: null };
    try {
      const pnu = payload.pnu;
      
      // PNU가 있으면 국가중점데이터 API 사용 (가장 정확)
      if (pnu && pnu.length >= 8) {
        const landUrl = `https://api.vworld.kr/ned/data/ladfrlList?key=${VWORLD_KEY}&pnu=${pnu}&format=json&numOfRows=1&domain=localhost`;
        console.log(`[search-property][${requestId}] fetching land data via NED API with pnu=${pnu}`);
        const landRes = await timeoutFetch(landUrl, 10_000);
        if (landRes.ok) {
          const landJson = await landRes.json();
          console.log(`[search-property][${requestId}] NED land API response:`, JSON.stringify(landJson).substring(0, 500));
          // 국가중점데이터 API 응답 구조: ladfrlVOList.ladfrlVOList 배열
          const item = landJson?.ladfrlVOList?.ladfrlVOList?.[0];
          if (item) {
            land = {
              jimok: String(item.lndcgrCodeNm || "").trim() || null,
              landArea: Number(item.lndpclAr || 0) || null,
            };
            console.log(`[search-property][${requestId}] NED land data found:`, land);
          }
        } else {
          console.error(`[search-property][${requestId}] NED land API failed: ${landRes.status}`);
        }
      }
      
      // PNU가 없거나 결과가 없으면 기존 공간정보 API 시도 (fallback)
      if (land.jimok === null && land.landArea === null) {
        const fallbackUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${VWORLD_KEY}&domain=localhost&size=1`;
        console.log(`[search-property][${requestId}] fallback: spatial land API`);
        const landRes = await timeoutFetch(fallbackUrl, 10_000);
        if (landRes.ok) {
          const landJson = await landRes.json();
          const feature = landJson?.response?.result?.featureCollection?.features?.[0];
          if (feature?.properties) {
            land = {
              jimok: String(feature.properties.jimok || feature.properties.lndcgr_nm || "").trim() || null,
              landArea: Number(feature.properties.pclnd_area || feature.properties.area || 0) || null,
            };
            console.log(`[search-property][${requestId}] fallback land data received:`, land);
          }
        }
      }
    } catch (e) {
      console.error(`[search-property][${requestId}] land fetch error`, e);
      land = { jimok: null, landArea: null };
    }

    return successResponse(
      {
        building: { ...building, representativeArea },
        land,
        sourceFacts: [
          {
            id: "public_building_ledger",
            title: "건축물대장(공공데이터포털)",
            url: "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo",
          },
          {
            id: "vworld_land_info",
            title: "브이월드 토지 특성",
            url: "https://www.vworld.kr/",
          },
        ],
      },
      requestId,
    );
  } catch (error: any) {
    console.error(`[search-property][${requestId}] FATAL ERROR`, error);
    return errorResponse("internal_error", `부동산 기본정보 조회 중 오류: ${error.message}`, requestId, 500);
  }
});
