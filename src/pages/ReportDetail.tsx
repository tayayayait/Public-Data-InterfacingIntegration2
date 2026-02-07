import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CATEGORY_LABELS, PRICING_TIERS, ReportCategory } from '@/types';
import { 
  ArrowLeft, 
  Calendar, 
  Tag, 
  FileText, 
  BarChart3, 
  Lightbulb,
  Download,
  ShoppingCart,
  Eye,
  Share2,
  Bookmark
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 목업 보고서 상세 데이터
const mockReport = {
  id: '1',
  title: '2024 글로벌 반도체 시장 동향 및 전망 분석 보고서',
  description: 'AI, 자동차, IoT 등 주요 수요 산업별 반도체 시장 규모와 성장률을 분석하고, 삼성전자, TSMC, 인텔 등 주요 기업의 경쟁력을 비교합니다. 본 보고서는 2024년 반도체 시장의 주요 트렌드와 향후 전망을 종합적으로 다룹니다.',
  category: 'industry' as ReportCategory,
  keywords: ['반도체', 'AI칩', 'TSMC', '삼성전자', 'HBM', '파운드리'],
  price: 59000,
  created_at: '2024-01-15T00:00:00Z',
  preview: {
    summary: `
      2024년 글로벌 반도체 시장은 AI 반도체 수요 급증으로 전년 대비 20% 이상 성장할 것으로 전망됩니다. 
      특히 HBM(High Bandwidth Memory)과 AI 가속기 시장이 폭발적으로 성장하며 시장 구조를 재편하고 있습니다.
      
      주요 하이라이트:
      • 글로벌 반도체 시장 규모: 2024년 약 6,500억 달러 전망
      • AI 반도체 시장 성장률: 전년 대비 45% 성장 예상
      • 메모리 반도체 회복세: HBM 수요 증가로 삼성, SK하이닉스 실적 개선
      • 파운드리 경쟁 심화: TSMC의 독주 속 삼성전자의 추격
    `,
    tableOfContents: [
      '1. Executive Summary',
      '2. 글로벌 반도체 시장 개요',
      '3. AI 반도체 시장 분석',
      '4. 메모리 반도체 동향',
      '5. 파운드리 경쟁 구도',
      '6. 주요 기업 분석',
      '7. 지역별 시장 분석',
      '8. 2024년 전망 및 투자 기회',
    ],
    keyInsights: [
      'AI 칩 수요 급증으로 NVIDIA 시가총액 급등, 경쟁사 추격 시작',
      'HBM3E 양산 경쟁에서 SK하이닉스가 선두, 삼성전자 추격 중',
      '미중 반도체 갈등 심화로 공급망 재편 가속화',
      '차량용 반도체 부족 완화, 전기차 성장과 함께 수요 지속',
    ],
  },
};

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState(PRICING_TIERS[1]); // 표준 기본 선택

  const handlePurchase = () => {
    navigate(`/report/${id}/payment`, {
      state: {
        report: mockReport,
        tier: selectedTier,
      },
    });
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {CATEGORY_LABELS[mockReport.category]}
                </Badge>
                <span className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-1 h-4 w-4" />
                  {format(new Date(mockReport.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-4">{mockReport.title}</h1>
              <p className="text-muted-foreground leading-relaxed">
                {mockReport.description}
              </p>
              
              {/* Keywords */}
              <div className="flex flex-wrap gap-2 mt-4">
                {mockReport.keywords.map((keyword) => (
                  <Badge key={keyword} variant="outline">
                    <Tag className="mr-1 h-3 w-3" />
                    {keyword}
                  </Badge>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6">
                <Button variant="outline" size="sm">
                  <Share2 className="mr-2 h-4 w-4" />
                  공유
                </Button>
                <Button variant="outline" size="sm">
                  <Bookmark className="mr-2 h-4 w-4" />
                  저장
                </Button>
              </div>
            </div>

            {/* Preview Tabs */}
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">
                  <FileText className="mr-2 h-4 w-4" />
                  요약
                </TabsTrigger>
                <TabsTrigger value="contents">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  목차
                </TabsTrigger>
                <TabsTrigger value="insights">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  인사이트
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      보고서 요약 (미리보기)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="whitespace-pre-line text-muted-foreground">
                        {mockReport.preview.summary}
                      </p>
                    </div>
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-dashed">
                      <p className="text-sm text-muted-foreground text-center">
                        전체 내용은 구매 후 확인하실 수 있습니다
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="contents" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>목차</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {mockReport.preview.tableOfContents.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-3 py-2 border-b last:border-0"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                            {index + 1}
                          </span>
                          <span>{item.replace(/^\d+\.\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="insights" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      핵심 인사이트
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {mockReport.preview.keyInsights.map((insight, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-muted-foreground">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Pricing */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>분석 등급 선택</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {PRICING_TIERS.map((tier) => (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      className={`relative cursor-pointer rounded-lg border p-4 transition-all ${
                        selectedTier.id === tier.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      {tier.recommended && (
                        <Badge className="absolute -top-2 right-2 gradient-primary text-xs">
                          추천
                        </Badge>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{tier.name}</span>
                        <span className="text-lg font-bold text-primary">
                          {tier.price.toLocaleString()}원
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {tier.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-1">
                            <span className="text-primary">✓</span> {feature}
                          </li>
                        ))}
                        {tier.features.length > 3 && (
                          <li className="text-xs text-muted-foreground">
                            +{tier.features.length - 3}개 더...
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}

                  <Button
                    onClick={handlePurchase}
                    className="w-full gradient-primary"
                    size="lg"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {selectedTier.price.toLocaleString()}원 결제하기
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    결제 후 즉시 다운로드 가능합니다
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
