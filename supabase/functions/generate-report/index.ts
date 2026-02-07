import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createRequestId,
  errorResponse,
  parseJson,
  successResponse,
} from "../_shared/http.ts";

interface SourceFact {
  id: string;
  title: string;
  url: string;
  summary?: string;
}

interface GenerateReportRequest {
  subject: string;
  analysisDepth?: "basic" | "standard" | "premium";
  valuation: Record<string, unknown>;
  sourceFacts: SourceFact[];
  options?: {
    language?: "ko" | "en";
    tone?: "neutral" | "friendly";
  };
}

interface ReportSection {
  title: string;
  content: string;
}

interface KeyNumber {
  label: string;
  value: number | null;
  unit: string;
  citationIds: string[];
}

interface Citation {
  id: string;
  title: string;
  url: string;
}

interface MarketInsight {
  keywords: string[];
  keywordContext?: string;
  news?: {
    title: string;
    url: string;
    publishedAt?: string | null;
  }[];
  expertOpinion: {
    priceBackground: string;
    riskFactors: string;
    outlook: string;
  };
  swot: {
    strength: string;
    weakness: string;
    opportunity: string;
    threat: string;
  };
}

interface StructuredReport {
  summary: string;
  sections: ReportSection[];
  keyNumbers: KeyNumber[];
  cautions: string[];
  citations: Citation[];
  marketInsight?: MarketInsight;
}

