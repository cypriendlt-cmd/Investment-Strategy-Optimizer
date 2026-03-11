/**
 * portfolioAnalytics.js — Source unique d'analyse portefeuille
 *
 * Fournit : risque, diversification, concentration, alertes, conseils.
 * Utilisé par Dashboard, Portfolio, et tout composant qui affiche
 * des métriques d'allocation.
 */

// ─── Coefficients de risque par classe d'actifs ──────────────────────────────
// 1 = très faible risque, 5 = très élevé
const RISK_COEFFICIENTS = {
  livrets: 1,       // Cash, livrets, fonds euros
  fundraising: 3,   // Crowdfunding, private equity
  pea: 3.5,         // Actions, ETF
  crypto: 5,        // Cryptomonnaies
}

// ─── Labels par classe ───────────────────────────────────────────────────────
const CLASS_LABELS = {
  crypto: 'Crypto',
  pea: 'Actions / ETF',
  livrets: 'Livrets / Cash',
  fundraising: 'Crowdfunding',
}

// ─── Couleurs par classe ─────────────────────────────────────────────────────
const CLASS_COLORS = {
  crypto: 'var(--color-crypto)',
  pea: 'var(--color-pea)',
  livrets: 'var(--color-livrets)',
  fundraising: 'var(--color-fundraising)',
}

// ─── Construction de l'allocation ────────────────────────────────────────────

/**
 * Construit la répartition par classe d'actifs.
 * @param {Object} totals - { crypto, pea, livrets, fundraising, total }
 * @param {number} bankLivrets - Solde des livrets importés (BankContext)
 * @returns {Array<{ key, label, value, pct, color }>}
 */
export function buildAllocation(totals, bankLivrets = 0) {
  const classes = [
    { key: 'crypto', value: totals.crypto || 0 },
    { key: 'pea', value: totals.pea || 0 },
    { key: 'livrets', value: (totals.livrets || 0) + bankLivrets },
    { key: 'fundraising', value: totals.fundraising || 0 },
  ]

  const totalValue = classes.reduce((s, c) => s + c.value, 0)

  return classes.map(c => ({
    ...c,
    label: CLASS_LABELS[c.key] || c.key,
    pct: totalValue > 0 ? c.value / totalValue : 0,
    color: CLASS_COLORS[c.key] || 'var(--text-muted)',
  }))
}

// ─── Score de risque ─────────────────────────────────────────────────────────

/**
 * Calcule le score de risque pondéré du portefeuille (0-100).
 *
 * Méthode :
 * 1. Score pondéré = somme(pct × coeff) / max(coeff)
 * 2. Pénalité de concentration : +10% si une classe > 70%
 *
 * @param {Array} allocation - depuis buildAllocation()
 * @returns {{ score: number, level: string, color: string, description: string }}
 */
export function computeRiskScore(allocation) {
  const totalValue = allocation.reduce((s, c) => s + c.value, 0)
  if (totalValue === 0) {
    return { score: 0, level: 'N/A', color: 'var(--text-muted)', description: 'Aucun actif' }
  }

  const maxCoeff = Math.max(...Object.values(RISK_COEFFICIENTS))

  // Score pondéré normalisé sur 0-100
  let weightedScore = 0
  for (const c of allocation) {
    const coeff = RISK_COEFFICIENTS[c.key] || 3
    weightedScore += c.pct * (coeff / maxCoeff) * 100
  }

  // Pénalité de concentration (amplifie le risque si mono-classe volatile)
  const maxPct = Math.max(...allocation.map(c => c.pct))
  if (maxPct > 0.7) {
    weightedScore = Math.min(100, weightedScore * 1.1)
  }

  const score = Math.round(Math.max(0, Math.min(100, weightedScore)))

  let level, color, description
  if (score <= 35) {
    level = 'Faible'
    color = 'var(--success)'
    description = 'Portefeuille orienté sécurité'
  } else if (score <= 60) {
    level = 'Modéré'
    color = 'var(--warning)'
    description = 'Équilibre entre rendement et sécurité'
  } else {
    level = 'Élevé'
    color = 'var(--danger)'
    description = 'Portefeuille orienté performance'
  }

  return { score, level, color, description }
}

