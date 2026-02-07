-- Property MVP alignment migration
-- Extends existing profiles/user_roles/reports/payments baseline.

-- 1) Expand report status enum for legacy admin compatibility.
DO $$
BEGIN
  ALTER TYPE public.report_status ADD VALUE IF NOT EXISTS 'error';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Expand reports table for property MVP data model and entitlement state.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS source_facts JSONB,
  ADD COLUMN IF NOT EXISTS valuation_result JSONB,
  ADD COLUMN IF NOT EXISTS draft_report JSONB,
  ADD COLUMN IF NOT EXISTS final_report JSONB,
  ADD COLUMN IF NOT EXISTS adjustment_used BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS adjustment_payload JSONB,
  ADD COLUMN IF NOT EXISTS download_limit INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS downloads_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS report_type TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE public.reports
SET
  adjustment_used = COALESCE(adjustment_used, FALSE),
  download_limit = COALESCE(download_limit, 3),
  downloads_used = COALESCE(downloads_used, 0)
WHERE TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reports_download_limit_nonnegative'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_download_limit_nonnegative CHECK (download_limit >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reports_downloads_used_nonnegative'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_downloads_used_nonnegative CHECK (downloads_used >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reports_downloads_within_limit'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_downloads_within_limit CHECK (downloads_used <= download_limit);
  END IF;
END $$;

-- 3) Add compatibility columns used by current admin pages.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT;

UPDATE public.payments
SET status = COALESCE(status, payment_status)
WHERE TRUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'free_member';

-- 4) Public library table for reusable reports/templates/guides.
CREATE TABLE IF NOT EXISTS public.library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'report',
  content_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view public library" ON public.library;
CREATE POLICY "Public can view public library" ON public.library
  FOR SELECT USING (is_public = TRUE);

DROP POLICY IF EXISTS "Admins manage library" ON public.library;
CREATE POLICY "Admins manage library" ON public.library
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) Report adjustment/download audit tables.
CREATE TABLE IF NOT EXISTS public.report_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_fields JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.report_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own report adjustments" ON public.report_adjustments;
CREATE POLICY "Users can view own report adjustments" ON public.report_adjustments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own report adjustments" ON public.report_adjustments;
CREATE POLICY "Users can create own report adjustments" ON public.report_adjustments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own download events" ON public.download_events;
CREATE POLICY "Users can view own download events" ON public.download_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own download events" ON public.download_events;
CREATE POLICY "Users can create own download events" ON public.download_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_report_adjustments_report_id ON public.report_adjustments(report_id);
CREATE INDEX IF NOT EXISTS idx_download_events_report_id ON public.download_events(report_id);

-- 6) Search history abuse-control columns.
ALTER TABLE public.search_history
  ADD COLUMN IF NOT EXISTS client_ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_search_history_user_created_at ON public.search_history(user_id, created_at DESC);

-- 7) DB-level enforcement for one-time adjustment and limited downloads.
CREATE OR REPLACE FUNCTION public.enforce_report_entitlements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.download_limit < 0 OR NEW.downloads_used < 0 THEN
    RAISE EXCEPTION 'download counters must be non-negative';
  END IF;

  IF NEW.downloads_used > NEW.download_limit THEN
    RAISE EXCEPTION 'download limit exceeded';
  END IF;

  IF OLD.adjustment_used = TRUE AND NEW.adjustment_used = FALSE THEN
    RAISE EXCEPTION 'adjustment_used cannot be reset';
  END IF;

  IF OLD.adjustment_used = TRUE
     AND NEW.adjustment_payload IS DISTINCT FROM OLD.adjustment_payload THEN
    RAISE EXCEPTION 'adjustment can only be applied once';
  END IF;

  IF OLD.confirmed_at IS NULL AND NEW.downloads_used > OLD.downloads_used THEN
    RAISE EXCEPTION 'cannot download before confirmation';
  END IF;

  IF NEW.downloads_used > OLD.downloads_used + 1 THEN
    RAISE EXCEPTION 'downloads_used can only increment by 1';
  END IF;

  IF OLD.downloads_used >= OLD.download_limit
     AND NEW.downloads_used > OLD.downloads_used THEN
    RAISE EXCEPTION 'no downloads remaining';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_report_entitlements ON public.reports;
CREATE TRIGGER trg_enforce_report_entitlements
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_report_entitlements();

-- 8) Keep library updated_at in sync.
DROP TRIGGER IF EXISTS update_library_updated_at ON public.library;
CREATE TRIGGER update_library_updated_at
  BEFORE UPDATE ON public.library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
