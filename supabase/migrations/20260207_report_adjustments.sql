-- ============================================
-- 보고서 조정 및 다운로드 제한 테이블
-- 기존 테이블 삭제 후 새로 생성
-- ============================================

-- 기존 테이블 삭제 (주의: 데이터 손실!)
DROP TABLE IF EXISTS public.download_limits CASCADE;
DROP TABLE IF EXISTS public.report_adjustments CASCADE;

-- 1. 보고서 조정 테이블
CREATE TABLE public.report_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_session_id TEXT NOT NULL UNIQUE,
  original_values JSONB NOT NULL,
  adjusted_values JSONB,
  adjustment_count INT DEFAULT 0 CHECK (adjustment_count <= max_adjustments),
  max_adjustments INT DEFAULT 1,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 다운로드 제한 테이블
CREATE TABLE public.download_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_session_id TEXT NOT NULL UNIQUE,
  download_count INT DEFAULT 0 CHECK (download_count <= max_downloads),
  max_downloads INT DEFAULT 3,
  last_download_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 인덱스
CREATE INDEX idx_report_adjustments_user ON public.report_adjustments(user_id);
CREATE INDEX idx_download_limits_user ON public.download_limits(user_id);

-- 4. RLS 활성화
ALTER TABLE public.report_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_limits ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 - report_adjustments
CREATE POLICY "select_own_adjustments" ON public.report_adjustments 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_adjustments" ON public.report_adjustments 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_adjustments" ON public.report_adjustments 
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. RLS 정책 - download_limits
CREATE POLICY "select_own_downloads" ON public.download_limits 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_downloads" ON public.download_limits 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_downloads" ON public.download_limits 
  FOR UPDATE USING (auth.uid() = user_id);

-- 7. updated_at 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_report_adjustments_updated
  BEFORE UPDATE ON public.report_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 완료!
