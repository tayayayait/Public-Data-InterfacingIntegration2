import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SearchX, PenLine, Search, Info, ChevronRight } from 'lucide-react';

export default function NoResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const handleManualInput = () => {
    navigate('/input');
  };

  const handleNewSearch = () => {
    navigate('/');
  };

  return (
    <Layout>
      <div className="container py-12 max-w-2xl px-6">
        {/* Empty State */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
            <SearchX className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-3">검색 결과가 없습니다</h1>
          <p className="text-muted-foreground text-lg">
            {query ? (
              <>
                "<span className="font-medium text-foreground">{query}</span>"에 대한 정보를 찾지 못했습니다.
              </>
            ) : (
              '해당 항목은 데이터베이스에서 찾지 못했습니다.'
            )}
          </p>
        </div>

        {/* Primary Action - Manual Input */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <PenLine className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">수기 입력으로 진행하기</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  검색 결과가 없어도 직접 정보를 입력하여 보고서를 생성할 수 있습니다.
                </p>
                <Button onClick={handleManualInput} className="gap-2">
                  수기 입력 시작
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Action - New Search */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">다른 검색어로 다시 검색</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  검색어를 수정하여 다시 시도해 보세요.
                </p>
                <Button variant="outline" onClick={handleNewSearch} className="gap-2">
                  홈으로 돌아가기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips Accordion */}
        <div className="bg-muted/50 rounded-xl p-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="tips" className="border-none">
              <AccordionTrigger className="hover:no-underline py-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  검색 팁 보기
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium">•</span>
                    <span>상호명은 정확하게 입력해 주세요. (예: "(주)홍길동" → "홍길동")</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium">•</span>
                    <span>소재지번은 행정구역명과 함께 입력해 주세요. (예: "서울 강남구 역삼동 123")</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium">•</span>
                    <span>법인등록번호나 사업자등록번호로도 검색 가능합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium">•</span>
                    <span>영문, 특수문자가 포함된 경우 한글로 변환하여 검색해 보세요.</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </Layout>
  );
}
