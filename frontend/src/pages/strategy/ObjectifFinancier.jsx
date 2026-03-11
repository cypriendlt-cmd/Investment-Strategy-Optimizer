import { useState, useMemo, useEffect } from 'react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { Target, ArrowLeft, CheckCircle, AlertTriangle, TrendingUp, Info, Lightbulb, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useBank } from '../../context/BankContext'
import { usePrivacyMask } from '../../hooks/usePrivacyMask'
import { updateGoal } from '../../services/goalsEngine'
import { analyzeFeasibility, INFLATION_RATE } from '../../services/goalProjectionEngine'
import { runObjectiveAnalysis, DEFAULT_INFLATION } from '../../services/strategy'
import { fmt } from '../../utils/format'

const STRATEGY_PROFILES = [
  { value: 'conservative', label: 'Prudent (4%/an)', returnRate: 0.04 },
  { value: 'balanced', label: 'Équilibré (6%/an)', returnRate: 0.06 },
  { value: 'growth', label: 'Croissance (8%/an)', returnRate: 0.08 },
  { value: 'aggressive', label: 'Offensif (10%/an)', returnRate: 0.10 },
]

function goalHorizonYears(goal) {
  if (!goal.targetDate) return null
  const diff = new Date(goal.targetDate) - new Date()
  const years = Math.round(diff / (1000 * 60 * 60 * 24 * 365.25))
  return Math.max(1, years)
}

