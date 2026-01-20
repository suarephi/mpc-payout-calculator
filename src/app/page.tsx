'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart, Area
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
    floorPrice: 1.50,
    ceilingPrice: 3.00
  });

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const payouts = useMemo(() =>
    calculatePayouts(typedPriceData, params),
    [params]
  );

  const summaries = useMemo(() => summarizeByYear(payouts), [payouts]);

  const chartData = useMemo(() => {
    const filtered = selectedYear === 'all'
      ? typedPriceData
      : typedPriceData.filter(d => d.date.startsWith(String(selectedYear)));

    return filtered.map(d => ({
      date: d.date,
      price: d.close,
      floor: params.floorPrice,
      ceiling: params.ceilingPrice
    }));
  }, [selectedYear, params.floorPrice, params.ceilingPrice]);

  const payoutChartData = useMemo(() => {
    const filtered = selectedYear === 'all'
      ? payouts
      : payouts.filter(p => p.year === selectedYear);

    return filtered.map(p => ({
      date: p.payoutDate,
      price: p.priceAtPayout,
      usdValue: p.usdValueAtPayout,
      floor: params.floorPrice,
      ceiling: params.ceilingPrice,
      floorValue: params.monthlyUsdTarget,
      ceilingValue: params.monthlyUsdTarget * 2,
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
          NEAR Protocol - Floor & Ceiling Analysis with 180-day Lookback Pricing
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
              <label className="block text-sm text-gray-400 mb-1">Floor Price ($)</label>
              <input
                type="number"
                step="0.1"
                value={params.floorPrice}
                onChange={(e) => setParams({ ...params, floorPrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ceiling Price ($)</label>
              <input
                type="number"
                step="0.1"
                value={params.ceilingPrice}
                onChange={(e) => setParams({ ...params, ceilingPrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 rounded px-3 py-2 text-white"
              />
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
          {summaries.map(s => (
            <div key={s.year} className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-cyan-400">{s.year}</h3>
              <p className="text-xs text-gray-400">180d Avg: {formatCurrency(s.basePrice180d)}</p>
              <p className="text-xs text-gray-400">Adj: {formatCurrency(s.adjustedBasePrice)}</p>
              <p className="text-sm mt-2">{formatNumber(s.fixedNearTokens, 0)} NEAR/mo</p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-green-400">F:{s.floorCount}</span>
                <span className="text-red-400">C:{s.ceilingCount}</span>
                <span className="text-blue-400">N:{s.normalCount}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Price Chart */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">NEAR Price with Floor/Ceiling Boundaries</h2>
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
              />
              <Legend />
              <Area
                dataKey="ceiling"
                fill="#3B82F6"
                fillOpacity={0.1}
                stroke="none"
                name="Ceiling Zone"
              />
              <ReferenceLine y={params.floorPrice} stroke="#22C55E" strokeDasharray="5 5" label={{ value: `Floor $${params.floorPrice}`, fill: '#22C55E', fontSize: 12 }} />
              <ReferenceLine y={params.ceilingPrice} stroke="#EF4444" strokeDasharray="5 5" label={{ value: `Ceiling $${params.ceilingPrice}`, fill: '#EF4444', fontSize: 12 }} />
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
                  if (name === 'USD Value' && typeof value === 'number') return formatCurrency(value);
                  return value;
                }}
              />
              <Legend />
              <ReferenceLine y={params.monthlyUsdTarget} stroke="#22C55E" strokeDasharray="5 5" label={{ value: `Floor Value $${params.monthlyUsdTarget}`, fill: '#22C55E', fontSize: 10 }} />
              <ReferenceLine y={params.monthlyUsdTarget * 2} stroke="#EF4444" strokeDasharray="5 5" label={{ value: `Ceiling Value $${params.monthlyUsdTarget * 2}`, fill: '#EF4444', fontSize: 10 }} />
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
                  <th className="pb-2 pr-4">180d Base</th>
                  <th className="pb-2 pr-4">Adjusted</th>
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
                    <td className="py-2 pr-4">{formatCurrency(p.adjustedBasePrice)}</td>
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
          <p>Data: Oct 2020 - Jan 2026 | 180-day lookback average pricing</p>
        </footer>
      </div>
    </main>
  );
}
