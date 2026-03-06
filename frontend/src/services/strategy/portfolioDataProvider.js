/**
 * portfolioDataProvider.js
 *
 * Extracts and normalizes data from the Portfolio Core
 * for consumption by the Strategy Engine.
 *
 * Input: portfolio, totals, accountBalances, aggregates, dcaPlans
 * Output: normalized snapshot of the user's financial situation
 */

const ASSET_CLASS_MAP = {
  crypto: 'crypto',
  pea: 'etf',
  livrets: 'cash',
  fundraising: 'other',
}

/**
 * Build a normalized snapshot of the user's entire financial position.
 */
export function buildPortfolioSnapshot(portfolio, totals, accountBalances = [], aggregates = []) {
  const bankLivrets = accountBalances.filter(a => a.type !== 'courant').reduce((s, a) => s + a.balance, 0)
  const bankCash = accountBalances.filter(a => a.type === 'courant').reduce((s, a) => s + a.balance, 0)

  const envelopes = [
    {
      id: 'crypto',
      label: 'Crypto',
      assetClass: 'crypto',
      currentValue: totals.crypto,
      positions: (portfolio.crypto || []).map(c => ({
        id: c.id,
        name: c.name || c.symbol,
        value: (c.currentPrice || c.buyPrice) * c.quantity,
        invested: c.buyPrice * c.quantity,
      })),
    },
    {
      id: 'pea',
      label: 'PEA',
      assetClass: 'etf',
      currentValue: totals.pea,
      positions: (portfolio.pea || []).map(p => ({
        id: p.id,
        name: p.name || p.symbol,
        value: (p.currentPrice || p.buyPrice) * p.quantity,
        invested: p.buyPrice * p.quantity,
      })),
    },
    {
      id: 'livrets',
      label: 'Livrets',
      assetClass: 'cash',
      currentValue: totals.livrets + bankLivrets,
      positions: (portfolio.livrets || []).map(l => ({
        id: l.id,
        name: l.name,
        value: l.balance,
        invested: l.balance,
      })),
    },
    {
      id: 'fundraising',
      label: 'Levées de fonds',
      assetClass: 'other',
      currentValue: totals.fundraising,
      positions: (portfolio.fundraising || []).map(f => ({
        id: f.id,
        name: f.name,
        value: f.amountInvested,
        invested: f.amountInvested,
      })),
    },
  ]

  // Estimate monthly contribution from aggregates or DCA
  const lastMonths = (aggregates || []).slice(-3)
  const avgSavings = lastMonths.length > 0
    ? lastMonths.reduce((s, a) => s + ((a.income || 0) - (a.expenses || 0)), 0) / lastMonths.length
    : 0

  const totalValue = envelopes.reduce((s, e) => s + e.currentValue, 0) + bankCash
  const totalInvested = envelopes.reduce((s, e) => s + e.positions.reduce((ps, p) => ps + p.invested, 0), 0)

  return {
    totalValue,
    totalInvested,
    totalGain: totalValue - totalInvested,
    bankCash,
    envelopes,
    estimatedMonthlySavings: Math.max(avgSavings, 0),
    objectives: portfolio.objectives || [],
  }
}

/**
 * Extract monthly contribution from DCA plans.
 */
export function getDcaMonthlyContribution(dcaPlans) {
  const plans = dcaPlans?.plans || []
  return plans
    .filter(p => p.enabled)
    .reduce((total, plan) => {
      if (plan.cadence === 'monthly') return total + plan.amount_per_period
      if (plan.cadence === 'weekly') return total + plan.amount_per_period * 4.33
      if (plan.cadence === 'daily') return total + plan.amount_per_period * 30
      return total
    }, 0)
}
