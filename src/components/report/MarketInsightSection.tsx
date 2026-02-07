import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, TrendingUp, Minus, Newspaper } from "lucide-react";
import { splitHighlights } from "@/lib/highlight";
import { decodeHtml } from "@/lib/utils";
import type { MarketInsight } from "@/types";
import { RichTextView } from "@/components/shared/RichTextView";

interface MarketInsightSectionProps {
  insight: MarketInsight;
  fallbackSummary?: string;
}



export function MarketInsightSection({ insight, fallbackSummary }: MarketInsightSectionProps) {
  // 데이터가 없으면 기존 요약 표시
  if (!insight && fallbackSummary) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>초안 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed whitespace-pre-wrap">{fallbackSummary}</p>
        </CardContent>
      </Card>
    );
  }

  if (!insight) return null;

  return (
    <div className="space-y-6 mb-6">
      <Card className="border-blue-100 overflow-hidden">
        <div className="bg-blue-50/50 p-4 border-b border-blue-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
              <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                시장 동향 및 입지 리포트 (Market Insight) 📊
              </h2>
              <p className="text-sm text-blue-600 mt-1">
                실시간 데이터와 AI 분석으로 도출된 핵심 인사이트입니다.
              </p>
              {insight.keywordContext && (
                <p className="text-sm text-blue-800/90 mt-2 leading-relaxed">
                  <RichTextView text={insight.keywordContext} />
                </p>
              )}
             </div>
             <div className="flex flex-wrap gap-2">
                {insight.keywords.map((keyword, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50 border-blue-200 shadow-sm">
                    {keyword}
                  </Badge>
                ))}
             </div>
          </div>
        </div>
        
        <CardContent className="p-6 space-y-8">
          {/* 전문가 진단 의견 */}
          <section>
            <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">🧐</span> AI 전문가 상세 진단 의견
            </h3>
            
            <div className="grid gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                  <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">1</span>
                  가격 급등의 배경과 실거래 추이
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed pl-7">
                  <RichTextView text={insight.expertOpinion.priceBackground} />
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                  <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">2</span>
                  공시지가와의 괴리율 및 위험 요인
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed pl-7">
                  <RichTextView text={insight.expertOpinion.riskFactors} />
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                   <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs">3</span>
                  향후 전망 및 투자 전략
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed pl-7">
                  <RichTextView text={insight.expertOpinion.outlook} />
                </p>
              </div>
            </div>
          </section>

          {/* SWOT 분석 */}
          <section>
             <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">📍</span> 입지 장단점 요약 (50대 맞춤형)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
               {/* 강점 */}
               <div className="bg-white p-4">
                  <div className="flex items-center gap-2 mb-2 text-blue-600 font-semibold text-sm">
                     <CheckCircle2 className="w-4 h-4" /> 강점 (Strength)
                  </div>
                  <p className="text-sm text-gray-600">{insight.swot.strength}</p>
               </div>
               
               {/* 약점 */}
               <div className="bg-white p-4">
                  <div className="flex items-center gap-2 mb-2 text-amber-600 font-semibold text-sm">
                     <Minus className="w-4 h-4" /> 약점 (Weakness)
                  </div>
                  <p className="text-sm text-gray-600">{insight.swot.weakness}</p>
               </div>

               {/* 기회 */}
               <div className="bg-white p-4">
                  <div className="flex items-center gap-2 mb-2 text-green-600 font-semibold text-sm">
                     <TrendingUp className="w-4 h-4" /> 기회 (Opportunity)
                  </div>
                  <p className="text-sm text-gray-600">{insight.swot.opportunity}</p>
               </div>

               {/* 위협 */}
               <div className="bg-white p-4">
                  <div className="flex items-center gap-2 mb-2 text-red-600 font-semibold text-sm">
                     <AlertTriangle className="w-4 h-4" /> 위협 (Threat)
                  </div>
                  <p className="text-sm text-gray-600">{insight.swot.threat}</p>
               </div>
            </div>
          </section>

          {/* 최근 뉴스(근거) */}
          {insight.news && insight.news.length > 0 && (
            <section>
              <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-700" />
                최근 뉴스(근거)
              </h3>
              <div className="space-y-2">
                {insight.news.slice(0, 5).map((item, idx) => (
                  <div key={`${item.url}-${idx}`} className="bg-white border rounded-lg p-3">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-700 hover:underline leading-snug"
                    >
                      {decodeHtml(item.title)}
                    </a>
                    {item.publishedAt && (
                      <p className="text-xs text-muted-foreground mt-1">{item.publishedAt}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
