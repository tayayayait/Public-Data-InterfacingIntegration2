import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Download, ArrowLeft, FileText, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { ReportDraft } from "@/types";
import { splitHighlights } from "@/lib/highlight";

interface DownloadReportRow {
  id: string;
  title: string;
  final_report: ReportDraft | null;
  confirmed_at: string | null;
  download_limit: number;
  downloads_used: number;
  user_id: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toHtmlWithHighlights(value: string): string {
  const parts = splitHighlights(value || "");
  return parts
    .map((part) => {
      const escaped = escapeHtml(part.text).replace(/\n/g, "<br />");
      return part.highlighted ? `<mark class="hl">${escaped}</mark>` : escaped;
    })
    .join("");
}

function toDateTag(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function buildPrintableHtml(title: string, report: ReportDraft): string {
  const sections = report.sections
    .map((section) => `
      <section class="section">
        <h2>${escapeHtml(section.title)}</h2>
        <p>${toHtmlWithHighlights(section.content)}</p>
      </section>
    `)
    .join("");

  const keyNumbers = report.keyNumbers
    .map((item) => `
      <li>${escapeHtml(item.label)}: ${item.value ?? "N/A"} ${escapeHtml(item.unit)}</li>
    `)
    .join("");

  const cautions = report.cautions
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const citations = report.citations
    .map((item) => `<li>[${escapeHtml(item.id)}] ${escapeHtml(item.title)} - ${escapeHtml(item.url)}</li>`)
    .join("");

  const marketInsight = report.marketInsight;
  const marketInsightBlock = marketInsight ? `
    <div class="mi">
      <div class="mi-header">
        <div>
          <div class="mi-title">시장 동향 및 입지 리포트 (Market Insight)</div>
          ${marketInsight.keywordContext ? `<div class="mi-sub">${toHtmlWithHighlights(marketInsight.keywordContext)}</div>` : ""}
        </div>
        <div class="mi-keywords">
          ${marketInsight.keywords.map((k) => `<span>${escapeHtml(k)}</span>`).join("")}
        </div>
      </div>
      <div class="mi-body">
        <div class="mi-card">
          <div class="mi-card-title">① 가격 급등의 배경과 실거래 추이</div>
          <p>${toHtmlWithHighlights(marketInsight.expertOpinion.priceBackground)}</p>
        </div>
        <div class="mi-card">
          <div class="mi-card-title">② 공시지가와의 괴리율 및 위험 요인</div>
          <p>${toHtmlWithHighlights(marketInsight.expertOpinion.riskFactors)}</p>
        </div>
        <div class="mi-card">
          <div class="mi-card-title">③ 향후 전망 및 투자 전략</div>
          <p>${toHtmlWithHighlights(marketInsight.expertOpinion.outlook)}</p>
        </div>

        <div class="mi-section">
          <div class="mi-card-title">입지 장단점 (SWOT)</div>
          <div class="swot">
            <div>
              <div class="swot-title">강점 (Strength)</div>
              <div class="swot-body">${toHtmlWithHighlights(marketInsight.swot.strength)}</div>
            </div>
            <div>
              <div class="swot-title">약점 (Weakness)</div>
              <div class="swot-body">${toHtmlWithHighlights(marketInsight.swot.weakness)}</div>
            </div>
            <div>
              <div class="swot-title">기회 (Opportunity)</div>
              <div class="swot-body">${toHtmlWithHighlights(marketInsight.swot.opportunity)}</div>
            </div>
            <div>
              <div class="swot-title">위협 (Threat)</div>
              <div class="swot-body">${toHtmlWithHighlights(marketInsight.swot.threat)}</div>
            </div>
          </div>
        </div>

        ${marketInsight.news && marketInsight.news.length > 0 ? `
          <div class="mi-section">
            <div class="mi-card-title">최근 뉴스(근거)</div>
            <ul class="mi-news">
              ${marketInsight.news.slice(0, 5).map((n) => `
                <li>
                  <a href="${escapeHtml(n.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(n.title)}</a>
                  ${n.publishedAt ? `<div class="mi-news-date">${escapeHtml(n.publishedAt)}</div>` : ""}
                </li>
              `).join("")}
            </ul>
          </div>
        ` : ""}
      </div>
    </div>
  ` : "";

  return `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}_${toDateTag()}.pdf</title>
    <style>
      body { font-family: "Malgun Gothic", sans-serif; max-width: 900px; margin: 0 auto; padding: 36px; color: #111827; }
      h1 { font-size: 28px; margin-bottom: 8px; }
      h2 { font-size: 20px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
      .meta { color: #6b7280; margin-bottom: 24px; }
      .summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 20px; line-height: 1.7; }
      .hl { background: #fef08a; padding: 0 2px; border-radius: 2px; }
      .section { margin-bottom: 24px; page-break-inside: avoid; }
      ul { padding-left: 18px; line-height: 1.6; }
      .block { margin-bottom: 18px; }
      .mi { border: 1px solid #dbeafe; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
      .mi-header { background: #eff6ff; border-bottom: 1px solid #dbeafe; padding: 12px 16px; display: flex; gap: 12px; justify-content: space-between; align-items: flex-start; }
      .mi-title { font-size: 18px; font-weight: 800; color: #1e40af; }
      .mi-sub { margin-top: 6px; color: #1d4ed8; font-size: 13px; line-height: 1.6; }
      .mi-keywords { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
      .mi-keywords span { font-size: 12px; background: #fff; border: 1px solid #bfdbfe; color: #1d4ed8; padding: 3px 8px; border-radius: 999px; }
      .mi-body { padding: 16px; }
      .mi-section { margin-top: 14px; page-break-inside: avoid; }
      .mi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
      .mi-card-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 6px; }
      .mi-card p { margin: 0; color: #374151; line-height: 1.7; }
      .swot { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
      .swot > div { padding: 12px; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
      .swot > div:nth-child(2n) { border-right: 0; }
      .swot > div:nth-last-child(-n+2) { border-bottom: 0; }
      .swot-title { font-size: 12px; font-weight: 800; margin-bottom: 6px; }
      .swot-body { color: #374151; line-height: 1.6; }
      .mi-news { margin: 0; padding-left: 18px; }
      .mi-news li { margin-bottom: 10px; }
      .mi-news a { color: #1d4ed8; text-decoration: none; font-weight: 700; }
      .mi-news a:hover { text-decoration: underline; }
      .mi-news-date { font-size: 12px; color: #6b7280; margin-top: 4px; }
      @media print {
        body { padding: 10mm; }
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">생성일: ${new Date().toLocaleDateString("ko-KR")}</p>

    <div class="summary">
      ${toHtmlWithHighlights(report.summary)}
    </div>

    ${marketInsightBlock}

    <div class="block">
      <h2>핵심 수치</h2>
      <ul>${keyNumbers}</ul>
    </div>

    ${sections}

    <div class="block">
      <h2>주의 사항</h2>
      <ul>${cautions || "<li>없음</li>"}</ul>
    </div>

    <div class="block">
      <h2>근거 출처</h2>
      <ul>${citations || "<li>없음</li>"}</ul>
    </div>
  </body>
</html>
  `.trim();
}

export default function ReportDownloadPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [report, setReport] = useState<DownloadReportRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    void loadReport();
  }, [id, user?.id]);

  const remainingDownloads = useMemo(() => {
    if (!report) return 0;
    return Math.max(0, report.download_limit - report.downloads_used);
  }, [report]);

  const loadReport = async () => {
    if (!id || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("id,title,final_report,confirmed_at,download_limit,downloads_used,user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      toast({
        title: "리포트를 찾을 수 없습니다.",
        description: error?.message ?? "다시 시도해 주세요.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setReport(data as unknown as DownloadReportRow);
    setIsLoading(false);
  };

  const handleDownload = async () => {
    if (!report || !user) return;
    if (!report.confirmed_at) {
      toast({
        title: "다운로드 불가",
        description: "리포트 확정 후 다운로드할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }
    if (remainingDownloads <= 0) {
      toast({
        title: "다운로드 한도 초과",
        description: "남은 다운로드 횟수가 없습니다.",
        variant: "destructive",
      });
      return;
    }
    if (!report.final_report) {
      toast({
        title: "최종 보고서 없음",
        description: "확정된 보고서 데이터를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const nextDownloadsUsed = report.downloads_used + 1;
      const { error: updateError } = await supabase
        .from("reports")
        .update({ downloads_used: nextDownloadsUsed })
        .eq("id", report.id)
        .eq("user_id", user.id)
        .eq("downloads_used", report.downloads_used);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await supabase.from("download_events").insert({
        report_id: report.id,
        user_id: user.id,
      });

      const html = buildPrintableHtml(report.title, report.final_report);
      const popup = window.open("", "_blank", "width=1000,height=900");
      if (!popup) {
        throw new Error("팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해주세요.");
      }

      const safeTitle = report.title.replace(/[^\w가-힣\s-]/g, "").trim().replace(/\s+/g, "_");
      const filename = `${safeTitle || "보고서"}_${toDateTag()}.pdf`;
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.document.title = filename;
      popup.focus();
      popup.print();

      setReport({
        ...report,
        downloads_used: nextDownloadsUsed,
      });

      toast({
        title: "PDF 인쇄 창을 열었습니다.",
        description: `저장 파일명 권장값: ${filename}`,
      });
    } catch (error: any) {
      toast({
        title: "다운로드 실패",
        description: error?.message ?? "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
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
          <p className="text-muted-foreground">리포트를 찾을 수 없습니다.</p>
          <Button className="mt-4" onClick={() => navigate("/")}>홈으로 이동</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate("/reports")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          내 보고서로 이동
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{report.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={report.confirmed_at ? "default" : "secondary"}>
                {report.confirmed_at ? "확정 완료" : "미확정"}
              </Badge>
              <Badge variant="outline">
                남은 다운로드 {remainingDownloads}회
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              확정된 보고서만 다운로드됩니다. 다운로드 시 횟수가 1회 차감됩니다.
            </p>
            {!report.confirmed_at && (
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <AlertTriangle className="h-4 w-4" />
                먼저 보고서를 확정해 주세요.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="mb-5 text-muted-foreground">
              브라우저 인쇄창에서 "PDF로 저장"을 선택해 다운로드하세요.
            </p>
            <Button
              size="lg"
              onClick={handleDownload}
              disabled={!report.confirmed_at || remainingDownloads <= 0 || isDownloading}
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "처리 중..." : "PDF 다운로드"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
