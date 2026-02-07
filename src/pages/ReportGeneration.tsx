import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Brain, FileText, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildNaverNewsSourceFacts } from "@/lib/sourceFacts";
import type {
  PropertySearchResult,
  PropertySourceFact,
  ReportDraft,
  ValuationResult,
} from "@/types";

interface ProgressStep {
  id: number;
  label: string;
  detail: string;
}

const steps: ProgressStep[] = [
  { id: 1, label: "데이터 확인", detail: "공공데이터/검색/네이버 부동산 요약 시세를 확인합니다." },
  { id: 2, label: "가치 산출", detail: "MVP 산식으로 적정단가와 현재백분율을 계산합니다." },
  { id: 3, label: "보고서 생성", detail: "근거(citations) 포함 구조화 JSON 보고서를 생성합니다." },
  { id: 4, label: "저장 완료", detail: "초안을 저장하고 확인 화면으로 이동합니다." },
];

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
}

function unwrapEnvelope<T>(raw: unknown): T {
  const envelope = raw as Envelope<T>;
  if (!envelope || envelope.success !== true || envelope.data === undefined) {
    throw new Error(envelope?.error?.message ?? "서버 응답 형식이 올바르지 않습니다.");
  }
  return envelope.data;
}

function mapTierToDepth(tier: string | null): "basic" | "standard" | "premium" {
  if (tier === "1") return "basic";
  if (tier === "3") return "premium";
  return "standard";
}

