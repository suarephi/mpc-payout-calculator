import { PriceData, PayoutResult, YearSummary, CalculatorParams } from './types';

export function get180dAverage(priceData: PriceData[], targetDate: string): number | null {
  const target = new Date(targetDate);
  const lookbackStart = new Date(target);
  lookbackStart.setDate(lookbackStart.getDate() - 180);

  const lookbackData = priceData.filter(d => {
    const date = new Date(d.date);
    return date >= lookbackStart && date < target;
  });

  if (lookbackData.length < 30) return null;

  const sum = lookbackData.reduce((acc, d) => acc + d.close, 0);
  return sum / lookbackData.length;
}

export function getPriceOnDate(priceData: PriceData[], targetDate: string): number | null {
  const target = new Date(targetDate);

  // Try exact match first
  const exact = priceData.find(d => d.date === targetDate);
  if (exact) return exact.close;

  // Find closest date on or after target
  const closest = priceData.find(d => new Date(d.date) >= target);
  return closest ? closest.close : null;
}

export function calculatePayouts(
  priceData: PriceData[],
  params: CalculatorParams,
  years: number[] = [2021, 2022, 2023, 2024, 2025, 2026]
): PayoutResult[] {
  const results: PayoutResult[] = [];
  const { monthlyUsdTarget, floorPercent, ceilingPercent } = params;

  for (const year of years) {
    const basePrice = get180dAverage(priceData, `${year}-01-01`);
    if (basePrice === null) continue;

    // Calculate floor/ceiling based on percentage of 180d average for this year
    const floorPrice = basePrice * floorPercent;
    const ceilingPrice = basePrice * ceilingPercent;

    // Fixed NEAR tokens based on 180d average
    const fixedNearTokens = monthlyUsdTarget / basePrice;

    // Floor/ceiling USD values
    const floorUsdValue = monthlyUsdTarget * floorPercent;   // 80% of target
    const ceilingUsdValue = monthlyUsdTarget * ceilingPercent; // 170% of target

    // Calculate payouts for each month (Feb to Jan next year)
    for (let month = 2; month <= 13; month++) {
      const payoutYear = month <= 12 ? year : year + 1;
      const payoutMonth = month <= 12 ? month : 1;
      const payoutDate = `${payoutYear}-${String(payoutMonth).padStart(2, '0')}-01`;

      const priceAtPayout = getPriceOnDate(priceData, payoutDate);
      if (priceAtPayout === null) continue;

      const usdValueAtPayout = fixedNearTokens * priceAtPayout;
      const floorHit = priceAtPayout < floorPrice;
      const ceilingHit = priceAtPayout > ceilingPrice;

      // Calculate effective payout
      // If floor hit: pay more NEAR to guarantee floor USD value
      // If ceiling hit: pay less NEAR (cap at ceiling USD value)
      // If normal: pay fixed NEAR tokens
      let effectiveNearTokens: number;
      let effectiveUsdValue: number;

      if (floorHit) {
        // Price dropped below floor - pay more NEAR to guarantee minimum USD value
        effectiveNearTokens = floorUsdValue / priceAtPayout;
        effectiveUsdValue = floorUsdValue;
      } else if (ceilingHit) {
        // Price rose above ceiling - cap payout at ceiling USD value
        effectiveNearTokens = ceilingUsdValue / priceAtPayout;
        effectiveUsdValue = ceilingUsdValue;
      } else {
        // Normal - pay fixed tokens
        effectiveNearTokens = fixedNearTokens;
        effectiveUsdValue = usdValueAtPayout;
      }

      const nearDelta = effectiveNearTokens - fixedNearTokens;

      results.push({
        year,
        payoutDate,
        month: payoutMonth,
        basePrice180d: basePrice,
        floorPrice,
        ceilingPrice,
        fixedNearTokens,
        effectiveNearTokens,
        priceAtPayout,
        usdValueAtPayout,
        effectiveUsdValue,
        floorHit,
        ceilingHit,
        status: floorHit ? 'FLOOR HIT' : (ceilingHit ? 'CEILING HIT' : 'Normal'),
        nearDelta
      });
    }
  }

  return results.sort((a, b) => a.payoutDate.localeCompare(b.payoutDate));
}

export function summarizeByYear(payouts: PayoutResult[]): YearSummary[] {
  const yearGroups = payouts.reduce((acc, p) => {
    if (!acc[p.year]) acc[p.year] = [];
    acc[p.year].push(p);
    return acc;
  }, {} as Record<number, PayoutResult[]>);

  return Object.entries(yearGroups).map(([year, data]) => {
    const totalNearPaid = data.reduce((sum, d) => sum + d.effectiveNearTokens, 0);
    const totalNearIfNoAdjustment = data.reduce((sum, d) => sum + d.fixedNearTokens, 0);

    // NEAR saved by ceiling (when we paid less than fixed)
    const nearSavedByCeiling = data
      .filter(d => d.ceilingHit)
      .reduce((sum, d) => sum + (d.fixedNearTokens - d.effectiveNearTokens), 0);

    // NEAR added by floor (when we paid more than fixed)
    const nearAddedByFloor = data
      .filter(d => d.floorHit)
      .reduce((sum, d) => sum + (d.effectiveNearTokens - d.fixedNearTokens), 0);

    return {
      year: parseInt(year),
      basePrice180d: data[0].basePrice180d,
      floorPrice: data[0].floorPrice,
      ceilingPrice: data[0].ceilingPrice,
      fixedNearTokens: data[0].fixedNearTokens,
      floorCount: data.filter(d => d.floorHit).length,
      ceilingCount: data.filter(d => d.ceilingHit).length,
      normalCount: data.filter(d => !d.floorHit && !d.ceilingHit).length,
      totalPayouts: data.length,
      avgUsdValue: data.reduce((sum, d) => sum + d.effectiveUsdValue, 0) / data.length,
      totalNearPaid,
      totalNearIfNoAdjustment,
      nearSavedByCeiling,
      nearAddedByFloor
    };
  }).sort((a, b) => a.year - b.year);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}