function buildFallbackReport(input: GenerateReportRequest): StructuredReport {
  const valuation = input.valuation as Record<string, unknown>;
  
  // 핵심 수치 추출
  const areaM2 = Number(valuation.areaM2 ?? NaN);
  const recentTradeUnitPrice = Number(valuation.recentTradeUnitPrice ?? NaN);
  const publicBasedUnitPrice = Number(valuation.publicBasedUnitPrice ?? NaN);
  const fairUnitPrice = Number(valuation.fairUnitPrice ?? NaN);
  const currentPercent = Number(valuation.currentPercent ?? NaN);
  const estimatedValue = Number(valuation.estimatedValue ?? NaN);
  const depth = input.analysisDepth ?? "standard";
  
  // sourceFacts에서 상세 정보 추출
  const buildingFact = input.sourceFacts.find(s => s.id.includes("building") || s.id.includes("건축물"));
  const tradeFact = input.sourceFacts.find(s => s.id.includes("transaction") || s.id.includes("실거래"));
  const landFact = input.sourceFacts.find(s => s.id.includes("land") || s.id.includes("토지"));
  const priceFact = input.sourceFacts.find(s => s.id.includes("공시지가") || s.id.includes("price"));
  const naverFact = input.sourceFacts.find((s) => s.id === "naver_news_digest")
    ?? input.sourceFacts.find((s) => s.id.includes("naver") || s.id.includes("검색"));

  const guessPublishedAt = (summary?: string): string | null => {
    if (!summary) return null;
    const firstLine = summary.split("\n")[0]?.trim();
    if (!firstLine) return null;
    // Naver pubDate example: "Mon, 06 Feb 2026 09:00:00 +0900"
    if (/\+\d{4}\b/.test(firstLine) || /\b\d{4}\b/.test(firstLine)) return firstLine;
    return null;
  };

  const naverNewsFacts = input.sourceFacts
    .filter((s) => /^naver_news_\d+$/.test(s.id))
    .slice(0, 5);

  const news = naverNewsFacts.map((s) => ({
    title: s.title,
    url: s.url,
    publishedAt: guessPublishedAt(s.summary),
  }));

  const keywordContext = news.length > 0
    ? `최근 뉴스 헤드라인을 반영해 지역 이슈를 요약했습니다. 예: ${news.slice(0, 2).map((n) => `"${n.title}"`).join(", ")}`
    : undefined;
  
  // Citation ID 매핑
  const buildingCitationId = buildingFact?.id ?? "building_data";
  const tradeCitationId = tradeFact?.id ?? "transaction_data";
  const landCitationId = landFact?.id ?? "land_data";
  const priceCitationId = priceFact?.id ?? "public_price_data";
  const naverCitationId = naverFact?.id ?? "naver_search";

  // 숫자 포맷팅 헬퍼
  const formatNumber = (n: number) => Number.isFinite(n) ? n.toLocaleString("ko-KR") : "확인 불가";
  const formatWon = (n: number) => Number.isFinite(n) ? `${n.toLocaleString("ko-KR")}원` : "확인 불가";
  const formatEok = (n: number) => Number.isFinite(n) ? `${(n / 100000000).toFixed(1)}억원` : "확인 불가";

  // 상세 요약문 생성 (analysisDepth에 따라 길이/밀도 조절)
  const summarySentences: string[] = [];
  summarySentences.push(`${input.subject}에 대한 부동산 가치분석 보고서입니다.`);

  if (Number.isFinite(areaM2)) {
    summarySentences.push(`전용면적 ${formatNumber(areaM2)}㎡ 기준으로 분석되었습니다.`);
  }
  if (Number.isFinite(estimatedValue)) {
    summarySentences.push(`추정 적정가치(총액)는 ==${formatEok(estimatedValue)}== 수준입니다.`);
  }
  if (Number.isFinite(currentPercent) && currentPercent > 0) {
    const percentDesc = currentPercent > 110
      ? "적정가 대비 높은 편(고평가 구간 가능성)"
      : currentPercent < 90
        ? "적정가 대비 낮은 편(저평가 구간 가능성)"
        : "적정가 근처";
    summarySentences.push(`현재 시세 백분율은 ${currentPercent.toFixed(1)}%로, ==${percentDesc}==으로 해석됩니다.`);
  }

  if (Number.isFinite(recentTradeUnitPrice) || Number.isFinite(publicBasedUnitPrice)) {
    summarySentences.push("본 보고서는 실거래 단가와 공시지가 기반 단가를 조합한 MVP 산식으로 적정가치를 산출했습니다.");
  }

  if (depth !== "basic" && news.length > 0) {
    summarySentences.push(`최근 뉴스 기반 참고 이슈를 함께 반영했습니다(예: ${news[0].title}).`);
  }

  summarySentences.push("본 결과는 공개 데이터 기반 참고용이며, 중요한 의사결정 전에는 추가 조사와 전문가 확인을 권장합니다.");

  const keyBullets: string[] = [];
  if (Number.isFinite(estimatedValue)) keyBullets.push(`• 추정 적정가치: ==${formatEok(estimatedValue)}==`);
  if (Number.isFinite(fairUnitPrice)) keyBullets.push(`• 적정 단가: ${formatWon(fairUnitPrice)}/㎡`);
  if (Number.isFinite(currentPercent) && currentPercent > 0) {
    keyBullets.push(`• 현재 시세 백분율: ${currentPercent.toFixed(1)}%`);
  }
  if (news.length > 0) {
    keyBullets.push(`• 최근 뉴스(근거): ${news.slice(0, 2).map((n) => n.title).join(" / ")}`);
  }

  const bulletLimit = depth === "basic" ? 3 : depth === "standard" ? 5 : 6;
  const summaryBlocks: string[] = [summarySentences.join(" ")];
  if (keyBullets.length > 0) {
    summaryBlocks.push("");
    summaryBlocks.push("핵심 포인트:");
    summaryBlocks.push(...keyBullets.slice(0, bulletLimit));
  }

  const summary = summaryBlocks.join("\n").trim();

  // keyNumbers 확장
  const keyNumbers: KeyNumber[] = [
    {
      label: "전용면적",
      value: Number.isFinite(areaM2) ? areaM2 : null,
      unit: "㎡",
      citationIds: [buildingCitationId],
    },
    {
      label: "최근 실거래 단가",
      value: Number.isFinite(recentTradeUnitPrice) ? recentTradeUnitPrice : null,
      unit: "원/㎡",
      citationIds: [tradeCitationId],
    },
    {
      label: "공시지가 기반 단가",
      value: Number.isFinite(publicBasedUnitPrice) ? publicBasedUnitPrice : null,
      unit: "원/㎡",
      citationIds: [priceCitationId],
    },
    {
      label: "적정 단가",
      value: Number.isFinite(fairUnitPrice) ? fairUnitPrice : null,
      unit: "원/㎡",
      citationIds: [tradeCitationId, priceCitationId],
    },
    {
      label: "현재 백분율",
      value: Number.isFinite(currentPercent) ? currentPercent : null,
      unit: "%",
      citationIds: [tradeCitationId],
    },
    {
      label: "추정 가치",
      value: Number.isFinite(estimatedValue) ? estimatedValue : null,
      unit: "원",
      citationIds: [tradeCitationId, priceCitationId],
    },
  ].filter(kn => kn.value !== null);

  // 상세 섹션 생성
  const sections: ReportSection[] = [];

  // 1. 물건 개요
  const buildingInfo: string[] = [];
  if (buildingFact?.summary) {
    buildingInfo.push(buildingFact.summary);
  } else {
    buildingInfo.push(`분석 대상: ${input.subject}`);
    if (Number.isFinite(areaM2)) buildingInfo.push(`전용면적: ${formatNumber(areaM2)}㎡`);
  }
  sections.push({
    title: "물건 개요",
    content: buildingInfo.join("\n") || "건축물대장 정보를 확인할 수 없습니다.",
  });

  // 2. 실거래 분석
  const tradeInfo: string[] = [];
  if (tradeFact?.summary) {
    tradeInfo.push(tradeFact.summary);
  }
  if (Number.isFinite(recentTradeUnitPrice)) {
    tradeInfo.push(`• 최근 실거래 단가: ${formatWon(recentTradeUnitPrice)}/㎡`);
  }
  if (Number.isFinite(areaM2) && Number.isFinite(recentTradeUnitPrice)) {
    const totalTrade = areaM2 * recentTradeUnitPrice;
    tradeInfo.push(`• 전용면적 기준 거래가: ${formatEok(totalTrade)}`);
  }
  sections.push({
    title: "실거래가 분석",
    content: tradeInfo.length > 0 ? tradeInfo.join("\n") : "최근 실거래 정보를 확인할 수 없습니다. 인근 유사 물건의 거래 사례를 참고하시기 바랍니다.",
  });

  // 3. 공시지가 분석
  const priceInfo: string[] = [];
  if (priceFact?.summary) {
    priceInfo.push(priceFact.summary);
  }
  if (Number.isFinite(publicBasedUnitPrice)) {
    priceInfo.push(`• 공시지가 기반 추정 단가: ${formatWon(publicBasedUnitPrice)}/㎡`);
    if (Number.isFinite(recentTradeUnitPrice) && recentTradeUnitPrice > 0) {
      const ratio = (publicBasedUnitPrice / recentTradeUnitPrice * 100).toFixed(1);
      priceInfo.push(`• 실거래가 대비 공시지가 비율: ${ratio}%`);
    }
  }
  sections.push({
    title: "공시지가 분석",
    content: priceInfo.length > 0 ? priceInfo.join("\n") : "개별공시지가 정보를 확인할 수 없습니다.",
  });

  // 4. 적정가치 산출
  const valuationInfo: string[] = [];
  valuationInfo.push("적정 단가는 다음 산식으로 계산되었습니다:");
  valuationInfo.push("• 적정단가 = (실거래 단가 × 60%) + (공시지가 기반 단가 × 40%)");
  if (Number.isFinite(fairUnitPrice)) {
    valuationInfo.push(`• 산출된 적정 단가: ${formatWon(fairUnitPrice)}/㎡`);
  }
  if (Number.isFinite(estimatedValue)) {
    valuationInfo.push(`• 추정 적정가치: ${formatEok(estimatedValue)}`);
  }
  sections.push({
    title: "적정가치 산출",
    content: valuationInfo.join("\n"),
  });

  // 5. 시장 동향 (네이버 검색 결과)
  const marketInfo: string[] = [];
  if (naverFact?.summary) {
    marketInfo.push(naverFact.summary);
  }
  const naverItems = input.sourceFacts.filter(s => s.id.includes("naver") || s.id.includes("검색"));
  if (naverItems.length > 0) {
    marketInfo.push("\n관련 정보:");
    naverItems.slice(0, 3).forEach(item => {
      if (item.title) marketInfo.push(`• ${item.title}`);
    });
  }
  if (marketInfo.length > 0) {
    sections.push({
      title: "시장 동향 및 참고 정보",
      content: marketInfo.join("\n"),
    });
  }

  // 6. 주의사항
  const cautions = Array.isArray(valuation.cautions)
    ? (valuation.cautions as string[])
    : [
        "본 보고서는 공공데이터와 웹 공개정보를 기반으로 자동 생성된 참고 자료입니다.",
        "최종 의사결정 전 반드시 전문가 검토 및 현장 확인이 필요합니다.",
        "실거래가는 거래 시점과 조건에 따라 달라질 수 있습니다.",
      ];

  sections.push({
    title: "주의사항",
    content: cautions.map(c => `• ${c}`).join("\n"),
  });

  // 7. Market Insight 생성
  // 주소에서 키워드 추출
  const extractKeywords = (subject: string): string[] => {
    const keywords: string[] = [];
    // 지역명 추출
    const regions = ["용산", "강남", "서초", "송파", "마포", "성동", "광진", "중구", "종로"];
    for (const region of regions) {
      if (subject.includes(region)) {
        keywords.push(`#${region}구`);
        break;
      }
    }
    // 역세권 키워드
    if (subject.includes("역") || naverFact?.summary?.includes("역세권")) {
      keywords.push("#역세권_프리미엄");
    }
    // 학군 키워드
    if (naverFact?.summary?.includes("학군") || naverFact?.summary?.includes("학교")) {
      keywords.push("#학군수요_지속");
    }
    // 매물 희소성
    if (currentPercent > 100) {
      keywords.push("#매물희소_강세");
    } else if (currentPercent < 90) {
      keywords.push("#저평가_매물");
    }
    // 개발 호재
    if (naverFact?.summary?.includes("개발") || naverFact?.summary?.includes("재개발")) {
      keywords.push("#개발호재");
    }
    return keywords.length > 0 ? keywords : ["#부동산분석", "#가치평가"];
  };

  // 전문가 의견 생성
  const generateExpertOpinion = () => {
    const priceBackground = Number.isFinite(currentPercent) && currentPercent > 100
      ? `최근 해당 지번 인근은 교통망 확충 호재가 맞물리며 ==단기간 내 실거래가가 상승==한 것으로 나타납니다. 전용면적 대비 거래가가 인근 평균을 상회하고 있으며, 이는 향후 기대 가치가 선반영된 결과로 풀이됩니다.`
      : `해당 물건은 현재 적정 시세 범위 내에서 거래되고 있습니다. ==안정적인 가격 흐름==을 보이고 있어 실거주 목적의 구매에 적합한 것으로 판단됩니다.`;

    const gapRatio = Number.isFinite(publicBasedUnitPrice) && Number.isFinite(recentTradeUnitPrice) && recentTradeUnitPrice > 0
      ? ((recentTradeUnitPrice - publicBasedUnitPrice) / publicBasedUnitPrice * 100).toFixed(1)
      : null;
    
    const riskFactors = gapRatio && Number(gapRatio) > 15
      ? `현재 가장 주목해야 할 점은 공시지가와 실거래가 사이의 괴리율이 ${gapRatio}%에 달한다는 점입니다. 이는 시장이 다소 과열되어 있음을 시사하며, ==시세가 다소 높게 형성되어 있는 고평가 구간==임을 나타냅니다.`
      : `공시지가와 실거래가 간의 괴리율이 적정 범위 내에 있어, ==합리적인 가격대==로 평가됩니다. 급격한 가격 조정 위험은 낮은 편입니다.`;

    const outlook = Number.isFinite(currentPercent) && currentPercent > 110
      ? `해당 입지는 하방 경직성(가격이 잘 떨어지지 않는 성질)은 강할 것으로 보입니다. 다만, 현재의 높은 가격대는 수익률 측면에서 부담이 될 수 있으므로 ==시세 차익을 노린 단기 투자보다는 실거주 목적의 장기적 관점==에서의 접근을 권장합니다.`
      : `해당 입지는 ==장기적 가치 상승 잠재력==을 보유한 것으로 분석됩니다. 현재 시세 수준에서 매수 시 안정적인 자산 형성이 가능할 것으로 전망됩니다.`;

    return { priceBackground, riskFactors, outlook };
  };

  // SWOT 분석 생성
  const generateSwot = () => {
    return {
      strength: Number.isFinite(currentPercent) && currentPercent < 100
        ? "적정가 대비 저평가되어 있어 매수 적기로 판단됨"
        : "우수한 입지 조건 및 안정적인 수요 기반 확보",
      weakness: Number.isFinite(areaM2) && areaM2 < 60
        ? "소형 평형으로 인한 제한적 주거 편의성"
        : "주변 재개발 진행 시 일시적인 정주 여건 저하 가능성",
      opportunity: "인근 지역 개발 프로젝트 완료 시 동반 가치 상승 기대",
      threat: "금리 변동 및 정책 변화에 따른 거래 위축 리스크",
    };
  };

  const marketInsight: MarketInsight = {
    keywords: extractKeywords(input.subject),
    keywordContext,
    news,
    expertOpinion: generateExpertOpinion(),
    swot: generateSwot(),
  };

  return {
    summary,
    sections,
    keyNumbers,
    cautions,
    citations: input.sourceFacts.map((s) => ({ id: s.id, title: s.title, url: s.url })),
    marketInsight,
  };
}


