/**
 * Entitlement Service
 * 다운로드 횟수 제한 및 수정 횟수 관리
 * 
 * Note: Supabase에 entitlements 테이블이 없으므로 localStorage + reports 테이블 활용
 */

export interface Entitlement {
  reportId: string;
  userId: string;
  downloadCount: number;
  maxDownloads: number;
  adjustmentCount: number;
  maxAdjustments: number;
  purchasedAt: string;
  expiresAt: string;
}

export interface EntitlementCheckResult {
  canDownload: boolean;
  canAdjust: boolean;
  remainingDownloads: number;
  remainingAdjustments: number;
  isExpired: boolean;
  message?: string;
}

const DEFAULT_MAX_DOWNLOADS = 3;
const DEFAULT_MAX_ADJUSTMENTS = 1;
const ADJUSTMENT_PERIOD_DAYS = 30;
const STORAGE_KEY = 'report_entitlements';

/**
 * 로컬 스토리지에서 entitlements 조회
 */
function getStoredEntitlements(): Record<string, Entitlement> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * 로컬 스토리지에 entitlements 저장
 */
function saveEntitlements(entitlements: Record<string, Entitlement>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entitlements));
  } catch (e) {
    console.error('Failed to save entitlements:', e);
  }
}

/**
 * 보고서 구매 시 entitlement 생성
 */
export function createEntitlement(
  reportId: string,
  userId: string,
  tier: 'basic' | 'pro' | 'premium' = 'pro'
): Entitlement {
  const maxDownloads = tier === 'premium' ? 5 : tier === 'pro' ? 3 : 2;
  const maxAdjustments = tier === 'premium' ? 3 : DEFAULT_MAX_ADJUSTMENTS;
  
  const purchasedAt = new Date();
  const expiresAt = new Date(purchasedAt);
  expiresAt.setDate(expiresAt.getDate() + ADJUSTMENT_PERIOD_DAYS);

  const entitlement: Entitlement = {
    reportId,
    userId,
    downloadCount: 0,
    maxDownloads,
    adjustmentCount: 0,
    maxAdjustments,
    purchasedAt: purchasedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  const entitlements = getStoredEntitlements();
  const key = `${userId}_${reportId}`;
  entitlements[key] = entitlement;
  saveEntitlements(entitlements);

  return entitlement;
}

/**
 * Entitlement 조회
 */
export function getEntitlement(
  reportId: string,
  userId: string
): Entitlement | null {
  const entitlements = getStoredEntitlements();
  const key = `${userId}_${reportId}`;
  return entitlements[key] || null;
}

/**
 * 다운로드/수정 가능 여부 확인
 */
export function checkEntitlement(entitlement: Entitlement | null): EntitlementCheckResult {
  if (!entitlement) {
    return {
      canDownload: false,
      canAdjust: false,
      remainingDownloads: 0,
      remainingAdjustments: 0,
      isExpired: true,
      message: '보고서 구매 내역이 없습니다.'
    };
  }

  const now = new Date();
  const expiresAt = new Date(entitlement.expiresAt);
  const isExpired = now > expiresAt;

  const remainingDownloads = entitlement.maxDownloads - entitlement.downloadCount;
  const remainingAdjustments = entitlement.maxAdjustments - entitlement.adjustmentCount;

  const canDownload = remainingDownloads > 0;
  const canAdjust = !isExpired && remainingAdjustments > 0;

  let message: string | undefined;
  if (!canDownload) {
    message = `다운로드 횟수(${entitlement.maxDownloads}회)를 모두 사용했습니다.`;
  } else if (!canAdjust && remainingAdjustments <= 0) {
    message = `수정 횟수(${entitlement.maxAdjustments}회)를 모두 사용했습니다.`;
  } else if (isExpired) {
    message = '수정 가능 기간이 만료되었습니다.';
  }

  return {
    canDownload,
    canAdjust,
    remainingDownloads,
    remainingAdjustments,
    isExpired,
    message
  };
}

/**
 * 다운로드 횟수 증가
 */
export function recordDownload(
  reportId: string,
  userId: string
): boolean {
  const entitlement = getEntitlement(reportId, userId);
  const check = checkEntitlement(entitlement);

  if (!check.canDownload || !entitlement) {
    console.warn('Download not allowed:', check.message);
    return false;
  }

  const entitlements = getStoredEntitlements();
  const key = `${userId}_${reportId}`;
  entitlements[key] = {
    ...entitlement,
    downloadCount: entitlement.downloadCount + 1
  };
  saveEntitlements(entitlements);

  return true;
}

/**
 * 수정 횟수 증가
 */
export function recordAdjustment(
  reportId: string,
  userId: string
): boolean {
  const entitlement = getEntitlement(reportId, userId);
  const check = checkEntitlement(entitlement);

  if (!check.canAdjust || !entitlement) {
    console.warn('Adjustment not allowed:', check.message);
    return false;
  }

  const entitlements = getStoredEntitlements();
  const key = `${userId}_${reportId}`;
  entitlements[key] = {
    ...entitlement,
    adjustmentCount: entitlement.adjustmentCount + 1
  };
  saveEntitlements(entitlements);

  return true;
}

/**
 * 남은 다운로드 횟수 조회
 */
export function getRemainingDownloads(
  reportId: string,
  userId: string
): number {
  const entitlement = getEntitlement(reportId, userId);
  if (!entitlement) return 0;
  return Math.max(0, entitlement.maxDownloads - entitlement.downloadCount);
}

/**
 * 남은 수정 횟수 조회
 */
export function getRemainingAdjustments(
  reportId: string,
  userId: string
): number {
  const entitlement = getEntitlement(reportId, userId);
  if (!entitlement) return 0;
  
  const check = checkEntitlement(entitlement);
  if (check.isExpired) return 0;
  
  return Math.max(0, entitlement.maxAdjustments - entitlement.adjustmentCount);
}

/**
 * 무료 다운로드 권한 생성 (테스트/프로모션용)
 */
export function grantFreeEntitlement(
  reportId: string,
  userId: string
): Entitlement {
  return createEntitlement(reportId, userId, 'basic');
}
