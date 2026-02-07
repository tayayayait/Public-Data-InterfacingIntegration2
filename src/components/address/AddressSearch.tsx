import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Search, Building2 } from 'lucide-react';

declare global {
  interface Window {
    daum: {
      Postcode: new (options: DaumPostcodeOptions) => DaumPostcodeInstance;
    };
  }
}

interface DaumPostcodeOptions {
  oncomplete: (data: DaumPostcodeResult) => void;
  onclose?: () => void;
  width?: string | number;
  height?: string | number;
}

interface DaumPostcodeInstance {
  open: () => void;
  embed: (element: HTMLElement) => void;
}

export interface DaumPostcodeResult {
  // 주소 정보
  zonecode: string;           // 우편번호
  address: string;            // 기본 주소 (도로명 또는 지번)
  addressEnglish: string;     // 영문 주소
  roadAddress: string;        // 도로명 주소
  roadAddressEnglish: string; // 도로명 영문 주소
  jibunAddress: string;       // 지번 주소
  jibunAddressEnglish: string;// 지번 영문 주소
  autoRoadAddress: string;    // 자동 도로명 주소
  autoJibunAddress: string;   // 자동 지번 주소

  // 코드 정보 (정부 API 연동에 필수!)
  sido: string;              // 시도 (예: 서울특별시)
  sigungu: string;           // 시군구 (예: 강남구)
  sigunguCode: string;       // 시군구코드 5자리 → 건축물대장 API
  bname: string;             // 법정동/법정리 이름 (예: 역삼동)
  bname1: string;            // 법정동/법정리 이름 앞자리
  bname2: string;            // 법정동/법정리 이름 뒷자리
  bcode: string;             // 법정동코드 10자리 → 정부 API 법정동 조회
  roadname: string;          // 도로명
  roadnameCode: string;      // 도로명 코드 7자리
  buildingCode: string;      // 건물관리번호 25자리 → 정확한 건물 조회
  buildingName: string;      // 건물명
  apartment: string;         // 아파트 여부 (Y/N)
  
  // 추가 정보
  hname: string;             // 행정동명
  query: string;             // 사용자가 입력한 검색어
  userSelectedType: string;  // 사용자가 선택한 주소 타입 (R: 도로명, J: 지번)
  addressType: string;       // 주소 타입 (R: 도로명, J: 지번)
}

export interface AddressData {
  fullAddress: string;
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
  sido: string;
  sigungu: string;
  sigunguCode: string;    // 시군구코드 5자리 → LAWD_CD로 사용
  bname: string;
  bcode: string;          // 법정동코드 10자리
  bjdongCd: string;       // 법정동코드 뒤 5자리 → 건축물대장 bjdongCd
  buildingCode: string;   // 건물관리번호 25자리
  buildingName: string;
  apartment: boolean;
}

interface AddressSearchProps {
  onAddressSelect: (address: AddressData) => void;
  placeholder?: string;
  buttonText?: string;
  showDetailInput?: boolean;
}