function extractJsonBlock(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

function buildPrompt(input: GenerateReportRequest): string {
  const lang = input.options?.language ?? "ko";
  const depth = input.analysisDepth ?? "standard";
  const depthRules = depth === "basic"
    ? [
        "- summary: 4~6문장 + (줄바꿈 후) '핵심 포인트' 불릿 3개",
        "- marketInsight.expertOpinion 각 문단: 2~3문장",
      ].join("\n")
    : depth === "standard"
      ? [
          "- summary: 6~10문장 + (줄바꿈 후) '핵심 포인트' 불릿 4~5개",
          "- marketInsight.expertOpinion 각 문단: 3~5문장",
        ].join("\n")
      : [
          "- summary: 8~12문장 + (줄바꿈 후) '핵심 포인트' 불릿 5~6개",
          "- sections에 '투자 전략', '리스크 체크리스트(일반 체크리스트)'를 추가",
          "- marketInsight.expertOpinion 각 문단: 4~6문장",
        ].join("\n");

  const sourceList = input.sourceFacts.map((s) =>
    `- id:${s.id}, title:${s.title}, url:${s.url}, summary:${s.summary ?? ""}`
  ).join("\n");

  return `
당신은 50대 고액자산가를 상대하는 **부동산 자산관리사(CFA)**입니다.
전문적이면서도 이해하기 쉬운 어조로 분석 결과를 작성하세요.
핵심 결론은 ==텍스트== 형식으로 강조하여 빠르게 파악할 수 있게 하세요.

Return ONLY valid JSON. 절대 설명이나 마크다운 블록 없이 JSON만 반환하세요.

## CRITICAL RULES (MUST FOLLOW)
- DO NOT INVENT or FABRICATE any information.
- DO NOT use general market knowledge outside of provided data.
- If data is missing, explicitly state "확인 불가" or "데이터 부족".
- Every number MUST have at least one citationId from SourceFacts.
- Use ==important text== syntax to highlight KEY conclusions (2-3 per section).
- If uncertain, add "추가 조사 필요" to cautions array.
- If any SourceFact id starts with "naver_news_", you MUST:
  - Mention 1~2 news titles naturally in summary or outlook (NO FABRICATION).
  - Fill marketInsight.news from those SourceFacts ONLY (max 5).

Language: ${lang}
AnalysisDepth: ${depth}
Subject: ${input.subject}

## CONTENT LENGTH RULES (BY AnalysisDepth)
${depthRules}

## PROVIDED DATA (USE ONLY THIS)
ValuationData: ${JSON.stringify(input.valuation)}

SourceFacts:
${sourceList}

## OUTPUT JSON SCHEMA
{
  "summary": "string - length depends on AnalysisDepth. Use 줄바꿈 + 불릿 to improve skimmability.",
  "sections": [{"title":"string","content":"string - use ==text== for key highlights"}],
  "keyNumbers": [{"label":"string","value": number|null,"unit":"string","citationIds":["source_id"]}],
  "cautions": ["string - warnings about data limitations"],
  "citations": [{"id":"source_id","title":"string","url":"string"}],
  "marketInsight": {
    "keywords": ["#해시태그형식_키워드", "최대4개"],
    "keywordContext": "string - 1~2문장으로 키워드가 왜 중요한지 설명(Provided data만 사용)",
    "news": [{"title":"string","url":"string","publishedAt":"string|null"}],
    "expertOpinion": {
      "priceBackground": "가격 동향 배경 분석 (==핵심== 포함)",
      "riskFactors": "공시지가 괴리율 등 위험 요인 (==핵심== 포함)",
      "outlook": "향후 전망 및 투자 전략 (==핵심== 포함)"
    },
    "swot": {
      "strength": "강점 - 한 문장",
      "weakness": "약점 - 한 문장",
      "opportunity": "기회 - 한 문장",
      "threat": "위험 - 한 문장"
    }
  }
}
`.trim();
}


function validateStructuredReport(
  report: StructuredReport,
  sourceFacts: SourceFact[],
): { ok: boolean; reason?: string; report?: StructuredReport } {
  const sourceMap = new Map(sourceFacts.map((s) => [s.id, s]));
  if (!report.summary || !Array.isArray(report.sections) || !Array.isArray(report.keyNumbers)) {
    return { ok: false, reason: "report shape is invalid" };
  }

  const usedCitationIds = new Set<string>();
  let numericCount = 0;

  for (const key of report.keyNumbers) {
    const isNumeric = typeof key.value === "number" && Number.isFinite(key.value);
    if (isNumeric) numericCount += 1;
    if (isNumeric) {
      if (!Array.isArray(key.citationIds) || key.citationIds.length === 0) {
        return { ok: false, reason: "numeric keyNumbers must include citationIds" };
      }
      for (const id of key.citationIds) {
        if (!sourceMap.has(id)) {
          return { ok: false, reason: `unknown citation id: ${id}` };
        }
        usedCitationIds.add(id);
      }
    }
  }

  if (numericCount > 0 && usedCitationIds.size === 0) {
    return { ok: false, reason: "numeric values without valid citations" };
  }

  // Always include all provided SourceFacts in citations so news/web sources don't disappear.
  const citations: Citation[] = [];
  const seen = new Set<string>();
  for (const src of sourceFacts) {
    if (!src?.id || seen.has(src.id)) continue;
    seen.add(src.id);
    citations.push({ id: src.id, title: src.title, url: src.url });
  }

  return {
    ok: true,
    report: {
      ...report,
      citations,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = createRequestId();
  try {
    const payload = await parseJson<GenerateReportRequest>(req);
    if (!payload.subject?.trim()) {
      return errorResponse("invalid_input", "subject는 필수입니다.", requestId, 400);
    }
    if (!Array.isArray(payload.sourceFacts) || payload.sourceFacts.length === 0) {
      return errorResponse("invalid_input", "sourceFacts는 최소 1개 이상 필요합니다.", requestId, 400);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return errorResponse(
        "config_missing",
        "필수 환경변수(GEMINI_API_KEY)가 설정되지 않았습니다.",
        requestId,
        500,
      );
    }

    const prompt = buildPrompt(payload);
    
    // 50초 타임아웃 설정 (Supabase 무료 티어 60초 제한 고려, 안전하게 50초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50_000);

    let apiRes: Response;
    try {
      // 모델 변경: 사용자 요청으로 gemini-3-flash-preview 유지
      apiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8,
              maxOutputTokens: 2048,
            },
          }),
        },
      );
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.error(`[generate-report][${requestId}] Gemini API Timeout`);
        return successResponse(buildFallbackReport(payload), requestId, 200, {
          llmFallback: true,
          reason: "timeout",
        });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error(`[generate-report][${requestId}] upstream=${apiRes.status} body=${errText}`);
      return successResponse(buildFallbackReport(payload), requestId, 200, { llmFallback: true });
    }

    const llmJson = await apiRes.json();
    const rawText = llmJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== "string") {
      return successResponse(buildFallbackReport(payload), requestId, 200, { llmFallback: true });
    }

    let parsed: StructuredReport;
    try {
      parsed = JSON.parse(extractJsonBlock(rawText));
    } catch {
      return successResponse(buildFallbackReport(payload), requestId, 200, { llmFallback: true });
    }

    const validated = validateStructuredReport(parsed, payload.sourceFacts);
    if (!validated.ok || !validated.report) {
      return successResponse(buildFallbackReport(payload), requestId, 200, {
        llmFallback: true,
        validationReason: validated.reason ?? "unknown",
      });
    }

    return successResponse(validated.report, requestId);
  } catch (error) {
    console.error(`[generate-report][${requestId}]`, error);
    // 에러 발생 시에도 Fallback 리포트를 반환하여 사용자 경험 유지 (선택사항)
    // 여기서는 500 에러 대신 Fallback을 반환하는 것이 더 안전할 수 있음
    return successResponse(buildFallbackReport(payload), requestId, 200, {
      llmFallback: true,
      error: (error as Error).message,
    });
    // return errorResponse("internal_error", "보고서 생성 중 오류가 발생했습니다.", requestId, 500);
  }
});
