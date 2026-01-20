'use client';

import { useState, useMemo } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Area, ReferenceLine
} from 'recharts';
import priceData from '@/data/price-data.json';
import { PriceData, CalculatorParams } from '@/lib/types';
import {
  calculatePayouts, summarizeByYear, formatCurrency, formatNumber
} from '@/lib/calculator';

const typedPriceData = priceData as PriceData[];

export default function Home() {
  const [params, setParams] = useState<CalculatorParams>({
    monthlyUsdTarget: 7200,
    floorPercent: 0.80,
    ceilingPercent: 1.70
  });

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const payouts = useMemo(() =>
    calculatePayouts(typedPriceData, params),
    [params]
  );

  const summaries = useMemo(() => summarizeByYear(payouts), [payouts]);

  const chartData = useMemo(() => {
    if (selectedYear === 'all') {
      return typedPriceData.map(d => {
        const year = parseInt(d.date.substring(0, 4));
        const yearSummary = summaries.find(s => s.year === year);
        return {
          date: d.date,
          price: d.close,
          floor: yearSummary?.floorPrice ?? null,
          ceiling: yearSummary?.ceilingPrice ?? null,
          strikePrice: yearSummary?.basePrice180d ?? null
        };
      });
    } else {
      const yearSummary = summaries.find(s => s.year === selectedYear);
      const filtered = typedPriceData.filter(d => d.date.startsWith(String(selectedYear)));
      return filtered.map(d => ({
        date: d.date,
        price: d.close,
        floor: yearSummary?.floorPrice ?? null,
        ceiling: yearSummary?.ceilingPrice ?? null,
        strikePrice: yearSummary?.basePrice180d ?? null
      }));
    }
  }, [selectedYear, summaries]);

  const payoutChartData = useMemo(() => {
    const filtered = selectedYear === 'all'
      ? payouts
      : payouts.filter(p => p.year === selectedYear);

    return filtered.map(p => ({
      date: p.payoutDate,
      price: p.priceAtPayout,
      usdValue: p.usdValueAtPayout,
      effectiveUsdValue: p.effectiveUsdValue,
      floor: p.floorPrice,
      ceiling: p.ceilingPrice,
      status: p.status,
      fixedNearTokens: p.fixedNearTokens,
      effectiveNearTokens: p.effectiveNearTokens,
      nearDelta: p.nearDelta
    }));
  }, [payouts, selectedYear]);

  const floorUsdValue = params.monthlyUsdTarget * params.floorPercent;
  const ceilingUsdValue = params.monthlyUsdTarget * params.ceilingPercent;

  const years = [2021, 2022, 2023, 2024, 2025, 2026];

  const totals = useMemo(() => {
    const filtered = selectedYear === 'all' ? summaries : summaries.filter(s => s.year === selectedYear);
    return {
      totalNearPaid: filtered.reduce((sum, s) => sum + s.totalNearPaid, 0),
      totalNearIfNoAdjustment: filtered.reduce((sum, s) => sum + s.totalNearIfNoAdjustment, 0),
      nearSavedByCeiling: filtered.reduce((sum, s) => sum + s.nearSavedByCeiling, 0),
      nearAddedByFloor: filtered.reduce((sum, s) => sum + s.nearAddedByFloor, 0)
    };
  }, [summaries, selectedYear]);

  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">MPC Node Payout Calculator</h1>
          <p className="text-muted-foreground">
            NEAR Protocol - Dynamic Floor & Ceiling Analysis (% of 180-day Lookback)
          </p>
        </div>

        {/* Parameters */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Monthly USD Target</label>
              <input
                type="number"
                value={params.monthlyUsdTarget}
                onChange={(e) => setParams({ ...params, monthlyUsdTarget: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white/50 border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Floor (% of 180d Avg)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="5"
                  value={Math.round(params.floorPercent * 100)}
                  onChange={(e) => setParams({ ...params, floorPercent: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-full bg-white/50 border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                />
                <span className="text-muted-foreground font-medium">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Ceiling (% of 180d Avg)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="5"
                  value={Math.round(params.ceilingPercent * 100)}
                  onChange={(e) => setParams({ ...params, ceilingPercent: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-full bg-white/50 border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                />
                <span className="text-muted-foreground font-medium">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Filter Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full bg-white/50 border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
              >
                <option value="all">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {summaries.map(s => {
            const isHighlighted = selectedYear !== 'all' && s.year === selectedYear - 1;
            const isSelected = selectedYear === s.year;
            return (
              <div
                key={s.year}
                className={`glass-card rounded-xl p-4 card-hover ${
                  isHighlighted
                    ? 'ring-2 ring-[var(--near-cyan)] bg-[var(--near-cyan)]/5'
                    : isSelected
                      ? 'ring-2 ring-[var(--accent)]'
                      : ''
                }`}
              >
                <h3 className="text-lg font-bold text-gradient">{s.year}</h3>
                {isHighlighted && (
                  <p className="text-xs text-[var(--near-cyan)] mb-1 font-medium">← 180d lookback source</p>
                )}
                <p className="text-xs text-muted-foreground">180d Avg: {formatCurrency(s.basePrice180d)}</p>
                <p className="text-xs amount-positive">Floor: {formatCurrency(s.floorPrice)}</p>
                <p className="text-xs amount-negative">Ceiling: {formatCurrency(s.ceilingPrice)}</p>
                <p className="text-sm font-semibold mt-2">{formatNumber(s.fixedNearTokens, 0)} NEAR/mo</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="variance-pill positive">F:{s.floorCount}</span>
                  <span className="variance-pill negative">C:{s.ceilingCount}</span>
                  <span className="px-2 py-0.5 bg-[var(--muted)] rounded-full">N:{s.normalCount}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-border text-xs">
                  <p className="text-muted-foreground">Total: {formatNumber(s.totalNearPaid, 0)} NEAR</p>
                  {s.nearAddedByFloor > 0 && (
                    <p className="amount-positive">+{formatNumber(s.nearAddedByFloor, 0)} (floor)</p>
                  )}
                  {s.nearSavedByCeiling > 0 && (
                    <p className="amount-negative">-{formatNumber(s.nearSavedByCeiling, 0)} (ceiling)</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* NEAR Impact Summary */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">NEAR Token Impact Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
            <div className="p-4 bg-white/30 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Base NEAR (no adjustment)</p>
              <p className="text-2xl font-bold">{formatNumber(totals.totalNearIfNoAdjustment, 0)}</p>
            </div>
            <div className="p-4 bg-[var(--near-cyan)]/10 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Actual NEAR Paid</p>
              <p className="text-2xl font-bold text-[var(--near-cyan)]">{formatNumber(totals.totalNearPaid, 0)}</p>
            </div>
            <div className="p-4 bg-[var(--positive-muted)] rounded-lg">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Extra NEAR (Floor Hits)</p>
              <p className="text-2xl font-bold amount-positive">+{formatNumber(totals.nearAddedByFloor, 0)}</p>
            </div>
            <div className="p-4 bg-[var(--negative-muted)] rounded-lg">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">NEAR Saved (Ceiling Hits)</p>
              <p className="text-2xl font-bold amount-negative">-{formatNumber(totals.nearSavedByCeiling, 0)}</p>
            </div>
          </div>

          {/* Per-Year Token Impact Table */}
          <div className="data-grid overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Year</th>
                  <th className="text-left">180d Avg</th>
                  <th className="text-left">Floor</th>
                  <th className="text-left">Ceiling</th>
                  <th className="text-right">Base NEAR/mo</th>
                  <th className="text-right">Total Base</th>
                  <th className="text-right">Actual Paid</th>
                  <th className="text-right">Floor Adj (+)</th>
                  <th className="text-right">Ceiling Adj (-)</th>
                  <th className="text-right">Net Impact</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map(s => {
                  const netImpact = s.nearAddedByFloor - s.nearSavedByCeiling;
                  return (
                    <tr key={s.year}>
                      <td className="font-bold text-gradient">{s.year}</td>
                      <td>{formatCurrency(s.basePrice180d)}</td>
                      <td className="amount-positive">{formatCurrency(s.floorPrice)}</td>
                      <td className="amount-negative">{formatCurrency(s.ceilingPrice)}</td>
                      <td className="text-right font-mono">{formatNumber(s.fixedNearTokens, 0)}</td>
                      <td className="text-right font-mono">{formatNumber(s.totalNearIfNoAdjustment, 0)}</td>
                      <td className="text-right font-mono font-semibold">{formatNumber(s.totalNearPaid, 0)}</td>
                      <td className="text-right font-mono amount-positive">
                        {s.nearAddedByFloor > 0 ? `+${formatNumber(s.nearAddedByFloor, 0)}` : '-'}
                      </td>
                      <td className="text-right font-mono amount-negative">
                        {s.nearSavedByCeiling > 0 ? `-${formatNumber(s.nearSavedByCeiling, 0)}` : '-'}
                      </td>
                      <td className={`text-right font-mono font-semibold ${
                        netImpact > 0 ? 'amount-positive' : netImpact < 0 ? 'amount-negative' : ''
                      }`}>
                        {netImpact > 0 ? '+' : ''}{formatNumber(netImpact, 0)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="summary-row">
                  <td className="font-bold">TOTAL</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td className="text-right">-</td>
                  <td className="text-right font-mono font-bold">{formatNumber(totals.totalNearIfNoAdjustment, 0)}</td>
                  <td className="text-right font-mono font-bold">{formatNumber(totals.totalNearPaid, 0)}</td>
                  <td className="text-right font-mono font-bold amount-positive">+{formatNumber(totals.nearAddedByFloor, 0)}</td>
                  <td className="text-right font-mono font-bold amount-negative">-{formatNumber(totals.nearSavedByCeiling, 0)}</td>
                  <td className={`text-right font-mono font-bold ${
                    (totals.nearAddedByFloor - totals.nearSavedByCeiling) > 0 ? 'amount-positive' : 'amount-negative'
                  }`}>
                    {(totals.nearAddedByFloor - totals.nearSavedByCeiling) > 0 ? '+' : ''}
                    {formatNumber(totals.nearAddedByFloor - totals.nearSavedByCeiling, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Price Chart */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">NEAR Price with Dynamic Floor/Ceiling Boundaries</h2>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.substring(0, 7)}
              />
              <YAxis stroke="var(--muted-foreground)" domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--foreground)' }}
                formatter={(value, name) => {
                  if (typeof value === 'number') return formatCurrency(value);
                  return value;
                }}
              />
              <Legend />
              <Area type="stepAfter" dataKey="ceiling" fill="var(--negative)" fillOpacity={0.1} stroke="var(--negative)" strokeDasharray="5 5" name={`Ceiling (${Math.round(params.ceilingPercent * 100)}%)`} />
              <Line type="stepAfter" dataKey="strikePrice" stroke="var(--warning)" strokeWidth={2} dot={false} name="180d Strike Price" />
              <Area type="stepAfter" dataKey="floor" fill="var(--positive)" fillOpacity={0.1} stroke="var(--positive)" strokeDasharray="5 5" name={`Floor (${Math.round(params.floorPercent * 100)}%)`} />
              <Line type="monotone" dataKey="price" stroke="var(--near-cyan)" dot={false} name="NEAR Price" strokeWidth={1.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Payout Value Chart */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Monthly Payout USD Value (Effective)</h2>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={payoutChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} tickFormatter={(v) => v.substring(0, 7)} />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (typeof value === 'number') {
                    if (typeof name === 'string' && name.includes('NEAR')) return formatNumber(value, 0) + ' NEAR';
                    return formatCurrency(value);
                  }
                  return value;
                }}
              />
              <Legend />
              <ReferenceLine y={floorUsdValue} stroke="var(--positive)" strokeDasharray="5 5" label={{ value: `Floor ${formatCurrency(floorUsdValue)}`, fill: 'var(--positive)', fontSize: 10, position: 'left' }} />
              <ReferenceLine y={params.monthlyUsdTarget} stroke="var(--warning)" strokeDasharray="3 3" label={{ value: `Target ${formatCurrency(params.monthlyUsdTarget)}`, fill: 'var(--warning)', fontSize: 10, position: 'left' }} />
              <ReferenceLine y={ceilingUsdValue} stroke="var(--negative)" strokeDasharray="5 5" label={{ value: `Ceiling ${formatCurrency(ceilingUsdValue)}`, fill: 'var(--negative)', fontSize: 10, position: 'left' }} />
              <Line type="monotone" dataKey="effectiveUsdValue" stroke="var(--accent)" name="Effective USD Value" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} />
              <Line type="monotone" dataKey="usdValue" stroke="var(--muted-foreground)" name="Unadjusted USD Value" strokeWidth={1} strokeDasharray="3 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Table */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Monthly Payout Details</h2>
          <div className="data-grid overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Date</th>
                  <th className="text-left">Year</th>
                  <th className="text-right">Price @ Payout</th>
                  <th className="text-right">Floor</th>
                  <th className="text-right">Ceiling</th>
                  <th className="text-right">Base NEAR</th>
                  <th className="text-right">Effective NEAR</th>
                  <th className="text-right">Delta</th>
                  <th className="text-right">Effective USD</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {(selectedYear === 'all' ? payouts : payouts.filter(p => p.year === selectedYear)).map((p, i) => (
                  <tr key={i}>
                    <td>{p.payoutDate}</td>
                    <td>{p.year}</td>
                    <td className="text-right font-mono">{formatCurrency(p.priceAtPayout)}</td>
                    <td className="text-right font-mono amount-positive">{formatCurrency(p.floorPrice)}</td>
                    <td className="text-right font-mono amount-negative">{formatCurrency(p.ceilingPrice)}</td>
                    <td className="text-right font-mono">{formatNumber(p.fixedNearTokens, 0)}</td>
                    <td className="text-right font-mono font-semibold">{formatNumber(p.effectiveNearTokens, 0)}</td>
                    <td className={`text-right font-mono ${
                      p.nearDelta > 0 ? 'amount-positive' : p.nearDelta < 0 ? 'amount-negative' : 'text-muted-foreground'
                    }`}>
                      {p.nearDelta > 0 ? '+' : ''}{formatNumber(p.nearDelta, 0)}
                    </td>
                    <td className="text-right font-mono">{formatCurrency(p.effectiveUsdValue)}</td>
                    <td>
                      <span className={`variance-pill ${
                        p.status === 'FLOOR HIT' ? 'positive' :
                        p.status === 'CEILING HIT' ? 'negative' : ''
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-8 text-center text-muted-foreground text-sm">
          <p>NEAR Foundation - MPC Governance Payout Calculator</p>
          <p>Data: Oct 2020 - Jan 2026 | Dynamic floor/ceiling based on % of 180-day lookback</p>
        </footer>
      </div>
    </main>
  );
}
