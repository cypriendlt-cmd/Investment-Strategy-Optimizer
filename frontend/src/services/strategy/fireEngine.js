/**
 * fireEngine.js — FIRE Calculator (Financial Independence, Retire Early)
 *
 * Computes Freedom Number, years to FIRE, and scenario comparisons
 * based on the 4% withdrawal rule (Trinity Study, 1998).
 */

const FIRE_PROFILES = {
  prudent: { label: 'Prudent', annualReturn: 0.04 },
  equilibre: { label: 'Équilibré', annualReturn: 0.07 },
  dynamique: { label: 'Dynamique', annualReturn: 0.10 },
}

const WITHDRAWAL_RATES = [
  { value: 0.03, label: '3 %', desc: 'Ultra-conservateur — quasi aucun risque d\'épuisement sur 40+ ans' },
  { value: 0.035, label: '3,5 %', desc: 'Conservateur — très faible risque sur 30+ ans' },
  { value: 0.04, label: '4 %', desc: 'Règle classique (Trinity Study) — soutenable sur 30 ans dans 95 % des cas historiques' },
  { value: 0.05, label: '5 %', desc: 'Agressif — risque d\'épuisement en cas de marchés baissiers prolongés' },
]

/**
 * Compute the Freedom Number (capital needed for financial independence).
 */
function computeFreedomNumber(monthlyExpenses, withdrawalRate = 0.04) {
  if (monthlyExpenses <= 0 || withdrawalRate <= 0) return 0
  return Math.round((monthlyExpenses * 12) / withdrawalRate)
}

/**
 * Compute years to reach FIRE via monthly compound growth.
 * Returns { months, years, projectedDate } or null if unreachable.
 */
function computeYearsToFire(currentWealth, freedomNumber, monthlyContribution, annualReturn) {
  if (currentWealth >= freedomNumber) {
    return { months: 0, years: 0, projectedDate: new Date().toISOString().slice(0, 7) }
  }
  if (monthlyContribution <= 0 && annualReturn <= 0) return null

  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1
  let wealth = currentWealth

  for (let m = 1; m <= 600; m++) {
    wealth = (wealth + monthlyContribution) * (1 + monthlyReturn)
    if (wealth >= freedomNumber) {
      const years = Math.floor(m / 12)
      const remainingMonths = m % 12
      const date = new Date()
      date.setMonth(date.getMonth() + m)
      return {
        months: m,
        years,
        remainingMonths,
        projectedDate: date.toISOString().slice(0, 7),
        label: remainingMonths > 0
          ? `${years} an${years > 1 ? 's' : ''} et ${remainingMonths} mois`
          : `${years} an${years > 1 ? 's' : ''}`,
      }
    }
  }

  return null // unreachable within 50 years
}

/**
 * Build a growth trajectory for charting.
 */
function computeFireTrajectory(currentWealth, freedomNumber, monthlyContribution, annualReturn, maxYears = 40) {
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1
  const points = []
  let wealth = currentWealth

  for (let y = 0; y <= maxYears; y++) {
    points.push({
      year: y,
      label: y === 0 ? 'Auj.' : `+${y}a`,
      wealth: Math.round(wealth),
      freedom: freedomNumber,
      reached: wealth >= freedomNumber,
    })
    // Simulate 12 months
    for (let m = 0; m < 12; m++) {
      wealth = (wealth + monthlyContribution) * (1 + monthlyReturn)
    }
    if (wealth >= freedomNumber * 3 && y > 5) break // stop chart if way past target
  }

  return points
}

/**
 * Compute 3 FIRE scenarios (prudent / équilibré / dynamique).
 */
function computeFireScenarios(currentWealth, monthlyContribution, monthlyExpenses, withdrawalRate = 0.04) {
  const freedomNumber = computeFreedomNumber(monthlyExpenses, withdrawalRate)

  return Object.entries(FIRE_PROFILES).map(([key, profile]) => {
    const result = computeYearsToFire(currentWealth, freedomNumber, monthlyContribution, profile.annualReturn)
    return {
      key,
      label: profile.label,
      annualReturn: profile.annualReturn,
      freedomNumber,
      result,
    }
  })
}

export {
  FIRE_PROFILES,
  WITHDRAWAL_RATES,
  computeFreedomNumber,
  computeYearsToFire,
  computeFireTrajectory,
  computeFireScenarios,
}
