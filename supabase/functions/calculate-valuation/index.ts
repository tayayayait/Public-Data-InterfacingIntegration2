import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createRequestId,
  errorResponse,
  maskAddress,
  parseJson,
  successResponse,
} from "../_shared/http.ts";

interface ValuationRequest {
  address: string;
  lawdCd?: string;
  dealYmd?: string;
  areaM2?: number;
  lat?: number;
  lng?: number;
  pnu?: string;
  representativeArea?: number;
}

interface TransactionInfo {
  amount: number | null;
  date: string | null;
  floor: number | null;
  exclusSpace: number | null;
}

interface PublicLandPriceInfo {
  pricePerM2: number | null;
  year: number | null;
}

function timeoutFetch(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

function normalizeCode(
  value: string | undefined,
  size: number,
): string | undefined {
  if (!value) return undefined;
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly.length === size ? digitsOnly : undefined;
}

function normalizeDealYmd(value: string | undefined): string {
  const v = value?.replace(/\D/g, "") ?? "";
  if (v.length === 6) return v;
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

// XML 파싱을 더 견고하게 수정 (여러 item 처리 가능하도록)
function parseTradeXml(xml: string, targetArea?: number): TransactionInfo {
  const items: TransactionInfo[] = [];

  // <item> ... </item> 블록 단위로 추출 (간단한 정규식 파서)
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g);

  if (!itemMatches) {
    console.warn(`[parseTradeXml] No <item> tags found in XML. Raw XML preview (first 500 chars): ${xml.substring(0, 500)}`);
    return { amount: null, date: null, floor: null, exclusSpace: null };
  }

  for (const itemXml of itemMatches) {
    // 가이드에 명시된 필드명: dealAmount, dealYear, dealMonth, dealDay, floor, excluUseAr
    const amountMatch = itemXml.match(
      /<dealAmount>\s*([0-9,\s]+)\s*<\/dealAmount>/i,
    );
    const yearMatch = itemXml.match(/<dealYear>\s*(\d+)\s*<\/dealYear>/i);
    const monthMatch = itemXml.match(/<dealMonth>\s*(\d+)\s*<\/dealMonth>/i);
    const dayMatch = itemXml.match(/<dealDay>\s*(\d+)\s*<\/dealDay>/i);
    const floorMatch = itemXml.match(/<floor>\s*([0-9-]+)\s*<\/floor>/i);
    // 가이드상 전용면적 태그는 'excluUseAr' 임
    const exclusSpaceMatch = itemXml.match(
      /<excluUseAr>\s*([0-9.]+)\s*<\/excluUseAr>/i,
    );

    const amountManWon = amountMatch
      ? Number(amountMatch[1].replace(/[,\s]/g, ""))
      : NaN;
    const amountWon = Number.isFinite(amountManWon)
      ? amountManWon * 10_000
      : null;

    const date =
      yearMatch && monthMatch && dayMatch
        ? `${yearMatch[1]}-${monthMatch[1].padStart(2, "0")}-${dayMatch[1].padStart(2, "0")}`
        : null;

    const floor = floorMatch ? Number(floorMatch[1]) : null;
    const exclusSpace = exclusSpaceMatch ? Number(exclusSpaceMatch[1]) : null;

    if (amountWon !== null && date !== null && exclusSpace !== null) {
      items.push({ amount: amountWon, date, floor, exclusSpace });
    }
  }

  if (items.length === 0) {
    return { amount: null, date: null, floor: null, exclusSpace: null };
  }

  // 1. 날짜 내림차순 정렬 (최신순)
  items.sort((a, b) => {
    if (a.date && b.date) {
      return b.date.localeCompare(a.date);
    }
    return 0;
  });

  // 2. targetArea(목표 면적)가 있으면, 면적이 가장 비슷한 물건을 찾음
  // (단, 너무 오래된 물건보다는 최신 물건을 더 우선시할지, 면적을 우선시할지 결정 필요)
  // 여기서는 "최신 10개 거래 중"에서 "면적 차이가 가장 적은 것"을 선택하는 로직 적용

  const recentItems = items.slice(0, 10); // 최신 10개만 후보로

  let bestItem = recentItems[0];
  if (targetArea && targetArea > 0) {
    let minDiff = Infinity;

    for (const item of recentItems) {
      if (item.exclusSpace) {
        const diff = Math.abs(item.exclusSpace - targetArea);
        if (diff < minDiff) {
          minDiff = diff;
          bestItem = item;
        }
      }
    }
  }

  return bestItem;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = createRequestId();

  try {
    const payload = await parseJson<ValuationRequest>(req);
    const address = payload.address?.trim();
    if (!address || address.length < 2) {
      return errorResponse(
        "invalid_input",
        "address는 2자 이상이어야 합니다.",
        requestId,
        400,
      );
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

    const lawdCd = normalizeCode(payload.lawdCd, 5) ?? "11680";
    const dealYmd = normalizeDealYmd(payload.dealYmd);

    // 타겟 면적 결정 (입력값 -> 기본값 84)
    const targetArea = payload.representativeArea || payload.areaM2 || 84;
    const pnu = payload.pnu;

    console.log(
      `[calculate-valuation][${requestId}] START Request: address="${maskAddress(address)}", pnu=${pnu}, lawdCd=${lawdCd}, dealYmd=${dealYmd}, targetArea=${targetArea}`,
    );

    const tradeParams = new URLSearchParams({
      serviceKey: GOV_DATA_KEY,
      LAWD_CD: lawdCd,
      DEAL_YMD: dealYmd,
      pageNo: "1",
      numOfRows: "50", // 데이터를 충분히 가져와서 클라이언트(Edge Func)에서 필터링
    });
    const tradeUrl = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade?${tradeParams.toString()}`;
    console.log(
      `[calculate-valuation][${requestId}] fetching trade data: ${tradeUrl.replace(GOV_DATA_KEY, "***")}`,
    );

    // 타임아웃 30초로 증가
    const tradeRes = await timeoutFetch(tradeUrl, 30_000);
    if (!tradeRes.ok) {
        console.error(
            `[calculate-valuation][${requestId}] Trade API ERROR: Status ${tradeRes.status} ${tradeRes.statusText} URL: ${tradeUrl.replace(GOV_DATA_KEY, "***")}`,
        );
    }

    let transaction: TransactionInfo = {
      amount: null,
      date: null,
      floor: null,
      exclusSpace: null,
    };
    if (tradeRes.ok) {
      const tradeXml = await tradeRes.text();
      // targetArea를 넘겨서 가장 적합한 거래 찾기
      transaction = parseTradeXml(tradeXml, targetArea);
      
      if (transaction.amount === null) {
          console.warn(`[calculate-valuation][${requestId}] Trade API succeed but no valid transaction found after parsing.`);
      }
      
      console.log(
        `[calculate-valuation][${requestId}] best transaction found:`,
        transaction,
      );
    }

    let publicLandPrice: PublicLandPriceInfo = { pricePerM2: null, year: null };
    try {
      
      // PNU가 있으면 국가중점데이터 API 사용 (가장 정확)
      if (pnu && pnu.length >= 8) {
        // 가이드에 따른 파라미터 구성: key, pnu, format, numOfRows, pageNo, domain(선택)
        // 브이월드 오픈API는 Deno(서버)에서 호출 시 domain 파라미터가 없어도 되거나, 가짜 도메인을 넣어야 할 수 있음.
        // 기존 코드에서 domain을 안 넣었을 때 잘 동작했는지 확인 필요하지만, 가이드 예시에는 domain이 있음.
        // 일단 domain 제거하고 호출 (서버 사이드 호출이므로)
        const vworldUrl = `https://api.vworld.kr/ned/data/getIndvdLandPriceAttr?key=${VWORLD_KEY}&pnu=${pnu}&format=json&numOfRows=1&pageNo=1&domain=localhost`;
        
        console.log(
          `[calculate-valuation][${requestId}] fetching public price via NED API with pnu=${pnu}`,
        );
        const vworldRes = await timeoutFetch(vworldUrl, 10_000);
        if (vworldRes.ok) {
          const vworldJson = await vworldRes.json();
          // 국가중점데이터 API 응답 구조 확인
          // 가이드 출력결과: items > item 형태일수도 있고, indvdLandPrices > field 형태일수도 있음.
          // 실제 응답 확인을 위해 로그 강화 및 유연한 처리
          
          let item = null;
          const root = vworldJson?.indvdLandPrices ?? vworldJson?.response?.body?.items; // items 케이스 대비

          if (root) {
             if (Array.isArray(root.field)) {
                 item = root.field[0];
             } else if (root.field) {
                 item = root.field;
             } else if (Array.isArray(root.item)) {
                 item = root.item[0];
             } else if (root.item) {
                 item = root.item;
             }
          } else if (vworldJson?.indvdLandPrices) {
             // field가 바로 있는 경우 (예: xml->json 변환 시)
             item = vworldJson.indvdLandPrices;
          }

          if (item) {
            const price = Number(item.pblntfPclnd ?? NaN);
            const year = Number(item.stdrYear ?? NaN);
            
            // 0원인 경우도 데이터 없음으로 처리
            if (Number.isFinite(price) && price > 0) {
                 publicLandPrice = {
                  pricePerM2: price,
                  year: Number.isFinite(year) ? year : null,
                };
                console.log(
                  `[calculate-valuation][${requestId}] NED API price found:`,
                  publicLandPrice,
                );
            } else {
                 console.log(`[calculate-valuation][${requestId}] NED API price is 0 or invalid:`, item);
            }

          } else {
             console.log(`[calculate-valuation][${requestId}] NED API: 'item' extraction failed. Raw Structure Preview: ${JSON.stringify(vworldJson).substring(0, 300)}`);
          }
        } else {
          console.error(
            `[calculate-valuation][${requestId}] NED API failed: ${vworldRes.status} ${vworldRes.statusText}`,
          );
        }
      }

      // PNU가 없거나 결과가 없으면 기존 공간정보 API 시도 (fallback)
      if (publicLandPrice.pricePerM2 === null) {
        let lat = payload.lat;
        let lng = payload.lng;

        // 좌표가 없으면 주소로 Geocoding
        if (!lat || !lng) {
          try {
            const geocodeUrl = `https://api.vworld.kr/req/address?service=address&request=getcoord&key=${VWORLD_KEY}&type=ROAD&address=${encodeURIComponent(address)}`;
            // console.log(`[calculate-valuation][${requestId}] geocoding address: ${maskAddress(address)}`);
            const geocodeRes = await timeoutFetch(geocodeUrl, 5_000);
            if (geocodeRes.ok) {
              const geocodeJson = await geocodeRes.json();
              const point = geocodeJson?.response?.result?.point;
              if (point?.x && point?.y) {
                lng = Number(point.x);
                lat = Number(point.y);
                console.log(
                  `[calculate-valuation][${requestId}] geocoded: lat=${lat}, lng=${lng}`,
                );
              }
            }
          } catch (geoErr) {
            console.error(
              `[calculate-valuation][${requestId}] geocoding failed`,
              geoErr,
            );
          }
        }

        if (lat && lng) {
          // domain 파라미터 제외 (서버 간 통신이므로 referer 체크가 다를 수 있음, key 설정에 따름)
          // geomFilter 정확도 확인
          const fallbackUrl = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_INDVDPBLNTF&key=${VWORLD_KEY}&size=1&geomFilter=POINT(${lng} ${lat})&domain=localhost`;
          console.log(
            `[calculate-valuation][${requestId}] fallback: spatial API with lat=${lat}, lng=${lng}`,
          );
          const fallbackRes = await timeoutFetch(fallbackUrl, 10_000);
          if (fallbackRes.ok) {
            const fallbackJson = await fallbackRes.json();
            const feature =
              fallbackJson?.response?.result?.featureCollection?.features?.[0];
            const price = Number(
              feature?.properties?.pblntf_pclnd ??
                feature?.properties?.jiga ??
                NaN,
            );
            const year = Number(feature?.properties?.stdr_year ?? NaN);
            publicLandPrice = {
              pricePerM2: Number.isFinite(price) ? price : null,
              year: Number.isFinite(year) ? year : null,
            };
            console.log(
              `[calculate-valuation][${requestId}] fallback price found:`,
              publicLandPrice,
            );
            
             if (!publicLandPrice.pricePerM2) {
                  console.warn(`[calculate-valuation][${requestId}] Fallback API: Price extraction failed. Feature props: ${JSON.stringify(fallbackJson?.response?.result?.featureCollection?.features?.[0]?.properties)}`);
             }
             
          } else {
            console.error(
              `[calculate-valuation][${requestId}] fallback API failed: ${fallbackRes.status}`,
            );
          }
        }
      }
    } catch (e) {
      console.error(`[calculate-valuation][${requestId}] vworld error`, e);
      publicLandPrice = { pricePerM2: null, year: null };
    }

    // 계산에 사용할 면적 결정 로직 개선
    // 1. 실거래가 정보(`transaction.exclusSpace`)가 있으면 그것을 최우선 (가장 정확한 비교 대상)
    // 2. 없으면 대표면적(`payload.representativeArea`) 사용
    // 3. 그것도 없으면 기본값(84) 사용

    let calcAreaM2 = 84;

    if (transaction.exclusSpace && transaction.exclusSpace > 0) {
      calcAreaM2 = transaction.exclusSpace;
    } else if (payload.representativeArea && payload.representativeArea > 0) {
      calcAreaM2 = payload.representativeArea;
    } else if (payload.areaM2 && payload.areaM2 > 0) {
      calcAreaM2 = payload.areaM2;
    }

    // 이상치 방어 로직 (주거용인데 300평 이상이면 의심)
    if (calcAreaM2 > 990) {
      console.warn(
        `[calculate-valuation][${requestId}] suspicious area ${calcAreaM2}m2 detected. Clamping to 84m2 for safety.`,
      );
      calcAreaM2 = 84;
    }

    console.log(
      `[calculate-valuation][${requestId}] Final Calc Area: ${calcAreaM2} (Trade: ${transaction.exclusSpace}, Repr: ${payload.representativeArea})`,
    );

    const recentTradeUnitPrice = transaction.amount
      ? Math.round(transaction.amount / calcAreaM2)
      : null;
    const publicBasedUnitPrice = publicLandPrice.pricePerM2
      ? Math.round(publicLandPrice.pricePerM2)
      : null;

    // Fallback 계산 로직: 데이터 부족 시에도 추정치 제공
    const cautions: string[] = [];
    let fairUnitPrice: number | null = null;
    let formulaDescription = "";

    if (recentTradeUnitPrice !== null && publicBasedUnitPrice !== null) {
      // 정상 계산: 실거래 60% + 공시지가 40%
      fairUnitPrice = Math.round(
        recentTradeUnitPrice * 0.6 + publicBasedUnitPrice * 0.4,
      );
      formulaDescription =
        "적정단가 = (최근실거래가 단가 * 0.6) + (공시지가 기반 단가 * 0.4)";
    } else if (recentTradeUnitPrice !== null) {
      // Fallback A: 실거래가만 있는 경우 → 실거래가 * 0.9 (너무 보수적이지 않게 상향)
      fairUnitPrice = Math.round(recentTradeUnitPrice * 0.9);
      cautions.push(
        "공시지가 데이터 확인 불가로 실거래가 기반 추정치입니다. (실거래가 × 0.9)",
      );
      formulaDescription = "적정단가 = 최근실거래가 단가 * 0.9";
    } else if (publicBasedUnitPrice !== null) {
      // Fallback B: 공시지가만 있는 경우 → 공시지가 * 1.5 (시장가 추정)
      fairUnitPrice = Math.round(publicBasedUnitPrice * 1.5);
      cautions.push(
        "실거래가 데이터 확인 불가로 공시지가 기반 추정치입니다. (공시지가 × 1.5)",
      );
      formulaDescription = "적정단가 = 공시지가 기반 단가 * 1.5";
    } else {
      // 둘 다 없는 경우
      cautions.push(
        "실거래가 및 공시지가 데이터가 모두 부족하여 가치 산출이 불가능합니다.",
      );
      formulaDescription = "데이터 부족으로 산출 불가";
    }

    const currentUnitPrice = recentTradeUnitPrice;
    const currentPercent =
      fairUnitPrice && currentUnitPrice
        ? Number(((currentUnitPrice / fairUnitPrice) * 100).toFixed(1))
        : null;
    const estimatedValue = fairUnitPrice
      ? Math.round(fairUnitPrice * calcAreaM2)
      : null;

    if (fairUnitPrice === null || currentPercent === null) {
      cautions.push("추정 정확도가 낮습니다. 추가 조사를 권장합니다.");
    }

    // 1000% 같은 비정상 수치 방어
    if (currentPercent && currentPercent > 500) {
        console.warn(`[calculate-valuation][${requestId}] ABNORMAL RESULT: ${currentPercent}%. Check inputs and data sources.`);
      cautions.push(
        "산출된 백분율이 비정상적으로 높습니다. 데이터 오류 가능성이 있습니다.",
      );
    }

    return successResponse(
      {
        transaction,
        publicLandPrice,
        valuationResult: {
          areaM2: calcAreaM2,
          recentTradeUnitPrice,
          publicBasedUnitPrice,
          fairUnitPrice,
          currentUnitPrice,
          currentPercent,
          estimatedValue,
          formula: {
            fairUnitPrice: formulaDescription,
            currentPercent: "현재백분율 = 현재단가 / 적정단가 * 100",
          },
          cautions,
        },
        sourceFacts: [
          {
            id: "public_trade_price",
            title: "아파트 실거래가(국토교통부)",
            url: "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade",
          },
          {
            id: "vworld_public_price",
            title: "브이월드 개별공시지가",
            url: "https://www.vworld.kr/",
          },
        ],
      },
      requestId,
    );
  } catch (error: any) {
    console.error(`[calculate-valuation][${requestId}] FATAL ERROR: ${error.message}`, error);
    return errorResponse(
      "internal_error",
      `가격 산출 중 오류: ${error.message}`,
      requestId,
      500,
    );
  }
});
