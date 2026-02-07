import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import type { Style } from "@react-pdf/types";

import type { ReportDraft, MarketInsight } from "@/types";
import { splitHighlights } from "@/lib/highlight";

// 타입 정의 (로컬 정의 제거하고 ReportDraft 사용)
type StructuredReport = ReportDraft & { marketInsight?: MarketInsight };

// 스타일 정의
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #2563EB',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  summary: {
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 6,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 12,
    color: '#374151',
  },
  keyNumbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 10,
  },
  keyNumberCard: {
    width: '48%',
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    marginBottom: 8,
  },
  keyNumberLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  keyNumberValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  keyNumberUnit: {
    fontSize: 10,
    color: '#6B7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    borderLeft: '3px solid #2563EB',
    paddingLeft: 10,
  },
  sectionContent: {
    fontSize: 11,
    color: '#4B5563',
    paddingLeft: 13,
  },
  cautionsBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  cautionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 6,
  },
  cautionItem: {
    fontSize: 10,
    color: '#92400E',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #E5E7EB',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  citationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  citationItem: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 4,
  },
  // Market Insight Styles
  marketInsightBox: {
    marginBottom: 20,
    border: '1px solid #DBEAFE',
    borderRadius: 6,
    overflow: 'hidden',
  },
  marketInsightHeader: {
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderBottom: '1px solid #DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marketInsightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  keywordBadge: {
    backgroundColor: '#FFFFFF',
    color: '#1D4ED8',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 8,
    border: '1px solid #BFDBFE',
    marginLeft: 4,
  },
  expertSection: {
    padding: 10,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    borderRadius: 4,
  },
  expertTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  expertContent: {
    fontSize: 10,
    color: '#4B5563',
    lineHeight: 1.4,
  },
  highlight: {
    backgroundColor: '#FEF08A',
    padding: '0 2px', 
  },
  swotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    border: '1px solid #E5E7EB',
    borderRadius: 4,
  },
  swotItem: {
    width: '50%',
    padding: 8,
    borderBottom: '1px solid #E5E7EB',
    borderRight: '1px solid #E5E7EB',
  },
  swotLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
});

// 형광펜 텍스트 렌더링
const HighlightText = ({ text, style }: { text: string; style?: Style | Style[] }) => {
  if (!text) return null;

  const parts = splitHighlights(text);
  return (
    <Text style={style}>
      {parts.map((part, i) => (
        part.highlighted ? (
          <Text key={i} style={styles.highlight}>
            {part.text}
          </Text>
        ) : (
          <Text key={i}>{part.text}</Text>
        )
      ))}
    </Text>
  );
};