export default function ReportGenerationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void runGeneration();
  }, []);

  const runGeneration = async () => {
    try {
      const tier = searchParams.get("tier");
      const analysisDepth = mapTierToDepth(tier);
      const addressCodesJson = sessionStorage.getItem("addressCodes");
      const addressCodes = addressCodesJson ? JSON.parse(addressCodesJson) : null;
      const subject = (addressCodes?.fullAddress as string | undefined) ?? "부동산 가치분석";

      setStepIndex(0);
      setProgress(10);

      let searchResult: PropertySearchResult | null = null;
      const cachedResult = sessionStorage.getItem("searchResult");
      if (cachedResult) {
        searchResult = JSON.parse(cachedResult) as PropertySearchResult;
      }

      if (!searchResult) {
        const propertyRes = await supabase.functions.invoke("search-property", {
          body: {
            address: subject,
            sigunguCd: addressCodes?.sigunguCd,
            bjdongCd: addressCodes?.bjdongCd,
            bun: addressCodes?.bun,
            ji: addressCodes?.ji,
          },
        });
        if (propertyRes.error) throw propertyRes.error;
        const propertyData = unwrapEnvelope<any>(propertyRes.data);

        const valuationRes = await supabase.functions.invoke("calculate-valuation", {
          body: {
            address: subject,
            lawdCd: addressCodes?.lawdCd ?? addressCodes?.sigunguCd,
            areaM2: propertyData?.building?.area ?? 84,
          },
        });
        if (valuationRes.error) throw valuationRes.error;
        const valuationData = unwrapEnvelope<any>(valuationRes.data);

        const newsQueryBase = [addressCodes?.sigungu, addressCodes?.bname].filter(Boolean).join(" ").trim() || subject;
        const newsQuery = `${newsQueryBase} 부동산 개발 호재`.trim();

        const naverSearchRes = await supabase.functions.invoke("search-naver", {
          body: { query: newsQuery, display: 5, sort: "date", target: "news" },
        });
        if (naverSearchRes.error) throw naverSearchRes.error;
        const naverSearchData = unwrapEnvelope<any>(naverSearchRes.data);

        const naverLandRes = await supabase.functions.invoke("crawl-naver-land", {
          body: {
            address: subject,
            lat: addressCodes?.lat,
            lng: addressCodes?.lng,
            cortarNo: addressCodes?.bcode,
          },
        });
        if (naverLandRes.error) throw naverLandRes.error;
        const naverLandData = unwrapEnvelope<any>(naverLandRes.data);

        searchResult = {
          building: propertyData.building,
          land: propertyData.land,
          naverSearch: naverSearchData.items,
          naverLand: naverLandData,
          sourceFacts: [
            ...(propertyData.sourceFacts ?? []),
            ...(valuationData.sourceFacts ?? []),
            ...(naverSearchData.source
              ? [{
                  id: naverSearchData.source.id ?? "naver_news_search",
                  title: "네이버 뉴스 API",
                  url: naverSearchData.source.url ?? "https://openapi.naver.com/",
                }]
              : []),
            ...(naverLandData.source
              ? [{
                  id: naverLandData.source.id ?? "naver_land_summary",
                  title: "네이버 부동산 요약 시세",
                  url: naverLandData.source.url ?? "https://m.land.naver.com/",
                }]
              : []),
          ],
          query: subject,
          collectedAt: new Date().toISOString(),
        };
        sessionStorage.setItem("searchResult", JSON.stringify(searchResult));
        sessionStorage.setItem("valuationResult", JSON.stringify(valuationData.valuationResult));
      }

      setStepIndex(1);
      setProgress(45);

      let valuationResult: ValuationResult | null = null;
      const cachedValuation = sessionStorage.getItem("valuationResult");
      if (cachedValuation) {
        valuationResult = JSON.parse(cachedValuation) as ValuationResult;
      }
      if (!valuationResult) {
        const valuationRes = await supabase.functions.invoke("calculate-valuation", {
          body: {
            address: subject,
            lawdCd: addressCodes?.lawdCd ?? addressCodes?.sigunguCd,
            areaM2: searchResult?.building?.area ?? 84,
          },
        });
        if (valuationRes.error) throw valuationRes.error;
        const valuationData = unwrapEnvelope<any>(valuationRes.data);
        valuationResult = valuationData.valuationResult as ValuationResult;
        sessionStorage.setItem("valuationResult", JSON.stringify(valuationResult));
      }

      // sourceFacts 생성 - 상세 summary 포함
      const sourceFactMap = new Map<string, PropertySourceFact>();
      for (const src of (searchResult?.sourceFacts ?? [])) {
        if (!src?.id || !src?.url) continue;
        sourceFactMap.set(src.id, {
          id: src.id,
          title: src.title || src.id,
          url: src.url,
          summary: src.summary || src.title || src.id,
        });
      }

      // 네이버 뉴스(근거) sourceFacts 추가: digest 1개 + 기사 3~5개
      const newsQueryBase = [addressCodes?.sigungu, addressCodes?.bname].filter(Boolean).join(" ").trim() || subject;
      const newsQuery = `${newsQueryBase} 부동산 개발 호재`.trim();
      const naverNewsFacts = buildNaverNewsSourceFacts({
        items: (searchResult?.naverSearch ?? []) as any,
        query: newsQuery,
        collectedAt: searchResult?.collectedAt ?? new Date().toISOString(),
        maxItems: 5,
      });
      for (const fact of naverNewsFacts) {
        sourceFactMap.set(fact.id, {
          ...fact,
          summary: fact.summary || fact.title || fact.id,
        });
      }
      
      // 건축물 정보 sourceFact 추가
      const building = searchResult?.building;
      if (building) {
        const buildingSummary = [
          `분석 대상: ${subject}`,
          building.area ? `전용면적: ${building.area.toLocaleString()}㎡` : null,
          building.structure ? `구조: ${building.structure}` : null,
          building.floor ? `층수: ${building.floor}` : null,
          building.builtYear ? `준공년도: ${building.builtYear}` : null,
        ].filter(Boolean).join("\n");
        
        sourceFactMap.set("building_info", {
          id: "building_info",
          title: "건축물대장 정보",
          url: "https://www.data.go.kr/",
          summary: buildingSummary,
        });
      }
      
      // 토지 정보 sourceFact 추가
      const land = searchResult?.land;
      if (land) {
        const landSummary = [
          land.jimok ? `지목: ${land.jimok}` : null,
          land.landArea ? `토지면적: ${land.landArea.toLocaleString()}㎡` : null,
        ].filter(Boolean).join("\n");
        
        if (landSummary) {
          sourceFactMap.set("land_info", {
            id: "land_info",
            title: "토지정보",
            url: "https://www.data.go.kr/",
            summary: landSummary,
          });
        }
      }
      
      // 실거래가 정보 sourceFact 추가
      if (valuationResult) {
        const tradeSummary = [
          valuationResult.recentTradeUnitPrice 
            ? `최근 실거래 단가: ${valuationResult.recentTradeUnitPrice.toLocaleString()}원/㎡` 
            : null,
          valuationResult.publicBasedUnitPrice 
            ? `공시지가 기반 단가: ${valuationResult.publicBasedUnitPrice.toLocaleString()}원/㎡` 
            : null,
          valuationResult.fairUnitPrice 
            ? `적정 단가: ${valuationResult.fairUnitPrice.toLocaleString()}원/㎡` 
            : null,
        ].filter(Boolean).join("\n");
        
        if (tradeSummary) {
          sourceFactMap.set("transaction_info", {
            id: "transaction_info",
            title: "실거래가 및 가치분석",
            url: "https://rt.molit.go.kr/",
            summary: tradeSummary,
          });
        }
      }
      
      // 네이버 부동산 정보 sourceFact 추가
      const naverLand = searchResult?.naverLand;
      const firstComplex = naverLand?.complexes?.[0];
      if (firstComplex) {
        const naverSummary = [
          `네이버 부동산 시세 정보`,
          firstComplex.dealPriceMin && firstComplex.dealPriceMax 
            ? `시세 범위: ${(firstComplex.dealPriceMin / 10000).toFixed(0)}만원 ~ ${(firstComplex.dealPriceMax / 10000).toFixed(0)}만원` 
            : null,
          firstComplex.complexName ? `단지명: ${firstComplex.complexName}` : null,
        ].filter(Boolean).join("\n");
        
        sourceFactMap.set("naver_land_info", {
          id: "naver_land_info",
          title: "네이버 부동산 시세",
          url: firstComplex.sourceUrl || "https://m.land.naver.com/",
          summary: naverSummary,
        });
      }
      
      const sourceFacts: PropertySourceFact[] = Array.from(sourceFactMap.values());
      if (sourceFacts.length === 0) {
        sourceFacts.push({
          id: "manual_subject_input",
          title: "사용자 입력 주소",
          url: "https://example.com/manual-input",
          summary: subject,
        });
      }

      setStepIndex(2);
      setProgress(70);

      // LLM 타임아웃 대비 (60초) - Edge Function 응답 시간 고려
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Timeout")), 60000);
      });

      try {
        console.log("[ReportGeneration] Starting generate-report fetch...", {
          subject,
          valuationKeys: Object.keys(valuationResult || {}),
          sourceFactsCount: sourceFacts?.length || 0,
        });

        // Supabase 클라이언트 대신 직접 fetch 사용 (Auth lock 문제 우회)
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        const fetchPromise = fetch(`${SUPABASE_URL}/functions/v1/generate-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            subject,
            analysisDepth,
            valuation: valuationResult,
            sourceFacts,
            options: { language: "ko", tone: "friendly" },
          }),
        }).then(async (res) => {
          const data = await res.json();
          return { data, error: res.ok ? null : data };
        });

        // @ts-ignore
        const reportRes = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        console.log("[ReportGeneration] fetch response received:", {
          hasError: !!reportRes.error,
          hasData: !!reportRes.data,
        });
        
        clearTimeout(timeoutId!); // 성공 시 해제

        if (reportRes.error) {
          console.error("[ReportGeneration] fetch error:", reportRes.error);
          throw new Error(reportRes.error?.message || "보고서 생성에 실패했습니다.");
        }
        
        console.log("[ReportGeneration] Unwrapping envelope...");
        const draftReport = unwrapEnvelope<ReportDraft>(reportRes.data);
        console.log("[ReportGeneration] Draft report received:", { 
          hasSummary: !!draftReport?.summary,
          hasSections: !!draftReport?.sections,
        });

        // Auth 확인 (타임아웃 적용)
        console.log("[ReportGeneration] Getting user auth...");
        const authPromise = supabase.auth.getUser();
        const authTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Auth timeout")), 5000);
        });
        
        let user;
        try {
          // @ts-ignore
          const { data: authData } = await Promise.race([authPromise, authTimeoutPromise]) as any;
          user = authData?.user;
          console.log("[ReportGeneration] User auth result:", { hasUser: !!user });
        } catch (authErr: any) {
          console.warn("[ReportGeneration] Auth failed, continuing without user:", authErr.message);
          // 로그인하지 않은 경우에도 보고서는 보여주되, DB 저장만 건너뜀
          user = null;
        }

        if (!user) {
          console.warn("[ReportGeneration] No user, skipping DB save. Redirecting to review...");
          // DB 저장 없이 세션 스토리지에만 저장 후 리다이렉트
          sessionStorage.setItem("draftReport", JSON.stringify(draftReport));
          sessionStorage.setItem("valuationResult", JSON.stringify(valuationResult));
          sessionStorage.setItem("sourceFacts", JSON.stringify(sourceFacts));
          setStepIndex(3);
          setProgress(100);
          navigate("/report/review?temp=true");
          return;
        }
  
        setStepIndex(3);
        setProgress(90);
  
        const { data: insertedRows, error: insertError } = await supabase
          .from("reports")
          .insert({
            user_id: user.id,
            title: subject,
            category: "custom",
            report_type: "property",
            status: "completed",
            analysis_depth: analysisDepth,
            source_facts: sourceFacts as any,
            valuation_result: valuationResult as any,
            draft_report: draftReport as any,
            final_report: null,
            adjustment_used: false,
            adjustment_payload: null,
            download_limit: 3,
            downloads_used: 0,
            content: JSON.stringify(draftReport),
            completed_at: new Date().toISOString(),
          })
          .select("id")
          .limit(1);
  
        if (insertError || !insertedRows?.[0]?.id) {
          throw new Error(insertError?.message ?? "리포트 저장에 실패했습니다.");
        }
  
        const reportId = insertedRows[0].id;
        sessionStorage.setItem(
          "generatedReport",
          JSON.stringify({
            reportId,
            title: subject,
            sourceFacts,
            valuationResult,
            draftReport,
          }),
        );
  
        setProgress(100);
        setTimeout(() => navigate(`/report/review?id=${reportId}`), 700);

      } catch (invokeError: any) {
        clearTimeout(timeoutId!);
        // 타임아웃 에러 처리 (AbortError 또는 네트워크 타임아웃)
        if (invokeError.message?.includes('Timeout') || invokeError.name === 'AbortError') {
           throw new Error("보고서 생성 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
        }
        throw invokeError;
      }
    } catch (err: any) {
      const message = err?.message ?? "보고서 생성 중 오류가 발생했습니다.";
      console.error("Report Generation Error:", err);
      setError(message);
      toast({
        title: "보고서 생성 실패",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="container py-20 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">부동산 가치분석 보고서를 생성 중입니다</h1>
          <p className="text-muted-foreground mt-3">
            공공데이터, 검색 API, 네이버 부동산 요약 시세를 기반으로 근거 중심 초안을 만듭니다.
          </p>
          {error && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}
        </div>

        <Progress value={progress} className="h-3 mb-8" />

        <div className="space-y-4">
          {steps.map((step, index) => {
            const active = index === stepIndex;
            const done = index < stepIndex || progress === 100;
            const Icon = done ? CheckCircle2 : active ? Loader2 : index === 0 ? Search : index === 1 ? FileText : Brain;

            return (
              <Card
                key={step.id}
                className={active ? "border-primary" : ""}
              >
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Icon className={`h-5 w-5 ${active ? "animate-spin text-primary" : done ? "text-green-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-semibold">{step.label}</p>
                    <p className="text-sm text-muted-foreground">{step.detail}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
