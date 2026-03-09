/**
 * Strategy Engine — Main entry point
 *
 * Orchestrates the full pipeline:
 * Portfolio Core → DataProvider → InputBuilder → ProjectionEngine → Insights → ViewModel
 */

import { buildPortfolioSnapshot, getDcaMonthlyContribution } from './portfolioDataProvider.js'
import { buildStrategyInputs, buildObjectiveInputs, buildEnvelopeContributions, DEFAULT_RETURNS, DEFAULT_INFLATION } from './strategyInputBuilder.js'
import { projectPortfolio, projectTrajectory, computeRequiredContribution, computeTimeToTarget, computeMilestones, toAnnualSeries } from './projectionEngine.js'
import { analyzeGrowthDrivers, generateInsights } from './strategyInsightsEngine.js'
import { buildProjectionViewModel, buildObjectiveViewModel } from './strategyViewModelBuilder.js'

// Re-export everything consumers might need
export {
  buildPortfolioSnapshot, getDcaMonthlyContribution,
  buildStrategyInputs, buildObjectiveInputs, buildEnvelopeContributions, DEFAULT_RETURNS, DEFAULT_INFLATION,
  projectPortfolio, projectTrajectory, computeRequiredContribution, computeTimeToTarget, computeMilestones, toAnnualSeries,
  analyzeGrowthDrivers, generateInsights,
  buildProjectionViewModel, buildObjectiveViewModel,
}

/**
 * Run the full projection pipeline.
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