// 숫자 포맷팅
const formatNumber = (value: number | null, unit: string): string => {
  if (value === null) return '확인 불가';
  
  if (unit === '원' && value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억원`;
  }
  if (unit === '원/㎡') {
    return `${value.toLocaleString('ko-KR')}원/㎡`;
  }
  
  return `${value.toLocaleString('ko-KR')}${unit}`;
};

// PDF 문서 컴포넌트
const ReportDocument = ({ 
  report, 
  address,
  generatedAt 
}: { 
  report: StructuredReport; 
  address: string;
  generatedAt: string;
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>부동산 가치분석 보고서</Text>
        <Text style={styles.subtitle}>{address}</Text>
        <Text style={styles.subtitle}>생성일: {generatedAt}</Text>
      </View>

      {/* 초안 요약 (항상 표시) */}
      <View style={styles.summary}>
        <HighlightText text={report.summary} style={styles.summaryText} />
      </View>

      {/* Market Insight (있으면 추가 표시) */}
      {report.marketInsight ? (
        <View style={styles.marketInsightBox}>
          <View style={styles.marketInsightHeader}>
            <Text style={styles.marketInsightTitle}>시장 동향 및 입지 리포트 (Market Insight)</Text>
            <View style={{ flexDirection: 'row' }}>
              {report.marketInsight.keywords.map((k, i) => (
                <Text key={i} style={styles.keywordBadge}>{k}</Text>
              ))}
            </View>
          </View>
          
          <View style={{ padding: 10 }}>
            {report.marketInsight.keywordContext ? (
              <View style={styles.expertSection}>
                <Text style={styles.expertTitle}>키워드 컨텍스트</Text>
                <HighlightText text={report.marketInsight.keywordContext} style={styles.expertContent} />
              </View>
            ) : null}

            <View style={styles.expertSection}>
              <Text style={styles.expertTitle}>① 가격 급등의 배경과 실거래 추이</Text>
              <HighlightText text={report.marketInsight.expertOpinion.priceBackground} style={styles.expertContent} />
            </View>
            <View style={styles.expertSection}>
              <Text style={styles.expertTitle}>② 공시지가와의 괴리율 및 위험 요인</Text>
              <HighlightText text={report.marketInsight.expertOpinion.riskFactors} style={styles.expertContent} />
            </View>
            <View style={styles.expertSection}>
              <Text style={styles.expertTitle}>③ 향후 전망 및 투자 전략</Text>
              <HighlightText text={report.marketInsight.expertOpinion.outlook} style={styles.expertContent} />
            </View>

            <View style={styles.sectionTitle}>
              <Text style={{ fontSize: 11 }}>입지 장단점 (SWOT)</Text>
            </View>
            <View style={styles.swotGrid}>
               <View style={styles.swotItem}>
                 <Text style={{ ...styles.swotLabel, color: '#2563EB' }}>강점 (Strength)</Text>
                 <Text style={styles.expertContent}>{report.marketInsight.swot.strength}</Text>
               </View>
               <View style={{ ...styles.swotItem, borderRightWidth: 0 }}>
                 <Text style={{ ...styles.swotLabel, color: '#D97706' }}>약점 (Weakness)</Text>
                 <Text style={styles.expertContent}>{report.marketInsight.swot.weakness}</Text>
               </View>
               <View style={{ ...styles.swotItem, borderBottomWidth: 0 }}>
                 <Text style={{ ...styles.swotLabel, color: '#16A34A' }}>기회 (Opportunity)</Text>
                 <Text style={styles.expertContent}>{report.marketInsight.swot.opportunity}</Text>
               </View>
               <View style={{ ...styles.swotItem, borderBottomWidth: 0, borderRightWidth: 0 }}>
                 <Text style={{ ...styles.swotLabel, color: '#DC2626' }}>위협 (Threat)</Text>
                 <Text style={styles.expertContent}>{report.marketInsight.swot.threat}</Text>
               </View>
            </View>

            {report.marketInsight.news && report.marketInsight.news.length > 0 ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.expertTitle}>최근 뉴스(근거)</Text>
                {report.marketInsight.news.slice(0, 5).map((item, i) => (
                  <View key={`${item.url}-${i}`} style={{ marginBottom: 6 }}>
                    <Text style={styles.citationItem}>• {item.title}</Text>
                    {item.publishedAt ? (
                      <Text style={{ ...styles.citationItem, fontSize: 8 }}>{item.publishedAt}</Text>
                    ) : null}
                    <Text style={{ ...styles.citationItem, fontSize: 8 }}>{item.url}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* 핵심 지표 */}
      <View style={styles.keyNumbersGrid}>
        {report.keyNumbers.map((kn, index) => (
          <View key={index} style={styles.keyNumberCard}>
            <Text style={styles.keyNumberLabel}>{kn.label}</Text>
            <Text style={styles.keyNumberValue}>
              {formatNumber(kn.value, kn.unit)}
            </Text>
          </View>
        ))}
      </View>

      {/* 섹션들 */}
      {report.sections.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <HighlightText text={section.content} style={styles.sectionContent} />
        </View>
      ))}

      {/* 주의사항 */}
      {report.cautions.length > 0 && (
        <View style={styles.cautionsBox}>
          <Text style={styles.cautionTitle}>⚠️ 주의사항</Text>
          {report.cautions.map((caution, index) => (
            <Text key={index} style={styles.cautionItem}>• {caution}</Text>
          ))}
        </View>
      )}

      {/* 출처 */}
      {report.citations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.citationsTitle}>📚 출처</Text>
          {report.citations.map((citation, index) => (
            <Text key={index} style={styles.citationItem}>
              [{index + 1}] {citation.title}
            </Text>
          ))}
        </View>
      )}

      {/* 푸터 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          본 보고서는 공공데이터와 웹 공개정보를 기반으로 자동 생성된 참고 자료입니다.
        </Text>
        <Text style={styles.footerText}>
          최종 의사결정 전 반드시 전문가 검토 및 현장 확인이 필요합니다.
        </Text>
      </View>
    </Page>
  </Document>
);

// PDF 다운로드 함수
export const downloadReportPDF = async (
  report: StructuredReport,
  address: string
): Promise<void> => {
  const generatedAt = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const blob = await pdf(
    <ReportDocument 
      report={report} 
      address={address}
      generatedAt={generatedAt}
    />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // 파일명 생성 (주소에서 특수문자 제거)
  const safeAddress = address.replace(/[^\w가-힣]/g, '_').substring(0, 30);
  link.download = `부동산분석_${safeAddress}_${Date.now()}.pdf`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// PDF Blob 반환 (서버 전송용)
export const generateReportPDFBlob = async (
  report: StructuredReport,
  address: string
): Promise<Blob> => {
  const generatedAt = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return await pdf(
    <ReportDocument 
      report={report} 
      address={address}
      generatedAt={generatedAt}
    />
  ).toBlob();
};

export default ReportDocument;
