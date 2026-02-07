export type ReportCategory = 'industry' | 'company' | 'technology' | 'market' | 'custom';
export type ReportStatus = 'draft' | 'pending' | 'processing' | 'completed' | 'failed';
export type AnalysisDepth = 'basic' | 'standard' | 'premium';

export interface Report {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: ReportCategory;
  status: ReportStatus;
  keywords?: string[];
  data_sources?: string[];
  analysis_depth: AnalysisDepth;
  preview_content?: ReportContent;
  full_content?: ReportContent;
  file_url?: string;
  price: number;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportContent {
  summary?: string;
  sections?: ReportSection[];
  charts?: ChartData[];
  tables?: TableData[];
  insights?: string[];
  recommendations?: string[];
}

export interface PropertySourceFact {
  id: string;
  title: string;
  url: string;
  summary?: string;
}

export interface PropertySearchResult {
  building?: {
    area: number;
    floor: number;
    structure: string;
    builtYear: number | null;
  };
  land?: {
    jimok: string | null;
    landArea: number | null;
  };
  naverSearch?: {
    title: string;
    link: string;
    originalLink?: string | null;
    description: string;
    pubDate?: string | null;
  }[];
  naverLand?: {
    complexes: {
      complexNo: string;
      complexName: string;
      address: string;
      dealPriceMin: number | null;
      dealPriceMax: number | null;
      articleCount: number | null;
      sourceUrl: string;
    }[];
    collectedAt: string;
  };
  sourceFacts?: PropertySourceFact[];
  query?: string;
  collectedAt?: string;
}

export interface ValuationResult {
  areaM2: number;
  recentTradeUnitPrice: number | null;
  publicBasedUnitPrice: number | null;
  fairUnitPrice: number | null;
  currentUnitPrice: number | null;
  currentPercent: number | null;
  estimatedValue: number | null;
  formula: {
    fairUnitPrice: string;
    currentPercent: string;
  };
  cautions: string[];
}

export interface ReportCitation {
  id: string;
  title: string;
  url: string;
}

export interface ReportKeyNumber {
  label: string;
  value: number | null;
  unit: string;
  citationIds: string[];
}

export interface MarketInsight {
  keywords: string[];
  keywordContext?: string;
  news?: {
    title: string;
    url: string;
    publishedAt?: string | null;
  }[];
  expertOpinion: {
    priceBackground: string;
    riskFactors: string;
    outlook: string;
  };
  swot: {
    strength: string;
    weakness: string;
    opportunity: string;
    threat: string;
  };
}

export interface ReportDraft {
  summary: string;
  sections: ReportSection[];
  keyNumbers: ReportKeyNumber[];
  cautions: string[];
  citations: ReportCitation[];
  marketInsight?: MarketInsight;
}

export interface ReportFinal extends ReportDraft {
  confirmedAt: string;
}

export interface EntitlementState {
  adjustmentUsed: boolean;
  downloadLimit: number;
  downloadsUsed: number;
  confirmedAt?: string | null;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface ChartData {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  title: string;
  data: Record<string, unknown>[];
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
}

export interface Payment {
  id: string;
  user_id: string;
  report_id?: string;
  amount: number;
  payment_method?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  receipt_url?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  company?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchFilters {
  category?: ReportCategory;
  dateRange?: {
    start: string;
    end: string;
  };
  keywords?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  keywords: string[];
  price: number;
  created_at: string;
  match_score?: number;
}

export interface PricingTier {
  id: AnalysisDepth;
  name: string;
  price: number;
  features: string[];
  recommended?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'basic',
    name: '기본',
    price: 29000,
    features: [
      '기본 데이터 분석',
      '주요 지표 요약',
      'PDF 다운로드',
      '이메일 지원',
    ],
  },
  {
    id: 'standard',
    name: '표준',
    price: 59000,
    features: [
      '심층 데이터 분석',
      '트렌드 분석 포함',
      '차트 및 그래프',
      'PDF + Excel 다운로드',
      '우선 이메일 지원',
    ],
    recommended: true,
  },
  {
    id: 'premium',
    name: '프리미엄',
    price: 99000,
    features: [
      'AI 기반 종합 분석',
      '맞춤형 인사이트',
      '경쟁사 비교 분석',
      '전문가 검토 포함',
      '모든 형식 다운로드',
      '전화 상담 지원',
    ],
  },
];

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  industry: '산업 분석',
  company: '기업 분석',
  technology: '기술 동향',
  market: '시장 조사',
  custom: '맞춤 분석',
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  draft: '초안',
  pending: '대기 중',
  processing: '분석 중',
  completed: '완료',
  failed: '실패',
};
