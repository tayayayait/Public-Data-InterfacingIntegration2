export interface ReportEntitlementState {
  adjustmentUsed: boolean;
  downloadLimit: number;
  downloadsUsed: number;
  confirmedAt: string | null;
}

export function canAdjust(state: ReportEntitlementState): boolean {
  return !state.adjustmentUsed;
}

export function applySingleAdjustment(state: ReportEntitlementState): ReportEntitlementState {
  if (!canAdjust(state)) {
    throw new Error("adjustment already used");
  }
  return {
    ...state,
    adjustmentUsed: true,
  };
}

export function canDownload(state: ReportEntitlementState): boolean {
  return Boolean(state.confirmedAt) && state.downloadsUsed < state.downloadLimit;
}

export function registerDownload(state: ReportEntitlementState): ReportEntitlementState {
  if (!canDownload(state)) {
    throw new Error("download not allowed");
  }
  return {
    ...state,
    downloadsUsed: state.downloadsUsed + 1,
  };
}
