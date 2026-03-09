/**
 * strategyInputBuilder.js
 *
 * Transforms a portfolio snapshot into projection-ready inputs.
 * Applies default return hypotheses per asset class.
 */

export const DEFAULT_RETURNS = {
  etf: 0.07,
  cash: 0.02,
  crypto: 0.10,
  immo: 0.05,
  other: 0.03,
}

export const DEFAULT_INFLATION = 0.025

/**
 * Build envelope contributions using DCA plans as priority source.
 *
 * Priority logic:
 * 1. If a DCA plan exists for an envelope, assign its monthly amount directly
 * 2. For envelopes without DCA, distribute the remaining budget proportionally to current value
 * 3. If no DCA plans at all, fall back to proportional distribution (original behavior)
 *
 * @param {Array} envelopes - envelopes with currentValue
 * @param {object} dcaByEnvelope - { crypto: 200, pea: 100, ... } monthly DCA per envelope
 * @param {number} totalMonthlyContribution - total budget to distribute
 * @returns {Array} envelopes with monthlyContribution assigned
 */
function buildEnvelopeContributions(envelopes, dcaByEnvelope, totalMonthlyContribution) {
  const totalValue = envelopes.reduce((s, e) => s + e.currentValue, 0)
  const hasDca = dcaByEnvelope && Object.values(dcaByEnvelope).some(v => v > 0)

  if (!hasDca) {
    // Fallback: proportional distribution based on current value
    return envelopes.map(env => ({
      ...env,
      allocationPct: totalValue > 0 ? env.currentValue / totalValue : 1 / envelopes.length,
      monthlyContribution: totalValue > 0
        ? totalMonthlyContribution * (env.currentValue / totalValue)
        : totalMonthlyContribution / envelopes.length,
    }))
  }

  // Assign DCA amounts first, then distribute remainder
  let dcaAssigned = 0
  const envsWithDca = envelopes.map(env => {
    const dcaAmount = dcaByEnvelope[env.id] || 0
    dcaAssigned += dcaAmount
    return { ...env, dcaAmount }
  })

  const remainder = Math.max(0, totalMonthlyContribution - dcaAssigned)
  const envsWithoutDca = envsWithDca.filter(e => e.dcaAmount === 0)
  const totalWithoutDca = envsWithoutDca.reduce((s, e) => s + e.currentValue, 0)

  return envsWithDca.map(env => {
    let contribution = env.dcaAmount
    if (env.dcaAmount === 0 && remainder > 0) {
      contribution = totalWithoutDca > 0
        ? remainder * (env.currentValue / totalWithoutDca)
        : remainder / envsWithoutDca.length
    }
    return {
      ...env,
      allocationPct: totalValue > 0 ? env.currentValue / totalValue : 1 / envelopes.length,
      monthlyContribution: contribution,
    }
  })
}

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
    dcaByEnvelope = {},
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

  const envelopesWithContribution = buildEnvelopeContributions(envelopes, dcaByEnvelope, monthlyContribution)

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

export { buildEnvelopeContributions }

/**
 * Build inputs specifically for objective calculation.
 */
export function buildObjectiveInputs(snapshot, objectiveParams) {
  const {
    targetAmount = 500000,
    horizonYears = 15,
    monthlyContribution = 500,
    annualReturn,
    strategyProfile = 'balanced',
    inflation = DEFAULT_INFLATION,
  } = objectiveParams

  const profileReturns = {
    conservative: 0.04,
    balanced: 0.06,
    growth: 0.08,
    aggressive: 0.10,
  }

  const blendedReturn = annualReturn ?? profileReturns[strategyProfile] ?? profileReturns.balanced

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

