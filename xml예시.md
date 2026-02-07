<?xml version="1.0" encoding="UTF-8"?>
<ServiceSpec id="pdi_report_mvp" version="0.1" createdDate="2026-02-06" lang="ko-KR">
  <Meta>
    <Project titleKo="AI 기반 공공데이터포털 + 웹정보 수집을 통한 분석 보고서 자동 생성/제공(PDF)" />
    <TargetAudience primary="50s" descriptionKo="50대 중후반 일반 사용자" />
    <Devices>
      <Device id="pc_web" priority="primary" />
      <Device id="mobile_browser" priority="secondary" constraintKo="깨지지 않는 수준의 반응형" />
    </Devices>
    <Benchmarks>
      <Benchmark id="samsung_direct" nameKo="삼성화재 다이렉트" focusKo="간결한 단계형 프로세스" />
      <Benchmark id="wishket" nameKo="위시켓" focusKo="깔끔한 톤앤매너/정보 구조" />
    </Benchmarks>
    <TechStack ui="Tailwind" uiComponents="shadcn-ui" />
  </Meta>

  <Goals>
    <Goal id="g1" textKo="검색 → 최소 입력 → 선택 → 결제 → 보고서 확정(1회 수정) → PDF 다운로드(횟수 제한)까지 막힘 없는 경험 제공" />
    <Goal id="g2" textKo="공공데이터+웹 공개정보 기반으로 신뢰 가능한 요약/설명 생성(출처 표기, 환각 방지)" />
    <Goal id="g3" textKo="엑셀 수식/로직을 서버에서 재현하여 자동 계산 및 비교군 분석" />
  </Goals>

  <UXPrinciples>
    <Rule id="ux_primary_cta" textKo="한 화면 = 한 개의 Primary CTA만 강조" />
    <Rule id="ux_no_jargon" textKo="전문용어/약어 지양(TERM → 검색 제한(악용 방지))" />
    <Rule id="ux_summary_cards" textKo="큰 글자 + 카드(요약) + 상세 접기(출처/설명)" />
    <Rule id="ux_confirm_pattern" textKo="입력/결제/확정 단계에 Confirm 패턴 필수" />
    <Rule id="ux_states_defined" textKo="로딩/에러/빈 상태를 항상 정의" />
    <Rule id="ux_self_serve_help" textKo="고객센터 없이 운영을 전제로 도움말/FAQ/가이드 문구 UI 내장" />
  </UXPrinciples>

  <Actors>
    <Actor id="visitor" nameKo="비회원" />
    <Actor id="free_member" nameKo="회원(무료)" />
    <Actor id="paid_member" nameKo="유료결제 사용자" />
    <Actor id="admin" nameKo="관리자" />
  </Actors>

  <AccessControl>
    <PermissionMatrix>
      <Feature id="search" descriptionKo="검색 및 개요(프리뷰)" visitor="allow" free_member="allow" paid_member="allow" admin="allow" />
      <Feature id="manual_input" descriptionKo="수기 입력 폼 진행" visitor="deny" free_member="allow" paid_member="allow" admin="allow" />
      <Feature id="step_selection" descriptionKo="단계(1/2/3) 선택" visitor="deny" free_member="allow" paid_member="allow" admin="allow" />
      <Feature id="checkout" descriptionKo="결제 진행" visitor="deny" free_member="allow" paid_member="allow" admin="allow" />
      <Feature id="report_confirm_adjust" descriptionKo="확정/1회 수치 조정" visitor="deny" free_member="deny" paid_member="allow" admin="allow" />
      <Feature id="pdf_download" descriptionKo="PDF 다운로드(횟수 제한)" visitor="deny" free_member="deny" paid_member="allow" admin="allow" />
      <Feature id="library" descriptionKo="자료실(법령/서식)" visitor="deny" free_member="deny" paid_member="allow" admin="allow" />
      <Feature id="admin_console" descriptionKo="관리자 페이지" visitor="deny" free_member="deny" paid_member="deny" admin="allow" />
    </PermissionMatrix>
  </AccessControl>

  <Policies>
    <Policy id="download_limit" type="limit" appliesTo="report" defaultValue="3" allowedValues="2,3" unit="count"
            textKo="보고서 1건당 PDF 다운로드 횟수 제한(서버 설정으로 2/3 선택 가능)" />
    <Policy id="one_time_adjustment" type="limit" appliesTo="report" defaultValue="1" unit="count"
            textKo="보고서 확정 후 수치 조정은 1회만 가능" />
    <Policy id="adjustment_window" type="timebox" appliesTo="report" defaultValue="P1M" iso8601Duration="true"
            textKo="수치 조정 가능 기간은 생성/결제 시점 기준 1개월" />
    <Policy id="search_subject_change_lock" type="timebox" appliesTo="search_subject" defaultValue="P1M" iso8601Duration="true"
            textKo="사용자가 등록한 검색 대상은 1개월 내 변경 불가(악용 방지)" />
    <Policy id="term_limit" type="anti_abuse" appliesTo="search" parameters="remainingCount,cooldownUntil"
            textKo="검색 악용 방지(TERM): 남은 횟수/쿨다운 UI 표시 및 서버 제한" />
    <Policy id="citation_required" type="integrity" appliesTo="report_content"
            textKo="핵심 수치/인용은 출처 표기(도메인/URL/수집시각)" />
    <Policy id="llm_grounding" type="guardrail" appliesTo="llm"
            textKo="수집된 데이터에 기반해서만 작성(환각 방지), 부족하면 '확인 불가'로 표기" />
  </Policies>

  <NonFunctionalRequirements>
    <NFR id="usability_50s" area="usability" priority="critical" textKo="50대 타겟: 폰트/버튼/단계 단순화/가독성 최우선" />
    <NFR id="accuracy_matching" area="data_accuracy" priority="high" textKo="공공데이터와 크롤링/검색 데이터 매칭 정확도 확보" />
    <NFR id="scalability_future" area="architecture" priority="high" textKo="모바일 앱 확장 및 AI 채팅 도입 고려" />
  </NonFunctionalRequirements>

  <DesignSystem stack="tailwind+shadcn" mode="light">
    <Breakpoints>
      <Breakpoint id="sm" px="640" />
      <Breakpoint id="md" px="768" />
      <Breakpoint id="lg" px="1024" />
      <Breakpoint id="xl" px="1280" />
      <Breakpoint id="2xl" px="1536" />
    </Breakpoints>

    <Containers>
      <ContainerPreset id="standard" maxWidthPx="1200" tailwind="max-w-6xl" paddingXDesktopPx="24" paddingXMobilePx="16" />
      <ContainerPreset id="form_read" maxWidthPx="720" tailwind="max-w-2xl" paddingXDesktopPx="24" paddingXMobilePx="16" />
      <ContainerPreset id="admin" maxWidthTailwind="max-w-screen-2xl" paddingXDesktopPx="24" />
    </Containers>

    <GlobalLayout>
      <Header fixed="true" heightPx="72" zIndex="10" />
      <SectionSpacing defaultPx="32" nestedPx="24" />
      <CardGrid lgCols="3" mdCols="2" smCols="1" />
      <ZIndexScale header="10" popover="20" toast="30" modalOverlay="50" />
    </GlobalLayout>

    <Colors>
      <Palette id="trust_blue">
        <Color name="primary_700" hex="#1D4ED8" />
        <Color name="primary_600" hex="#2563EB" />
        <Color name="primary_500" hex="#3B82F6" />
        <Color name="primary_100" hex="#DBEAFE" />
        <Color name="primary_50" hex="#EFF6FF" />

        <Color name="text_strong" hex="#0F172A" />
        <Color name="text_default" hex="#1F2937" />
        <Color name="text_muted" hex="#475569" />
        <Color name="border" hex="#E2E8F0" />
        <Color name="bg" hex="#F8FAFC" />
        <Color name="surface" hex="#FFFFFF" />

        <Color name="success" hex="#16A34A" />
        <Color name="warning" hex="#D97706" />
        <Color name="error" hex="#DC2626" />
        <Color name="info" hex="#0EA5E9" />
      </Palette>

      <ShadcnThemeTokens>
        <Token name="--background" hsl="210 40% 98%" />
        <Token name="--foreground" hsl="222 47% 11%" />
        <Token name="--card" hsl="0 0% 100%" />
        <Token name="--card-foreground" hsl="222 47% 11%" />
        <Token name="--popover" hsl="0 0% 100%" />
        <Token name="--popover-foreground" hsl="222 47% 11%" />
        <Token name="--primary" hsl="221 83% 53%" />
        <Token name="--primary-foreground" hsl="0 0% 100%" />
        <Token name="--secondary" hsl="210 40% 96%" />
        <Token name="--secondary-foreground" hsl="222 47% 11%" />
        <Token name="--muted" hsl="210 40% 96%" />
        <Token name="--muted-foreground" hsl="215 16% 47%" />
        <Token name="--accent" hsl="214 95% 93%" />
        <Token name="--accent-foreground" hsl="221 83% 53%" />
        <Token name="--border" hsl="214 32% 91%" />
        <Token name="--input" hsl="214 32% 91%" />
        <Token name="--ring" hsl="221 83% 53%" />
        <Token name="--destructive" hsl="0 72% 51%" />
        <Token name="--destructive-foreground" hsl="0 0% 100%" />
      </ShadcnThemeTokens>
    </Colors>

    <Typography baseFont="Pretendard" fallbacks="Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif">
      <NumberFormatting tabularNums="true" />
      <Scale>
        <TextStyle id="h1" fontSizePx="28" fontWeight="700" lineHeight="1.25" />
        <TextStyle id="h2" fontSizePx="24" fontWeight="700" />
        <TextStyle id="h3" fontSizePx="20" fontWeight="600" />
        <TextStyle id="body" fontSizePx="18" fontWeight="400" lineHeight="1.6" />
        <TextStyle id="small" fontSizePx="16" fontWeight="400" />
        <TextStyle id="disclaimer" fontSizePx="14" fontWeight="400" />
      </Scale>
    </Typography>

    <Spacing scalePx="4,8,12,16,20,24,32,40,48,64" />
    <Radii cardPx="16" controlPx="12" badgePx="999" />
    <Borders defaultWidthPx="1" defaultColor="#E2E8F0" />
    <Shadows>
      <Shadow id="card_default" tailwind="shadow-sm" />
      <Shadow id="card_hover" tailwind="shadow-md" ruleKo="hover 시 레이아웃 이동 금지" />
    </Shadows>

    <Accessibility>
      <Rule id="contrast" requirement="WCAG_AA" minRatio="4.5" />
      <Rule id="touch_target" minPx="44" />
      <Rule id="focus_ring" minWidthPx="2" colorRef="primary_500" alwaysVisible="true" />
      <Rule id="keyboard_nav" required="true" />
      <Rule id="labels" required="true" />
    </Accessibility>

    <ComponentSpecs>
      <ButtonSpecs>
        <Variant id="primary_l" heightPx="56" fontSizePx="18" fontWeight="600" paddingXpx="24" radiusPx="12" usageKo="다음/결제/다운로드/확정" />
        <Variant id="secondary_m" heightPx="48" fontSizePx="16-18" fontWeight="600" paddingXpx="20" radiusPx="12" usageKo="보조 행동" />
        <Variant id="tertiary_s" heightPx="40" fontSizePx="16" fontWeight="600" paddingXpx="16" radiusPx="10" usageKo="테이블/관리자" />
      </ButtonSpecs>

      <InputSpecs>
        <Variant id="default" heightPx="48" />
        <Variant id="home_search" heightPx="56" leftIcon="search" rightClearButton="true" enterSubmit="true" autocomplete="recent5,recommended5(optional)" />
        <Labels fontSizePx="16" position="top" />
        <Placeholder fontSizePx="18" />
        <ErrorMessage fontSizePx="14-16" colorRef="error" />
        <NumericFormatting align="right" thousandsSeparator="true" suffixUnitSeparated="true" />
      </InputSpecs>

      <CardSpecs basePaddingPx="24" radiusPx="16" border="1px" shadow="shadow-sm" />
      <DialogSpecs defaultWidthPx="560" mobileBehavior="fullscreen" focusTrap="true" />
      <StepperSpecs maxSteps="5" />
      <ToastAlertSpecs toastDurationSec="3-5" dismissible="true" topBannerForPolicies="true" />
      <TableSpecs headerHeightPx="44" rowHeightPx="48" numericAlign="right" filtersSticky="true" paginationButtonHeightPx="48" />
    </ComponentSpecs>

  </DesignSystem>

  <InformationArchitecture>
    <UserPages>
      <PageRef id="home_search" />
      <PageRef id="search_loading" />
      <PageRef id="overview_preview" />
      <PageRef id="no_results" />
      <PageRef id="login_social" />
      <PageRef id="manual_input" />
      <PageRef id="step_selection" />
      <PageRef id="checkout" />
      <PageRef id="report_generation" />
      <PageRef id="report_review_confirm" />
      <PageRef id="download" />
      <PageRef id="my_reports" />
      <PageRef id="library" />
      <PageRef id="settings_notifications" optional="true" />
    </UserPages>
    <AdminPages>
      <PageRef id="admin_login" />
      <PageRef id="admin_dashboard" />
      <PageRef id="admin_users" />
      <PageRef id="admin_payments" />
      <PageRef id="admin_report_logs" />
      <PageRef id="admin_library" />
    </AdminPages>
  </InformationArchitecture>

  <UI>
    <Routes>
      <Route pageId="home_search" path="/" />
      <Route pageId="search_loading" path="/search/progress" />
      <Route pageId="overview_preview" path="/overview" />
      <Route pageId="no_results" path="/no-results" />
      <Route pageId="login_social" path="/auth/login" />
      <Route pageId="manual_input" path="/input" />
      <Route pageId="step_selection" path="/steps" />
      <Route pageId="checkout" path="/checkout" />
      <Route pageId="report_generation" path="/report/progress" />
      <Route pageId="report_review_confirm" path="/report/review" />
      <Route pageId="download" path="/report/download" />
      <Route pageId="my_reports" path="/my-reports" />
      <Route pageId="library" path="/library" />
      <Route pageId="settings_notifications" path="/settings" optional="true" />

      <Route pageId="admin_login" path="/admin/login" />
      <Route pageId="admin_dashboard" path="/admin" />
      <Route pageId="admin_users" path="/admin/users" />
      <Route pageId="admin_payments" path="/admin/payments" />
      <Route pageId="admin_report_logs" path="/admin/report-logs" />
      <Route pageId="admin_library" path="/admin/library" />
    </Routes>

    <Flows>
      <Flow id="user_primary_flow" nameKo="사용자 핵심 플로우(검색→결제→다운로드)" stepperMaxSteps="5">
        <Step order="1" pageRef="home_search" />
        <Step order="2" pageRef="search_loading" />
        <Step order="3" pageRef="overview_preview" />
        <Step order="4" pageRef="manual_input" noteKo="비회원은 login_social로 우회" />
        <Step order="5" pageRef="step_selection" />
        <Step order="6" pageRef="checkout" />
        <Step order="7" pageRef="report_generation" />
        <Step order="8" pageRef="report_review_confirm" />
        <Step order="9" pageRef="download" />
        <Step order="10" pageRef="my_reports" />
      </Flow>
    </Flows>

    <Pages>
      <Page id="home_search" nameKo="홈/검색" containerPresetRef="form_read" primaryCtaLabelKo="분석 시작">
        <Purpose textKo="무엇을 입력해야 하는지 즉시 이해" />
        <KeyElements>
          <Element type="input_search" variantRef="DesignSystem.ComponentSpecs.InputSpecs.Variant:home_search" />
          <Element type="quota_badge" policyRef="term_limit" textKo="오늘 남은 검색: N회 / 다음 검색 가능: 00:30 후" />
          <Element type="hint" textKo="예: 상호명 / 소재지번" />
          <Element type="trust_copy" textKo="공공데이터와 웹 공개정보를 기반으로 작성됩니다." />
        </KeyElements>
        <States>
          <State id="validation_error" textKo="검색어를 입력해 주세요." />
          <State id="loading" nextPageRef="search_loading" />
        </States>
      </Page>

      <Page id="search_loading" nameKo="검색 진행(로딩)" containerPresetRef="form_read">
        <Purpose textKo="대기 불안을 줄이는 진행 표시" />
        <KeyElements>
          <Element type="progress_steps" textKo="공공데이터 조회/웹 정보 수집/비교군 분석/문장 생성" />
          <Element type="eta" textKo="약 30~60초(예시)" />
        </KeyElements>
        <States>
          <State id="failure" textKo="일시적으로 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." actionKo="재시도" />
          <State id="success" nextPageRef="overview_preview" />
        </States>
      </Page>

      <Page id="overview_preview" nameKo="개요(프리뷰)" containerPresetRef="standard" primaryCtaLabelKo="보고서 만들기(결제 전)">
        <Purpose textKo="결과를 카드 3개로 즉시 이해" />
        <KeyElements>
          <Element type="kpi_card" textKo="현재 백분율" citationPolicyRef="citation_required" />
          <Element type="kpi_card" textKo="단가(원/단위)" citationPolicyRef="citation_required" />
          <Element type="kpi_card" textKo="솔루션 사용 진행 여부" citationPolicyRef="citation_required" />
          <Element type="source_modal" textKo="출처 보기(도메인/URL/수집 시각)" />
        </KeyElements>
        <States>
          <State id="visitor_click_primary" nextPageRef="login_social" />
          <State id="member_click_primary" nextPageRef="manual_input" />
        </States>
      </Page>

      <Page id="no_results" nameKo="결과 없음/대체 경로" containerPresetRef="form_read" primaryCtaLabelKo="수기 입력으로 진행">
        <Purpose textKo="DB 미존재 시 대체 경로 제공" />
        <KeyElements>
          <Element type="empty_state" textKo="해당 항목은 데이터베이스에서 찾지 못했습니다." />
          <Element type="secondary_action" textKo="다른 검색어로 다시 검색" />
          <Element type="tips" textKo="표기 형식 예시 제공(접기)" />
        </KeyElements>
      </Page>

      <Page id="login_social" nameKo="로그인(소셜)" containerPresetRef="form_read">
        <Purpose textKo="다운로드 제한/1회 조정 등 권한 부여를 위한 인증" />
        <KeyElements>
          <Element type="oauth_button" provider="kakao" heightPx="56" />
          <Element type="oauth_button" provider="naver" heightPx="56" />
          <Element type="helper_text" textKo="다운로드 횟수 제한(최대 3회)과 1회 조정 기능을 위해 로그인해 주세요." />
        </KeyElements>
        <States>
          <State id="failure" textKo="로그인에 실패했습니다. 다시 시도해 주세요." />
          <State id="success" nextPageRef="manual_input" />
        </States>
      </Page>

      <Page id="manual_input" nameKo="수기 입력(1페이지 폼)" containerPresetRef="form_read" primaryCtaLabelKo="다음">
        <Purpose textKo="딱 한 장에서 끝나는 최소 입력" />
        <KeyElements>
          <Element type="form" sections="필수 정보,선택 정보,확인/동의" fieldCountGuideline="12~18"
                   placeholder="excel_logic_fields_v1" />
        </KeyElements>
      </Page>

      <Page id="step_selection" nameKo="단계(1/2/3) 선택" containerPresetRef="standard" primaryCtaLabelKo="이 단계로 진행하기">
        <Purpose textKo="3개 카드로 비교를 단순화" />
        <KeyElements>
          <Element type="step_card" step="1" />
          <Element type="step_card" step="2" badgeKo="추천(1개만)" />
          <Element type="step_card" step="3" />
          <Element type="comparison_table" optional="true" />
        </KeyElements>
      </Page>

      <Page id="checkout" nameKo="결제/약관/세금계산서 정보" containerPresetRef="form_read" primaryCtaLabelKo="결제하기">
        <Purpose textKo="건당 결제 흐름을 단순/명확하게" />
        <KeyElements>
          <Element type="payment_summary_card" />
          <Element type="terms_checkboxes" countGuideline="2~3" />
          <Element type="tax_invoice_form" optional="true" placeholder="business_number,company_name,contact" />
        </KeyElements>
        <States>
          <State id="failure" textKo="결제에 실패했습니다. 다시 시도해 주세요." actionKo="재시도" />
        </States>
      </Page>

      <Page id="report_generation" nameKo="보고서 생성(진행)" containerPresetRef="form_read">
        <Purpose textKo="생성 중 이탈 불안을 줄이고 '내 보고서' 재진입 보장" />
        <KeyElements>
          <Element type="progress" textKo="생성 중에는 창을 닫아도 내 보고서에서 확인할 수 있습니다." />
        </KeyElements>
        <States>
          <State id="success" nextPageRef="report_review_confirm" />
          <State id="failure" nextPageRef="my_reports" textKo="오류 발생 시 내 보고서에서 상태 확인/재시도" />
        </States>
      </Page>

      <Page id="report_review_confirm" nameKo="보고서 프리뷰/확정(1회 조정)" containerPresetRef="standard" primaryCtaLabelKo="확정하고 PDF 다운로드">
        <Purpose textKo="확정의 의미를 명확히 하고 1회 조정 UX 제공" />
        <KeyElements>
          <Element type="policy_banner" policyRefs="one_time_adjustment,adjustment_window"
                   textKo="확정 후 1회만 조정 가능 / 조정 가능 기간 1개월" />
          <Element type="accordion_sections" sections="요약,지표/표,비교군 분석,출처 목록" />
          <Element type="editable_field" iconKo="연필" policyRef="one_time_adjustment" />
          <Element type="confirm_dialog" textKo="이번 저장이 1회 조정으로 처리됩니다. 진행할까요?" />
        </KeyElements>
      </Page>

      <Page id="download" nameKo="다운로드(횟수 제한)" containerPresetRef="form_read" primaryCtaLabelKo="PDF 다운로드">
        <Purpose textKo="남은 횟수를 명확히 보여주고 재다운로드/소진 상태 제공" />
        <KeyElements>
          <Element type="download_counter" policyRef="download_limit" textKo="남은 다운로드: 3/3" />
          <Element type="download_history" fields="datetime,remainingCount" />
        </KeyElements>
        <States>
          <State id="limit_reached" textKo="다운로드 횟수를 모두 사용했습니다." />
        </States>
      </Page>

      <Page id="my_reports" nameKo="내 보고서 목록" containerPresetRef="standard" primaryCtaLabelKo="보고서 열기">
        <Purpose textKo="상태/다운로드/조정 여부를 한눈에" />
        <KeyElements>
          <Element type="report_list_card" fields="title,createdAt,status,downloadsRemaining,adjustmentUsed" />
        </KeyElements>
      </Page>

      <Page id="library" nameKo="자료실(법령/서식)" containerPresetRef="standard">
        <Purpose textKo="유료 전용 자료 제공(카테고리/검색/게시물 카드)" />
        <KeyElements>
          <Element type="category_tabs" />
          <Element type="search_input" heightPx="48" />
          <Element type="post_card" fields="title,summary,updatedAt" />
          <Element type="paywall" condition="notPaid" textKo="유료 회원만 이용 가능합니다." ctaKo="결제/멤버십 안내" />
        </KeyElements>
      </Page>

      <Page id="settings_notifications" nameKo="설정/알림 수신(옵션)" containerPresetRef="form_read" optional="true">
        <Purpose textKo="알림/수신 동의 등 간단 설정" />
      </Page>

      <Page id="admin_login" nameKo="관리자 로그인" containerPresetRef="form_read" />
      <Page id="admin_dashboard" nameKo="관리자 대시보드(KPI)" containerPresetRef="admin">
        <KeyElements>
          <Element type="kpi_cards" fields="todayPayments,reportsCreated,errorRate,activeUsers" />
        </KeyElements>
      </Page>
      <Page id="admin_users" nameKo="회원 관리" containerPresetRef="admin">
        <KeyElements>
          <Element type="table" />
          <Element type="filters" fields="grade,keyword" />
          <Element type="detail_modal" fields="profile,paymentHistory" />
        </KeyElements>
      </Page>
      <Page id="admin_payments" nameKo="결제 내역 관리" containerPresetRef="admin">
        <KeyElements>
          <Element type="table" fields="status,amount,pgProvider,receiptLink,taxInvoiceLink" />
        </KeyElements>
      </Page>
      <Page id="admin_report_logs" nameKo="보고서 생성 로그" containerPresetRef="admin">
        <KeyElements>
          <Element type="table" fields="status,duration,errorMessage,copyButton,retryTrigger" />
        </KeyElements>
      </Page>
      <Page id="admin_library" nameKo="자료실 게시물 관리" containerPresetRef="admin">
        <KeyElements>
          <Element type="crud" />
          <Element type="file_upload" fileTypes="pdf" />
          <Element type="visibility_toggle" />
        </KeyElements>
      </Page>
    </Pages>

    <StatesAndMessages>
      <Loading ruleKo="스켈레톤 + 진행 문구 + 중복 클릭 방지" />
      <Empty ruleKo="데이터가 없습니다 + 다음 행동(추가/검색/초기화)" />
      <Error ruleKo="사용자 행동 기준 문장 + 재시도 + 대체 경로, 기술 메시지는 관리자 로그에만" />
    </StatesAndMessages>

    <A11yChecklist>
      <Item id="keyboard_nav" textKo="키보드 탭 이동 가능(모달 포커스 트랩 포함)" />
      <Item id="focus_ring" textKo="포커스 링 항상 표시" />
      <Item id="form_labels" textKo="label 연결 및 오류 메시지 연계" />
      <Item id="no_color_only" textKo="색만으로 상태 구분 금지" />
      <Item id="min_font" textKo="최소 16px, 본문 18px 준수" />
      <Item id="no_horizontal_scroll" textKo="375px에서 가로 스크롤 금지" />
    </A11yChecklist>

  </UI>

  <Backend>
    <Integrations>
      <Integration id="public_data_portal_api" type="api" nameKo="공공데이터포털 API"
                   noteKo="현재 2개 항목 연동, 최대 4개까지 확장 가능성" />
      <Integration id="crawler_site_1" type="crawler" nameKo="특정 정보 사이트(1개처)"
                   noteKo="법적 이슈 없는 범위 내 크롤링" />
      <Integration id="google_search_api" type="search_api" nameKo="Google 검색 API" />
      <Integration id="naver_search_api" type="search_api" nameKo="Naver 검색 API" />
      <Integration id="oauth_kakao" type="oauth" nameKo="카카오 로그인" />
      <Integration id="oauth_naver" type="oauth" nameKo="네이버 로그인" />
      <Integration id="payment_pg" type="pg" nameKo="PG사 결제" />
      <Integration id="tax_invoice_system" type="tax" nameKo="세금계산서 발행 프로세스" />
      <Integration id="object_storage" type="storage" nameKo="PDF/원본 저장소" />
    </Integrations>

    <Services>
      <Service id="auth_service" responsibilities="social_login,session,roles" integrations="oauth_kakao,oauth_naver" />
      <Service id="term_guard_service" responsibilities="quota,cooldown,abuse_detection" policyRefs="term_limit" />
      <Service id="search_orchestrator" responsibilities="query_normalization,dispatch_collectors,caching" />
      <Service id="public_data_collector" responsibilities="public_api_fetch" integrations="public_data_portal_api" />
      <Service id="web_crawler" responsibilities="crawl_target_site" integrations="crawler_site_1" />
      <Service id="web_search_collector" responsibilities="search_api_fetch" integrations="google_search_api,naver_search_api" />
      <Service id="matcher" responsibilities="entity_matching,comparable_grouping,deduplication" />
      <Service id="analysis_engine" responsibilities="excel_formula_port,comparables_analysis,unit_price_calculation"
               noteKo="클라이언트 엑셀 수식/로직 서버 구현" />
      <Service id="llm_writer" responsibilities="grounded_summary,explanations" policyRefs="llm_grounding,citation_required" />
      <Service id="report_renderer" responsibilities="template_fill,citations,versioning" />
      <Service id="pdf_service" responsibilities="html_to_pdf" />
      <Service id="payment_service" responsibilities="one_time_checkout,webhook,receipt" integrations="payment_pg" />
      <Service id="invoice_service" responsibilities="tax_invoice_issue" integrations="tax_invoice_system" />
      <Service id="entitlement_service" responsibilities="paid_access,download_count,adjustment_count,lock_windows"
               policyRefs="download_limit,one_time_adjustment,adjustment_window,search_subject_change_lock" />
      <Service id="library_service" responsibilities="law_forms_posts,contract_templates,paid_gate" />
      <Service id="admin_service" responsibilities="user_mgmt,payment_mgmt,report_logs,library_mgmt" />
      <Service id="notification_service" responsibilities="scheduled_messages"
               noteKo="(검토) 보고서 작성 시점 기준 3개월 알림 발송" />
    </Services>

    <Pipelines>
      <Pipeline id="report_generation_pipeline" triggerKo="사용자 검색/입력/결제 후 보고서 생성">
        <Step order="1" id="normalize_query" serviceRef="search_orchestrator" />
        <Step order="2" id="apply_term_policy" serviceRef="term_guard_service" policyRef="term_limit" />
        <Step order="3" id="fetch_public_data" serviceRef="public_data_collector" />
        <Step order="4" id="crawl_target_site" serviceRef="web_crawler" />
        <Step order="5" id="fetch_web_search" serviceRef="web_search_collector" />
        <Step order="6" id="match_merge_snapshot" serviceRef="matcher" output="grounded_facts_snapshot" />
        <Step order="7" id="compute_metrics" serviceRef="analysis_engine" input="grounded_facts_snapshot" output="computed_metrics" />
        <Step order="8" id="generate_text" serviceRef="llm_writer" policyRef="llm_grounding" output="report_text_blocks" />
        <Step order="9" id="assemble_report" serviceRef="report_renderer" policyRef="citation_required" />
        <Step order="10" id="render_pdf" serviceRef="pdf_service" />
        <Step order="11" id="store_and_entitle" serviceRef="entitlement_service" policies="download_limit,one_time_adjustment,adjustment_window" />
      </Pipeline>
    </Pipelines>

    <ReportTemplate id="report_v1" outputFormat="pdf" citationsRequired="true">
      <Sections>
        <Section id="executive_summary" titleKo="요약" generator="llm" />
        <Section id="kpi_overview" titleKo="지표/표" generator="analysis_engine" />
        <Section id="comparables" titleKo="비교군 분석" generator="analysis_engine+llm" />
        <Section id="sources" titleKo="출처" generator="system" />
      </Sections>
      <EditableFields policyRef="one_time_adjustment" windowPolicyRef="adjustment_window">
        <Field id="percent_current" labelKo="현재 백분율" type="percent" editable="true" />
        <Field id="unit_price" labelKo="단가" type="currency" unit="KRW" editable="true" />
      </EditableFields>
      <Downloads policyRef="download_limit" />
    </ReportTemplate>

    <LLMGuardrails>
      <Rule id="ground_only" policyRef="llm_grounding" />
      <Rule id="no_fake_numbers" textKo="수치/금액/백분율은 computed_metrics 또는 사용자 조정 값만 사용" />
      <Rule id="always_cite" policyRef="citation_required" />
      <Rule id="unknown_when_missing" textKo="근거가 없으면 '확인 불가'로 명시" />
    </LLMGuardrails>

  </Backend>

  <DataModel>
    <Entity id="user">
      <Field name="user_id" type="uuid" />
      <Field name="role" type="enum" values="visitor,free_member,paid_member,admin" />
      <Field name="oauth_provider" type="enum" values="kakao,naver" />
      <Field name="created_at" type="datetime" />
    </Entity>

    <Entity id="search_subject">
      <Field name="subject_id" type="uuid" />
      <Field name="user_id" type="uuid" ref="user.user_id" />
      <Field name="query" type="string" />
      <Field name="created_at" type="datetime" />
      <Field name="locked_until" type="datetime" policyRef="search_subject_change_lock" />
    </Entity>

    <Entity id="term_quota">
      <Field name="user_id" type="uuid" ref="user.user_id" />
      <Field name="date" type="date" />
      <Field name="remaining_count" type="int" />
      <Field name="cooldown_until" type="datetime" />
      <Field name="policy" type="ref" refValue="term_limit" />
    </Entity>

    <Entity id="report">
      <Field name="report_id" type="uuid" />
      <Field name="user_id" type="uuid" ref="user.user_id" />
      <Field name="subject_id" type="uuid" ref="search_subject.subject_id" />
      <Field name="step_level" type="enum" values="1,2,3" />
      <Field name="status" type="enum" values="generating,ready,error" />
      <Field name="created_at" type="datetime" />
      <Field name="adjustment_used" type="bool" policyRef="one_time_adjustment" />
      <Field name="adjustment_until" type="datetime" policyRef="adjustment_window" />
      <Field name="download_limit" type="int" policyRef="download_limit" />
      <Field name="downloads_used" type="int" />
      <Field name="pdf_storage_key" type="string" ref="Backend.Integrations.object_storage" />
    </Entity>

    <Entity id="report_adjustment">
      <Field name="adjustment_id" type="uuid" />
      <Field name="report_id" type="uuid" ref="report.report_id" />
      <Field name="changed_fields" type="json" />
      <Field name="created_at" type="datetime" />
    </Entity>

    <Entity id="payment">
      <Field name="payment_id" type="uuid" />
      <Field name="user_id" type="uuid" ref="user.user_id" />
      <Field name="report_id" type="uuid" ref="report.report_id" />
      <Field name="amount" type="currency" unit="KRW" />
      <Field name="status" type="enum" values="pending,paid,failed,refunded" />
      <Field name="pg_provider" type="string" ref="Backend.Integrations.payment_pg" />
      <Field name="paid_at" type="datetime" />
    </Entity>

    <Entity id="tax_invoice">
      <Field name="invoice_id" type="uuid" />
      <Field name="payment_id" type="uuid" ref="payment.payment_id" />
      <Field name="business_number" type="string" />
      <Field name="issued_at" type="datetime" />
    </Entity>

    <Entity id="download_event">
      <Field name="event_id" type="uuid" />
      <Field name="report_id" type="uuid" ref="report.report_id" />
      <Field name="user_id" type="uuid" ref="user.user_id" />
      <Field name="downloaded_at" type="datetime" />
      <Field name="ip" type="string" optional="true" />
      <Field name="user_agent" type="string" optional="true" />
    </Entity>

    <Entity id="library_item">
      <Field name="item_id" type="uuid" />
      <Field name="category" type="string" />
      <Field name="title" type="string" />
      <Field name="summary" type="string" />
      <Field name="file_key" type="string" />
      <Field name="paid_only" type="bool" />
      <Field name="updated_at" type="datetime" />
    </Entity>

    <Entity id="admin_log">
      <Field name="log_id" type="uuid" />
      <Field name="admin_user_id" type="uuid" ref="user.user_id" />
      <Field name="action" type="string" />
      <Field name="entity_ref" type="string" />
      <Field name="created_at" type="datetime" />
    </Entity>

  </DataModel>

  <QA>
    <AcceptanceCriteria>
      <Item id="flow_end_to_end" textKo="검색→개요→입력→단계→결제→생성→확정(1회 조정)→다운로드(2~3회)까지 단절 없음" />
      <Item id="policy_visibility" textKo="TERM/다운로드 제한/1회 조정/1개월 제한이 UI에서 항상 명확" />
      <Item id="citations" textKo="핵심 지표/요약에 출처 확인 경로 존재" />
      <Item id="responsive" textKo="375/768/1024/1440에서 레이아웃 깨짐 없음" />
      <Item id="a11y" textKo="키보드/포커스/라벨/대비 기준 충족" />
    </AcceptanceCriteria>
  </QA>

  <CopyGuide>
    <Tone formality="polite" ruleKo="존댓말 통일(하세요/됩니다), 한 문장 25자 내외 권장" />
    <Messages>
      <Message id="saved" textKo="저장했습니다." />
      <Message id="generic_error" textKo="잠시 후 다시 시도해 주세요." />
      <Message id="download_remaining" textKo="남은 다운로드: 2회" />
    </Messages>
  </CopyGuide>

  <FutureExtensions>
    <Item id="mobile_app" textKo="모바일 앱 확장: 토큰/컴포넌트 재사용 구조 유지" />
    <Item id="ai_chat" textKo="AI 채팅 도입: 보고서 기반 Q&amp;A 영역으로 확장 가능하게 설계" />
  </FutureExtensions>
</ServiceSpec>
