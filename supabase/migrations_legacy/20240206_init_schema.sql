-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table (Extends Supabase Auth if needed, but keeping separate based on spec entity)
-- Note: In Supabase, typically we link to auth.users. Here we create a public table for app-specific data.
CREATE TYPE user_role AS ENUM ('visitor', 'free_member', 'paid_member', 'admin');
CREATE TYPE oauth_provider AS ENUM ('kakao', 'naver');

CREATE TABLE public.users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255), -- Optional linkage to auth.users
    role user_role DEFAULT 'visitor',
    provider oauth_provider,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Term Quota (For rate limiting/guardrails)
CREATE TABLE public.term_quota (
    quota_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    remaining_count INT DEFAULT 0,
    cooldown_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(user_id, date)
);

-- 3. Search Subjects
CREATE TABLE public.search_subjects (
    subject_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE, -- 1 month lock
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. Reports
CREATE TYPE report_status AS ENUM ('generating', 'ready', 'error');
CREATE TYPE step_level_enum AS ENUM ('1', '2', '3');

CREATE TABLE public.reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.search_subjects(subject_id),
    step_level step_level_enum DEFAULT '1',
    status report_status DEFAULT 'generating',
    
    -- Entitlements
    adjustment_used BOOLEAN DEFAULT FALSE,
    adjustment_until TIMESTAMP WITH TIME ZONE,
    download_limit INT DEFAULT 3,
    downloads_used INT DEFAULT 0,
    
    pdf_storage_key TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 5. Payments
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE public.payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(user_id),
    report_id UUID REFERENCES public.reports(report_id),
    amount DECIMAL(12, 2) NOT NULL,
    status payment_status DEFAULT 'pending',
    pg_provider VARCHAR(50),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 6. Report Adjustments (History of changes)
CREATE TABLE public.report_adjustments (
    adjustment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.reports(report_id) ON DELETE CASCADE,
    changed_fields JSONB, -- Stores what was changed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 7. Download Events (Log)
CREATE TABLE public.download_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.reports(report_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(user_id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Row Level Security (RLS) - Basic Setup (To be refined)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for initial setup)
-- Users can see their own data
CREATE POLICY "Users view own profile" ON public.users 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own reports" ON public.reports 
    FOR SELECT USING (auth.uid() = user_id);
