import { describe, expect, it } from "vitest";
import { computeValuationResult } from "@/lib/valuation";

describe("computeValuationResult", () => {
  it("calculates fair unit price and current percent with MVP formula", () => {
    const result = computeValuationResult({
      areaM2: 84,
      recentTradePriceWon: 840_000_000,
      publicPricePerM2: 6_000_000,
    });

    // recent trade unit = 10,000,000
    // fair = 10,000,000 * 0.6 + 6,000,000 * 0.4 = 8,400,000
    expect(result.recentTradeUnitPrice).toBe(10_000_000);
    expect(result.fairUnitPrice).toBe(8_400_000);
    expect(result.currentPercent).toBe(119);
    expect(result.cautions).toHaveLength(0);
  });

  it("returns caution when required inputs are missing", () => {
    const result = computeValuationResult({
      areaM2: 84,
      recentTradePriceWon: null,
      publicPricePerM2: null,
    });

    expect(result.fairUnitPrice).toBeNull();
    expect(result.currentPercent).toBeNull();
    expect(result.cautions[0]).toContain("추가 조사 필요");
  });
});
