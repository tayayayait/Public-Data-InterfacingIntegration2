import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight } from "lucide-react";
import AddressSearch, { AddressData, extractAddressCodes } from "@/components/address/AddressSearch";

export default function ManualInputPage() {
  const navigate = useNavigate();
  const [requesterName, setRequesterName] = useState("");
  const [email, setEmail] = useState("");
  const [memo, setMemo] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [addressData, setAddressData] = useState<AddressData | null>(null);

  const isFormValid = Boolean(addressData && agreeTerms && agreePrivacy);

  const handleAddressSelect = (address: AddressData) => {
    setAddressData(address);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressData) return;

    const codes = extractAddressCodes(addressData);
    sessionStorage.setItem(
      "addressCodes",
      JSON.stringify({
        sigunguCd: codes.sigunguCd,
        bjdongCd: codes.bjdongCd,
        bun: codes.bun,
        ji: codes.ji,
        lawdCd: codes.LAWD_CD,
        fullAddress: addressData.fullAddress,
        roadAddress: addressData.roadAddress,
        jibunAddress: addressData.jibunAddress,
        bcode: addressData.bcode,
        buildingCode: addressData.buildingCode,
      }),
    );

    sessionStorage.setItem(
      "requesterInfo",
      JSON.stringify({
        requesterName,
        email,
        memo,
      }),
    );

    navigate("/steps");
  };

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          이전으로
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">부동산 분석 정보 입력</h1>
          <p className="text-muted-foreground">주소를 기준으로 가치분석 보고서를 생성합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>필수 정보</CardTitle>
              <CardDescription>주소는 반드시 선택해 주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requesterName">신청자 이름 (선택)</Label>
                <Input
                  id="requesterName"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="예: 홍길동"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">이메일 (선택)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>분석 대상 주소</Label>
                <AddressSearch
                  onAddressSelect={handleAddressSelect}
                  placeholder="분석할 부동산 주소를 검색하세요"
                  buttonText="주소 검색"
                  showDetailInput={true}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">요청 메모 (선택)</Label>
                <Textarea
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="특이사항이 있으면 입력해 주세요."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>약관 동의</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="agreeTerms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(Boolean(checked))}
                />
                <Label htmlFor="agreeTerms">서비스 이용약관 동의 (필수)</Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="agreePrivacy"
                  checked={agreePrivacy}
                  onCheckedChange={(checked) => setAgreePrivacy(Boolean(checked))}
                />
                <Label htmlFor="agreePrivacy">개인정보 처리방침 동의 (필수)</Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={!isFormValid}>
              분석 단계 선택으로 이동
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