export default function ObjectifFinancier() {
  const { portfolio, totals, dcaPlans, updateAndSave } = usePortfolio()
  const { accountBalances, aggregates } = useBank() || {}
  const { m } = usePrivacyMask()

  // Read goalId from URL query param
  const urlGoalId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('goalId') || null
  }, [])

  // Find matching goal
  const allGoals = portfolio?.goals || []
  const linkedGoal = useMemo(() => {
    if (urlGoalId) return allGoals.find(g => g.id === urlGoalId) || null
    return null
  }, [urlGoalId, allGoals])

  // State: initialized from goal if linked, otherwise defaults
  const [targetAmount, setTargetAmount] = useState(100000)
  const [horizonYears, setHorizonYears] = useState(10)
  const [contribution, setContribution] = useState(500)
  const [strategyProfile, setStrategyProfile] = useState('balanced')
  const [inflation, setInflation] = useState(DEFAULT_INFLATION * 100)
  const [linkedGoalId, setLinkedGoalId] = useState(urlGoalId)
  const [goalApplied, setGoalApplied] = useState(false)

  // Auto-fill when a goal is linked (on first load or when clicking "Utiliser")
  useEffect(() => {
    if (linkedGoal && !goalApplied) {
      setTargetAmount(linkedGoal.targetAmount || 100000)
      setContribution(linkedGoal.monthlyContribution || 500)
      setStrategyProfile(linkedGoal.riskProfile || 'balanced')
      const h = goalHorizonYears(linkedGoal)
      if (h) setHorizonYears(h)
      setGoalApplied(true)
    }
  }, [linkedGoal, goalApplied])

  // Goals that can be used (not yet linked)
  const availableGoals = allGoals.filter(g => g.id !== linkedGoalId)

  const applyGoal = (goal) => {
    setTargetAmount(goal.targetAmount || 100000)
    setContribution(goal.monthlyContribution || 500)
    setStrategyProfile(goal.riskProfile || 'balanced')
    const h = goalHorizonYears(goal)
    if (h) setHorizonYears(h)
    setLinkedGoalId(goal.id)
    setGoalApplied(true)
  }

  // Detect if params differ from linked goal
  const currentGoal = useMemo(() => allGoals.find(g => g.id === linkedGoalId), [allGoals, linkedGoalId])
  const hasChanges = useMemo(() => {
    if (!currentGoal) return false
    const goalHorizon = goalHorizonYears(currentGoal)
    return (
      targetAmount !== currentGoal.targetAmount ||
      contribution !== (currentGoal.monthlyContribution || 0) ||
      strategyProfile !== (currentGoal.riskProfile || 'balanced') ||
      (goalHorizon && horizonYears !== goalHorizon)
    )
  }, [currentGoal, targetAmount, contribution, strategyProfile, horizonYears])

  // Save changes back to the goal
  const applyToGoal = () => {
    if (!linkedGoalId) return
    const targetDate = new Date()
    targetDate.setFullYear(targetDate.getFullYear() + horizonYears)
    updateAndSave(p => ({
      ...p,
      goals: updateGoal(p.goals || [], linkedGoalId, {
        targetAmount,
        monthlyContribution: contribution,
        riskProfile: strategyProfile,
        targetDate: targetDate.toISOString().slice(0, 10),
      }),
    }))
  }

  const selectedProfile = STRATEGY_PROFILES.find(p => p.value === strategyProfile)

  const result = useMemo(() => {
    return runObjectiveAnalysis(portfolio, totals, accountBalances || [], aggregates || [], dcaPlans, {
      targetAmount,
      horizonYears,
      monthlyContribution: contribution,
      annualReturn: selectedProfile.returnRate,
      inflation: inflation / 100,
    })
  }, [portfolio, totals, accountBalances, aggregates, dcaPlans, targetAmount, horizonYears, contribution, strategyProfile, inflation])

  // Feasibility analysis for suggestions
  const feasibility = useMemo(() => {
    if (!linkedGoalId || contribution <= 0) return null
    const goal = allGoals.find(g => g.id === linkedGoalId)
    if (!goal) return null
    const targetDate = new Date()
    targetDate.setFullYear(targetDate.getFullYear() + horizonYears)
    return analyzeFeasibility({
      type: goal.type,
      targetAmount,
      currentAmount: 0,
      monthlyContribution: contribution,
      targetDate: targetDate.toISOString().slice(0, 10),
    })
  }, [linkedGoalId, allGoals, targetAmount, contribution, horizonYears])

  const { viewModel } = result

  return (
    <div className="projection-page">
      {/* Header */}
      <div className="projection-header">
        <Link to="/strategy" className="projection-back">
          <ArrowLeft size={16} /> Labo Stratégie
        </Link>
        <div>
          <h1 className="projection-title">Objectif patrimonial</h1>
          <p className="projection-subtitle">
            {currentGoal
              ? <>Projection pour <strong>{currentGoal.label}</strong> — ajustez les paramètres puis appliquez les modifications.</>
              : 'Fixez un montant cible et découvrez si votre stratégie actuelle peut l\'atteindre.'}
          </p>
        </div>
      </div>

      {/* Goal suggestion banner — show available goals */}
      {availableGoals.length > 0 && !linkedGoalId && (
        <div className="goal-picker-banner">
          <Lightbulb size={16} style={{ color: 'var(--accent)', minWidth: 16 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Vous avez {availableGoals.length} objectif{availableGoals.length > 1 ? 's' : ''} défini{availableGoals.length > 1 ? 's' : ''}. Sélectionnez-en un pour pré-remplir automatiquement les paramètres.
            </p>
          </div>
        </div>
      )}
      {availableGoals.length > 0 && !linkedGoalId && (
        <div className="goal-picker-list">
          {availableGoals.map(g => (
            <button key={g.id} className="goal-picker-item" onClick={() => applyGoal(g)}>
              <Target size={14} />
              <span className="goal-picker-item-label">{g.label}</span>
              <span className="goal-picker-item-amount">{fmt(g.targetAmount)}</span>
              <span className="goal-picker-item-action">Utiliser cet objectif</span>
            </button>
          ))}
        </div>
      )}

      {/* Linked goal indicator + apply button */}
      {currentGoal && (
        <div className="goal-linked-bar">
          <div className="goal-linked-bar-info">
            <Target size={15} />
            <span>Objectif lié : <strong>{currentGoal.label}</strong></span>
          </div>
          {hasChanges && (
            <button className="btn btn-primary btn-sm" onClick={applyToGoal}>
              <Save size={14} /> Appliquer à l'objectif défini
            </button>
          )}
          {!hasChanges && (
            <span style={{ fontSize: '0.78rem', color: 'var(--success)' }}>
              <CheckCircle size={13} style={{ marginRight: 4, verticalAlign: -2 }} />À jour
            </span>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="projection-controls">
        <div className="projection-control">
          <label>Montant cible</label>
          <div className="projection-input-group">
            <input type="number" value={targetAmount} onChange={e => setTargetAmount(Math.max(0, Number(e.target.value)))} min="0" step="10000" />
            <span>€</span>
          </div>
        </div>
        <div className="projection-control">
          <label>Horizon</label>
          <div className="projection-input-group">
            <input type="number" value={horizonYears} onChange={e => setHorizonYears(Math.max(1, Math.min(50, Number(e.target.value))))} min="1" max="50" step="1" />
            <span>ans</span>
          </div>
        </div>
        <div className="projection-control">
          <label>Épargne mensuelle</label>
          <div className="projection-input-group">
            <input type="number" value={contribution} onChange={e => setContribution(Math.max(0, Number(e.target.value)))} min="0" step="50" />
            <span>€/mois</span>
          </div>
        </div>
        <div className="projection-control">
          <label>Profil de risque</label>
          <select value={strategyProfile} onChange={e => setStrategyProfile(e.target.value)}>
            {STRATEGY_PROFILES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="projection-control">
          <label>Inflation</label>
          <div className="projection-input-group">
            <input type="number" value={inflation} onChange={e => setInflation(Number(e.target.value))} min="0" max="10" step="0.1" />
            <span>%/an</span>
          </div>
        </div>
      </div>

      {/* Feasibility suggestions when not achievable */}
      {feasibility && !feasibility.feasible && feasibility.suggestions.length > 0 && (
        <div className="goal-feasibility-panel" style={{ marginBottom: 16 }}>
          <div className="goal-feasibility-header goal-feasibility--warn">
            <AlertTriangle size={15} /> <span>Objectif difficilement atteignable avec ces paramètres</span>
          </div>
          <div className="goal-feasibility-suggestions">
            <div className="goal-feasibility-suggestions-title">
              <Lightbulb size={13} /> Suggestions d'ajustement
            </div>
            {feasibility.suggestions.map((s, i) => (
              <div key={i} className="goal-feasibility-suggestion">
                <span className="goal-feasibility-suggestion-label">{s.label}</span>
                <button
                  type="button"
                  className="goal-feasibility-suggestion-value"
                  onClick={() => {
                    if (s.type === 'contribution') setContribution(s.value)
                    else if (s.type === 'target') setTargetAmount(s.value)
                    else if (s.type === 'horizon') {
                      const d = new Date(s.value + '-01')
                      const yrs = Math.max(1, Math.round((d - new Date()) / (1000 * 60 * 60 * 24 * 365.25)))
                      setHorizonYears(yrs)
                    }
                  }}
                >
                  {s.type === 'contribution' ? fmt(s.value) + '/mois' : s.type === 'target' ? fmt(s.value) : new Date(s.value + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  <span style={{ fontSize: '0.68rem', marginLeft: 4 }}>Appliquer</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Banner */}
      <div className={`objective-result ${viewModel.isAchievable ? 'objective-result--success' : 'objective-result--warning'}`}>
        <div className="objective-result-icon">
          {viewModel.isAchievable ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
        </div>
        <div className="objective-result-content">
          <div className="objective-result-title">
            {viewModel.isAchievable ? 'Objectif atteignable !' : 'Objectif non atteint dans l\'horizon choisi'}
          </div>
          <div className="objective-result-desc">
            {viewModel.isAchievable
              ? `Votre patrimoine projeté de ${m(viewModel.projectedValue)} dépasse l'objectif de ${m(viewModel.targetAmount)} en ${viewModel.yearsToTargetLabel}.`
              : `Patrimoine projeté : ${m(viewModel.projectedValue)}. Il vous manque ${m(viewModel.gap)} pour atteindre ${m(viewModel.targetAmount)}.`
            }
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="objective-progress-section">
        <div className="objective-progress-header">
          <span>Progression vers l'objectif</span>
          <span className="objective-progress-pct">{viewModel.progressPct.toFixed(0)}%</span>
        </div>
        <div className="objective-progress-bar">
          <div
            className="objective-progress-fill"
            style={{
              width: `${Math.min(viewModel.progressPct, 100)}%`,
              background: viewModel.isAchievable ? 'var(--success)' : 'var(--warning)',
            }}
          />
        </div>
        <div className="objective-progress-labels">
          <span>Aujourd'hui</span>
          <span>{m(viewModel.targetAmount)}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="projection-kpis">
        <div className="projection-kpi">
          <span className="projection-kpi-label">Patrimoine projeté</span>
          <span className="projection-kpi-value" style={{ color: 'var(--accent)' }}>{m(viewModel.projectedValue)}</span>
          <span className="projection-kpi-sub">à {horizonYears} ans</span>
        </div>
        <div className="projection-kpi">
          <span className="projection-kpi-label">Date estimée</span>
          <span className="projection-kpi-value" style={{ color: 'var(--success)' }}>{viewModel.yearsToTargetLabel}</span>
          <span className="projection-kpi-sub">pour atteindre l'objectif</span>
        </div>
        <div className="projection-kpi">
          <span className="projection-kpi-label">Effort mensuel nécessaire</span>
          <span className="projection-kpi-value" style={{ color: 'var(--warning)' }}>{m(viewModel.requiredContribution)}</span>
          <span className="projection-kpi-sub">à {viewModel.annualReturn}/an sur {horizonYears} ans</span>
        </div>
        <div className="projection-kpi">
          <span className="projection-kpi-label">Effort supplémentaire</span>
          <span className="projection-kpi-value" style={{ color: '#8b5cf6' }}>{m(viewModel.extraEffort)}</span>
          <span className="projection-kpi-sub">en plus de votre versement actuel</span>
        </div>
      </div>

      {/* Chart */}
      <div className="projection-chart-card">
        <div className="projection-chart-title">Trajectoire vs Objectif</div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={viewModel.chartData}>
            <defs>
              <linearGradient id="objGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={viewModel.isAchievable ? 'var(--success)' : 'var(--warning)'} stopOpacity={0.2} />
                <stop offset="100%" stopColor={viewModel.isAchievable ? 'var(--success)' : 'var(--warning)'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v, name) => [m(fmt(v)), name === 'value' ? 'Patrimoine projeté' : 'Objectif']}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: '0.82rem' }}
            />
            <ReferenceLine y={viewModel.targetRaw} stroke="var(--danger)" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: 'Objectif', fill: 'var(--danger)', fontSize: 11 }} />
            <Area type="monotone" dataKey="value" stroke={viewModel.isAchievable ? 'var(--success)' : 'var(--warning)'} strokeWidth={2.5} fill="url(#objGrad)" name="value" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="projection-chart-legend">
          <span><span className="projection-dot" style={{ background: viewModel.isAchievable ? 'var(--success)' : 'var(--warning)' }} /> Patrimoine projeté</span>
          <span><span className="projection-dot projection-dot--dashed" style={{ background: 'var(--danger)' }} /> Objectif</span>
        </div>
      </div>

      {/* Hypotheses */}
      <div className="projection-hypotheses">
        <Info size={14} style={{ color: 'var(--text-muted)', minWidth: 14 }} />
        <p>
          Croissance estimée : {(selectedProfile.returnRate * 100)}% / an ({selectedProfile.label}).
          Inflation : {inflation}%/an.
          Ces projections sont indicatives et ne constituent pas un conseil en investissement.
        </p>
      </div>
      <div className="projection-hypotheses" style={{ borderColor: 'var(--warning)' }}>
        <AlertTriangle size={14} style={{ color: 'var(--warning)', minWidth: 14 }} />
        <p>
          Les performances passées ne garantissent pas les résultats futurs.
          Les actifs volatils (crypto, actions) peuvent perdre une part importante de leur valeur.
          Ces projections sont des estimations à titre informatif uniquement.
        </p>
      </div>
    </div>
  )
}
