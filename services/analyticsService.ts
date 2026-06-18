/**
 * analyticsService.ts
 * Pure computation – no AI calls.
 * Derives performance analytics and financial analysis entirely from user data.
 */

import type { Farm, FinancialAnalysis, PerformanceAnalyticsData, Transaction } from '../types';

// ─── Farm Performance Analytics ──────────────────────────────

export const computePerformanceAnalytics = (farms: Farm[]): PerformanceAnalyticsData => {
  if (farms.length === 0) {
    return {
      kpis: { averageYield: '0', bestPerformingCrop: '—', worstPerformingCrop: '—', mostProductiveSoil: '—', totalFarms: 0 },
      cropPerformance: [],
      soilPerformance: [],
      insights: [{ type: 'recommendation', text: 'Add your first farm to start seeing performance insights.' }],
      prediction: { predictedYield: '0', reasoning: 'No farm data available yet.' },
      yieldTrend: { labels: [], datasets: [], yieldUnit: 'units' },
    };
  }

  // ── Crop Performance ─────────────────────────────────────
  const cropMap = new Map<string, { totalYield: number; totalArea: number; count: number; yieldUnit: string; areaUnit: string }>();
  for (const farm of farms) {
    const cropName = farm.crop ?? farm.name;
    if (!cropName) continue;
    const existing = cropMap.get(cropName);
    if (existing) {
      existing.totalYield += farm.yield ?? 0;
      existing.totalArea  += farm.area  ?? 0;
      existing.count      += 1;
    } else {
      cropMap.set(cropName, {
        totalYield: farm.yield ?? 0,
        totalArea:  farm.area  ?? 0,
        count: 1,
        yieldUnit: farm.yieldUnit ?? 'units',
        areaUnit:  farm.areaUnit  ?? 'hectare',
      });
    }
  }

  const cropPerformance = Array.from(cropMap.entries()).map(([crop, d]) => ({
    crop,
    averageYield: d.count > 0 ? Math.round((d.totalYield / d.count) * 10) / 10 : 0,
    totalArea:    d.totalArea,
    yieldUnit:    d.yieldUnit,
    areaUnit:     d.areaUnit,
  }));

  const sorted = [...cropPerformance].sort((a, b) => b.averageYield - a.averageYield);
  const bestCrop  = sorted[0]?.crop ?? '—';
  const worstCrop = sorted[sorted.length - 1]?.crop ?? '—';

  // ── Soil Performance ─────────────────────────────────────
  const soilMap = new Map<string, { totalYield: number; count: number; crops: Set<string>; yieldUnit: string; areaUnit: string }>();
  for (const farm of farms) {
    if (!farm.soilType) continue;
    const cropName = farm.crop ?? farm.name;
    const existing = soilMap.get(farm.soilType);
    if (existing) {
      existing.totalYield += farm.yield ?? 0;
      existing.count      += 1;
      if (cropName) existing.crops.add(cropName);
    } else {
      soilMap.set(farm.soilType, {
        totalYield: farm.yield ?? 0,
        count: 1,
        crops: new Set(cropName ? [cropName] : []),
        yieldUnit: farm.yieldUnit ?? 'units',
        areaUnit:  farm.areaUnit  ?? 'hectare',
      });
    }
  }

  const soilPerformance = Array.from(soilMap.entries()).map(([soilType, d]) => ({
    soilType,
    averageYield: d.count > 0 ? Math.round((d.totalYield / d.count) * 10) / 10 : 0,
    cropsGrown:   Array.from(d.crops),
    yieldUnit:    d.yieldUnit,
    areaUnit:     d.areaUnit,
  }));

  const bestSoil = [...soilPerformance].sort((a, b) => b.averageYield - a.averageYield)[0]?.soilType ?? '—';

  // ── KPIs ─────────────────────────────────────────────────
  const yieldsWithData = farms.filter(f => (f.yield ?? 0) > 0);
  const avgYield = yieldsWithData.length > 0
    ? Math.round(yieldsWithData.reduce((s, f) => s + (f.yield ?? 0), 0) / yieldsWithData.length)
    : 0;

  // ── Insights ─────────────────────────────────────────────
  const insights: PerformanceAnalyticsData['insights'] = [];
  if (sorted[0] && sorted[0].averageYield > 0) {
    insights.push({ type: 'positive', text: `${bestCrop} is your highest-yielding crop with an average of ${sorted[0].averageYield} ${sorted[0].yieldUnit}.` });
  }
  if (sorted.length > 1 && sorted[sorted.length - 1].averageYield < sorted[0].averageYield * 0.5) {
    insights.push({ type: 'negative', text: `${worstCrop} is significantly underperforming. Consider reviewing soil conditions or irrigation.` });
  }
  if (farms.some(f => !f.yield)) {
    insights.push({ type: 'recommendation', text: 'Add yield data to your farms to unlock more detailed performance analysis.' });
  }
  if (soilPerformance.length > 0) {
    insights.push({ type: 'positive', text: `${bestSoil} soil is most productive across your portfolio.` });
  }

  // ── Yield Trend (by season) ───────────────────────────────
  const seasonMap = new Map<string, Map<string, number[]>>();
  for (const farm of farms) {
    const season = farm.season ?? 'Unknown';
    const crop   = farm.crop   ?? farm.name ?? 'Unknown';
    if (!seasonMap.has(season)) seasonMap.set(season, new Map());
    const cropEntry = seasonMap.get(season)!;
    if (!cropEntry.has(crop)) cropEntry.set(crop, []);
    cropEntry.get(crop)!.push(farm.yield ?? 0);
  }

  const labels   = Array.from(seasonMap.keys()).sort();
  const cropSet  = new Set(farms.map(f => f.crop ?? f.name).filter(Boolean) as string[]);
  const datasets = Array.from(cropSet).map(crop => ({
    crop,
    data: labels.map(season => {
      const vals = seasonMap.get(season)?.get(crop) ?? [];
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    }),
  }));

  const yieldUnit = farms.find(f => f.yieldUnit)?.yieldUnit ?? 'units';

  // ── Prediction ───────────────────────────────────────────
  const nextYield = avgYield > 0 ? Math.round(avgYield * 1.05) : 0;
  const prediction = {
    predictedYield: `${nextYield} ${yieldUnit}`,
    reasoning:
      avgYield > 0
        ? `Based on your current average yield of ${avgYield} ${yieldUnit} across ${farms.length} farms, a 5% improvement is achievable with optimised irrigation and fertilisation.`
        : 'Add yield data to your farms to enable yield predictions.',
  };

  return {
    kpis: {
      averageYield:      `${avgYield} ${yieldUnit}`,
      bestPerformingCrop:  bestCrop,
      worstPerformingCrop: worstCrop,
      mostProductiveSoil:  bestSoil,
      totalFarms:          farms.length,
    },
    cropPerformance,
    soilPerformance,
    insights,
    prediction,
    yieldTrend: { labels, datasets, yieldUnit },
  };
};

