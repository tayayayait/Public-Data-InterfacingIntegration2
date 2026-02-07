import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PricingTier } from '@/types';
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  Building2,
  CheckCircle2,
  Shield,
  FileText,
  Loader2
} from 'lucide-react';

// 결제 수단 아이콘
const TossIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <circle cx="12" cy="12" r="12" fill="#0064FF"/>
    <path d="M7 12h10M12 7v10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const KakaopayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFEB00">
    <rect width="24" height="24" rx="4" fill="#FFEB00"/>
    <path d="M12 6C8.13 6 5 8.462 5 11.5c0 1.932 1.29 3.627 3.226 4.58-.112.41-.405 1.488-.462 1.72-.072.282.104.277.218.201.09-.06 1.426-.945 2.002-1.328.326.046.664.07 1.016.07 3.87 0 7-2.462 7-5.5S15.87 6 12 6z" fill="#3C1E1E"/>
  </svg>
);

const steps = [
  { id: 1, label: '정보 확인' },
  { id: 2, label: '결제 수단' },
  { id: 3, label: '결제 완료' },
];

const paymentMethods = [
  { id: 'toss', name: '토스페이', icon: TossIcon },
  { id: 'kakaopay', name: '카카오페이', icon: KakaopayIcon },
  { id: 'card', name: '신용/체크카드', icon: CreditCard },
  { id: 'phone', name: '휴대폰 결제', icon: Smartphone },
  { id: 'bank', name: '계좌이체', icon: Building2 },
];

export default function PaymentPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('toss');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // location.state에서 보고서 정보 가져오기
  const report = location.state?.report || {
    id: '1',
    title: '2024 글로벌 반도체 시장 동향 및 전망 분석 보고서',
    category: 'industry',
  };
  const tier: PricingTier = location.state?.tier || {
    id: 'standard',
    name: '표준',
    price: 59000,
    features: [],
  };

  const handlePayment = async () => {
    if (!agreeTerms) {
      toast({
        variant: 'destructive',
        title: '약관 동의 필요',
        description: '결제 진행을 위해 약관에 동의해 주세요.',
      });
      return;
    }

    setIsProcessing(true);

    // 결제 처리 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setCurrentStep(3);
    setIsProcessing(false);

    toast({
      title: '결제 완료',
      description: '보고서 결제가 완료되었습니다.',
    });
  };

  if (currentStep === 3) {
    return (
      <Layout showFooter={false}>
        <div className="container max-w-lg py-16">
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full gradient-primary flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">결제가 완료되었습니다!</h1>
              <p className="text-muted-foreground mt-2">
                보고서를 다운로드할 수 있습니다
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">주문번호</span>
                    <span className="font-mono">ORD-{Date.now()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">상품명</span>
                    <span className="text-right max-w-[200px] truncate">{report.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">분석 등급</span>
                    <Badge>{tier.name}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>결제 금액</span>
                    <span className="text-primary">{tier.price.toLocaleString()}원</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate(`/report/${id}/download`)}
                className="gradient-primary"
                size="lg"
              >
                <FileText className="mr-2 h-4 w-4" />
                보고서 다운로드
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/reports')}
              >
                내 보고서 목록
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="container max-w-4xl py-8">
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

        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} className="mb-8" />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {currentStep === 1 && (
              <>
                {/* 주문 정보 확인 */}
                <Card>
                  <CardHeader>
                    <CardTitle>주문 정보 확인</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">보고서 제목</Label>
                      <p className="font-medium mt-1">{report.title}</p>
                    </div>
                    <div className="flex gap-8">
                      <div>
                        <Label className="text-muted-foreground">분석 등급</Label>
                        <p className="font-medium mt-1">{tier.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">가격</Label>
                        <p className="font-medium mt-1 text-primary">
                          {tier.price.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 구매자 정보 */}
                <Card>
                  <CardHeader>
                    <CardTitle>구매자 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="email">이메일</Label>
                        <Input
                          id="email"
                          type="email"
                          defaultValue={user?.email || ''}
                          placeholder="보고서 수신 이메일"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">연락처 (선택)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="010-0000-0000"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={() => setCurrentStep(2)}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  다음 단계로
                </Button>
              </>
            )}

            {currentStep === 2 && (
              <>
                {/* 결제 수단 선택 */}
                <Card>
                  <CardHeader>
                    <CardTitle>결제 수단 선택</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                      className="grid grid-cols-2 gap-4"
                    >
                      {paymentMethods.map((method) => (
                        <div key={method.id}>
                          <RadioGroupItem
                            value={method.id}
                            id={method.id}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={method.id}
                            className="flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50 transition-colors"
                          >
                            <method.icon />
                            <span className="font-medium">{method.name}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* 약관 동의 */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={agreeTerms}
                        onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
                        주문 내용을 확인하였으며,{' '}
                        <a href="/terms" className="text-primary hover:underline">
                          서비스 이용약관
                        </a>
                        {' '}및{' '}
                        <a href="/privacy" className="text-primary hover:underline">
                          개인정보 처리방침
                        </a>
                        에 동의합니다.
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    이전
                  </Button>
                  <Button
                    onClick={handlePayment}
                    className="flex-1 gradient-primary"
                    size="lg"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        결제 처리 중...
                      </>
                    ) : (
                      <>
                        {tier.price.toLocaleString()}원 결제하기
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">주문 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {report.title}
                  </p>
                  <Badge className="mt-2">{tier.name}</Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">상품 금액</span>
                    <span>{tier.price.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">할인</span>
                    <span>0원</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-bold">
                  <span>총 결제 금액</span>
                  <span className="text-primary text-lg">
                    {tier.price.toLocaleString()}원
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <Shield className="h-4 w-4 shrink-0" />
                  <span>안전한 결제를 위해 SSL 암호화를 사용합니다</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
