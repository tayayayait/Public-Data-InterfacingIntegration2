import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Check, Download, Info, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { splitHighlights } from "@/lib/highlight";
import { decodeHtml } from "@/lib/utils";
import type { ReportDraft, ValuationResult } from "@/types";
import { MarketInsightSection } from "@/components/report/MarketInsightSection";
import { RichTextView } from "@/components/shared/RichTextView";

export interface ReportRow {
  id: string;
  title: string;
  draft_report: ReportDraft | null;
  final_report: ReportDraft | null;
  valuation_result: ValuationResult | null;
  adjustment_used: boolean;
  adjustment_payload: Record<string, unknown> | null;
  confirmed_at: string | null;
  download_limit: number;
  downloads_used: number;
  user_id: string;
}


export default function ReportReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // State definitions
  const [report, setReport] = useState<ReportRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [percentCurrent, setPercentCurrent] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [totalPriceInput, setTotalPriceInput] = useState("");

  const reportId = useMemo(() => {
    const fromQuery = searchParams.get("id");
    if (fromQuery) return fromQuery;
    const generated = sessionStorage.getItem("generatedReport");
    if (!generated) return null;
    try {
      const parsed = JSON.parse(generated) as { reportId?: string };
      return parsed.reportId ?? null;
    } catch {
      return null;
    }
  }, [searchParams]);

  useEffect(() => {
    void loadReport();
  }, [reportId, user?.id]);

  const loadReport = async () => {
    const isTemp = searchParams.get("temp") === "true";
    
    // 임시 보고서 모드 (세션 스토리지에서 불러오기)
    if (isTemp) {
      try {
        const draftReportStr = sessionStorage.getItem("draftReport");
        const valuationResultStr = sessionStorage.getItem("valuationResult");
        const sourceFactsStr = sessionStorage.getItem("sourceFacts");
        
        if (draftReportStr) {
          const draftReport = JSON.parse(draftReportStr) as ReportDraft;
          const valuationResult = valuationResultStr ? JSON.parse(valuationResultStr) as ValuationResult : null;
          
          // 임시 ReportRow 객체 생성
          const tempReport: ReportRow = {
            id: "temp-" + Date.now(),
            title: sessionStorage.getItem("subject") || "임시 보고서",
            draft_report: draftReport,
            final_report: null,
            valuation_result: valuationResult,
            adjustment_used: false,
            adjustment_payload: null,
            confirmed_at: null,
            download_limit: 0,
            downloads_used: 0,
            user_id: "temp",
          };
          
          setReport(tempReport);
          
          if (valuationResult) {
            setPercentCurrent(String(valuationResult.currentPercent ?? ""));
            const area = valuationResult.areaM2 || 84;
            const totalAmt = (valuationResult.fairUnitPrice ?? 0) * area;
            const totalEok = (totalAmt / 100000000).toFixed(1);
            setTotalPriceInput(totalEok);
            setUnitPrice(String(valuationResult.fairUnitPrice ?? ""));
          }
          
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Failed to load temp report from sessionStorage:", err);
      }
    }

    if (!user || !reportId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select(
        "id,title,draft_report,final_report,valuation_result,adjustment_used,adjustment_payload,confirmed_at,download_limit,downloads_used,user_id",
      )
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      toast({
        title: "리포트를 찾을 수 없습니다.",
        description: error?.message ?? "다시 생성해 주세요.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const row = data as unknown as ReportRow;
    setReport(row);
    const valuation = row.valuation_result;
    
    // 초기값 설정
    if (valuation) {
      setPercentCurrent(String(valuation.currentPercent ?? ""));
      // 단가 대신 총액(억 단위)으로 초기화
      const area = valuation.areaM2 || 84; 
      const totalAmt = (valuation.fairUnitPrice ?? 0) * area;
      const totalEok = (totalAmt / 100000000).toFixed(1); // 억 단위 반올림
      setTotalPriceInput(totalEok);
      setUnitPrice(String(valuation.fairUnitPrice ?? ""));
    }
    setIsLoading(false);
  };

  const canAdjust = !!report && !report.adjustment_used;
  const canConfirm = !!report && !!report.draft_report && !report.confirmed_at;

  const handleTotalPriceChange = (val: string) => {
    setTotalPriceInput(val);
    const parsedTotal = parseFloat(val); // 억 단위
    
    if (!Number.isNaN(parsedTotal) && report?.valuation_result?.areaM2) {
      // 억 단위 -> 원 단위 변환 후 단가 계산
      const totalWon = parsedTotal * 100000000;
      const newUnitPrice = Math.round(totalWon / report.valuation_result.areaM2);
      setUnitPrice(String(newUnitPrice));
    }
  };

  const handleSaveAdjustment = async () => {
    if (!report || !user) return;
    if (!canAdjust) {
      toast({
        title: "수정 불가",
        description: "수치는 1회만 수정할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    const parsedPercent = Number(percentCurrent);
    const parsedUnit = Number(unitPrice);
    if (!Number.isFinite(parsedPercent) || !Number.isFinite(parsedUnit) || parsedUnit <= 0) {
      toast({
        title: "입력값 오류",
        description: "백분율/단가를 숫자로 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const nextValuation: ValuationResult = {
      ...(report.valuation_result as ValuationResult),
      currentPercent: Number(parsedPercent.toFixed(1)),
      fairUnitPrice: Math.round(parsedUnit),
    };

    const adjustmentPayload = {
      percentCurrent: nextValuation.currentPercent,
      unitPrice: nextValuation.fairUnitPrice,
      adjustedAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("reports")
      .update({
        valuation_result: nextValuation as any,
        adjustment_used: true,
        adjustment_payload: adjustmentPayload as any,
      })
      .eq("id", report.id)
      .eq("user_id", user.id)
      .eq("adjustment_used", false);

    if (updateError) {
      toast({
        title: "수정 저장 실패",
        description: updateError.message,
        variant: "destructive",
      });
      return;
    }

    await supabase.from("report_adjustments").insert({
      report_id: report.id,
      user_id: user.id,
      changed_fields: adjustmentPayload as any,
    });

    setReport({
      ...report,
      valuation_result: nextValuation,
      adjustment_used: true,
      adjustment_payload: adjustmentPayload,
    });
    setIsEditing(false);

    toast({
      title: "수정 저장 완료",
      description: "해당 리포트는 추가 수정이 불가합니다.",
    });
  };

  const handleConfirm = async () => {
    if (!report || !user || !canConfirm) return;

    const finalReport = report.draft_report;
    const { error } = await supabase
      .from("reports")
      .update({
        final_report: finalReport as any,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", report.id)
      .eq("user_id", user.id)
      .is("confirmed_at", null);

    if (error) {
      toast({
        title: "확정 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    navigate(`/report/${report.id}/download`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center text-muted-foreground">로딩 중...</div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">리포트를 불러오지 못했습니다.</p>
          <Button className="mt-4" onClick={() => navigate("/")}>홈으로 이동</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">보고서 확인 및 확정</h1>
        <p className="text-muted-foreground mb-6">
          수치 수정은 1회만 가능합니다. 확정 후 다운로드 횟수가 차감됩니다.
        </p>

        <Alert className="mb-6 border-blue-200 bg-blue-50 text-blue-800">
          <Info className="h-4 w-4" />
          <AlertTitle>정책</AlertTitle>
          <AlertDescription>
            수정 1회, 다운로드 {report.download_limit}회 제한이 적용됩니다.
          </AlertDescription>
        </Alert>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>AI 분석 결과 조정</CardTitle>
              <p className="text-sm text-muted-foreground">AI가 산출한 적정 가치가 다르다고 생각되시면 조정해주세요.</p>
            </div>
            {!report.adjustment_used && (
              <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={() => setIsEditing((v) => !v)}>
                {isEditing ? <Check className="h-4 w-4 mr-1" /> : <Pencil className="h-4 w-4 mr-1" />}
                {isEditing ? "편집 종료" : "수정하기"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="totalPrice" className="text-base font-semibold text-blue-700">
                적정 가치 (총액)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="totalPrice"
                  disabled={!isEditing || report.adjustment_used}
                  value={totalPriceInput}
                  onChange={(e) => handleTotalPriceChange(e.target.value)}
                  className="text-lg font-bold text-right"
                  type="number"
                  step="0.1"
                />
                <span className="font-bold text-lg whitespace-nowrap">억원</span>
              </div>
              <p className="text-xs text-muted-foreground text-right">
                * 전용면적 {report.valuation_result?.areaM2?.toLocaleString()}㎡ 기준
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentCurrent" className="text-base">현재 백분율 (저평가 지수)</Label>
               <div className="flex items-center gap-2">
                <Input
                  id="percentCurrent"
                  disabled={!isEditing || report.adjustment_used}
                  value={percentCurrent}
                  onChange={(e) => setPercentCurrent(e.target.value)}
                  className="text-right"
                />
                <span className="whitespace-nowrap">%</span>
              </div>
              <p className="text-xs text-muted-foreground text-right">
                * 100% 미만이면 적정가보다 저렴함
              </p>
            </div>
            
            {/* 히든/Readonly 단가 필드 (디버깅용 또는 참고용) */}
            <div className="sm:col-span-2 pt-2 border-t flex justify-between items-center text-sm text-muted-foreground">
               <span>변환된 단가: <strong>{Number(unitPrice).toLocaleString()}</strong> 원/㎡</span>
               <span>(총액 입력 시 자동 계산)</span>
            </div>

            {isEditing && canAdjust && (
              <div className="sm:col-span-2">
                <Button onClick={handleSaveAdjustment}>수정값 저장 (1회)</Button>
              </div>
            )}
            {report.adjustment_used && (
              <div className="sm:col-span-2 flex items-center gap-2 text-amber-700 text-sm">
                <AlertTriangle className="h-4 w-4" />
                수정 1회를 이미 사용했습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 초안 요약 (항상 표시) */}
        {report.draft_report?.summary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>초안 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                <RichTextView text={report.draft_report.summary} />
              </p>
            </CardContent>
          </Card>
        )}

        {/* Market Insight (있으면 표시) */}
        {report.draft_report?.marketInsight && (
          <MarketInsightSection insight={report.draft_report.marketInsight} />
        )}

        {/* keyNumbers 카드 */}
        {report.draft_report?.keyNumbers && report.draft_report.keyNumbers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>핵심 지표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.draft_report.keyNumbers.map((kn, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-muted-foreground">{kn.label}</p>
                    <p className="text-xl font-bold text-blue-700">
                      {kn.value !== null ? kn.value.toLocaleString("ko-KR") : "-"} <span className="text-sm font-normal">{kn.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 상세 섹션 */}
        {report.draft_report?.sections && report.draft_report.sections.length > 0 && (
          <div className="space-y-4 mb-6">
            {report.draft_report.sections.map((section, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    <RichTextView text={section.content} />
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 출처 목록 */}
        {report.draft_report?.citations && report.draft_report.citations.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">출처</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {report.draft_report.citations.map((cite, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-muted-foreground">[{idx + 1}]</span>
                    <a 
                      href={cite.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline truncate"
                    >
                      {cite.title}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button size="lg" disabled={!canConfirm} onClick={handleConfirm}>
            확정하고 다운로드로 이동
            <Download className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