// ─── Score de diversification ────────────────────────────────────────────────

/**
 * Calcule un score de diversification (0-100) basé sur l'indice Herfindahl.
 *
 * Méthode :
 * - HI = somme(pct²) → 1.0 = mono-classe, 0.25 = 4 classes égales
 * - Score = (1 - HI) / (1 - 1/N) × 100 (normalisé par N classes possibles)
 * - Bonus si ≥3 classes présentes, pénalité si <2
 *
 * @param {Array} allocation - depuis buildAllocation()
 * @returns {{ score: number, level: string, color: string, effectiveN: number }}
 */
export function computeDiversificationScore(allocation) {
  const active = allocation.filter(c => c.value > 0)
  const n = active.length
  const totalClasses = allocation.length // 4 classes possibles

  if (n === 0) {
    return { score: 0, level: 'N/A', color: 'var(--text-muted)', effectiveN: 0 }
  }

  if (n === 1) {
    return { score: 10, level: 'Très faible', color: 'var(--danger)', effectiveN: 1 }
  }

  // Indice Herfindahl-Hirschman (HHI)
  const hhi = active.reduce((s, c) => s + c.pct * c.pct, 0)

  // Nombre effectif de positions (inverse HHI)
  const effectiveN = Math.round((1 / hhi) * 10) / 10

  // Normalisation : HHI min = 1/N (distribution parfaite), max = 1 (mono-classe)
  const hhiMin = 1 / totalClasses
  const normalizedHHI = (hhi - hhiMin) / (1 - hhiMin)
  let score = Math.round((1 - normalizedHHI) * 100)

  // Bonus : avoir ≥3 classes réelles améliore le score
  if (n >= 4) score = Math.min(100, score + 5)
  else if (n >= 3) score = Math.min(100, score + 3)

  score = Math.max(0, Math.min(100, score))

  let level, color
  if (score >= 75) {
    level = 'Excellente'
    color = 'var(--success)'
  } else if (score >= 50) {
    level = 'Bonne'
    color = 'var(--accent)'
  } else if (score >= 30) {
    level = 'Moyenne'
    color = 'var(--warning)'
  } else {
    level = 'Faible'
    color = 'var(--danger)'
  }

  return { score, level, color, effectiveN }
}

// ─── Alertes de surconcentration ─────────────────────────────────────────────

/**
 * Détecte les alertes de surconcentration.
 *
 * @param {Array} allocation - depuis buildAllocation()
 * @returns {Array<{ type: string, message: string, severity: string }>}
 */
export function detectConcentrationAlerts(allocation) {
  const alerts = []
  const active = allocation.filter(c => c.value > 0)

  if (active.length === 0) return alerts

  // Tri par poids décroissant
  const sorted = [...active].sort((a, b) => b.pct - a.pct)
  const dominant = sorted[0]

  // Alerte si une classe > 80%
  if (dominant.pct > 0.80) {
    alerts.push({
      type: 'critical',
      severity: 'high',
      message: `Portefeuille très concentré sur ${dominant.label} (${Math.round(dominant.pct * 100)}%)`,
    })
  }
  // Alerte si une classe > 60%
  else if (dominant.pct > 0.60) {
    alerts.push({
      type: 'warning',
      severity: 'medium',
      message: `Forte concentration sur ${dominant.label} (${Math.round(dominant.pct * 100)}%)`,
    })
  }

  // Alerte si top 2 > 90% et il y a ≥3 classes
  if (sorted.length >= 3) {
    const top2Pct = sorted[0].pct + sorted[1].pct
    if (top2Pct > 0.90) {
      alerts.push({
        type: 'info',
        severity: 'low',
        message: `Les 2 premières classes représentent ${Math.round(top2Pct * 100)}% du portefeuille`,
      })
    }
  }

  // Alerte mono-classe
  if (active.length === 1) {
    alerts.push({
      type: 'critical',
      severity: 'high',
      message: 'Portefeuille composé d\'une seule classe d\'actifs',
    })
  }

  return alerts
}

