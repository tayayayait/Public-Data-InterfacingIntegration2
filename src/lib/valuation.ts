import type { ValuationResult } from "@/types";

export interface ValuationInputs {
  areaM2: number;
  recentTradePriceWon: number | null;
  publicPricePerM2: number | null;
}

export function computeValuationResult(input: ValuationInputs): ValuationResult {
  const safeAreaM2 = Number.isFinite(input.areaM2) && input.areaM2 > 0 ? input.areaM2 : 84;
  const recentTradeUnitPrice = input.recentTradePriceWon
    ? Math.round(input.recentTradePriceWon / safeAreaM2)
    : null;
  const publicBasedUnitPrice = input.publicPricePerM2 ? Math.round(input.publicPricePerM2) : null;

  const fairUnitPrice = recentTradeUnitPrice !== null && publicBasedUnitPrice !== null
    ? Math.round(recentTradeUnitPrice * 0.6 + publicBasedUnitPrice * 0.4)
    : null;
  const currentUnitPrice = recentTradeUnitPrice;
  const currentPercent = currentUnitPrice && fairUnitPrice
    ? Number(((currentUnitPrice / fairUnitPrice) * 100).toFixed(1))
    : null;
  const estimatedValue = fairUnitPrice ? Math.round(fairUnitPrice * safeAreaM2) : null;

  const cautions: string[] = [];
  if (fairUnitPrice === null || currentPercent === null) {
    cautions.push("추가 조사 필요: 실거래가 또는 공시지가 데이터가 부족해 추정 정확도가 낮습니다.");
  }

  return {
    areaM2: safeAreaM2,
    recentTradeUnitPrice,
    publicBasedUnitPrice,
    fairUnitPrice,
    currentUnitPrice,
    currentPercent,
    estimatedValue,
    formula: {
      fairUnitPrice: "적정단가 = (최근실거래가 단가 * 0.6) + (공시지가 기반 단가 * 0.4)",
      currentPercent: "현재백분율 = 현재단가 / 적정단가 * 100",
    },
    cautions,
  };
}
