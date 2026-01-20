export interface PriceData {
  date: string;
  close: number;
}

export interface PayoutResult {
  year: number;
  payoutDate: string;
  month: number;
  basePrice180d: number;
  floorPrice: number;
  ceilingPrice: number;
  fixedNearTokens: number;        // Base tokens from 180d avg
  effectiveNearTokens: number;    // Actual tokens paid (adjusted for floor/ceiling)
  priceAtPayout: number;
  usdValueAtPayout: number;       // Value if paying fixed tokens
  effectiveUsdValue: number;      // Actual USD value after adjustment
  floorHit: boolean;
  ceilingHit: boolean;
  status: 'FLOOR HIT' | 'CEILING HIT' | 'Normal';
  nearDelta: number;              // Difference from fixed tokens (+ = more NEAR, - = less NEAR)
}

export interface YearSummary {
  year: number;
  basePrice180d: number;
  floorPrice: number;
  ceilingPrice: number;
  fixedNearTokens: number;
  floorCount: number;
  ceilingCount: number;
  normalCount: number;
  totalPayouts: number;
  avgUsdValue: number;
  totalNearPaid: number;
  totalNearIfNoAdjustment: number;
  nearSavedByCeiling: number;
  nearAddedByFloor: number;
}

export interface CalculatorParams {
  monthlyUsdTarget: number;
  floorPercent: number;   // e.g., 0.80 for 80%
  ceilingPercent: number; // e.g., 1.70 for 170%
}
