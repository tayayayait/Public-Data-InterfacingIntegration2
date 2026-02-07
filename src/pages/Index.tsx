import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import AddressSearch, { AddressData, extractAddressCodes } from '@/components/address/AddressSearch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Shield, 
  TrendingUp, 
  Building,
  Home,
  Building2,
  Landmark,
  ArrowRight,
  Star
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'AI 기반 가치 분석',
    description: '공공데이터와 실거래가를 AI가 분석하여 적정 가치를 산출합니다.',
  },
  {
    icon: Shield,
    title: '신뢰할 수 있는 데이터',
    description: '국토부 실거래가, 건축물대장 등 검증된 공공데이터를 기반으로 합니다.',
  },
  {
    icon: TrendingUp,
    title: '미래 가치 예측',
    description: '주변 시세 트렌드와 입지 분석을 통해 향후 가치를 전망합니다.',
  },
];

const propertyTypes = [
  { id: 'apt', label: '아파트', icon: Building2 },
  { id: 'villa', label: '연립/다세대', icon: Home },
  { id: 'officetel', label: '오피스텔', icon: Building },
  { id: 'land', label: '토지/임야', icon: Landmark },
];



const testimonials = [
  {
    name: '김철수',
    role: '부동산 투자자',
    content: '복잡한 등기부등본과 실거래가를 일일이 찾아볼 필요 없이 한눈에 파악할 수 있어 좋았습니다.',
    rating: 5,
  },
  {
    name: '이영희',
    role: '공인중개사',
    content: '고객에게 매물 브리핑할 때 객관적인 AI 보고서를 함께 보여주니 신뢰도가 높아졌어요.',
    rating: 5,
  },
  {
    name: '박대한',
    role: '내집마련 준비중',
    content: '적정 가격인지 항상 고민이었는데, AI가 분석해준 가격과 비교해볼 수 있어 큰 도움이 되었습니다.',
    rating: 5,
  },
];

const Index = () => {
  const navigate = useNavigate();

  const handleAddressSelect = (address: AddressData) => {
    // 선택된 주소 정보를 sessionStorage에 저장
    const codes = extractAddressCodes(address);
    const addressCodes = {
      ...codes,
      fullAddress: address.fullAddress,
      roadAddress: address.roadAddress,
      jibunAddress: address.jibunAddress,
      buildingName: address.buildingName,
      sido: address.sido,
      sigungu: address.sigungu,
      bname: address.bname,
      bcode: address.bcode,
      zonecode: address.zonecode,
      buildingCode: address.buildingCode,
      sigunguCode: address.sigunguCode, // LAWD_CD
      // 좌표 정보는 AddressSearch에서 제공하지 않으므로, 
      // 다음 단계(search-property 또는 manual input)에서 처리하거나
      // 필요한 경우 지오코딩 API를 추가로 호출해야 함. 
      // 일단은 주소 문자열 기반으로 진행.
    };
    
    sessionStorage.setItem('addressCodes', JSON.stringify(addressCodes));
    console.log('[Index] Address selected:', addressCodes);

    // 로딩 페이지로 이동 (검색어 파라미터 포함)
    navigate(`/search/progress?q=${encodeURIComponent(address.fullAddress)}`);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-background to-background py-20 lg:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
        </div>
        
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-1.5 border-blue-200">
              <Zap className="mr-1 h-3 w-3" />
              AI 기반 부동산 가치 분석
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 leading-tight">
              주소만 입력하면
              <br />
              <span className="text-blue-600">AI가 가치를 분석</span>해 드립니다
            </h1>
            
            <p className="mt-6 text-lg text-slate-600">
              공공데이터와 웹상의 정보를 종합하여<br className="hidden sm:block" />
              누구나 이해하기 쉬운 <strong>부동산 가치 분석 보고서</strong>를 제공합니다.
            </p>

            <div className="mt-10 max-w-xl mx-auto">
              <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-100">
                <AddressSearch 
                  onAddressSelect={handleAddressSelect} 
                  placeholder="주소나 건물명을 입력하세요 (예: 은마아파트)"
                  buttonText="무료 분석 시작"
                  showDetailInput={false}
                />
              </div>
              

            </div>
          </div>
        </div>
      </section>

      {/* Property Types Section */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">분석 가능 부동산</h2>
            <p className="mt-3 text-slate-500">
              아파트부터 토지까지 다양한 부동산의 가치를 분석합니다
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {propertyTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Card key={type.id} className="group cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full border-slate-200">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-4 rounded-full bg-blue-50 p-4 group-hover:bg-blue-100 transition-colors">
                      <Icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900">{type.label}</h3>
                    <p className="text-xs text-slate-400 mt-2">AI 자동 분석</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">왜 AI Report인가요?</h2>
            <p className="mt-3 text-slate-500">
              복잡한 부동산 분석을 쉽고 빠르게 해결해 드립니다
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="pt-8 pb-6 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                    <feature.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-slate-900">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">이용 방법</h2>
            <p className="mt-3 text-slate-500">
              주소만 알면 누구나 1분 만에 보고서를 만들 수 있습니다
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: 1, title: '주소 검색', desc: '분석하고 싶은 부동산의 주소를 입력하세요' },
              { step: 2, title: 'AI 분석', desc: '공공데이터와 실거래가를 AI가 분석합니다' },
              { step: 3, title: '보고서 확인', desc: '분석 결과가 담긴 PDF 보고서를 확인하세요' },
            ].map((item, index) => (
              <div key={item.step} className="relative text-center group">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
                
                {index < 2 && (
                  <ArrowRight className="hidden md:block absolute top-7 -right-4 h-6 w-6 text-slate-300" />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12 bg-blue-50 py-10 rounded-2xl mx-auto max-w-3xl">
            <h3 className="text-xl font-semibold mb-4 text-slate-900">지금 바로 우리 집 가치를 확인해보세요</h3>
            <div className="flex justify-center">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-lg shadow-lg shadow-blue-200" onClick={() => window.scrollTo(0, 0)}>
                  무료 분석 시작하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">사용자 후기</h2>
            <p className="mt-3 text-slate-500">
              먼저 사용해보신 분들의 이야기입니다
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-sm">
                <CardContent className="pt-8">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3 border-t pt-4">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{testimonial.name}</p>
                      <p className="text-sm text-slate-400">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
