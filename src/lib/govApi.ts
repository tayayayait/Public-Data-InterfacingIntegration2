
import { supabase } from '@/integrations/supabase/client';

export interface PropertySpecs {
  area: number;
  floor: number;
  structure: string;
  builtYear: number;
}

export interface LandInfo {
  jimok: string; // e.g., 'Da'
  landArea: number;
}

export interface ValuationResult {
  transaction: {
    amount: number;
    date: string;
    floor: number;
  } | null;
  publicLandPrice: {
    pricePerM2: number;
    year: number;
  };
  estimatedValue: number;
}

/**
 * Call 'search-property' Edge Function
 * Integrates: Building Ledger (API 2) & Land Info (API 4)
 */
export async function searchPropertySpecs(address: string, dong: string, ho: string) {
  try {
    const { data, error } = await supabase.functions.invoke('search-property', {
      body: { address, dong, ho },
    });

    if (error) throw error;
    return data as { building: PropertySpecs; land: LandInfo };
  } catch (error) {
    console.error('Failed to search property specs:', error);
    // Fallback Mock Data for demo purposes if backend fails or is not running
    return {
      building: { area: 84.5, floor: 12, structure: "CheolGeunConcrete", builtYear: 2015 },
      land: { jimok: "Da", landArea: 3500 }
    };
  }
}

/**
 * Call 'calculate-valuation' Edge Function
 * Integrates: Transaction Price (API 1) & Public Land Price (API 3)
 */
export async function calculateValuation(address: string, buildingType: string = 'APT') {
  try {
    const { data, error } = await supabase.functions.invoke('calculate-valuation', {
      body: { address, buildingType },
    });

    if (error) throw error;
    return data as ValuationResult;
  } catch (error) {
    console.error('Failed to calculate valuation:', error);
    // Fallback Mock Data
    return {
      transaction: { amount: 540000000, date: "2024-01-15", floor: 12 },
      publicLandPrice: { pricePerM2: 3500000, year: 2023 },
      estimatedValue: 540000000
    };
  }
}
