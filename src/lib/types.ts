export interface PriceData {
  date: string;
  close: number;
}

export interface PayoutResult {
  year: number;
  payoutDate: string;
  month: number;
  basePrice180d: number;
  adjustedBasePrice: number;
  fixedNearTokens: number;
  priceAtPayout: number;
  usdValueAtPayout: number;
  floorHit: boolean;
  ceilingHit: boolean;
  status: 'FLOOR HIT' | 'CEILING HIT' | 'Normal';
}

export interface YearSummary {
  year: number;
  basePrice180d: number;
  adjustedBasePrice: number;
  fixedNearTokens: number;
  floorCount: number;
  ceilingCount: number;
  normalCount: number;
  totalPayouts: number;
  avgUsdValue: number;
}

export interface CalculatorParams {
  monthlyUsdTarget: number;
  floorPrice: number;
  ceilingPrice: number;
}
