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

    // Fixed NEAR tokens based on 180d average (no adjustment needed since floor/ceiling are relative)
    const fixedNearTokens = monthlyUsdTarget / basePrice;

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

      results.push({
        year,
        payoutDate,
        month: payoutMonth,
        basePrice180d: basePrice,
        floorPrice,
        ceilingPrice,
        fixedNearTokens,
        priceAtPayout,
        usdValueAtPayout,
        floorHit,
        ceilingHit,
        status: floorHit ? 'FLOOR HIT' : (ceilingHit ? 'CEILING HIT' : 'Normal')
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

  return Object.entries(yearGroups).map(([year, data]) => ({
    year: parseInt(year),
    basePrice180d: data[0].basePrice180d,
    floorPrice: data[0].floorPrice,
    ceilingPrice: data[0].ceilingPrice,
    fixedNearTokens: data[0].fixedNearTokens,
    floorCount: data.filter(d => d.floorHit).length,
    ceilingCount: data.filter(d => d.ceilingHit).length,
    normalCount: data.filter(d => !d.floorHit && !d.ceilingHit).length,
    totalPayouts: data.length,
    avgUsdValue: data.reduce((sum, d) => sum + d.usdValueAtPayout, 0) / data.length
  })).sort((a, b) => a.year - b.year);
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
