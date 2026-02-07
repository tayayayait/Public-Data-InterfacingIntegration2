import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Sparkles, BarChart, Zap, ArrowRight } from 'lucide-react';

interface StepOption {
  id: number;
  title: string;
  description: string;
  price: string;
  features: string[];
  recommended?: boolean;
  icon: React.ReactNode;
}

const steps: StepOption[] = [
  {
    id: 1,
    title: 'BASIC (개요 분석)',
    description: '빠르게 핵심 현황만 파악하고 싶을 때 적합합니다.',
    price: '39,000원',
    features: ['기본 기업 정보 요약', '동종 업계 평균 비교', '주요 재무 지표 시각화 (3종)', 'PDF 보고서 (약 5~8p)'],
    icon: <BarChart className="h-6 w-6 text-blue-500" />,
  },
  {
    id: 2,
    title: 'PRO (심층 분석)',
    description: '가장 많이 선택하는 경쟁력 강화 패키지입니다.',
    price: '59,000원',
    features: ['BASIC 모든 기능', '상세 경쟁사 비교 (3개사)', 'AI 기반 SWOT 분석', '시장 트렌드 & 키워드 분석', '개선 전략 제안'],
    recommended: true,
    icon: <Zap className="h-6 w-6 text-yellow-500" />,
  },
  {
    id: 3,
    title: 'PREMIUM (종합 컨설팅)',
    description: '투자 유치나 사업 확장을 위한 전문 보고서입니다.',
    price: '99,000원',
    features: ['PRO 모든 기능', '업계 심층 리포트 데이터 연동', '전문가 코멘트 (AI 페르소나)', '마케팅 전략 시뮬레이션', '수치 조정 기능 (횟수 제한 없음)'],
    icon: <Sparkles className="h-6 w-6 text-purple-500" />,
  },
];

export default function StepSelectionPage() {
  const navigate = useNavigate();
  const [selectedStep, setSelectedStep] = useState<number | null>(2); // Default to recommended

  const handleSelect = (id: number) => {
    setSelectedStep(id);
  };

  const handleNext = () => {
    if (selectedStep) {
      navigate(`/report/progress?tier=${selectedStep}`);
    }
  };

  return (
    <Layout>
      <div className="container py-12 max-w-6xl">
         <div className="flex items-center mb-8">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">분석 단계 선택</h1>
                <p className="text-muted-foreground">필요한 분석 깊이에 따라 단계를 선택해 주세요.</p>
            </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {steps.map((step) => (
            <Card 
              key={step.id} 
              className={`relative flex flex-col cursor-pointer transition-all duration-200 ${
                selectedStep === step.id 
                  ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-105 z-10' 
                  : 'hover:border-primary/50 hover:shadow-md'
              }`}
              onClick={() => handleSelect(step.id)}
            >
              {step.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">추천</Badge>
                </div>
              )}
              <CardHeader>
                <div className="bg-muted w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    {step.icon}
                </div>
                <CardTitle className="text-xl flex justify-between items-center">
                    {step.title}
                </CardTitle>
                <CardDescription className="min-h-[48px] pt-2">
                    {step.description}
                </CardDescription>
                <div className="pt-4 pb-2">
                    <span className="text-3xl font-bold text-foreground">
                        {step.price}
                    </span>
                    <span className="text-muted-foreground ml-1">/ 건</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {step.features.map((feature, i) => (
                    <li key={i} className="flex items-start text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground ">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-6">
                <Button 
                    className={`w-full ${selectedStep === step.id ? 'bg-primary' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    variant={selectedStep === step.id ? 'default' : 'ghost'}
                >
                    {selectedStep === step.id ? '선택됨' : '선택하기'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:hidden">
            <Button size="lg" className="w-full" onClick={handleNext} disabled={!selectedStep}>
                다음 단계로 진행
            </Button>
        </div>
         <div className="hidden md:flex justify-end">
            <Button size="lg" className="text-lg px-8 h-12 rounded-xl" onClick={handleNext} disabled={!selectedStep}>
                이 단계로 진행하기
                 <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </div>
      </div>
    </Layout>
  );
}