export default function AddressSearch({
  onAddressSelect,
  placeholder = '주소를 검색하세요',
  buttonText = '주소 검색',
  showDetailInput = true
}: AddressSearchProps) {
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  const [detailAddress, setDetailAddress] = useState('');

  const openPostcode = useCallback(() => {
    if (!window.daum?.Postcode) {
      console.error('Daum Postcode script not loaded');
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data: DaumPostcodeResult) => {
        // 법정동코드에서 시군구(앞 5자리)와 읍면동(뒤 5자리) 분리
        const sigunguCd = data.bcode.substring(0, 5);  // 예: 11680
        const bjdongCd = data.bcode.substring(5, 10);  // 예: 10300

        const addressData: AddressData = {
          fullAddress: data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          zonecode: data.zonecode,
          sido: data.sido,
          sigungu: data.sigungu,
          sigunguCode: data.sigunguCode,
          bname: data.bname,
          bcode: data.bcode,
          bjdongCd: bjdongCd,
          buildingCode: data.buildingCode,
          buildingName: data.buildingName,
          apartment: data.apartment === 'Y'
        };

        setSelectedAddress(addressData);
        
        // 상세 주소 입력이 필요없거나 아파트가 아닌 경우 바로 콜백
        if (!showDetailInput) {
          onAddressSelect(addressData);
        }
      }
    }).open();
  }, [onAddressSelect, showDetailInput]);

  const handleConfirm = () => {
    if (selectedAddress) {
      const finalAddress: AddressData = {
        ...selectedAddress,
        fullAddress: detailAddress 
          ? `${selectedAddress.fullAddress} ${detailAddress}`
          : selectedAddress.fullAddress
      };
      onAddressSelect(finalAddress);
    }
  };

  return (
    <div className="space-y-4">
      {/* 주소 검색 버튼 */}
      <div className="flex gap-2">
        <Input
          value={selectedAddress?.fullAddress || ''}
          placeholder={placeholder}
          readOnly
          className="flex-1 cursor-pointer"
          onClick={openPostcode}
        />
        <Button type="button" onClick={openPostcode} variant="outline">
          <Search className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </div>

      {/* 선택된 주소 정보 */}
      {selectedAddress && (
        <Card className="bg-muted/50">
          <CardContent className="p-4 space-y-3">
            {/* 기본 주소 정보 */}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{selectedAddress.roadAddress}</p>
                <p className="text-sm text-muted-foreground">{selectedAddress.jibunAddress}</p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {selectedAddress.zonecode}
              </span>
            </div>

            {/* 건물 정보 */}
            {selectedAddress.buildingName && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{selectedAddress.buildingName}</span>
                {selectedAddress.apartment && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">아파트</span>
                )}
              </div>
            )}

            {/* 상세 주소 입력 */}
            {showDetailInput && (
              <div className="pt-2 border-t">
                <Label htmlFor="detailAddress" className="text-sm">상세 주소</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="detailAddress"
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    placeholder="동/호수를 입력하세요 (예: 101동 1001호)"
                    className="flex-1"
                  />
                  <Button onClick={handleConfirm}>확인</Button>
                </div>
              </div>
            )}

            {/* 디버그 정보 (개발용) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">API 연동 코드</summary>
                <div className="mt-1 p-2 bg-muted rounded font-mono text-[10px] space-y-1">
                  <div>시군구코드(LAWD_CD): <code>{selectedAddress.sigunguCode}</code></div>
                  <div>법정동코드(bcode): <code>{selectedAddress.bcode}</code></div>
                  <div>법정동(bjdongCd): <code>{selectedAddress.bjdongCd}</code></div>
                  <div>건물관리번호: <code className="break-all">{selectedAddress.buildingCode}</code></div>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 주소 코드 유틸리티 함수
export function extractAddressCodes(address: AddressData) {
  // buildingCode (건물관리번호 25자리) 구조:
  // 법정동코드(10) + 산여부(1) + 본번(4) + 부번(4) + 특수지코드(2) + 층(2) + 호(2)
  // PNU (19자리) = 법정동코드(10) + 대지구분(1) + 본번(4) + 부번(4)
  
  let pnu: string | undefined = undefined;
  
  if (address.buildingCode && address.buildingCode.length >= 19) {
    // buildingCode에서 PNU 추출 (앞 19자리)
    pnu = address.buildingCode.substring(0, 19);
  } else if (address.bcode && address.bcode.length === 10) {
    // buildingCode가 없으면 bcode + 기본 대지구분(1) + 번지 조합
    const bun = address.buildingCode?.substring(11, 15) || '0000';
    const ji = address.buildingCode?.substring(15, 19) || '0000';
    pnu = address.bcode + '1' + bun + ji; // 대지구분 1(대지) 가정
  }
  
  return {
    // 건축물대장 API용
    sigunguCd: address.sigunguCode,        // 시군구코드 5자리
    bjdongCd: address.bjdongCd,            // 법정동코드 뒤 5자리
    
    // 실거래가 API용
    LAWD_CD: address.sigunguCode,          // 지역코드 5자리
    lawdCd: address.sigunguCode,           // 별칭
    
    // 건물관리번호에서 번/지 추출 (선택적)
    bun: address.buildingCode?.substring(11, 15) || '0000', // 본번 4자리
    ji: address.buildingCode?.substring(15, 19) || '0000',  // 부번 4자리
    
    // 브이월드 API용 PNU (19자리)
    pnu,
  };
}
