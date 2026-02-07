import { describe, expect, it } from "vitest";
import {
  applySingleAdjustment,
  canAdjust,
  canDownload,
  registerDownload,
  type ReportEntitlementState,
} from "@/lib/reportEntitlement";

const baseState: ReportEntitlementState = {
  adjustmentUsed: false,
  downloadLimit: 3,
  downloadsUsed: 0,
  confirmedAt: "2026-02-06T12:00:00.000Z",
};

describe("report entitlement guards", () => {
  it("allows only one adjustment", () => {
    expect(canAdjust(baseState)).toBe(true);
    const adjusted = applySingleAdjustment(baseState);
    expect(adjusted.adjustmentUsed).toBe(true);
    expect(() => applySingleAdjustment(adjusted)).toThrow("adjustment already used");
  });

  it("increments downloads until limit", () => {
    let state = { ...baseState };
    expect(canDownload(state)).toBe(true);

    state = registerDownload(state);
    state = registerDownload(state);
    state = registerDownload(state);

    expect(state.downloadsUsed).toBe(3);
    expect(canDownload(state)).toBe(false);
    expect(() => registerDownload(state)).toThrow("download not allowed");
  });

  it("blocks download before confirmation", () => {
    const unconfirmed: ReportEntitlementState = { ...baseState, confirmedAt: null };
    expect(canDownload(unconfirmed)).toBe(false);
  });
});
