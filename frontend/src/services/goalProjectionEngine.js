/**
 * Goal Projection Engine — compound-interest projections for financial goals.
 * All projections use real returns (nominal - inflation) so amounts are in today's euros.
 */

export const GOAL_TYPES = {
  emergency_fund: { label: "Fonds d'urgence",         color: '#22c55e', icon: 'Shield' },
  investment:     { label: 'Investissement',           color: '#3b82f6', icon: 'TrendingUp' },
  real_estate:    { label: 'Achat immobilier',         color: '#f59e0b', icon: 'Building' },
  freedom:        { label: 'Liberté financière',       color: '#8b5cf6', icon: 'Sunrise' },
  other:          { label: 'Autre objectif',           color: '#94a3b8', icon: 'Target' },
}

export const INFLATION_RATE = 0.02

// Annual nominal rates used for compound-interest goals
const ANNUAL_RATES = { emergency_fund: 0.02, investment: 0.07, real_estate: 0.04, freedom: 0.06, other: 0.03 }

// Rates derived from user-selected risk profile (used preferentially over ANNUAL_RATES)
const RISK_PROFILE_RATES = {
  conservative: 0.04,
  balanced: 0.06,
  growth: 0.08,
  aggressive: 0.10,
}

// Goal types that use compound interest and inflation adjustment
const LONG_TERM_TYPES = ['investment', 'real_estate', 'freedom', 'long_term']

export { ANNUAL_RATES, RISK_PROFILE_RATES }

/**
 * Compute future value at month n with real (inflation-adjusted) monthly rate.
 * FV_real = PV*(1+r_real)^n + PMT*((1+r_real)^n - 1)/r_real
 */
function futureValueReal(pv, pmt, monthlyRealRate, months) {
  if (monthlyRealRate === 0) return pv + pmt * months
  const factor = (1 + monthlyRealRate) ** months
  return pv * factor + pmt * (factor - 1) / monthlyRealRate
}

/**
 * Binary search for number of months to reach target using real returns.
 */
function findMonthsToTarget(currentAmount, monthlyContribution, monthlyRealRate, targetAmount) {
  if (currentAmount >= targetAmount) return 0
  if (monthlyContribution <= 0 && monthlyRealRate <= 0) return null

  let lo = 0, hi = 600
  // Check if achievable within 50 years
  const fvMax = futureValueReal(currentAmount, monthlyContribution, monthlyRealRate, hi)
  if (fvMax < targetAmount) return null

  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    const fv = futureValueReal(currentAmount, monthlyContribution, monthlyRealRate, mid)
    if (fv >= targetAmount) hi = mid; else lo = mid
  }
  return hi
}

/**
 * Project when a goal will be reached.
 * Uses real returns (nominal - inflation) so the result is in today's purchasing power.
 *
 * @param {Object} goal – { type, targetAmount, currentAmount, monthlyContribution }
 * @returns {{ monthsToReach, projectedDate, progressPct, projectedAmount, realRate, nominalRate }}
 */
export function projectGoal(goal) {
  const { type, targetAmount = 0, currentAmount = 0, monthlyContribution = 0, riskProfile } = goal
  const progressPct = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 1000) / 10) : 0

  if (currentAmount >= targetAmount) {
    return { monthsToReach: 0, projectedDate: new Date().toISOString().slice(0, 7), progressPct: 100, projectedAmount: currentAmount, realRate: 0, nominalRate: 0 }
  }
  if (!monthlyContribution || monthlyContribution <= 0) {
    return { monthsToReach: null, projectedDate: null, progressPct, projectedAmount: currentAmount, realRate: 0, nominalRate: 0 }
  }

  // Use riskProfile rate if available, otherwise fall back to type-based rate
  const nominalRate = (riskProfile && RISK_PROFILE_RATES[riskProfile]) || ANNUAL_RATES[type] || 0.03
  const useCompound = LONG_TERM_TYPES.includes(type) || !!(riskProfile && RISK_PROFILE_RATES[riskProfile])
  const isLongTerm = LONG_TERM_TYPES.includes(type)
  const inflationApplied = isLongTerm ? INFLATION_RATE : 0

  let monthsToReach

  if (useCompound && nominalRate > 0) {
    const realAnnual = (1 + nominalRate) / (1 + inflationApplied) - 1
    const monthlyReal = realAnnual / 12
    monthsToReach = findMonthsToTarget(currentAmount, monthlyContribution, monthlyReal, targetAmount)
  } else {
    // Simple accumulation (no compound)
    if (isLongTerm) {
      const monthlyInflation = inflationApplied / 12
      const monthlyReal = -monthlyInflation
      monthsToReach = findMonthsToTarget(currentAmount, monthlyContribution, monthlyReal, targetAmount)
    } else {
      // Short-term / security: no inflation, simple division
      const remaining = targetAmount - currentAmount
      monthsToReach = Math.ceil(remaining / monthlyContribution)
    }
  }

  if (monthsToReach === null) {
    return { monthsToReach: null, projectedDate: null, progressPct, projectedAmount: currentAmount, realRate: nominalRate - inflationApplied, nominalRate }
  }

  // Cap at 50 years (600 months) — beyond that, date is not meaningful
  let projectedDate = null
  if (monthsToReach <= 600) {
    try {
      const projDate = new Date()
      projDate.setMonth(projDate.getMonth() + monthsToReach)
      const iso = projDate.toISOString().slice(0, 7)
      if (iso && !iso.includes('NaN')) projectedDate = iso
    } catch { /* invalid date — leave null */ }
  }

  return {
    monthsToReach,
    projectedDate,
    progressPct,
    projectedAmount: Math.round(targetAmount),
    realRate:        nominalRate - inflationApplied,
    nominalRate,
  }
}