// ─── Conseils automatiques ───────────────────────────────────────────────────

/**
 * Génère des conseils d'équilibrage pédagogiques (max 3).
 *
 * @param {Array} allocation
 * @param {{ score: number, level: string }} risk
 * @param {{ score: number, level: string }} diversification
 * @returns {Array<{ message: string, priority: number }>}
 */
export function generateInsights(allocation, risk, diversification) {
  const insights = []
  const active = allocation.filter(c => c.value > 0)

  if (active.length === 0) {
    return [{ message: 'Ajoutez des actifs pour obtenir une analyse de votre portefeuille.', priority: 1 }]
  }

  const sorted = [...active].sort((a, b) => b.pct - a.pct)
  const dominant = sorted[0]

  // Conseil 1 : Diversification faible
  if (diversification.score < 30) {
    if (active.length === 1) {
      insights.push({
        message: `Votre portefeuille est composé uniquement de ${dominant.label}. Répartir entre plusieurs classes d'actifs réduit le risque global.`,
        priority: 1,
      })
    } else {
      insights.push({
        message: 'La répartition est peu équilibrée. Une meilleure distribution entre les classes d\'actifs peut renforcer la robustesse du portefeuille.',
        priority: 1,
      })
    }
  }

  // Conseil 2 : Risque élevé
  if (risk.score > 60) {
    const volatileClasses = active.filter(c => (RISK_COEFFICIENTS[c.key] || 3) >= 4)
    const volatilePct = volatileClasses.reduce((s, c) => s + c.pct, 0)
    if (volatilePct > 0.5) {
      insights.push({
        message: `Les actifs volatils représentent ${Math.round(volatilePct * 100)}% du portefeuille. Une part d'actifs plus stables peut amortir les baisses de marché.`,
        priority: 2,
      })
    }
  }

  // Conseil 3 : Absence de cash / sécurité
  const cashClass = allocation.find(c => c.key === 'livrets')
  if (cashClass && cashClass.pct < 0.05 && active.length > 1) {
    insights.push({
      message: 'La part de liquidités est très faible. Un coussin de sécurité permet de saisir des opportunités ou d\'absorber les imprévus.',
      priority: 3,
    })
  }

  // Conseil 4 : Bonne diversification (positif)
  if (diversification.score >= 60 && risk.score <= 50) {
    insights.push({
      message: 'Bonne répartition entre les classes d\'actifs. Le portefeuille présente un équilibre sain entre rendement et sécurité.',
      priority: 4,
    })
  }

  return insights.sort((a, b) => a.priority - b.priority).slice(0, 3)
}

// ─── Analyse complète ────────────────────────────────────────────────────────

/**
 * Analyse complète du portefeuille — point d'entrée principal.
 *
 * @param {Object} totals - { crypto, pea, livrets, fundraising, total }
 * @param {number} bankLivrets - Solde livrets importés
 * @returns {Object} Résultat complet
 */
export function analyzePortfolio(totals, bankLivrets = 0) {
  const allocation = buildAllocation(totals, bankLivrets)
  const totalValue = allocation.reduce((s, c) => s + c.value, 0)
  const risk = computeRiskScore(allocation)
  const diversification = computeDiversificationScore(allocation)
  const alerts = detectConcentrationAlerts(allocation)
  const insights = generateInsights(allocation, risk, diversification)

  // Classe dominante
  const sorted = [...allocation].filter(c => c.value > 0).sort((a, b) => b.pct - a.pct)
  const dominant = sorted[0] || null

  return {
    totalValue,
    allocation,
    dominant,
    risk,
    diversification,
    alerts,
    insights,
  }
}
