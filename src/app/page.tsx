'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Area
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
    floorPercent: 0.80,    // 80% of 180d avg
    ceilingPercent: 1.70   // 170% of 180d avg
  });

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const payouts = useMemo(() =>
    calculatePayouts(typedPriceData, params),
    [params]
  );

  const summaries = useMemo(() => summarizeByYear(payouts), [payouts]);

  // Build chart data with dynamic floor/ceiling per year
  const chartData = useMemo(() => {
    if (selectedYear === 'all') {
      // For all years view, show price with year-specific boundaries
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
      floor: p.floorPrice,
      ceiling: p.ceilingPrice,
      floorValue: params.monthlyUsdTarget * params.floorPercent,
      ceilingValue: params.monthlyUsdTarget * params.ceilingPercent,
      status: p.status,
      nearTokens: p.fixedNearTokens
    }));
  }, [payouts, selectedYear, params]);

  const years = [2021, 2022, 2023, 2024, 2025, 2026];

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">MPC Node Payout Calculator</h1>
        <p className="text-gray-400 mb-6">
          NEAR Protocol - Dynamic Floor & Ceiling Analysis (% of 180-day Lookback)
        </p>

        {/* Parameters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Monthly USD Target</label>
              <input
                type="number"
                value={params.monthlyUsdTarget}
                onChange={(e) => setParams({ ...params, monthlyUsdTarget: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Floor (% of 180d Avg)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="5"
                  value={Math.round(params.floorPercent * 100)}
                  onChange={(e) => setParams({ ...params, floorPercent: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white"
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ceiling (% of 180d Avg)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="5"
                  value={Math.round(params.ceilingPercent * 100)}
                  onChange={(e) => setParams({ ...params, ceilingPercent: (parseFloat(e.target.value) || 0) / 100 })}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white"
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Filter Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full bg-gray-700 rounded px-3 py-2 text-white"
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
            // Highlight the previous year's card when filtering (since 180d lookback uses prior year data)
            const isHighlighted = selectedYear !== 'all' && s.year === selectedYear - 1;
            const isSelected = selectedYear === s.year;
            return (
              <div
                key={s.year}
                className={`rounded-lg p-4 transition-all ${
                  isHighlighted
                    ? 'bg-cyan-900 ring-2 ring-cyan-400'
                    : isSelected
                      ? 'bg-gray-700 ring-2 ring-blue-400'
                      : 'bg-gray-800'
                }`}
              >
                <h3 className="text-lg font-bold text-cyan-400">{s.year}</h3>
                {isHighlighted && (
                  <p className="text-xs text-cyan-300 mb-1">← 180d lookback source</p>
                )}
                <p className="text-xs text-gray-400">180d Avg: {formatCurrency(s.basePrice180d)}</p>
                <p className="text-xs text-green-400">Floor: {formatCurrency(s.floorPrice)}</p>
                <p className="text-xs text-red-400">Ceiling: {formatCurrency(s.ceilingPrice)}</p>
                <p className="text-sm mt-2">{formatNumber(s.fixedNearTokens, 0)} NEAR/mo</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-green-400">F:{s.floorCount}</span>
                  <span className="text-red-400">C:{s.ceilingCount}</span>
                  <span className="text-blue-400">N:{s.normalCount}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Price Chart with Dynamic Boundaries */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">NEAR Price with Dynamic Floor/Ceiling Boundaries</h2>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.substring(0, 7)}
              />
              <YAxis stroke="#9CA3AF" domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
                formatter={(value, name) => {
                  if (typeof value === 'number') return formatCurrency(value);
                  return value;
                }}
              />
              <Legend />
              <Area
                type="stepAfter"
                dataKey="ceiling"
                fill="#EF4444"
                fillOpacity={0.1}
                stroke="#EF4444"
                strokeDasharray="5 5"
                name={`Ceiling (${Math.round(params.ceilingPercent * 100)}%)`}
              />
              <Line
                type="stepAfter"
                dataKey="strikePrice"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                name="180d Strike Price"
              />
              <Area
                type="stepAfter"
                dataKey="floor"
                fill="#22C55E"
                fillOpacity={0.1}
                stroke="#22C55E"
                strokeDasharray="5 5"
                name={`Floor (${Math.round(params.floorPercent * 100)}%)`}
              />
              <Line type="monotone" dataKey="price" stroke="#3B82F6" dot={false} name="NEAR Price" strokeWidth={1.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Payout Value Chart */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Payout USD Value</h2>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={payoutChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.substring(0, 7)}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                formatter={(value, name) => {
                  if (typeof value === 'number') return formatCurrency(value);
                  return value;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="usdValue" stroke="#8B5CF6" name="USD Value" strokeWidth={2} dot={{ fill: '#8B5CF6', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Table */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Payout Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Year</th>
                  <th className="pb-2 pr-4">180d Avg</th>
                  <th className="pb-2 pr-4">Floor</th>
                  <th className="pb-2 pr-4">Ceiling</th>
                  <th className="pb-2 pr-4">NEAR Tokens</th>
                  <th className="pb-2 pr-4">Price @ Payout</th>
                  <th className="pb-2 pr-4">USD Value</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(selectedYear === 'all' ? payouts : payouts.filter(p => p.year === selectedYear)).map((p, i) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-2 pr-4">{p.payoutDate}</td>
                    <td className="py-2 pr-4">{p.year}</td>
                    <td className="py-2 pr-4">{formatCurrency(p.basePrice180d)}</td>
                    <td className="py-2 pr-4 text-green-400">{formatCurrency(p.floorPrice)}</td>
                    <td className="py-2 pr-4 text-red-400">{formatCurrency(p.ceilingPrice)}</td>
                    <td className="py-2 pr-4">{formatNumber(p.fixedNearTokens, 0)}</td>
                    <td className="py-2 pr-4">{formatCurrency(p.priceAtPayout)}</td>
                    <td className="py-2 pr-4">{formatCurrency(p.usdValueAtPayout)}</td>
                    <td className={`py-2 font-medium ${
                      p.status === 'FLOOR HIT' ? 'text-green-400' :
                      p.status === 'CEILING HIT' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {p.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>NEAR Foundation - MPC Governance Payout Calculator</p>
          <p>Data: Oct 2020 - Jan 2026 | Dynamic floor/ceiling based on % of 180-day lookback</p>
        </footer>
      </div>
    </main>
  );
}
