/**
 * strategyInputBuilder.js
 *
 * Transforms a portfolio snapshot into projection-ready inputs.
 * Applies default return hypotheses per asset class.
 */

const DEFAULT_RETURNS = {
  etf: 0.07,
  cash: 0.02,
  crypto: 0.10,
  immo: 0.05,
  other: 0.03,
}

const DEFAULT_INFLATION = 0.025

/**
 * Build projection inputs from a portfolio snapshot.
 *
 * @param {object} snapshot - from portfolioDataProvider.buildPortfolioSnapshot
 * @param {object} overrides - user overrides for hypotheses
 * @returns {object} projection-ready input
 */
export function buildStrategyInputs(snapshot, overrides = {}) {
  const {
    monthlyContribution = snapshot.estimatedMonthlySavings || 500,
    horizonYears = 10,
    inflation = DEFAULT_INFLATION,
    returnOverrides = {},
  } = overrides

  const envelopes = snapshot.envelopes.map(env => {
    const annualReturn = returnOverrides[env.assetClass] ?? DEFAULT_RETURNS[env.assetClass] ?? 0.05
    return {
      id: env.id,
      label: env.label,
      assetClass: env.assetClass,
      currentValue: env.currentValue,
      annualReturn,
      monthlyReturn: Math.pow(1 + annualReturn, 1 / 12) - 1,
    }
  })

  // Distribute monthly contribution proportionally to current allocation
  const totalValue = envelopes.reduce((s, e) => s + e.currentValue, 0)
  const envelopesWithContribution = envelopes.map(env => ({
    ...env,
    allocationPct: totalValue > 0 ? env.currentValue / totalValue : 1 / envelopes.length,
    monthlyContribution: totalValue > 0
      ? monthlyContribution * (env.currentValue / totalValue)
      : monthlyContribution / envelopes.length,
  }))

  return {
    totalValue: snapshot.totalValue,
    bankCash: snapshot.bankCash,
    envelopes: envelopesWithContribution,
    monthlyContribution,
    horizonYears,
    horizonMonths: horizonYears * 12,
    inflation,
    monthlyInflation: Math.pow(1 + inflation, 1 / 12) - 1,
  }
}

/**
 * Build inputs specifically for objective calculation.
 */
export function buildObjectiveInputs(snapshot, objectiveParams) {
  const {
    targetAmount = 500000,
    horizonYears = 15,
    monthlyContribution = 500,
    strategyProfile = 'moderate',
    inflation = DEFAULT_INFLATION,
  } = objectiveParams

  const profileReturns = {
    conservative: 0.04,
    moderate: 0.06,
    aggressive: 0.09,
  }

  const blendedReturn = profileReturns[strategyProfile] ?? profileReturns.moderate

  return {
    currentValue: snapshot.totalValue,
    targetAmount,
    horizonYears,
    horizonMonths: horizonYears * 12,
    monthlyContribution,
    annualReturn: blendedReturn,
    monthlyReturn: Math.pow(1 + blendedReturn, 1 / 12) - 1,
    inflation,
    monthlyInflation: Math.pow(1 + inflation, 1 / 12) - 1,
  }
}

export { DEFAULT_RETURNS, DEFAULT_INFLATION }
