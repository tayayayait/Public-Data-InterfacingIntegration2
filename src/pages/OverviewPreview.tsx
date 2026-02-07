import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  ExternalLink,
  Info,
  ArrowRight,
  Clock,
  Home,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SourceInfo {
  domain: string;
  url: string;
  collectedAt: string;
}

interface KPIData {
  percentCurrent: string;
  unitPrice: string;
  solutionStatus: string;
  sources: SourceInfo[];
  naverLand?: {
    complexName?: string;
    dealPriceMin?: number;
    dealPriceMax?: number;
    articleCount?: number;
  };
}

export default function OverviewPreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();

  // sessionStorage에서 검색 결과 불러오기
  const [data, setData] = useState<KPIData>({
    percentCurrent: "-",
    unitPrice: "-",
    solutionStatus: "분석 중...",
    sources: [],
  });

  useEffect(() => {
    // sessionStorage에서 검색 결과 데이터 로드
    const searchResultJson = sessionStorage.getItem("searchResult");
    if (searchResultJson) {
      try {
        const searchResult = JSON.parse(searchResultJson);

        // 실제 데이터로 KPI 업데이트
        const valuationResult = searchResult.valuationResult;
        const transaction = searchResult.transaction;
        const building = searchResult.building;
        const naverLand = searchResult.naverLand;

        // 실거래가가 있으면 억원 단위로 표시, 없으면 단가(만원/㎡) 표시
        let unitPrice = "-";
        if (transaction?.amount) {
          // 실거래가 억원 단위 (예: 22.3억)
          const amountInEok = transaction.amount / 100000000;
          unitPrice =
            amountInEok >= 1
              ? `${amountInEok.toFixed(1)}억`
              : `${Math.round(transaction.amount / 10000).toLocaleString()}만`;
        } else if (valuationResult?.fairUnitPrice) {
          // 적정 단가 만원/㎡ 단위
          unitPrice = `${Math.round(valuationResult.fairUnitPrice / 10000).toLocaleString()}만/㎡`;
        }

        const percentCurrent = valuationResult?.currentPercent
          ? valuationResult.currentPercent.toString()
          : "-";

        setData({
          percentCurrent,
          unitPrice,
          solutionStatus: valuationResult?.currentPercent
            ? "분석 완료"
            : "분석 가능",
          sources: [
            {
              domain: "공공데이터포털",
              url: "https://www.data.go.kr/data/15126468/openapi.do",
              collectedAt: new Date().toISOString(),
            },
            {
              domain: "브이월드",
              url: "https://www.vworld.kr/dtna/dtna_apiSvcFc_s001.do?apiNum=25",
              collectedAt: new Date().toISOString(),
            },
            {
              domain: "네이버 부동산",
              url: "https://land.naver.com/",
              collectedAt: new Date().toISOString(),
            },
          ],
          naverLand: naverLand?.complexes?.[0]
            ? {
                complexName: naverLand.complexes[0].complexName,
                dealPriceMin: naverLand.complexes[0].dealPriceMin,
                dealPriceMax: naverLand.complexes[0].dealPriceMax,
                articleCount: naverLand.articles?.length || 0,
              }
            : undefined,
        });
      } catch (e) {
        console.error("Failed to parse search result:", e);
      }
    }
  }, []);

  const [showSourceModal, setShowSourceModal] = useState(false);

  const handlePrimaryAction = () => {
    if (!user) {
      // 비회원 → 로그인 페이지로 리다이렉트
      navigate("/login", { state: { from: location.pathname } });
    } else {
      // 회원 → 정보 입력 생략하고 바로 보고서 생성으로 이동
      navigate("/report/progress");
    }
  };

  const kpiCards = [
    {
      title: "현재 백분율",
      value: `${data.percentCurrent}%`,
      description: "시장 내 위치 지표",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "단가",
      value: `₩${data.unitPrice}`,
      description: "기준 단위당 가격",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "솔루션 사용 여부",
      value: data.solutionStatus,
      description: "진행 상태",
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  // 인증 로딩은 CTA 버튼 텍스트에만 영향을 주므로 전체 UI 로딩 대기 불필요
  // isLoading 상태에서도 UI를 표시하고, 버튼만 동적으로 업데이트

  return (
    <Layout>
      <div className="container py-8 max-w-5xl px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">분석 결과 개요</h1>
          <p className="text-muted-foreground text-lg">
            공공데이터와 웹 공개정보를 기반으로 분석한 결과입니다.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {kpiCards.map((card, index) => (
            <Card
              key={index}
              className="relative overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <div
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${card.bgColor} mb-2`}
                >
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <CardTitle className="text-base font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{card.value}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Source Info */}
        <div className="mb-8">
          <Dialog open={showSourceModal} onOpenChange={setShowSourceModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                출처 보기
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  데이터 출처
                </DialogTitle>
                <DialogDescription>
                  분석에 사용된 데이터의 출처와 수집 시점입니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {data.sources.map((source, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{source.domain}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {source.url}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {source.collectedAt}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Trust Copy */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-blue-800">
          <p className="text-sm flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />이 분석 결과는
            공공데이터와 웹 공개정보를 기반으로 작성되었습니다. 최종 확정 전
            내용을 검토해 주세요.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="w-full sm:w-auto text-lg px-8 h-14 rounded-xl shadow-lg shadow-primary/20"
            onClick={handlePrimaryAction}
          >
            {user ? "보고서 만들기" : "로그인 후 보고서 만들기"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          {!user && (
            <p className="text-sm text-muted-foreground text-center">
              다운로드 횟수 제한(최대 3회)과 1회 조정 기능을 위해 로그인해
              주세요.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
