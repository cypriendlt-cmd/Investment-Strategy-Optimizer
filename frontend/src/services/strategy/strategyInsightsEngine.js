/**
 * strategyInsightsEngine.js
 *
 * Produces actionable insights from projection results.
 */

/**
 * Analyze which envelopes drive the most growth.
 */
export function analyzeGrowthDrivers(envelopeProjections, horizonYears = 10) {
  const targetMonth = horizonYears * 12

  return envelopeProjections
    .map(ep => {
      const start = ep.trajectory[0]
      const end = ep.trajectory.find(p => p.month === targetMonth) || ep.trajectory[ep.trajectory.length - 1]
      const gainAmount = end.nominal - start.nominal
      const gainPct = start.nominal > 0 ? ((end.nominal - start.nominal) / start.nominal) * 100 : 0

      return {
        id: ep.id,
        label: ep.label,
        assetClass: ep.assetClass,
        startValue: start.nominal,
        endValue: end.nominal,
        gainAmount,
        gainPct: Math.round(gainPct * 10) / 10,
        contributionToGrowth: gainAmount,
      }
    })
    .sort((a, b) => b.contributionToGrowth - a.contributionToGrowth)
}

/**
 * Generate simple strategic insights.
 */
export function generateInsights(snapshot, projectionResult, inputs) {
  const insights = []
  const { totalTrajectory, envelopeProjections } = projectionResult
  const finalPoint = totalTrajectory[totalTrajectory.length - 1]
  const startPoint = totalTrajectory[0]
  const totalGainPct = startPoint.nominal > 0
    ? ((finalPoint.nominal - startPoint.nominal) / startPoint.nominal) * 100
    : 0

  // Cash allocation insight
  const cashPct = snapshot.totalValue > 0 ? (snapshot.bankCash / snapshot.totalValue) * 100 : 0
  if (cashPct > 20) {
    insights.push({
      type: 'warning',
      title: 'Cash dormant élevé',
      description: `${Math.round(cashPct)}% de votre patrimoine est en cash non investi. Réduire ce ratio pourrait accélérer votre trajectoire.`,
      impact: 'medium',
    })
  }

  // Concentration insight
  const drivers = analyzeGrowthDrivers(envelopeProjections, inputs.horizonYears)
  const topDriver = drivers[0]
  if (topDriver && drivers.length > 1) {
    const topPct = (topDriver.gainAmount / drivers.reduce((s, d) => s + Math.max(d.gainAmount, 0), 0)) * 100
    if (topPct > 70) {
      insights.push({
        type: 'info',
        title: 'Concentration sur ' + topDriver.label,
        description: `${Math.round(topPct)}% de votre croissance projetée vient de ${topDriver.label}. Diversifier pourrait réduire le risque.`,
        impact: 'medium',
      })
    }
  }

  // Growth summary
  insights.push({
    type: 'success',
    title: 'Projection de croissance',
    description: `À horizon ${inputs.horizonYears} ans, votre patrimoine pourrait atteindre ${formatEur(finalPoint.nominal)} (×${(finalPoint.nominal / Math.max(startPoint.nominal, 1)).toFixed(1)}).`,
    impact: 'high',
  })

  // Savings effort
  if (inputs.monthlyContribution > 0) {
    const totalContributions = finalPoint.contributions
    const totalGains = finalPoint.gains
    const gainRatio = totalContributions > 0 ? (totalGains / totalContributions * 100).toFixed(0) : 0
    insights.push({
      type: 'info',
      title: 'Effet des intérêts composés',
      description: `Sur ${inputs.horizonYears} ans, vos versements de ${formatEur(totalContributions)} génèrent ${formatEur(totalGains)} de gains (${gainRatio}% de rendement sur l'épargne).`,
      impact: 'high',
    })
  }

  return insights
}

function formatEur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}
