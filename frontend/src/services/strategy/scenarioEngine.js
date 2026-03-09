/**
 * scenarioEngine.js — Scenario Comparator
 *
 * Builds 3 preconfigured scenarios (current / optimized / ambitious)
 * and runs projections for each to compare outcomes.
 */

import { buildPortfolioSnapshot, getDcaMonthlyContribution } from './portfolioDataProvider.js'
import { buildStrategyInputs, DEFAULT_RETURNS, DEFAULT_INFLATION } from './strategyInputBuilder.js'
import { projectPortfolio, toAnnualSeries, computeTimeToTarget } from './projectionEngine.js'

/**
 * Build current scenario — uses actual allocation and DCA.
 */
function buildCurrentScenario(snapshot, monthlyContribution) {
  return {
    key: 'current',
    label: 'Stratégie actuelle',
    description: 'Votre allocation et effort d\'épargne actuels, maintenus dans le temps.',
    color: 'var(--text-muted)',
    changes: [],
    monthlyContribution,
    returnOverrides: {},
  }
}

/**
 * Build optimized scenario — rebalance excess cash toward ETF.
 */
function buildOptimizedScenario(snapshot, monthlyContribution) {
  const changes = []
  const returnOverrides = {}
  const totalValue = snapshot.totalValue

  // If cash > 15% of total, reduce to 10% and redistribute to ETF
  const cashEnv = snapshot.envelopes.find(e => e.assetClass === 'cash')
  const cashPct = cashEnv && totalValue > 0 ? cashEnv.currentValue / totalValue : 0

  if (cashPct > 0.15) {
    const excessCash = cashEnv.currentValue - totalValue * 0.10
    changes.push({
      type: 'rebalance',
      label: `Réduire le cash de ${Math.round(cashPct * 100)}% à 10%`,
      detail: `Réaffecter ${Math.round(excessCash).toLocaleString('fr-FR')} € vers les ETF`,
      amount: Math.round(excessCash),
    })
  }

  return {
    key: 'optimized',
    label: 'Stratégie recommandée',
    description: 'Optimisation de l\'allocation avec réduction du cash excédentaire.',
    color: 'var(--accent)',
    changes,
    monthlyContribution,
    returnOverrides,
  }
}

/**
 * Build ambitious scenario — increase contribution by 20%.
 */
function buildAmbitiousScenario(snapshot, monthlyContribution) {
  const extraContribution = Math.round(monthlyContribution * 0.2)
  const ambitiousContribution = monthlyContribution + extraContribution

  return {
    key: 'ambitious',
    label: 'Stratégie ambitieuse',
    description: `Allocation optimisée + épargne augmentée de ${extraContribution} €/mois.`,
    color: 'var(--success)',
    changes: [
      {
        type: 'contribution',
        label: `Augmenter l'épargne de +${extraContribution} €/mois`,
        detail: `Passer de ${monthlyContribution} € à ${ambitiousContribution} €/mois`,
        amount: extraContribution,
      },
    ],
    monthlyContribution: ambitiousContribution,
    returnOverrides: {},
  }
}

/**
 * Apply scenario overrides to snapshot envelopes for projection.
 */
function applyScenario(snapshot, scenario, horizonYears) {
  const inputs = buildStrategyInputs(snapshot, {
    monthlyContribution: scenario.monthlyContribution,
    horizonYears,
    returnOverrides: scenario.returnOverrides || {},
  })

  // For optimized/ambitious: if there's a rebalance change, shift cash to ETF
  let adjustedEnvelopes = inputs.envelopes.map(env => ({
    ...env,
    horizonMonths: inputs.horizonMonths,
    monthlyInflation: inputs.monthlyInflation,
  }))

  const rebalance = scenario.changes?.find(c => c.type === 'rebalance')
  if (rebalance) {
    adjustedEnvelopes = adjustedEnvelopes.map(env => {
      if (env.assetClass === 'cash') {
        return { ...env, currentValue: Math.max(0, env.currentValue - rebalance.amount) }
      }
      if (env.assetClass === 'etf') {
        return { ...env, currentValue: env.currentValue + rebalance.amount }
      }
      return env
    })
  }

  const result = projectPortfolio({
    envelopes: adjustedEnvelopes,
    horizonMonths: inputs.horizonMonths,
    monthlyInflation: inputs.monthlyInflation,
    bankCash: inputs.bankCash,
  })

  const chartData = toAnnualSeries(result.totalTrajectory, horizonYears)
  const finalValue = result.totalTrajectory[result.totalTrajectory.length - 1]?.nominal || 0
  const totalContributions = result.totalTrajectory[result.totalTrajectory.length - 1]?.contributions || 0

  return {
    ...scenario,
    projectionResult: result,
    chartData,
    kpis: {
      finalValue,
      totalGains: finalValue - snapshot.totalValue - totalContributions,
      totalContributions,
    },
  }
}

/**
 * Run the full scenario comparison.
 */
function runScenarioSet(portfolio, totals, accountBalances, aggregates, dcaPlans, horizonYears = 20, objectiveTarget = null) {
  const snapshot = buildPortfolioSnapshot(portfolio, totals, accountBalances, aggregates)
  const dcaMonthly = getDcaMonthlyContribution(dcaPlans)
  const monthlyContribution = dcaMonthly > 0 ? dcaMonthly : (snapshot.estimatedMonthlySavings || 500)

  const scenarios = [
    buildCurrentScenario(snapshot, monthlyContribution),
    buildOptimizedScenario(snapshot, monthlyContribution),
    buildAmbitiousScenario(snapshot, monthlyContribution),
  ].map(s => applyScenario(snapshot, s, horizonYears))

  // Compute years gained relative to current scenario
  const currentFinal = scenarios[0].kpis.finalValue
  scenarios.forEach((s, i) => {
    if (i === 0) {
      s.kpis.yearsGained = null
      s.kpis.extraEffort = 0
    } else {
      s.kpis.yearsGained = null
      s.kpis.extraEffort = s.monthlyContribution - scenarios[0].monthlyContribution

      // If we have an objective, compute time to target for each
      if (objectiveTarget && objectiveTarget > 0) {
        const monthlyReturn = Math.pow(1 + 0.07, 1 / 12) - 1
        const currentMonths = computeTimeToTarget(snapshot.totalValue, objectiveTarget, scenarios[0].monthlyContribution, monthlyReturn)
        const thisMonths = computeTimeToTarget(snapshot.totalValue, objectiveTarget, s.monthlyContribution, monthlyReturn)
        if (currentMonths > 0 && thisMonths > 0) {
          s.kpis.yearsGained = Math.round((currentMonths - thisMonths) / 12 * 10) / 10
        }
      }
    }

    s.kpis.objectiveReached = objectiveTarget ? s.kpis.finalValue >= objectiveTarget : null
  })

  return { scenarios, snapshot, horizonYears }
}

export {
  buildCurrentScenario,
  buildOptimizedScenario,
  buildAmbitiousScenario,
  runScenarioSet,
}