// ─── Financial Analysis ───────────────────────────────────────

export const computeFinancialAnalysis = (transactions: Transaction[], farms: Farm[]): FinancialAnalysis => {
  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netProfit = income - expenses;
  const profitMargin = income > 0 ? `${Math.round((netProfit / income) * 100)}%` : '0%';

  // ── Cost breakdown by category ────────────────────────────
  const catMap = new Map<string, number>();
  for (const t of transactions.filter(t => t.type === 'expense')) {
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
  }
  const costBreakdown = Array.from(catMap.entries()).map(([category, amount]) => ({
    category,
    amount,
    percentage: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
  }));

  // ── Rule-based insights ───────────────────────────────────
  const aiInsights: FinancialAnalysis['aiInsights'] = [];

  if (netProfit > 0) {
    aiInsights.push({ title: 'Profitable Operation', message: `Your farm is generating a net profit of $${netProfit.toLocaleString()}.`, type: 'success' });
  } else if (netProfit < 0) {
    aiInsights.push({ title: 'Operating at Loss', message: `Expenses exceed income by $${Math.abs(netProfit).toLocaleString()}. Review your cost structure.`, type: 'warning' });
  }

  const topCostEntry = [...catMap.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCostEntry) {
    aiInsights.push({ title: `Highest Cost: ${topCostEntry[0]}`, message: `${topCostEntry[0]} accounts for $${topCostEntry[1].toLocaleString()} of your total expenses.`, type: 'tip' });
  }

  if (income === 0) {
    aiInsights.push({ title: 'No Income Recorded', message: 'Add income transactions to track profitability.', type: 'tip' });
  }

  // ── Cost per unit (if farm yield available) ───────────────
  const totalYield = farms.reduce((s, f) => s + (f.yield ?? 0), 0);
  const yieldUnit  = farms.find(f => f.yieldUnit)?.yieldUnit ?? 'unit';
  const costPerUnit = totalYield > 0 ? `$${(expenses / totalYield).toFixed(2)} / ${yieldUnit}` : undefined;

  return { netProfit, profitMargin, costBreakdown, aiInsights, costPerUnit };
};
