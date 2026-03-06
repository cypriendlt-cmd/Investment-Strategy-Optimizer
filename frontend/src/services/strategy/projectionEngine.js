/**
 * projectionEngine.js
 *
 * Core mathematical engine for portfolio projections.
 * All calculations are monthly granularity, restitution is annual.
 *
 * Formula: Value(m+1) = (Value(m) + Contribution(m)) × (1 + return_m)
 * Real value applies inflation discount.
 */

/**
 * Project a single asset/envelope trajectory over N months.
 *
 * @param {number} startValue - current value
 * @param {number} monthlyContribution - monthly investment
 * @param {number} monthlyReturn - monthly return rate (e.g. 0.0057 for 7% annual)
 * @param {number} months - projection horizon in months
 * @param {number} monthlyInflation - monthly inflation rate
 * @returns {Array} monthly trajectory points
 */
export function projectTrajectory(startValue, monthlyContribution, monthlyReturn, months, monthlyInflation = 0) {
  const trajectory = []
  let nominal = startValue
  let contributions = 0

  for (let m = 0; m <= months; m++) {
    const realFactor = Math.pow(1 + monthlyInflation, m)
    trajectory.push({
      month: m,
      year: m / 12,
      nominal: Math.round(nominal),
      real: Math.round(nominal / realFactor),
      contributions: Math.round(contributions),
      gains: Math.round(nominal - startValue - contributions),
    })

    if (m < months) {
      nominal = (nominal + monthlyContribution) * (1 + monthlyReturn)
      contributions += monthlyContribution
    }
  }

  return trajectory
}

/**
 * Aggregate projection for a single envelope.
 */
export function projectEnvelope(envelope) {
  return projectTrajectory(
    envelope.currentValue,
    envelope.monthlyContribution,
    envelope.monthlyReturn,
    envelope.horizonMonths || 120,
    envelope.monthlyInflation || 0,
  )
}

/**
 * Aggregate projection for the entire portfolio.
 * Projects each envelope independently then sums.
 */
export function projectPortfolio(inputs) {
  const { envelopes, horizonMonths, monthlyInflation, bankCash = 0 } = inputs

  // Project each envelope
  const envelopeProjections = envelopes.map(env => ({
    ...env,
    trajectory: projectTrajectory(
      env.currentValue,
      env.monthlyContribution,
      env.monthlyReturn,
      horizonMonths,
      monthlyInflation,
    ),
  }))

  // Aggregate total trajectory
  const totalTrajectory = []
  for (let m = 0; m <= horizonMonths; m++) {
    let nominal = bankCash
    let real = bankCash / Math.pow(1 + monthlyInflation, m)
    let contributions = 0
    let gains = 0

    for (const ep of envelopeProjections) {
      const point = ep.trajectory[m]
      nominal += point.nominal
      real += point.real
      contributions += point.contributions
      gains += point.gains
    }

    totalTrajectory.push({
      month: m,
      year: m / 12,
      nominal: Math.round(nominal),
      real: Math.round(real),
      contributions: Math.round(contributions),
      gains: Math.round(gains),
    })
  }

  return {
    totalTrajectory,
    envelopeProjections,
  }
}

/**
 * Extract annual milestones from a trajectory.
 */
export function computeMilestones(trajectory, milestoneYears = [1, 3, 5, 10, 20, 30]) {
  return milestoneYears
    .map(y => {
      const m = y * 12
      const point = trajectory.find(p => p.month === m)
      if (!point) return null
      return { year: y, ...point }
    })
    .filter(Boolean)
}

/**
 * Convert monthly trajectory to annual data points for charts.
 */
export function toAnnualSeries(trajectory, horizonYears) {
  const result = []
  for (let y = 0; y <= horizonYears; y++) {
    const point = trajectory.find(p => p.month === y * 12)
    if (point) {
      result.push({
        label: y === 0 ? 'Auj.' : `+${y}a`,
        year: y,
        ...point,
      })
    }
  }
  return result
}

/**
 * Calculate required monthly contribution to reach a target.
 * Uses binary search for precision.
 */
export function computeRequiredContribution(currentValue, targetAmount, monthlyReturn, months) {
  let low = 0
  let high = targetAmount

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2
    const trajectory = projectTrajectory(currentValue, mid, monthlyReturn, months)
    const finalValue = trajectory[trajectory.length - 1].nominal

    if (finalValue < targetAmount) {
      low = mid
    } else {
      high = mid
    }
  }

  return Math.ceil((low + high) / 2)
}

/**
 * Calculate when a target amount will be reached.
 * Returns month number, or -1 if never reached within maxMonths.
 */
export function computeTimeToTarget(currentValue, targetAmount, monthlyContribution, monthlyReturn, maxMonths = 600) {
  let value = currentValue

  for (let m = 0; m <= maxMonths; m++) {
    if (value >= targetAmount) return m
    value = (value + monthlyContribution) * (1 + monthlyReturn)
  }

  return -1
}