/**
 * Analyze goal feasibility and suggest adjustments if not achievable.
 * Returns { feasible, monthsToReach, projectedDate, suggestions[] }
 */
export function analyzeFeasibility({ type, targetAmount, currentAmount, monthlyContribution, targetDate }) {
  const projection = projectGoal({ type, targetAmount, currentAmount, monthlyContribution })
  const suggestions = []

  const targetDateMonths = targetDate
    ? Math.max(0, Math.round((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24 * 30.44)))
    : null

  // Check if achievable at all
  const feasible = projection.monthsToReach !== null

  // Check if achievable within target date
  const withinDate = feasible && targetDateMonths !== null
    ? projection.monthsToReach <= targetDateMonths
    : feasible

  if (!feasible || !withinDate) {
    const nominalRate = ANNUAL_RATES[type] || 0.03
    const isLongTerm = ['investment', 'real_estate', 'freedom'].includes(type)
    const inflationApplied = isLongTerm ? INFLATION_RATE : 0
    const realAnnual = (1 + nominalRate) / (1 + inflationApplied) - 1
    const monthlyReal = realAnnual / 12
    const horizon = targetDateMonths || 240 // default 20 years if no date

    // Suggestion 1: Required monthly contribution to reach target in time
    const remaining = targetAmount - currentAmount
    if (remaining > 0 && horizon > 0) {
      let requiredMonthly
      if (monthlyReal > 0) {
        const factor = (1 + monthlyReal) ** horizon
        const pvGrowth = currentAmount * factor
        requiredMonthly = (targetAmount - pvGrowth) / ((factor - 1) / monthlyReal)
      } else {
        requiredMonthly = remaining / horizon
      }
      if (requiredMonthly > 0 && Math.round(requiredMonthly) !== Math.round(monthlyContribution)) {
        suggestions.push({
          type: 'contribution',
          label: 'Épargne mensuelle nécessaire',
          value: Math.ceil(requiredMonthly / 10) * 10,
        })
      }
    }

    // Suggestion 2: Achievable amount with current contribution & date
    if (targetDateMonths && monthlyContribution > 0) {
      const achievable = Math.round(futureValueReal(currentAmount, monthlyContribution, monthlyReal, targetDateMonths))
      if (achievable < targetAmount) {
        suggestions.push({
          type: 'target',
          label: 'Montant atteignable à cette date',
          value: Math.floor(achievable / 1000) * 1000,
        })
      }
    }

    // Suggestion 3: Extended horizon with current contribution
    if (monthlyContribution > 0 && projection.monthsToReach && targetDateMonths && projection.monthsToReach > targetDateMonths) {
      const extDate = new Date()
      extDate.setMonth(extDate.getMonth() + projection.monthsToReach)
      suggestions.push({
        type: 'horizon',
        label: 'Date réaliste avec cette épargne',
        value: extDate.toISOString().slice(0, 7),
        months: projection.monthsToReach,
      })
    }
  }

  return {
    feasible: feasible && withinDate,
    monthsToReach: projection.monthsToReach,
    projectedDate: projection.projectedDate,
    targetDateMonths,
    suggestions,
  }
}

/**
 * Generate sensible default goals from financial context.
 */
export function getDefaultGoals(avgMonthlyExpenses, totalCash) {
  const now = new Date().toISOString()
  return [
    {
      id:                  `goal_emergency_${Date.now()}`,
      type:                'emergency_fund',
      label:               "Fonds d'urgence (6 mois)",
      targetAmount:        Math.round(avgMonthlyExpenses * 6 / 100) * 100 || 9000,
      currentAmount:       Math.max(0, totalCash),
      monthlyContribution: Math.round((avgMonthlyExpenses * 0.10) / 50) * 50 || 200,
      createdAt:           now,
    },
  ]
}

/**
 * Format months-to-reach into a human string.
 */
export function fmtMonths(months) {
  if (months === null || months === undefined) return '—'
  if (months <= 0)  return 'Atteint !'
  if (months > 600) return '+50 ans'
  if (months < 12)  return `${months} mois`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? `${y} an${y > 1 ? 's' : ''} ${m} mois` : `${y} an${y > 1 ? 's' : ''}`
}
