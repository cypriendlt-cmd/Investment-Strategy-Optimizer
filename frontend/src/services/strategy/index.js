/**
 * Strategy Engine — Main entry point
 *
 * Orchestrates the full pipeline:
 * Portfolio Core → DataProvider → InputBuilder → ProjectionEngine → Insights → ViewModel
 */

export { buildPortfolioSnapshot, getDcaMonthlyContribution } from './portfolioDataProvider.js'
export { buildStrategyInputs, buildObjectiveInputs, DEFAULT_RETURNS, DEFAULT_INFLATION } from './strategyInputBuilder.js'
export { projectTrajectory, projectPortfolio, computeMilestones, toAnnualSeries, computeRequiredContribution, computeTimeToTarget } from './projectionEngine.js'
export { analyzeGrowthDrivers, generateInsights } from './strategyInsightsEngine.js'
export { buildProjectionViewModel, buildObjectiveViewModel } from './strategyViewModelBuilder.js'

import { buildPortfolioSnapshot, getDcaMonthlyContribution } from './portfolioDataProvider.js'
import { buildStrategyInputs, buildObjectiveInputs } from './strategyInputBuilder.js'
import { projectPortfolio, projectTrajectory, computeRequiredContribution, computeTimeToTarget } from './projectionEngine.js'
import { generateInsights } from './strategyInsightsEngine.js'
import { buildProjectionViewModel, buildObjectiveViewModel } from './strategyViewModelBuilder.js'

/**
 * Run the full projection pipeline.
 *
 * @param {object} portfolio - from PortfolioContext
 * @param {object} totals - from PortfolioContext
 * @param {Array} accountBalances - from BankContext
 * @param {Array} aggregates - from BankContext
 * @param {object} dcaPlans - from PortfolioContext
 * @param {object} overrides - user hypotheses overrides
 * @returns {object} { viewModel, insights, inputs, projectionResult }
 */
export function runProjection(portfolio, totals, accountBalances, aggregates, dcaPlans, overrides = {}) {
  const snapshot = buildPortfolioSnapshot(portfolio, totals, accountBalances, aggregates)
  const dcaMonthly = getDcaMonthlyContribution(dcaPlans)

  const inputs = buildStrategyInputs(snapshot, {
    monthlyContribution: overrides.monthlyContribution ?? (dcaMonthly > 0 ? dcaMonthly : snapshot.estimatedMonthlySavings || 500),
    horizonYears: overrides.horizonYears ?? 10,
    inflation: overrides.inflation,
    returnOverrides: overrides.returnOverrides,
  })

  // Add shared params to each envelope
  const enrichedInputs = {
    ...inputs,
    envelopes: inputs.envelopes.map(env => ({
      ...env,
      horizonMonths: inputs.horizonMonths,
      monthlyInflation: inputs.monthlyInflation,
    })),
  }

  const projectionResult = projectPortfolio(enrichedInputs)
  const insights = generateInsights(snapshot, projectionResult, inputs)
  const viewModel = buildProjectionViewModel(projectionResult, inputs)

  return { viewModel, insights, inputs, projectionResult, snapshot }
}

/**
 * Run the objective analysis pipeline.
 *
 * @param {object} portfolio - from PortfolioContext
 * @param {object} totals - from PortfolioContext
 * @param {Array} accountBalances - from BankContext
 * @param {Array} aggregates - from BankContext
 * @param {object} dcaPlans - from PortfolioContext
 * @param {object} objectiveParams - { targetAmount, horizonYears, monthlyContribution, strategyProfile, inflation }
 * @returns {object} { viewModel, objectiveResult }
 */
export function runObjectiveAnalysis(portfolio, totals, accountBalances, aggregates, dcaPlans, objectiveParams) {
  const snapshot = buildPortfolioSnapshot(portfolio, totals, accountBalances, aggregates)
  const dcaMonthly = getDcaMonthlyContribution(dcaPlans)

  const params = {
    ...objectiveParams,
    monthlyContribution: objectiveParams.monthlyContribution ?? (dcaMonthly > 0 ? dcaMonthly : snapshot.estimatedMonthlySavings || 500),
  }

  const inputs = buildObjectiveInputs(snapshot, params)
  const trajectory = projectTrajectory(
    inputs.currentValue,
    inputs.monthlyContribution,
    inputs.monthlyReturn,
    inputs.horizonMonths,
    inputs.monthlyInflation,
  )

  const finalValue = trajectory[trajectory.length - 1].nominal
  const monthsToTarget = computeTimeToTarget(
    inputs.currentValue, inputs.targetAmount,
    inputs.monthlyContribution, inputs.monthlyReturn,
  )
  const requiredContribution = computeRequiredContribution(
    inputs.currentValue, inputs.targetAmount,
    inputs.monthlyReturn, inputs.horizonMonths,
  )

  const objectiveResult = {
    isAchievable: finalValue >= inputs.targetAmount,
    targetAmount: inputs.targetAmount,
    projectedValue: finalValue,
    monthsToTarget,
    requiredContribution,
    currentContribution: inputs.monthlyContribution,
    trajectory,
    horizonYears: inputs.horizonYears,
    annualReturn: inputs.annualReturn,
  }

  const viewModel = buildObjectiveViewModel(objectiveResult)

  return { viewModel, objectiveResult }
}
