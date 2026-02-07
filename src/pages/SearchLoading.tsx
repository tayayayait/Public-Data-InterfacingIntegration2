import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildNaverNewsSourceFacts } from "@/lib/sourceFacts";
import type { PropertySearchResult, PropertySourceFact } from "@/types";

// Guard long-running network calls to avoid a forever-loading UI.

interface LoadingStep {
  id: number;
  label: string;
}

const steps: LoadingStep[] = [
  { id: 1, label: "공공데이터 조회" },
  { id: 2, label: "네이버 검색/시세 조회" },
  { id: 3, label: "분석 데이터 정리" },
  { id: 4, label: "결과 준비 완료" },
];

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function unwrapEnvelope<T>(raw: unknown): T {
  const envelope = raw as Envelope<T>;
  if (!envelope?.success || envelope.data === undefined) {
    throw new Error(envelope?.error?.message ?? "서버 응답 형식이 올바르지 않습니다.");
  }
  return envelope.data;
}

export default function SearchLoading() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const query = searchParams.get("q") || "";

  useEffect(() => {
    const fetchData = async () => {
      setIsRunning(true);
      try {
        const addressCodesJson = sessionStorage.getItem("addressCodes");
        const addressCodes = addressCodesJson ? JSON.parse(addressCodesJson) : null;
        const subject = addressCodes?.fullAddress || query;
        if (!subject || String(subject).trim().length < 2) {
          throw new Error("주소(또는 검색어)를 2자 이상 입력해주세요.");
        }

        const newsQueryBase = [addressCodes?.sigungu, addressCodes?.bname].filter(Boolean).join(" ").trim() || subject;
        const newsQuery = `${newsQueryBase} 부동산 개발 호재`.trim();

        // supabase.functions.invoke() has no built-in timeout; guard against a forever-pending request.
        const step1TimeoutMs = 90_000;
        const step2TimeoutMs = 90_000;
        const step3TimeoutMs = 30_000;
        const step4TimeoutMs = 60_000;

        setActiveStep(0);
        setProgress(10);
        setError(null);

        console.log("[SearchLoading] Step 1: fetch property data", { address: subject, addressCodes });
        const propertyRes = await withTimeout(
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-property`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: subject,
              sigunguCd: addressCodes?.sigunguCd,
              bjdongCd: addressCodes?.bjdongCd,
              bun: addressCodes?.bun,
              ji: addressCodes?.ji,
            }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(`search-property failed: ${res.status}`);
            return { data: await res.json(), error: null };
          }),
          step1TimeoutMs,
          "공공데이터 조회(1단계)가 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
        );
        if (propertyRes.error) {
            console.error("[SearchLoading] Step 1 failed:", propertyRes.error);
            throw propertyRes.error;
        }
        const propertyData = unwrapEnvelope<any>(propertyRes.data);
        console.log("[SearchLoading] Step 1 success:", propertyData);

        setProgress(25);

        console.log("[SearchLoading] Step 2: calculate valuation");
        const valuationRes = await withTimeout(
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-valuation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: subject,
              lawdCd: addressCodes?.lawdCd || addressCodes?.sigunguCode,
              areaM2: propertyData?.building?.area ?? 84,
              representativeArea: propertyData?.building?.representativeArea,
              lat: addressCodes?.lat,
              lng: addressCodes?.lng,
              pnu: addressCodes?.pnu,
            }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(`calculate-valuation failed: ${res.status}`);
            return { data: await res.json(), error: null };
          }),
          step2TimeoutMs,
          "시세/가치 계산(2단계)이 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
        );
        if (valuationRes.error) {
            console.error("[SearchLoading] Step 2 failed:", valuationRes.error);
            throw valuationRes.error;
        }
        const valuationData = unwrapEnvelope<any>(valuationRes.data);
        console.log("[SearchLoading] Step 2 success:", valuationData);
        setActiveStep(1);
        setProgress(45);

        let naverSearchData: any = { items: [] };

        try {
          console.log("[SearchLoading] Step 3: search naver");
        const naverSearchRes = await withTimeout(
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-naver`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: newsQuery, display: 5, sort: "date", target: "news" }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(`search-naver failed: ${res.status}`);
            return { data: await res.json(), error: null };
          }),
          step3TimeoutMs,
          "네이버 검색(3-1단계)이 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
        );
        if (naverSearchRes.error) {
             console.error("[SearchLoading] Step 3 (search-naver) failed:", naverSearchRes.error);
             throw naverSearchRes.error;
        }
        naverSearchData = unwrapEnvelope<any>(naverSearchRes.data);
        console.log("[SearchLoading] Step 3 (search-naver) success:", naverSearchData);
        } catch (e) {
          console.warn("[SearchLoading] Step 3 (search-naver) skipped:", e);
          naverSearchData = { items: [] };
        }

        let naverLandData: any = null;

        try {
          console.log("[SearchLoading] Step 3: crawl naver land");
        const naverLandRes = await withTimeout(
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crawl-naver-land`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: subject,
              lat: addressCodes?.lat,
              lng: addressCodes?.lng,
              cortarNo: addressCodes?.bcode,
            }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(`crawl-naver-land failed: ${res.status}`);
            return { data: await res.json(), error: null };
          }),
          step4TimeoutMs,
          "네이버 부동산 조회(3-2단계)가 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
        );
        if (naverLandRes.error) {
             console.error("[SearchLoading] Step 3 (crawl-naver-land) failed:", naverLandRes.error);
             throw naverLandRes.error;
        }
        naverLandData = unwrapEnvelope<any>(naverLandRes.data);
        console.log("[SearchLoading] Step 3 (crawl-naver-land) success:", naverLandData);
        } catch (e) {
          console.warn("[SearchLoading] Step 3 (crawl-naver-land) skipped:", e);
          naverLandData = null;
        }

        setActiveStep(2);
        setProgress(75);

        const collectedAt = new Date().toISOString();
        const naverNewsFacts: PropertySourceFact[] = buildNaverNewsSourceFacts({
          items: naverSearchData?.items ?? [],
          query: newsQuery,
          collectedAt,
          maxItems: 5,
        });

        const searchResult: PropertySearchResult & {
          transaction?: any;
          publicLandPrice?: any;
          valuationResult?: any;
        } = {
          building: propertyData?.building,
          land: propertyData?.land,
          naverSearch: naverSearchData?.items ?? [],
          naverLand: naverLandData,
          transaction: valuationData?.transaction,
          publicLandPrice: valuationData?.publicLandPrice,
          valuationResult: valuationData?.valuationResult,
          sourceFacts: [
            ...(propertyData?.sourceFacts ?? []),
            ...(valuationData?.sourceFacts ?? []),
            ...(naverSearchData?.source
              ? [{
                  id: naverSearchData.source.id ?? "naver_news_search",
                  title: "네이버 뉴스 API",
                  url: naverSearchData.source.url ?? "https://openapi.naver.com/",
                }]
              : []),
            ...naverNewsFacts,
            ...(naverLandData?.source
              ? [{
                  id: naverLandData.source.id ?? "naver_land_summary",
                  title: "네이버 부동산 요약 시세",
                  url: naverLandData.source.url ?? "https://m.land.naver.com/",
                }]
              : []),
          ],
          query: subject,
          collectedAt,
        };

        sessionStorage.setItem("searchResult", JSON.stringify(searchResult));
        if (valuationData?.valuationResult) {
          sessionStorage.setItem("valuationResult", JSON.stringify(valuationData.valuationResult));
        }

        console.log("[SearchLoading] All steps completed. Navigating to overview.");
        setActiveStep(3);
        setProgress(100);
        setTimeout(() => navigate("/overview"), 500);
      } catch (err: any) {
        console.error("[SearchLoading] Global Error Catch:", err);
        const message = err?.message || "데이터 수집 중 오류가 발생했습니다.";
        setError(message);
      } finally {
        setIsRunning(false);
      }
    };

    void fetchData();
  }, [navigate, query, runId]);

  const getStepState = (index: number) => {
    if (index < activeStep) return "done";
    if (index === activeStep) return "active";
    return "pending";
  };

  return (
    <Layout>
      <div className="container max-w-2xl py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-3">데이터를 수집하고 있습니다</h2>
          <p className="text-muted-foreground">보통 30~60초 내에 완료됩니다.</p>
          {error && (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button type="button" onClick={() => setRunId((v) => v + 1)} disabled={isRunning}>
                  다시 시도
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")} disabled={isRunning}>
                  처음으로
                </Button>
              </div>
            </div>
          )}
        </div>

        <Progress value={progress} className="h-2 mb-8" />

        <div className="space-y-5">
          {steps.map((step, index) => {
            const state = getStepState(index);
            return (
              <div key={step.id} className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    state === "done"
                      ? "bg-primary border-primary text-white"
                      : state === "active"
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {state === "done" ? (
                    <span>✓</span>
                  ) : state === "active" && isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-xs">{step.id}</span>
                  )}
                </div>
                <span className={state === "pending" ? "text-muted-foreground" : "font-medium"}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
