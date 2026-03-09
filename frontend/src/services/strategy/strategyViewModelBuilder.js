/**
 * strategyViewModelBuilder.js
 *
 * Transforms projection results into view-model data
 * ready for React components (charts, KPIs, tables).
 */

import { toAnnualSeries, computeMilestones } from './projectionEngine.js'
import { analyzeGrowthDrivers } from './strategyInsightsEngine.js'
import { fmt } from '../../utils/format.js'

/**
 * Build the full view model for the Projection Globale page.
 */
export function buildProjectionViewModel(projectionResult, inputs) {
  const { totalTrajectory, envelopeProjections } = projectionResult

  const annualData = toAnnualSeries(totalTrajectory, inputs.horizonYears)
  const milestones = computeMilestones(totalTrajectory)
  const finalPoint = totalTrajectory[totalTrajectory.length - 1]
  const startPoint = totalTrajectory[0]
  const growthDrivers = analyzeGrowthDrivers(envelopeProjections, inputs.horizonYears)

  // Chart data: combined nominal + real + invested (capital initial + versements cumulés)
  const chartData = annualData.map(p => ({
    label: p.label,
    nominal: p.nominal,
    real: p.real,
    invested: inputs.totalValue + p.contributions,
  }))

  // KPI cards
  const kpis = [
    {
      id: 'projected',
      label: 'Valeur estimée',
      value: fmt(finalPoint.nominal),
      sublabel: `Sur ${inputs.horizonYears} ans`,
      color: 'var(--accent)',
    },
    {
      id: 'real',
      label: 'Valeur après inflation',
      value: fmt(finalPoint.real),
      sublabel: `Inflation ${(inputs.inflation * 100).toFixed(1)}% / an`,
      color: 'var(--success)',
    },
    {
      id: 'contributions',
      label: 'Épargne cumulée',
      value: fmt(finalPoint.contributions),
      sublabel: `${fmt(inputs.monthlyContribution)} / mois`,
      color: 'var(--warning)',
    },
    {
      id: 'gains',
      label: 'Gains estimés',
      value: fmt(finalPoint.gains),
      sublabel: `×${(finalPoint.nominal / Math.max(startPoint.nominal, 1)).toFixed(1)} multiplier`,
      color: '#8b5cf6',
    },
  ]

  // Milestones table
  const milestonesTable = milestones.map(m => ({
    year: m.year,
    label: `${m.year} an${m.year > 1 ? 's' : ''}`,
    nominal: fmt(m.nominal),
    real: fmt(m.real),
    contributions: fmt(m.contributions),
    gains: fmt(m.gains),
  }))

  return {
    chartData,
    kpis,
    milestonesTable,
    growthDrivers,
    annualData,
  }
}

/**
 * Build the view model for the Objective page.
 */
export function buildObjectiveViewModel(objectiveResult) {
  const {
    isAchievable,
    targetAmount,
    projectedValue,
    monthsToTarget,
    requiredContribution,
    currentContribution,
    trajectory,
    horizonYears,
    annualReturn,
  } = objectiveResult

  const yearsToTarget = monthsToTarget >= 0 ? Math.round(monthsToTarget / 12 * 10) / 10 : null
  const gap = Math.max(targetAmount - projectedValue, 0)

  const chartData = toAnnualSeries(trajectory, Math.max(horizonYears, yearsToTarget ? Math.ceil(yearsToTarget) + 1 : horizonYears))
    .map(p => ({
      label: p.label,
      value: p.nominal,
      target: targetAmount,
    }))

  return {
    isAchievable,
    targetAmount: fmt(targetAmount),
    targetRaw: targetAmount,
    projectedValue: fmt(projectedValue),
    gap: fmt(gap),
    gapRaw: gap,
    progressPct: Math.min((projectedValue / Math.max(targetAmount, 1)) * 100, 100),
    yearsToTarget,
    yearsToTargetLabel: yearsToTarget !== null
      ? `~${yearsToTarget} an${yearsToTarget > 1 ? 's' : ''}`
      : 'Non atteint',
    requiredContribution: fmt(requiredContribution),
    requiredContributionRaw: requiredContribution,
    currentContribution: fmt(currentContribution),
    extraEffort: fmt(Math.max(requiredContribution - currentContribution, 0)),
    chartData,
    annualReturn: `${(annualReturn * 100).toFixed(0)}%`,
    horizonYears,
  }
}
